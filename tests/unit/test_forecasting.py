from datetime import date, timedelta
import json

import numpy as np
import pytest

from riskmatch.analytics.forecasting import forecast, lagged_examples, factor_reference


def fixture():
    r=np.random.default_rng(42).normal(.001,.02,220)
    d=[date(2020,1,1)+timedelta(days=i) for i in range(len(r))]
    return r,d


def run(r,d):
    return forecast(r,d,instrument="fixture",frequency="daily",currency="USD",
                    kind="total_return",data_version="synthetic-v1",as_of=d[-1])


def test_lags_and_test_isolation():
    r,d=fixture()
    X,y,_=lagged_examples(r)
    assert y[0]==r[20]
    assert X[0,0]==r[19]
    a=run(r,d)
    mutated=r.copy()
    mutated[-30:]+=1
    b=run(mutated,d)
    assert a["selected_model"]==b["selected_model"]
    for key,v in a["models"].items():
        assert v["parameters"]==b["models"][key]["parameters"]
        assert v["validation_mse"]==b["models"][key]["validation_mse"]
    assert a["bundle"]["horizon_periods"]==1
    assert a["approved"] is False
    json.dumps(a,allow_nan=False)


def test_constant_returns_and_invalid_dates():
    _,d=fixture()
    a=run(np.full(len(d),.005),d)
    assert a["models"]["historical"]["expected_return"]==pytest.approx(.005)
    assert a["models"]["historical"]["test"]["mae"]<1e-12
    assert a["models"]["ols"]["test"]["temporal_rank_correlation"] is None
    with pytest.raises(ValueError,match="Insufficient"):
        run(np.zeros(30),d[:30])
    with pytest.raises(ValueError,match="ordered"):
        run(np.zeros(len(d)),d[::-1])


def test_factor_reference_analytical():
    _,d=fixture()
    rng=np.random.default_rng(42)
    f=rng.normal(0,.02,(len(d),3))
    rf=np.full(len(d),.001)
    r=rf+.002+f@np.array([1.2,.4,-.3])
    result=factor_reference(r,f,rf,[.5,.5],np.eye(2)*.02)
    assert result["multifactor"]["beta"]==pytest.approx([1.2,.4,-.3])
    assert result["multifactor"]["alpha"]==pytest.approx(.002)
    assert result["black_litterman_no_view"]==pytest.approx([.025,.025])
