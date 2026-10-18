import io, pytest, store, calc
from app import create_app

@pytest.fixture
def client(tmp_path, monkeypatch):
    test_db = tmp_path / "test_checks.json"
    monkeypatch.setattr(store, "PATH", str(test_db))
    return create_app().test_client()

def test_check_1_action_center_dates_and_target(client):
    """Check 1: Action Center 7-day average, previous 7-day baseline correct dates & dynamic target."""
    res = client.get("/api/analytics").get_json()["data"]
    ac = res["action_center"]
    assert ac is not None, "Action center must be present"
    p = ac["progress"]
    assert p["current_7d_avg"] > 0
    assert p["baseline_7d_avg"] > 0
    assert "current_window" in p and len(p["current_window"]) > 0
    assert "baseline_window" in p and len(p["baseline_window"]) > 0
    assert p["target_reduction_pct"] >= 5.0
    assert p["target_7d_avg"] == round(p["current_7d_avg"] * (1 - p["target_reduction_pct"] / 100), 2)
    assert p["status"] in ("Needs Attention", "On Track")

def test_check_2_forecast_horizons_chart_table_and_error(client):
    """Check 2: 7, 14, 30 days forecast horizons, MAE metrics, consistency, and clear error state."""
    for h in [7, 14, 30]:
        res = client.post("/api/forecast", json={"horizon": h}).get_json()["data"]
        assert res["status"] == "ok"
        assert len(res["forecast"]) == h
        assert res["summary"]["horizon_days"] == h
        # Verify chart line and table data match
        total_kwh_from_table = round(sum(row["forecast"] for row in res["forecast"]), 2)
        assert res["summary"]["total_kwh"] == total_kwh_from_table
        # Verify MAE metrics present on demo dataset (>21 days)
        assert res["metrics"] is not None
        assert res["metrics"]["model_mae_kwh"] >= 0
        assert res["metrics"]["baseline_mae_kwh"] >= 0
    
    # Check error state when 0 records
    client.post("/api/demo", json={"mode": "clear"})
    insufficient_0 = client.post("/api/forecast", json={"horizon": 7}).get_json()["data"]
    assert insufficient_0["status"] == "insufficient"
    assert "No data yet" in insufficient_0["message"]

    # Check error state when 3 records (< 7 days)
    for i in range(3):
        client.post("/api/consumption", json={"date": f"2026-10-0{i+1}", "consumption_kwh": 10.0, "category": "Lighting"})
    insufficient_3 = client.post("/api/forecast", json={"horizon": 7}).get_json()["data"]
    assert insufficient_3["status"] == "insufficient"
    assert "Need at least 7 days" in insufficient_3["message"]

def test_check_3_settings_update_calculations_consistency(client):
    """Check 3: Updating tariff and emission factor consistently updates totals and calculations."""
    init_res = client.get("/api/analytics").get_json()["data"]
    init_tariff = init_res["settings"]["tariff"]
    init_cost = init_res["totals"]["cost"]

    new_tariff = 10.0
    new_ef = 0.71
    put_res = client.put("/api/settings", json={
        "tariff": new_tariff,
        "emission_factor": new_ef,
        "emission_source": "CEA Southern Region test"
    })
    assert put_res.status_code == 200

    updated_res = client.get("/api/analytics").get_json()["data"]
    assert updated_res["settings"]["tariff"] == new_tariff
    assert updated_res["settings"]["emission_factor"] == new_ef
    # Cost must scale proportionally with tariff
    assert updated_res["totals"]["cost"] > init_cost
    assert round(updated_res["totals"]["cost"], 0) == round(updated_res["totals"]["kwh"] * new_tariff, 0)
    # CO2 must update with new emission factor
    assert round(updated_res["totals"]["co2"], 0) == round(updated_res["totals"]["kwh"] * new_ef, 0)

def test_check_4_data_crud_and_totals_update(client):
    """Check 4: Adding, editing, and deleting records dynamically updates totals."""
    initial = client.get("/api/analytics").get_json()["data"]["totals"]
    initial_kwh = initial["kwh"]

    # Add a new 100 kWh record
    add_r = client.post("/api/consumption", json={
        "date": "2026-11-01",
        "consumption_kwh": 100.0,
        "category": "Appliances",
        "tariff": 7.0
    })
    assert add_r.status_code == 201
    rec_id = add_r.get_json()["data"]["id"]

    after_add = client.get("/api/analytics").get_json()["data"]["totals"]
    assert round(after_add["kwh"], 1) == round(initial_kwh + 100.0, 1)

    # Edit to 50 kWh
    client.put(f"/api/consumption/{rec_id}", json={
        "date": "2026-11-01",
        "consumption_kwh": 50.0,
        "category": "Appliances",
        "tariff": 7.0
    })
    after_edit = client.get("/api/analytics").get_json()["data"]["totals"]
    assert round(after_edit["kwh"], 1) == round(initial_kwh + 50.0, 1)

    # Delete record
    client.delete(f"/api/consumption/{rec_id}")
    after_delete = client.get("/api/analytics").get_json()["data"]["totals"]
    assert round(after_delete["kwh"], 1) == round(initial_kwh, 1)

def test_check_5_production_persistence_and_connectivity(client, tmp_path, monkeypatch):
    """Check 5: Data persists across application reloads."""
    # Write a unique custom record
    client.post("/api/consumption", json={
        "date": "2026-12-25",
        "consumption_kwh": 42.0,
        "category": "Lighting",
        "tariff": 8.0,
        "notes": "Christmas event"
    })
    
    # Simulate application restart by loading store directly
    reloaded_db = store.load()
    found = [r for r in reloaded_db["records"] if r["date"] == "2026-12-25"]
    assert len(found) == 1
    assert found[0]["consumption_kwh"] == 42.0
    assert found[0]["notes"] == "Christmas event"
