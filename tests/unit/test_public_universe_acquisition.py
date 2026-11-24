from datetime import date
import json
from pathlib import Path
import importlib

import pytest

ROOT=Path(__file__).resolve().parents[2]


def test_treasury_identity_excludes_floaters_and_future(monkeypatch):
    monkeypatch.syspath_prepend(str(ROOT/"scripts"));m=importlib.import_module("build_treasury_identity")
    row={"cusip":"912345678","security_type":"Note","floating_rate":"No","inflation_index_security":"No","issue_date":"2020-01-01","maturity_date":"2030-01-01","record_date":"2020-01-01","int_rate":"2.5"}
    result=m.build([row,row,dict(row,cusip="912345679",floating_rate="Yes"),dict(row,cusip="912345680",record_date="2027-01-01")],date(2026,11,24))
    assert len(result["rows"])==1 and result["rejected_rows"]==2
    assert result["rows"][0]["coupon_rate_decimal"]=="0.025"


def test_snapshot_does_not_treat_money_market_as_cash(monkeypatch):
    monkeypatch.syspath_prepend(str(ROOT/"scripts"));m=importlib.import_module("audit_issuer_holdings")
    assert m.classify("Treasury money market","Money Market","066922477","USD","2026-11-23",{})=="money_market_not_direct_treasury"
    assert m.classify("USD CASH","Cash","-","USD","2026-11-23",{})=="ancillary_usd_cash"
    assert m.classify("unknown","Fixed Income","unknown","USD","2026-11-23",{})=="unresolved_identity"


def test_eod_update_fixture_no_future_or_duplicate(monkeypatch):
    monkeypatch.syspath_prepend(str(ROOT/"scripts"));m=importlib.import_module("fetch_eod_updates")
    row={"date":"2026-11-20","open":100,"high":102,"low":99,"close":101,"adjusted_close":100,"volume":1000}
    assert m.validate_response(json.dumps([row]),date(2026,1,1),date(2026,11,24))["rows"]==1
    with pytest.raises(ValueError):m.validate_response(json.dumps([row,row]),date(2026,1,1),date(2026,11,24))
    with pytest.raises(ValueError):m.validate_response(json.dumps([dict(row,date="2026-11-25")]),date(2026,1,1),date(2026,11,24))
