"""Build chapter 8 for all catalogue items, with reproducible local checkpoints."""
import argparse
from concurrent.futures import ProcessPoolExecutor
from datetime import date
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import fcntl

# Each worker fits single-thread CPU candidates; avoid nested BLAS oversubscription.
for variable in ("OMP_NUM_THREADS","OPENBLAS_NUM_THREADS","MKL_NUM_THREADS","VECLIB_MAXIMUM_THREADS"):
    os.environ[variable]="1"
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"src"))
import duckdb
from riskmatch.analytics.descriptive_report import client_catalog
from riskmatch.analytics.forecast_batch import prepare_item, run_item, summarize_rows
from riskmatch.analytics.forecasting import VERSION
from riskmatch.market_data.returns import returns_report


def build(as_of, workers):
    report=returns_report(ROOT,as_of)
    if not report.get("datasets"):
        raise ValueError("Missing verified returns snapshot")
    catalogue=client_catalog(ROOT,as_of)["items"]
    sources={d["dataset"] for d in report["datasets"] if "total_returns" in d}
    folder=ROOT/"data/processed/returns"/report["return_id"]
    base=ROOT/"data/processed/forecasts"
    base.mkdir(parents=True,exist_ok=True)
    policy="USD; total then price; monthly then weekly then daily; no splicing"
    key=hashlib.sha256(json.dumps([report["return_id"],VERSION,as_of.isoformat(),policy,
                                [a["id"] for a in catalogue]],sort_keys=True).encode()).hexdigest()
    dest=base/key
    dest.mkdir(exist_ok=True)
    with (base/"build.lock").open("a") as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        checkpoint=dest/"results.jsonl"
        done={}
        if checkpoint.exists():
            with checkpoint.open() as stream:
                for line in stream:
                    row=json.loads(line)
                    done[row["id"]]=row
        print(f"Catalogue: {len(catalogue)}; resume: {len(done)}",flush=True)
        with duckdb.connect(config={"threads":1}) as db:
            jobs=[prepare_item(a,db,folder,sources,as_of) for a in catalogue if a["id"] not in done]
        print(f"Ready to fit: {sum(j['status']=='ready' for j in jobs)}; unavailable: {sum(j['status']!='ready' for j in jobs)}",flush=True)
        with checkpoint.open("a") as stream, ProcessPoolExecutor(max_workers=workers) as pool:
            for row in pool.map(run_item,((j,as_of,report["return_id"]) for j in jobs),chunksize=4):
                stream.write(json.dumps(row,allow_nan=False,separators=(",",":"))+"\n")
                stream.flush()
                done[row["id"]]=row
                if len(done)%50==0 or len(done)==len(catalogue):
                    print(f"Progress: {len(done)}/{len(catalogue)}",flush=True)
        if set(done)!={a["id"] for a in catalogue}:
            raise RuntimeError("Incomplete catalogue output")
        with checkpoint.open("rb") as stream:
            file_hash=hashlib.file_digest(stream,"sha256").hexdigest()
        meta={"status":"complete","approved":False,"run_id":key,"data_version":report["return_id"],
              "model_version":VERSION,"as_of":as_of.isoformat(),"policy":policy,"file_hash":file_hash,
              **summarize_rows(list(done.values()))}
        with tempfile.NamedTemporaryFile(mode="w",dir=base,delete=False) as stream:
            json.dump(meta,stream,indent=2,allow_nan=False)
            temp=Path(stream.name)
        temp.replace(base/"report.json")
        print(json.dumps({k:meta[k] for k in ("catalogue_count","statuses","reasons","by_model")}),flush=True)


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--as-of",type=date.fromisoformat,default=date.today())
    parser.add_argument("--workers",type=int,default=4,choices=range(1,9))
    args=parser.parse_args()
    build(args.as_of,args.workers)
