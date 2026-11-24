"""Build local typed Parquet research partitions with content-addressed lineage."""

from datetime import datetime, timezone
import hashlib
import json
import fcntl
from pathlib import Path
import tempfile

import duckdb

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BASE = DATA / "processed/universe"
DEST = DATA / "processed/pit"


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def single(pattern):
    paths = sorted(DATA.glob(pattern))
    if len(paths) != 1:
        raise ValueError(f"Expected one explicit source: {pattern}")
    return paths[0]


def verified(folder, entry):
    path = folder / entry["file"]
    if digest(path) != entry["sha256"]:
        raise ValueError("Input fingerprint mismatch")
    return path


def partitions():
    windows = BASE / "research_windows"
    mem = json.loads((BASE / "universe_membership_review.json").read_text())
    win = json.loads((windows / "receipt-fbca75207d485dd2.json").read_text())
    delivery = json.loads((BASE / "wrds_delivery.json").read_text())["tables"]
    def delivered(name):
        entry = delivery[name]
        path = single("telecharger */" + entry["file"])
        info = path.stat()
        if (info.st_size, info.st_mtime_ns) != (entry["size"], entry["mtime_ns"]):
            raise ValueError("WRDS delivery changed")
        return path
    # Input expressions are fixed, never supplied by API callers.
    yield ("etf_crsp_daily", BASE/"crsp_etf_daily_extract.csv",
           "cast(PERMNO as varchar) instrument,cast(DlyCalDt as date) observation_date, "
           "cast(DlyPrc as double) close,try_cast(DlyRet as double) reported_return,"
           "try_cast(DlyBid as double) bid,try_cast(DlyAsk as double) ask",
           "instrument,observation_date", "close is not null and isfinite(close) and close>0",
           "USD/share; reported return decimal")
    yield ("listed_daily", verified(windows, win["bridge"]["bars_file"]),
           "ticker instrument,cast(date as date) observation_date,try_cast(close as double) close,"
           "try_cast(volume as double) volume,try_cast(research_gross_return as double) research_return,return_status",
           "instrument,observation_date", "close>0 and isfinite(close) and volume>=0", "USD/share; shares; decimal")
    yield ("stock_membership", verified(windows, mem["stocks"]["file"]),
           "cast(permno as varchar) instrument,cast(ranking_date as date) observation_date,rank,"
           "market_cap_source_units,reported_month_volume,decision_after_close",
           "instrument,observation_date", "rank between 1 and 1000", "rank; vendor market cap units")
    yield ("stock_outcomes", verified(windows, win["stocks"]["file"]),
           "cast(permno as varchar) instrument,cast(end_date as date) observation_date,ranking_date,rank,"
           "try_cast(observed_return as double) observed_return",
           "instrument,observation_date", "rank between 1 and 1000 and (observed_return is null or (isfinite(observed_return) and observed_return>=-1))", "decimal")
    yield ("treasury_membership", verified(windows, mem["treasuries"]["file"]),
           "cast(cusip as varchar) instrument,cast(statement_date as date) observation_date,class,reported_maturity,decision",
           "instrument,observation_date", "decision is not null", "classification")
    yield ("treasury_funds", verified(windows, mem["funds"]["file"]),
           "ticker instrument,cast(report_date as date) observation_date,accession,decision",
           "instrument,observation_date,accession", "decision is not null", "classification")
    yield ("nominal_accrual", verified(windows, win["treasuries"]["accrued_file"]),
           "cast(cusip as varchar) instrument,cast(valuation_date as date) observation_date,contractual_accrued_per_100",
           "instrument,observation_date", "contractual_accrued_per_100>=0", "USD per 100 face")
    yield ("tips_payments", verified(windows, win["treasuries"]["tips_file"]),
           "cast(cusip as varchar) instrument,cast(contractual_date as date) observation_date,published_ratio,indexed_coupon_per_100,redemption_per_100",
           "instrument,observation_date", "published_ratio>0", "USD per 100 face; ratio")
    for group, expr, key, predicate, unit in [
        ("split", "act_symbol instrument,cast(ex_date as date) observation_date,to_factor,for_factor",
         "instrument,observation_date,to_factor,for_factor", "to_factor>0 and for_factor>0", "share ratio"),
        ("dividend", "act_symbol instrument,cast(ex_date as date) observation_date,amount",
         "instrument,observation_date,amount", "amount>=0 and isfinite(amount)", "USD/share"),
    ]:
        yield (group, single(f"raw/public_actions/*/{group}-*.csv.gz"), expr, key, predicate, unit)
    for pair in ("BTC-USD", "ETH-USD"):
        yield (pair.lower(), single(f"raw/crypto_bars/{pair}-*.csv.gz"),
               f"'{pair}' instrument,cast(utc_day as date) observation_date,open,high,low,close,base_volume",
               "instrument,observation_date", "low>0 and high>=greatest(open,close,low) and low<=least(open,close) and base_volume>=0",
               "USD/base unit; base volume")
    yield ("fx_usd_chf", single("raw/public_universe/*/fred-DEXSZUS-*.csv"),
           "'USDCHF' instrument,cast(observation_date as date) observation_date,try_cast(DEXSZUS as double) rate",
           "instrument,observation_date", "rate>0 and isfinite(rate)", "CHF per USD")
    for series in ("CPIAUCSL", "INDPRO", "UNRATE", "GDPC1", "DTB3", "DGS1MO",
                   "DGS3MO", "DGS2", "DGS5", "DGS10", "DGS30", "DFII5", "DFII10", "DFII30",
                   "SOFR", "SOFRINDEX"):
        unit = {"CPIAUCSL":"index", "INDPRO":"index", "GDPC1":"billions chained USD",
                "SOFRINDEX":"index"}.get(series, "percent")
        pattern = f"raw/cash_reference/{series}-*.csv" if series.startswith("SOFR") else f"raw/public_universe/*/fred-{series}-*.csv"
        yield (series.lower(), single(pattern),
               f"'{series}' instrument,cast(observation_date as date) observation_date,try_cast({series} as double) observed_value",
               "instrument,observation_date", "isfinite(observed_value)", unit)
    yield ("filing_chronology", single("raw/edgar_as_filed/filing_times_*.parquet"),
           "cast(cik as varchar) instrument,period observation_date,adsh,form,filed,accepted",
           "instrument,observation_date,adsh", "accepted is not null and cast(accepted as date)>=observation_date",
           "SEC filing timestamp as reported; timezone requires verification")
    for frequency in ("annual", "quarterly"):
        yield (f"fundamentals_{frequency}", single(f"processed/universe/filing_dates/{frequency}-original-*.parquet"),
               "gvkey instrument,period observation_date,adsh,accepted,tag,version taxonomy_version,qtrs,uom,value",
               "instrument,observation_date,adsh,tag,taxonomy_version,qtrs,uom",
               "accepted is not null and cast(accepted as date)>=observation_date and isfinite(value)", "USD; period quarters")
    yield ("treasury_archive_marks", single("raw/treasury_archive/cusip-set-*.csv.gz"),
           "cusip instrument,cast(date as date) observation_date,instrument_type,bid_price,offer_price,mid_price,eod_price",
           "instrument,observation_date", "eod_price>0 and isfinite(eod_price)", "USD per 100 face")
    yield ("treasury_historical_marks", single("raw/treasury_archive/historical-*.csv.gz"),
           'CUSIP instrument,cast(Date as date) observation_date,"SECURITY.TYPE" instrument_type,BUY buy_mark,SELL sell_mark,"END.OF.DAY" eod_price',
           "instrument,observation_date", "eod_price>0 and isfinite(eod_price)", "USD per 100 face")
    yield ("wrds_distributions", delivered("distributions"),
           "cast(permno as varchar) instrument,try_cast(disexdt as date) observation_date,disseqnbr,"
           "distype,disdetailtype,dispaymenttype,disorigcurtype,disdivamt,disfacpr,disfacshr,"
           "try_cast(disdeclaredt as date) declared_date,try_cast(dispaydt as date) payment_date,dispermno successor_permno",
           "instrument,observation_date,disseqnbr", "disseqnbr is not null", "reported event units; factors require source convention")
    yield ("wrds_delistings", delivered("delistings"),
           "cast(permno as varchar) instrument,try_cast(delistingdt as date) observation_date,"
           "delactiontype,delstatustype,delreasontype,delpaymenttype,delpermno successor_permno,"
           "try_cast(delret as double) delisting_return,delretmisstype,try_cast(delnextdt as date) next_date,"
           "try_cast(delamtdt as date) amount_date,try_cast(deldivamt as double) distribution_amount",
           "instrument,observation_date", "delisting_return is null or (isfinite(delisting_return) and delisting_return>=-1)",
           "reported return decimal; event codes and proceeds as reported")
    yield ("wrds_names", delivered("names_history"),
           "cast(permno as varchar) instrument,try_cast(secinfostartdt as date) observation_date,"
           "try_cast(secinfoenddt as date) valid_until_inclusive,ticker,cusip,permco,securitytype,securitysubtype,tradingstatusflg",
           "instrument,observation_date", "valid_until_inclusive is null or valid_until_inclusive>=observation_date", "dated identifiers")
    for frequency, prefix in (("daily","dly"),("monthly","mth")):
        yield (f"wrds_{frequency}_index", delivered(f"{frequency}_index"),
               f"'CRSP_INDEX' instrument,try_cast({prefix}caldt as date) observation_date,"
               "try_cast(vwretd as double) value_weighted_return,"
               "try_cast(ewretd as double) equal_weighted_return,sprtrn",
               "instrument,observation_date", "isfinite(value_weighted_return)", "decimal")


def normalize(db, spec, stage):
    name, path, projection, keys, predicate, unit = spec
    version = digest(path)
    # Validate the embedded digest when present; the generated extract has no embedded hash.
    import re
    match = re.search(r"-([0-9a-f]{16})\.", path.name)
    if match and not version.startswith(match[1]):
        raise ValueError("Input filename digest mismatch")
    reader = "read_parquet(?)" if path.suffix == ".parquet" else "read_csv_auto(?, sample_size=-1)"
    db.execute(f"create or replace temp table projected as select {projection} from {reader}", [str(path)])
    if digest(path) != version:
        raise ValueError("Input changed during normalization")
    total = db.execute("select count(*) from projected").fetchone()[0]
    valid = f"instrument is not null and observation_date is not null and ({predicate})"
    db.execute(f"create or replace temp table distinct_rows as select distinct * from projected where {valid}")
    distinct_count = db.execute("select count(*) from distinct_rows").fetchone()[0]
    valid_count = db.execute(f"select count(*) from projected where {valid}").fetchone()[0]
    db.execute(f"""create or replace temp table normalized as
        select *, '{version}' dataset_version, cast(null as timestamptz) availability_time
        from distinct_rows qualify count(*) over(partition by {keys})=1""")
    rows, first, last = db.execute("select count(*),min(observation_date),max(observation_date) from normalized").fetchone()
    columns = {r[0] for r in db.execute("describe normalized").fetchall()}
    quality = {}
    if "close" in columns:
        stale, extreme = db.execute("""with changes as (
            select close,lag(close) over(partition by instrument order by observation_date) previous
            from normalized)
            select count(*) filter(where close=previous),
            count(*) filter(where previous>0 and abs(close/previous-1)>0.5) from changes""").fetchone()
        quality.update(unchanged_close=stale, large_price_change=extreme)
    for column in ("reported_return", "research_return", "observed_return"):
        if column in columns:
            quality["missing_return"] = db.execute(f"select count(*) from normalized where {column} is null").fetchone()[0]
    if name == "listed_daily":
        calendar = json.loads(single("raw/public_sessions/*/receipt-*.json").read_text())["expected"]
        expected = db.execute("select count(distinct instrument) from normalized").fetchone()[0] * len(calendar)
        actual = db.execute("select count(*) from normalized where observation_date in (select unnest(?)::date)", [calendar]).fetchone()[0]
        quality.update(expected_sessions=expected, missing_sessions=expected-actual)
    if name in ("btc-usd", "eth-usd"):
        quality["missing_sessions"] = (last-first).days+1-rows
    destination = stage / f"{name}.parquet"
    db.execute(f"copy (select * from normalized order by {keys}) to ? (format parquet, compression zstd)", [str(destination)])
    return {"dataset":name,"input_rows":total,"rows":rows,"invalid":total-valid_count,
            "duplicates":valid_count-distinct_count,"conflicts":distinct_count-rows,
            "first":str(first),"last":str(last),"source_hash":version,"file_hash":digest(destination),
            "units":unit,"quality":quality,"pit_eligible":False,"reason":"historical_availability_unverified"}


def calendar_partition(db, stage):
    path = single("raw/public_sessions/*/receipt-*.json")
    receipt = json.loads(path.read_text())
    days = sorted(set(receipt["expected"]))
    version = digest(path)
    db.execute("""create or replace temp table observed_calendar as select
        'US_EQUITY' instrument, unnest(?)::date observation_date,
        cast(null as timestamptz) close_utc, cast(null as timestamptz) availability_time,
        ? dataset_version""", [days, version])
    dest = stage / "us_equity_sessions.parquet"
    db.execute("copy (select * from observed_calendar order by observation_date) to ? (format parquet, compression zstd)", [str(dest)])
    return {"dataset":"us_equity_sessions","input_rows":len(receipt["expected"]),"rows":len(days),
            "invalid":0,"duplicates":len(receipt["expected"])-len(days),"conflicts":0,
            "first":days[0],"last":days[-1],"source_hash":version,"file_hash":digest(dest),
            "units":"observed exchange session date; close timestamp unverified",
            "quality":{},"pit_eligible":False,"reason":"exchange_close_schedule_unverified"}


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    with (DEST / "build.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        build()


def build():
    with tempfile.TemporaryDirectory(dir=DEST) as temp:
        stage = Path(temp)
        with duckdb.connect() as db:
            db.execute("set threads=1")
            rows = [normalize(db, spec, stage) for spec in partitions()]
            rows.append(calendar_partition(db, stage))
        snapshot_id = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()
        snapshot = DEST / snapshot_id
        snapshot.mkdir(exist_ok=True)
        for file in stage.glob("*.parquet"):
            target = snapshot / file.name
            if target.exists():
                if digest(target) != digest(file):
                    raise ValueError("Existing snapshot changed")
            else:
                file.replace(target)
        report = {"schema":"pit-v1","snapshot_id":snapshot_id,"approved":False,
                  "built_at":datetime.now(timezone.utc).isoformat(),"datasets":rows,
                  "scope":"private_academic_research","reason":"historical_availability_and_source_validation_pending"}
        pending = stage / "report.json"
        pending.write_text(json.dumps(report, indent=2))
        pending.replace(DEST / "report.json")
    print(f"{len(rows)} partitions, {sum(row['rows'] for row in rows):,} rows; historical approval pending")


if __name__ == "__main__":
    main()
