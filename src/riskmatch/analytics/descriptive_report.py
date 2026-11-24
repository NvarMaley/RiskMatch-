"""Local-only aggregate results and bounded selected-asset research comparisons."""
from datetime import date
import hashlib
import json
from pathlib import Path

import duckdb
import numpy as np

from riskmatch.analytics.descriptive import covariance_matrix,summarize,distribution,time_diagnostics,longest_contiguous
from riskmatch.market_data.returns import returns_report


def descriptive_report(root,as_of):
    root=Path(root)
    base=root/"data/processed/descriptive"
    unavailable={"schema":"descriptive-v1","approved":False,"datasets":[],"sources":[]}
    try:
        report=json.loads((base/"report.json").read_text())
        upstream=json.loads((root/"data/processed/returns/report.json").read_text())
        if report["return_id"]!=upstream["return_id"] or date.fromisoformat(report["built_at"][:10])>as_of:
            return unavailable
        key=hashlib.sha256(json.dumps([report["return_id"],report["datasets"],report["sources"]],sort_keys=True).encode()).hexdigest()
        if key!=report["descriptive_id"]:
            return unavailable
        for row in report["datasets"]:
            name=row["dataset"]
            if name not in ("asset_statistics","rolling_features","cross_section","covariance_reference"):
                return unavailable
            extension="json" if name=="covariance_reference" else "parquet"
            with (base/key/f"{name}.{extension}").open("rb") as stream:
                if hashlib.file_digest(stream,"sha256").hexdigest()!=row["file_hash"]:
                    return unavailable
        return report | {"approved":False}
    except (OSError,ValueError,TypeError,KeyError):
        return unavailable


def selected_source(root,source,as_of):
    report=returns_report(root,as_of)
    entry=next((r for r in report["datasets"] if r["dataset"]==source and "total_returns" in r),None)
    if entry is None:
        raise ValueError("Research return source unavailable")
    return Path(root)/"data/processed/returns"/report["return_id"]/f"{source}.parquet",entry


def assets(root,source,as_of):
    path,entry=selected_source(root,source,as_of)
    with duckdb.connect() as db:
        items=db.execute("select distinct instrument from read_parquet(?) order by instrument",[str(path)]).fetchall()
        labels={}
        try:
            pit=json.loads((Path(root)/"data/processed/pit/report.json").read_text())
            base=Path(root)/"data/processed/pit"/pit["snapshot_id"]
            if source.startswith(("etf_crsp","stock_monthly")):
                names=base/"wrds_names.parquet"
                labels=dict(db.execute("""select instrument,arg_max(ticker,observation_date)
                    from read_parquet(?) where observation_date<=? and ticker is not null
                    and instrument in (select distinct instrument from read_parquet(?))
                    group by instrument""",[str(names),as_of,str(path)]).fetchall())
            elif source in ("treasury_marks","bill_marks","nominal_bond_scenario"):
                labels=dict(db.execute("""select instrument,instrument_type||' · '||cast(maturity as varchar)
                    from read_parquet(?) where observation_date<=?""",[str(base/"treasury_identity.parquet"),as_of]).fetchall())
        except (OSError,ValueError,KeyError,duckdb.Error):
            labels={}
    return {"assets":[r[0] for r in items],"first":entry["first"],"last":entry["last"],
            "frequency":entry["frequency"],"labels":labels,
            "kinds":[kind for kind,count in (("price_return",entry["price_returns"]),("total_return",entry["total_returns"])) if count]}


def compare(root,source,instruments,start,end,currency,kind,as_of):
    if not isinstance(instruments,list) or not 1<=len(instruments)<=8 or len(set(instruments))!=len(instruments):
        raise ValueError("Select one to eight distinct assets")
    if not all(isinstance(x,str) and 0<len(x)<=100 for x in instruments):
        raise ValueError("Invalid asset identifier")
    if start>end or end>as_of or currency not in ("USD","CHF") or kind not in ("price_return","total_return"):
        raise ValueError("Invalid research comparison")
    return compare_series(root,[{"source":source,"instrument":i} for i in instruments],start,end,currency,kind,as_of)


def _points(frame, field, limit=450):
    if field not in frame:
        return []
    step=max(1,(len(frame)+limit-1)//limit)
    return [[str(r[0])[:10],float(r[1]) if np.isfinite(r[1]) else None]
            for r in frame[["end_date",field]].iloc[::step].itertuples(index=False,name=None)]


def compare_series(root,series,start,end,currency,kind,as_of):
    if start>end or end>as_of or currency not in ("USD","CHF") or kind not in ("price_return","total_return"):
        raise ValueError("Invalid research comparison")
    if not isinstance(series,list) or not 1<=len(series)<=8:
        raise ValueError("Select one to eight assets")
    import pandas as pd
    resolved=[]
    for item in series:
        source,instrument=item["source"],item["instrument"]
        if not isinstance(instrument,str) or not instrument or len(instrument)>100:
            raise ValueError("Invalid asset")
        path,entry=selected_source(root,source,as_of)
        resolved.append((source,instrument,path,entry))
    if len({(s,i) for s,i,_,_ in resolved})!=len(resolved):
        raise ValueError("Duplicate series")
    frequencies={e["frequency"] for _,_,_,e in resolved}
    if len(frequencies)!=1:
        raise ValueError("Use the same frequency for all selected assets")
    frequency=frequencies.pop()
    column=kind+("_chf" if currency=="CHF" else "")
    rows=[]
    aligned_frames=[]
    descriptive=descriptive_report(root,as_of)
    detail=Path(root)/"data/processed/descriptive"/descriptive.get("descriptive_id","unavailable")
    pit_base=None
    try:
        pit=json.loads((Path(root)/"data/processed/pit/report.json").read_text())
        pit_base=Path(root)/"data/processed/pit"/pit["snapshot_id"]
    except (OSError,ValueError,KeyError):
        pass
    with duckdb.connect() as db:
        for source,instrument,path,entry in resolved:
            group=db.execute(f"""select start_date,end_date,{column} value from read_parquet(?)
                where instrument=? and end_date between ? and ? order by end_date,start_date""",[str(path),instrument,start,end]).df()
            k={"daily":365 if source in ("btc","eth") else 252,"weekly":52,"monthly":12}.get(frequency)
            values=group.value.to_numpy()
            asset={"instrument":instrument,"source":source,"statistics":summarize(values,k),"distribution":distribution(values),
                "serial":time_diagnostics(longest_contiguous(group)) if k else {},
                "history":_points(group,"value"),"rolling":{},"cross_section":{}}
            price_source=next((name for prefix,name in (("etf_crsp_daily","etf_crsp_daily"),
                ("etf_crsp_monthly","etf_crsp_monthly"),("listed_daily","listed_daily"),
                ("stock_ticker_reference","stock_refresh_ticker_reference"),("btc","btc-usd"),("eth","eth-usd"),
                ("treasury_marks","fedinvest_marks"),("bill_marks","fedinvest_marks"),("nominal_bond_scenario","fedinvest_marks"))
                if source.startswith(prefix)),None)
            if pit_base and price_source:
                field="eod_price" if price_source=="fedinvest_marks" else "close"
                prices=db.execute(f"""select observation_date end_date,{field} price from read_parquet(?)
                    where instrument=? and observation_date between ? and ? order by observation_date""",
                    [str(pit_base/f"{price_source}.parquet"),instrument,start,end]).df()
                asset["prices"]=_points(prices,"price")
                asset["price_units"]="USD per 100 face" if field=="eod_price" else "USD per unit"
            if descriptive.get("datasets"):
                for table,fields,key in (
                    ("rolling_features",["rolling_mean","annualized_volatility","rolling_beta","rolling_correlation"],"rolling"),
                    ("cross_section",["cross_section_rank","standardized_return"],"cross_section"),
                ):
                    frame=db.execute(f"""select end_date,{','.join(fields)} from read_parquet(?)
                        where source=? and instrument=? and currency=? and kind=? and end_date between ? and ?
                        order by end_date""",[str(detail/f"{table}.parquet"),source,instrument,currency,kind,start,end]).df()
                    asset[key]={field:_points(frame,field) for field in fields}
            rows.append(asset)
            aligned_frames.append(group.dropna(subset=["start_date"]).set_index(["start_date","end_date"])["value"].rename(f"{source}:{instrument}"))
    aligned=pd.concat(aligned_frames,axis=1,join="outer")
    return {"approved":False,"source":resolved[0][0],"currency":currency,"kind":kind,"frequency":frequency,
            "start":start.isoformat(),"end":end.isoformat(),"assets":rows,
            "matrix":covariance_matrix(aligned.to_numpy(dtype=float))}
