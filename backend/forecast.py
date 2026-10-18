"""Forecasting: baseline (7-day mean) vs Ridge regression, compared on a chronological hold-out."""
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge

MIN_BASELINE, MIN_MODEL, MIN_TEST = 7, 21, 5

def _features(idx, t0):
    return np.hstack([(np.arange(len(idx)) + t0).reshape(-1, 1), np.eye(7)[idx.dayofweek]])

def forecast(daily, horizon=7, tariff=7.0, emission_factor=0.82):
    s = daily.asfreq("D")
    missing = int(s.isna().sum())
    s = s.interpolate(limit_direction="both")
    n = len(s)
    if n < MIN_BASELINE:
        return {"status": "insufficient", "message": f"Need at least {MIN_BASELINE} days of data to forecast; you have {n}. Add more records."}
    fidx = pd.date_range(s.index[-1] + pd.Timedelta(days=1), periods=horizon)
    base = float(s.iloc[-7:].mean())
    
    def _build_forecast_rows(values):
        rows = []
        for i, v in zip(fidx, values):
            kwh = round(float(v), 2)
            rows.append({
                "date": i.strftime("%Y-%m-%d"),
                "day": i.strftime("%a"),
                "forecast": kwh,
                "cost": round(kwh * tariff, 2),
                "co2": round(kwh * emission_factor, 2)
            })
        return rows

    result = {
        "status": "ok",
        "method": "Baseline: mean of last 7 days (not machine learning)",
        "metrics": None,
        "history_days": n,
        "interpolated_days": missing,
        "history": [{"date": i.strftime("%Y-%m-%d"), "actual": round(float(v), 2)} for i, v in s.iloc[-30:].items()],
        "forecast": _build_forecast_rows([base] * horizon),
        "test_evaluation": None,
        "note": "Forecasts are estimates, not guarantees."
    }

    test_n = max(MIN_TEST, int(n * 0.2))
    if n < MIN_MODEL or n - test_n < 14:
        result["message"] = f"Only {n} days available; ML needs {MIN_MODEL}+. Showing the labeled baseline."
        tot = sum(r["forecast"] for r in result["forecast"])
        result["summary"] = {
            "total_kwh": round(tot, 2),
            "total_cost": round(tot * tariff, 2),
            "total_co2": round(tot * emission_factor, 2),
            "avg_daily_kwh": round(tot / horizon, 2),
            "horizon_days": horizon
        }
        return result

    tr, te = s.iloc[:-test_n], s.iloc[-test_n:]  # chronological split, no shuffling
    model = Ridge(alpha=1.0).fit(_features(tr.index, 0), tr.values)
    te_preds = model.predict(_features(te.index, len(tr)))
    mae_m = float(np.mean(np.abs(te_preds - te.values)))
    mae_b = float(np.mean(np.abs(tr.iloc[-7:].mean() - te.values)))
    result["metrics"] = {"test_days": test_n, "model_mae_kwh": round(mae_m, 2), "baseline_mae_kwh": round(mae_b, 2)}
    result["test_evaluation"] = [
        {"date": i.strftime("%Y-%m-%d"), "actual": round(float(a), 2), "predicted": round(float(p), 2)}
        for i, a, p in zip(te.index, te.values, te_preds)
    ]

    if mae_m < mae_b:
        final = Ridge(alpha=1.0).fit(_features(s.index, 0), s.values)
        pred = np.clip(final.predict(_features(fidx, n)), 0, None)
        result["method"] = "Ridge regression (trend + day-of-week), refit on all history"
        result["forecast"] = _build_forecast_rows(pred)
    else:
        result["message"] = "Regression did not beat the baseline on held-out data, so the baseline is shown."

    tot = sum(r["forecast"] for r in result["forecast"])
    result["summary"] = {
        "total_kwh": round(tot, 2),
        "total_cost": round(tot * tariff, 2),
        "total_co2": round(tot * emission_factor, 2),
        "avg_daily_kwh": round(tot / horizon, 2),
        "horizon_days": horizon
    }
    return result

