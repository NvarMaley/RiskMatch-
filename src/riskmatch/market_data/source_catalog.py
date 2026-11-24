"""Source acquisition readiness; no source availability grants investability or rights."""

from dataclasses import dataclass
from datetime import date, datetime
import hashlib
import json
import stat
from pathlib import Path

from .local_sources import new_data_root, monthly_audit, daily_audit, audit_available_for_as_of, treasury_identity_summary, issuer_holdings_summary, fedinvest_summary

ROOT=Path(__file__).resolve().parents[3]


def catalog():
    result=json.loads((ROOT/"configs/source_catalog.json").read_text())
    if len({r["id"] for r in result["entries"]})!=len(result["entries"]):raise ValueError("Duplicate source ID")
    return result


@dataclass(frozen=True)
class ProviderRequest:
    provider: str
    dataset_version: str
    as_of: date

    def __post_init__(self):
        if not self.provider or not self.dataset_version:raise ValueError("Missing provider/version")


def request_snapshot(request, adapters):
    """Explicit adapters only. Unavailable providers return a diagnostic, never synthetic substitutes."""
    adapter=adapters.get(request.provider)
    if adapter is None:return {"status":"provider_unavailable","provider":request.provider,"dataset_version":request.dataset_version,"as_of":request.as_of.isoformat()}
    return adapter(request)


def public_receipts(root=ROOT, as_of=None):
    """Verify the small immutable local public-download receipts, not raw WRDS data."""
    as_of=as_of or date.today();found={};base=Path(root)/"data/raw/public_universe"
    if not base.is_dir():return found
    for path in sorted(base.glob("*/receipt-*.json")):
        try:
            if getattr(path.stat(),"st_flags",0)&getattr(stat,"SF_DATALESS",0x40000000):continue
            receipt=json.loads(path.read_text());stamp=datetime.fromisoformat(receipt["acquired_at_utc"])
            if receipt["schema"]!="public-source-receipt-v1" or stamp.date()>as_of:continue
            for row in receipt["datasets"]:
                if row["status"]!="downloaded_schema_checked_not_normalized":continue
                verified=True
                for file in row["files"]:
                    if Path(file["file"]).name!=file["file"]:raise ValueError("Invalid receipt path")
                    p=path.parent/file["file"]
                    info=p.stat()
                    if info.st_size!=file["size"] or file["size"]>20_000_000:raise ValueError("Public receipt size mismatch")
                    if getattr(info,"st_flags",0)&getattr(stat,"SF_DATALESS",0x40000000):
                        verified=False;continue
                    if hashlib.sha256(p.read_bytes()).hexdigest()!=file["sha256"]:raise ValueError("Public receipt fingerprint mismatch")
                previous=found.get(row["dataset"])
                if previous is None or stamp.isoformat()>previous["acquired_at"]:
                    found[row["dataset"]]={"rows":row["rows"],"first":row["first_record"],"last":row["last_record"],"acquired_at":stamp.isoformat(),"status":row["status"],"kind":row["kind"],"verification":"hash_checked" if verified else "receipt_only_cloud_placeholder"}
        except (OSError,ValueError,KeyError,TypeError):continue
    return found


def source_report(as_of, root=ROOT):
    root=Path(root);meta=catalog();new=new_data_root(root);monthly=audit_available_for_as_of(monthly_audit(root),as_of);daily=audit_available_for_as_of(daily_audit(root),as_of)
    public=public_receipts(root,as_of)
    treasury=treasury_identity_summary(as_of,root);holdings=issuer_holdings_summary(as_of,root);fed=fedinvest_summary(as_of,root)
    def present(path):return bool(new and (new/path).is_file())
    available={
      "ETF_DAILY":("local_partial" if daily or present("data_plus/raw/wrds/crsp_dsf.csv") else "missing", f"CRSP daily {daily['observed_etfs']}/22; no volume field; ends 2025" if daily else "Daily CRSP audit pending"),
      "ETF_MONTHLY":("local_partial" if monthly or present("data_plus/raw/wrds/crsp_msf.csv") else "missing",f"{monthly['observed_etfs']}/22 monthly ETF histories through 2025" if monthly else "Monthly audit pending"),
      "EQUITY_MASTER":("local_partial" if monthly or present("data_plus/raw/wrds/crsp_msf.csv") else "missing",f"{monthly['stock_candidate_count']} raw classified candidates; {monthly['selected_count']} ranked locally at {monthly['snapshot_date']}" if monthly else "Monthly audit pending"),
      "ETF_HOLDINGS":("local_partial" if holdings else "missing", f"{len(holdings)}/5 current issuer snapshots audited; strict rule blocks reported money-market shares; historical holdings still missing" if holdings else "No verified dated Treasury ETF holding snapshots"),
      "FUNDAMENTALS":("local_partial" if present("data_plus/raw/wrds/comp_funda.csv") else "missing","Annual export lacks verified release/revision history"),
      "LINKS":("local_partial" if present("data_plus/raw/wrds/ccm_lnkhist.csv") else "missing","CCM dated links present; validate types and overlaps"),
      "TREASURY_MASTER":("public_downloaded" if treasury or any(k in public for k in ("auctions_query","treasury_securities_auctions_v2")) else "missing",f"{sum(treasury['historical_by_type'].values())} historical CUSIPs; {sum(treasury['not_matured_by_type'].values())} non-matured candidates; no secondary prices" if treasury else "Auction identity metadata, not secondary-market quotes"),
      "TREASURY_DAILY":("local_partial" if fed else "missing",f"FedInvest: {fed['days']} dated snapshots, {fed['scope_positive_eod']} positive in-scope valuation observations; historical completeness and execution pricing unverified" if fed else "No individual daily secondary-market prices verified"),
      "RATES_FX":("public_downloaded" if any(k.startswith("fred_rates") for k in public) else "local_partial","Latest-vintage rates/FX; PIT lag and cash conversion not validated"),
      "MACRO_VINTAGES":("local_partial","Existing local macro/vintage inputs; complete release and revision coverage pending"),
      "FACTORS":("local_partial" if new and (new/"data_plus/raw/factors").is_dir() else "missing","Local factor archives; definitions and final dates require validation"),
      "BENCHMARKS":("local_partial","Local CRSP index columns and ETF proxies; historical index weights missing"),
      "FUTURES":("missing","No verified contract-level settlement/volume/OI/margin history"),
      "COSTS_LIQUIDITY":("local_partial" if daily or present("data_plus/raw/wrds/crsp_dsf.csv") else "missing","Bid/ask present; daily volume, dated fund expenses and execution assumptions missing"),
      "SENTIMENT":("local_partial" if present("data1/raw/sentratio_and_price_for_pf2.pkl") else "missing","Course files present if accessible; optional and rights unverified"),
    }
    audit_dir = root / "data/processed/universe"
    def local_audit(name):
        try:
            return audit_available_for_as_of(json.loads((audit_dir / name).read_text()), as_of) or {}
        except (OSError, ValueError):
            return {}

    delivery = local_audit("wrds_delivery.json").get("tables", {})
    folders = [p for p in (root / "data").glob("telecharger*") if p.name.strip() == "telecharger"]
    def current(table):
        item = delivery.get(table, {})
        if len(folders) != 1 or not item or Path(item["file"]).name != item["file"]:
            return None
        try:
            info = (folders[0] / item["file"]).stat()
            if (info.st_size, info.st_mtime_ns) == (item["size"], item["mtime_ns"]):
                return item
        except OSError:
            pass
        return None

    supplement = current("daily_supplement")
    if supplement:
        evidence = f"{supplement['rows']:,} WRDS supplement rows through {supplement['last']}; {supplement['populated_volume']:,} populated volume fields. PERMNO/date reconciliation pending."
        available["ETF_DAILY"] = ("local_partial", evidence)
        available["COSTS_LIQUIDITY"] = ("local_partial", evidence)
    joined = local_audit("etf_daily_volume.json")
    if supplement and joined and (audit_dir / "etf_daily_volume.csv.gz").is_file():
        detail = f"{joined['matched']:,} daily ETF keys matched across {len(joined['by_ticker'])} funds with return agreement and volume. Ends {supplement['last']}."
        available["ETF_DAILY"] = ("local_partial", detail)
        available["COSTS_LIQUIDITY"] = ("local_partial", detail + " Dated expenses and AUM pending.")
    treasury_data = local_audit("treasury_supplements.json")
    if treasury_data:
        available["TREASURY_MASTER"] = ("local_partial", f"{treasury_data['monthly_statements']} monthly statements; {treasury_data['latest_positive_issues']} issues with positive balances at {treasury_data['latest_statement']}.")
        available["TREASURY_DAILY"] = ("local_partial", available["TREASURY_DAILY"][1] + f". {treasury_data['tips_issues']} TIPS with ratios; {len(treasury_data['archives'])} separately archived third-party historical sources.")
    quarter = current("quarterly")
    if quarter:
        available["FUNDAMENTALS"] = ("local_partial", f"{quarter['rows']:,} quarterly rows. Release dates and restatements require validation.")
    if current("links"):
        available["LINKS"] = ("local_partial", "Dated CCM links audited; historical overlap checks pending.")
    ranking = local_audit("monthly_stock_candidates.json")
    if ranking and (audit_dir / "monthly_stock_candidates.csv.gz").is_file():
        available["EQUITY_MASTER"] = ("local_partial", f"{ranking['months']} month-end candidate rankings ({ranking['first']} to {ranking['last']}); execution and PIT validation pending.")
    if "cftc_legacy_futures_only" in public:
        count = public["cftc_legacy_futures_only"]["rows"]
        available["FUTURES"] = ("local_partial", f"{count:,} weekly CFTC market observations across ten families. Settlement histories by expiry still required.")
    spot = [public[key] for key in ("CBBTCUSD", "CBETHUSD") if key in public]
    available["CRYPTO_SPOT"] = ("local_partial" if spot else "missing", f"{len(spot)}/2 spot series acquired. Research candidates only.")
    rows=[]
    for row in meta["entries"]:
        status,evidence=available[row["id"]];rows.append(row|{"status":status,"evidence":evidence,"allocation_approved":False})
    return {"version":meta["version"],"as_of":as_of.isoformat(),"rows":rows,"public_receipts":public,"treasury_identity":treasury,"issuer_holdings":holdings,
            "rights_policy":"local_only_pending_entitlement_and_redistribution_review","approved_for_allocation":0}
