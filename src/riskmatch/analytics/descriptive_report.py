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
    return {"assets":[r[0] for r in items],"first":entry["first"],"last":entry["last"],
            "frequency":entry["frequency"]}


def compare(root,source,instruments,start,end,currency,kind,as_of):
    if not isinstance(instruments,list) or not 1<=len(instruments)<=8 or len(set(instruments))!=len(instruments):
        raise ValueError("Select one to eight distinct assets")
    if not all(isinstance(x,str) and 0<len(x)<=100 for x in instruments):
        raise ValueError("Invalid asset identifier")
    if start>end or end>as_of or currency not in ("USD","CHF") or kind not in ("price_return","total_return"):
        raise ValueError("Invalid research comparison")
    path,entry=selected_source(root,source,as_of)
    column=kind+("_chf" if currency=="CHF" else "")
    with duckdb.connect() as db:
        frame=db.execute(f"""select instrument,start_date,end_date,{column} value from read_parquet(?)
            where instrument in (select unnest(?)) and end_date between ? and ?
            order by instrument,end_date,start_date""",[str(path),instruments,start,end]).df()
    k={"daily":365 if source in ("btc","eth") else 252,"weekly":52,"monthly":12}.get(entry["frequency"])
    rows=[]
    for instrument in instruments:
        group=frame.loc[frame.instrument==instrument]
        values=group.value.to_numpy()
        rows.append({"instrument":instrument,"statistics":summarize(values,k),"distribution":distribution(values),
                     "serial":time_diagnostics(longest_contiguous(group)) if k else {}})
    aligned=frame.dropna(subset=["start_date"]).pivot(index=["start_date","end_date"],columns="instrument",values="value")
    aligned=aligned.reindex(columns=instruments)
    return {"approved":False,"source":source,"currency":currency,"kind":kind,"frequency":entry["frequency"],
            "start":start.isoformat(),"end":end.isoformat(),"assets":rows,
            "matrix":covariance_matrix(aligned.to_numpy(dtype=float))}
