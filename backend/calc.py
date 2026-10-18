"""All calculations. Dashboard, insights, reports and exports all call these same functions."""
import math
import numpy as np
import pandas as pd
from datetime import datetime

def pct_change(new, old):
    return None if not old else round((new - old) / old * 100, 1)

def validate(raw, default_tariff=7.0):
    errs, out = [], {}
    try:
        out["date"] = datetime.strptime(str(raw.get("date", "")).strip()[:10], "%Y-%m-%d").date().isoformat()
    except ValueError:
        errs.append("Date must be in YYYY-MM-DD format.")
    for key, label, default in (("consumption_kwh", "Consumption", None), ("tariff", "Tariff", default_tariff)):
        v = raw.get(key)
        if v is None or v == "" or (isinstance(v, float) and math.isnan(v)):
            if default is None:
                errs.append(f"{label} is required."); continue
            v = default
        try:
            v = float(v)
            if not math.isfinite(v) or v < 0 or (key == "tariff" and v == 0):
                raise ValueError
        except (ValueError, TypeError):
            errs.append(f"{label} must be a valid {'positive' if key == 'tariff' else 'non-negative'} number."); continue
        out[key] = v
    cat, notes = raw.get("category"), raw.get("notes")
    out["category"] = "General" if cat in (None, "") or str(cat) == "nan" else str(cat).strip()[:40]
    out["notes"] = "" if notes is None or str(notes) == "nan" else str(notes).strip()[:200]
    return out, errs

def _df(records):
    df = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["date"])
    df["cost"] = df["consumption_kwh"] * df["tariff"]
    return df

def periods(df, ef):
    out = {}
    for name, rule, fmt in (("daily", "D", "%Y-%m-%d"), ("weekly", "W-SUN", "%Y-%m-%d"), ("monthly", "MS", "%b %Y")):
        g = df.set_index("date")[["consumption_kwh", "cost"]].resample(rule).sum()
        g = g[g.consumption_kwh > 0]
        out[name] = [{"period": i.strftime(fmt), "kwh": round(float(r.consumption_kwh), 2),
                      "cost": round(float(r.cost), 2), "co2": round(float(r.consumption_kwh) * ef, 2)} for i, r in g.iterrows()]
    return out

def _wd_we(df, cat=None):
    d = df if cat is None else df[df.category == cat]
    if d.empty: return None
    s = d.groupby("date").consumption_kwh.sum()
    wd, we = s[s.index.dayofweek < 5], s[s.index.dayofweek >= 5]
    if len(wd) < 4 or len(we) < 4: return None
    return float(wd.mean()), float(we.mean())

def analytics(records, s, baseline=None):
    if not records: return {"empty": True}
    ef = s["emission_factor"]
    df = _df(records)
    daily = df.groupby("date").consumption_kwh.sum().sort_index()
    total, cost, n = float(df.consumption_kwh.sum()), float(df.cost.sum()), len(daily)
    avg, std = total / n, float(daily.std(ddof=0))
    cv = std / avg if avg else 0
    end = daily.index.max()
    cur = float(daily[daily.index > end - pd.Timedelta(days=7)].sum())
    prev = daily[(daily.index <= end - pd.Timedelta(days=7)) & (daily.index > end - pd.Timedelta(days=14))]
    change = pct_change(cur, float(prev.sum())) if len(prev) >= 4 else None
    avg_tariff = cost / total if total else 0
    base_avg = float(baseline) if baseline else float(daily.iloc[:min(14, max(n // 2, 1))].mean())
    saved_kwh = base_avg * n - total

    high = []
    if n >= 7:
        high = [{"date": i.strftime("%Y-%m-%d"), "kwh": round(float(v), 2)}
                for i, v in daily[daily > avg + 1.5 * std].sort_values(ascending=False).head(5).items()]
    exp = daily.rolling(7).mean().shift(1)
    anoms = [{"date": i.strftime("%Y-%m-%d"), "kwh": round(float(daily[i]), 2), "expected": round(float(exp[i]), 2),
              "pct_above": pct_change(float(daily[i]), float(exp[i]))} for i in daily.index if pd.notna(exp[i]) and daily[i] > 1.3 * exp[i]]
    ww = _wd_we(df)
    wdwe = {"weekday_avg": round(ww[0], 2), "weekend_avg": round(ww[1], 2), "diff_pct": pct_change(ww[1], ww[0])} if ww else None
    cats = df.groupby("category").consumption_kwh.sum().sort_values(ascending=False)
    categories = [{"category": c, "kwh": round(float(v), 2), "share": round(float(v) / total * 100, 1) if total else 0} for c, v in cats.items()]
    share = {c["category"]: c["share"] for c in categories}

    recs = []
    def rec(title, why, kwh, rule):
        recs.append({"title": title, "why": why, "saving_kwh_month": round(kwh, 1),
                     "saving_cost_month": round(kwh * avg_tariff, 0), "rule": rule})
    if share.get("Cooling", 0) > 40:
        rec("Raise the cooling setpoint by 1-2 °C", f"Cooling is {share['Cooling']}% of your usage (rule threshold: 40%). Rule of thumb: ~8% cooling saving.",
            df[df.category == "Cooling"].consumption_kwh.sum() / n * 30 * 0.08, "cooling share > 40%")
    if share.get("Lighting", 0) > 20:
        rec("Switch to LED and occupancy sensors", f"Lighting is {share['Lighting']}% of usage (threshold: 20%). Assumes 15% saving.",
            df[df.category == "Lighting"].consumption_kwh.sum() / n * 30 * 0.15, "lighting share > 20%")
    o = _wd_we(df, "Office Equipment")
    if o and o[1] / o[0] > 0.7:
        rec("Switch off office equipment on weekends", f"Weekend office usage is {o[1]/o[0]*100:.0f}% of weekday usage (threshold: 70%), suggesting idle devices.",
            o[0] * (o[1] / o[0] - 0.5) * 8, "office weekend/weekday > 70%")
    if anoms:
        ex = sum(a["kwh"] - a["expected"] for a in anoms)
        rec("Investigate recent usage spikes", f"{len(anoms)} day(s) exceeded the prior 7-day average by over 30%. Preventing repeats saves roughly that excess per period.",
            ex * 30 / n, "day > 1.3 x trailing 7-day mean")
    if change is not None and change > 10:
        rec("Reverse the rising weekly trend", f"Last 7 days are {change}% above the 7 days before (threshold: 10%).",
            (cur - float(prev.sum())) * 4, "weekly change > 10%")
    if cv > 0.3:
        rec("Smooth out day-to-day variation", f"Daily usage varies a lot (coefficient of variation {cv:.2f}, threshold 0.30).", avg * 30 * 0.03, "CV > 0.30")
    if not recs:
        rec("Keep going - usage looks stable", "No rule threshold was triggered by your data.", 0, "no rules triggered")

    score = 100 - 30 * min(cv / 0.4, 1) - (40 * min(max(change, 0) / 30, 1) if change is not None else 0) - 5 * min(len(anoms), 6)
    return {
        "empty": False, "has_demo": any(r.get("demo") for r in records), "settings": s,
        "totals": {"kwh": round(total, 2), "cost": round(cost, 2), "co2": round(total * ef, 2), "avg_daily": round(avg, 2), "days": n},
        "change_pct": change, "last7_kwh": round(cur, 2),
        "saved": {"kwh": round(saved_kwh, 2), "cost": round(saved_kwh * avg_tariff, 2), "baseline_avg": round(base_avg, 2)},
        "score": int(max(0, min(100, round(score)))),
        "score_rule": "Heuristic consumption stability index (100 minus: load variability max 30, week-over-week rise max 40, anomalies 5 each max 30)",
        "categories": categories, "high_days": high, "anomalies": anoms[-5:], "weekday_weekend": wdwe,
        "recommendations": recs, "recommendation_basis": "Transparent rule-based logic on your records. No ML model is used here.",
        "periods": periods(df, ef), "solar_hint_kw": round(avg / (5.0 * 0.75), 1),
    }

def solar_estimate(daily_kwh, area_m2, sun_hours, capacity_kw, perf, tariff, ef, m2_per_kw=6.0, cost_per_kw=50000.0):
    from_area = area_m2 / m2_per_kw if area_m2 > 0 else 0
    cap = capacity_kw if capacity_kw > 0 else from_area
    gen = cap * sun_hours * perf
    useful = min(gen, daily_kwh)
    annual_savings = useful * 365 * tariff
    est_install_cost = cap * cost_per_kw if cap > 0 else 0
    payback_years = round(est_install_cost / annual_savings, 1) if annual_savings > 0 else None
    return {"capacity_kw": round(cap, 2), "capacity_source": "entered" if capacity_kw > 0 else "estimated from area",
            "daily_generation_kwh": round(gen, 2), "monthly_generation_kwh": round(gen * 30, 1),
            "offset_pct": round(useful / daily_kwh * 100, 1) if daily_kwh else 0,
            "monthly_savings": round(useful * 30 * tariff, 0), "annual_co2_avoided_kg": round(useful * 365 * ef, 0),
            "required_capacity_kw": round(daily_kwh / (sun_hours * perf), 2) if sun_hours * perf else 0,
            "area_needed_m2": round(daily_kwh / (sun_hours * perf) * m2_per_kw, 1) if sun_hours * perf else 0,
            "area_limit_exceeded": capacity_kw > 0 and area_m2 > 0 and capacity_kw > from_area,
            "estimated_install_cost": round(est_install_cost, 0), "payback_years": payback_years,
            "assumptions": f"generation = capacity x sun hours x performance factor; {m2_per_kw} m2 per kW; 30-day month; est. turnkey cost benchmark ₹{int(cost_per_kw):,}/kW"}

def scenario(current_kwh, reduction_pct, tariff, ef):
    new = current_kwh * (1 - reduction_pct / 100)
    return {"current": {"kwh": round(current_kwh, 2), "cost": round(current_kwh * tariff, 2), "co2": round(current_kwh * ef, 2)},
            "proposed": {"kwh": round(new, 2), "cost": round(new * tariff, 2), "co2": round(new * ef, 2)},
            "saved": {"kwh": round(current_kwh - new, 2), "cost": round((current_kwh - new) * tariff, 2), "co2": round((current_kwh - new) * ef, 2)}}
