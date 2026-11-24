from datetime import date

import duckdb
import pytest

from riskmatch.analytics import descriptive_report as research


def test_cross_source_comparison_aligns_exact_intervals(tmp_path,monkeypatch):
    path=tmp_path/"fixture.parquet"
    with duckdb.connect() as db:
        db.execute("""copy (select * from (values
            ('A',date '2025-01-01',date '2025-01-02',.01),
            ('A',date '2025-01-02',date '2025-01-03',.02),
            ('B',date '2024-12-31',date '2025-01-02',.03),
            ('B',date '2025-01-02',date '2025-01-03',.04))
            as t(instrument,start_date,end_date,price_return)) to ? (format parquet)""",[str(path)])
    monkeypatch.setattr(research,"selected_source",lambda *args:(path,{"frequency":"daily"}))
    monkeypatch.setattr(research,"descriptive_report",lambda *args:{"datasets":[]})
    result=research.compare_series(tmp_path,[{"source":"one","instrument":"A"},{"source":"two","instrument":"B"}],
        date(2025,1,1),date(2025,1,3),"USD","price_return",date(2025,1,3))
    assert result["matrix"]["count"]==1
    assert result["matrix"]["covariance"] is None
    assert result["assets"][0]["history"][0][1]==pytest.approx(.01)
