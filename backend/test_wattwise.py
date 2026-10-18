import io, pytest, store, calc
from app import create_app

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "PATH", str(tmp_path / "d.json"))
    return create_app().test_client()

def test_pct_change():
    assert calc.pct_change(110, 100) == 10.0 and calc.pct_change(5, 0) is None

def test_validation_rejects_negative_and_bad_date():
    _, e = calc.validate({"date": "x", "consumption_kwh": -1}); assert len(e) == 2

def test_solar_math():
    r = calc.solar_estimate(20, 0, 5, 4, 0.75, 7, 0.82); assert r["daily_generation_kwh"] == 15.0 and r["offset_pct"] == 75.0

def test_scenario():
    assert calc.scenario(100, 20, 7, 0.8)["saved"] == {"kwh": 20.0, "cost": 140.0, "co2": 16.0}

def test_health_and_demo_analytics(client):
    assert client.get("/api/health").status_code == 200
    d = client.get("/api/analytics").get_json()["data"]
    assert d["has_demo"] and d["totals"]["days"] == 45 and 0 <= d["score"] <= 100 and d["anomalies"]

def test_crud(client):
    r = client.post("/api/consumption", json={"date": "2030-01-01", "consumption_kwh": 5, "category": "Lighting"})
    assert r.status_code == 201; rid = r.get_json()["data"]["id"]
    assert client.put(f"/api/consumption/{rid}", json={"date": "2030-01-01", "consumption_kwh": 6}).status_code == 200
    assert client.post("/api/consumption", json={"date": "bad"}).status_code == 422
    assert client.delete(f"/api/consumption/{rid}").status_code == 200
    assert client.delete(f"/api/consumption/{rid}").status_code == 404

def test_csv_upload(client):
    csv = b"date,consumption_kwh,category\n2031-01-01,4.5,Cooling\n2031-01-02,abc,Cooling\n"
    r = client.post("/api/upload-csv", data={"file": (io.BytesIO(csv), "a.csv")}, content_type="multipart/form-data")
    d = r.get_json()["data"]; assert d["added"] == 1 and d["skipped"] == 1

def test_forecast_demo_and_insufficient(client):
    d = client.post("/api/forecast", json={"horizon": 7}).get_json()["data"]
    assert d["status"] == "ok" and len(d["forecast"]) == 7 and d["metrics"] and d["uses_demo_data"]
    client.post("/api/demo", json={"mode": "clear"})
    assert client.post("/api/forecast", json={}).get_json()["data"]["status"] == "insufficient"

def test_negative_baseline_savings_and_score_bounds():
    records = [
        {"id": "1", "date": "2026-09-01", "consumption_kwh": 10.0, "tariff": 7.0, "category": "Lighting"},
        {"id": "2", "date": "2026-09-02", "consumption_kwh": 50.0, "tariff": 7.0, "category": "Cooling"}
    ]
    res = calc.analytics(records, {"emission_factor": 0.82, "tariff": 7.0}, baseline=15.0)
    # Expected baseline = 15.0 * 2 = 30.0, Total = 60.0 => saved_kwh = -30.0 (consumption above baseline)
    assert res["saved"]["kwh"] == -30.0
    assert 0 <= res["score"] <= 100

def test_solar_payback_and_limits():
    # 4 kW system, 20 kWh daily consumption, 5 sun hours, 0.75 PR, 7 ₹/kWh tariff
    r = calc.solar_estimate(20, 18, 5, 4, 0.75, 7, 0.82, m2_per_kw=6.0, cost_per_kw=50000.0)
    assert r["estimated_install_cost"] == 200000.0  # 4 * 50000
    assert r["payback_years"] is not None and r["payback_years"] > 0
    # 18 m2 / 6 = 3 kW max roof capacity. Entered 4 kW > 3 kW => area_limit_exceeded must be True
    assert r["area_limit_exceeded"] is True
