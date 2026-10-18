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
    def rec(title, problem, evidence, action, kwh, assumptions, confidence, rule):
        saving_kwh = max(0.0, float(kwh))
        recs.append({
            "title": title,
            "problem": problem,
            "evidence": evidence,
            "action": action,
            "saving_kwh_month": round(saving_kwh, 1),
            "saving_cost_month": round(saving_kwh * avg_tariff, 0),
            "saving_co2_month": round(saving_kwh * ef, 1),
            "assumptions": assumptions,
            "confidence": confidence,
            "rule": rule,
            "why": f"{evidence} {assumptions}"
        })

    if share.get("Cooling", 0) > 40:
        c_sum = float(df[df.category == "Cooling"].consumption_kwh.sum())
        c_norm = (c_sum / n) * 30
        c_save = c_norm * 0.08
        rec("Raise the cooling setpoint by 1-2 °C",
            "Cooling energy consumption is unusually high.",
            f"Cooling makes up {share['Cooling']}% of total consumption ({round(c_sum, 1)} kWh across {n} recorded days, averaging {round(c_sum/n, 1)} kWh/day ≈ {round(c_norm, 1)} kWh/month normalized).",
            "Set thermostat to 24 °C or higher, clean AC filters monthly, and seal window leaks.",
            c_save,
            f"BEE / ASHRAE benchmark: each 1 °C increase saves 6-8% cooling energy. Calculated as 8% of monthly normalized cooling ({round(c_norm, 1)} kWh × 8% = {round(c_save, 1)} kWh/mo).",
            "High (Supported by Bureau of Energy Efficiency standards)",
            "cooling share > 40%")

    if share.get("Lighting", 0) > 20:
        l_sum = float(df[df.category == "Lighting"].consumption_kwh.sum())
        l_norm = (l_sum / n) * 30
        l_save = l_norm * 0.15
        rec("Switch to LED and occupancy sensors",
            "Lighting load share exceeds efficiency thresholds.",
            f"Lighting accounts for {share['Lighting']}% of total consumption ({round(l_sum, 1)} kWh across {n} days ≈ {round(l_norm, 1)} kWh/month normalized).",
            "Replace remaining conventional tubes with LEDs and install motion sensors in corridors and restrooms.",
            l_save,
            f"Assumes 15% lighting reduction from LED retrofit and auto-shutoff ({round(l_norm, 1)} kWh × 15% = {round(l_save, 1)} kWh/mo).",
            "High",
            "lighting share > 20%")

    o = _wd_we(df, "Office Equipment")
    if o and o[1] / o[0] > 0.7:
        o_save = o[0] * (o[1] / o[0] - 0.5) * 8
        rec("Switch off office equipment on weekends",
            "Significant standby / idle load detected over weekends.",
            f"Weekend office equipment consumption is {o[1]/o[0]*100:.0f}% of weekday consumption (threshold: 70%), indicating idle computers/monitors running while facility is closed.",
            "Use smart master power strips or configure automated PC shutdown policies at 7 PM and over weekends.",
            o_save,
            f"Assumes standby load on 8 weekend days per month is reduced to 50% of active weekday levels.",
            "Medium",
            "office weekend/weekday > 70%")

    if anoms:
        ex = sum(a["kwh"] - a["expected"] for a in anoms)
        ex_month = ex * 30 / n
        rec("Investigate recent usage spikes",
            "Unusual operational consumption spikes detected.",
            f"{len(anoms)} spike day(s) exceeded the trailing 7-day average by >30% (cumulative excess: {round(ex, 1)} kWh across {n} days).",
            "Review operational logs on spike dates to identify unmonitored equipment or overlapping high-draw machinery.",
            ex_month,
            f"Historical spike excess ({round(ex, 1)} kWh over {n} days) normalized to a 30-day monthly rate ({round(ex_month, 1)} kWh/mo). Realized only if recurring spikes are eliminated.",
            "Medium",
            "day > 1.3 x trailing 7-day mean")

    if change is not None and change > 10:
        c_save = (cur - float(prev.sum())) * 4
        rec("Reverse the rising weekly trend",
            "Weekly consumption trajectory is trending upward.",
            f"The most recent 7 days ({round(cur, 1)} kWh) are {change}% higher than the prior 7 days ({round(float(prev.sum()), 1)} kWh).",
            "Audit equipment operating hours and HVAC setpoints added or modified over the past week.",
            c_save,
            f"Assumes recent weekly surge ({round(cur - float(prev.sum()), 1)} kWh/wk) is brought back to previous baseline across 4 weeks.",
            "Medium",
            "weekly change > 10%")

    if cv > 0.3:
        cv_save = avg * 30 * 0.03
        rec("Smooth out day-to-day load variation",
            "High consumption volatility across days.",
            f"Daily consumption varies significantly with a coefficient of variation of {cv:.2f} (threshold: 0.30).",
            "Stagger startup times for major appliances to level demand peaks.",
            cv_save,
            f"Assumes 3% energy reduction through operational scheduling and peak shaving ({round(avg * 30, 1)} kWh/mo × 3%).",
            "Low-to-Medium",
            "CV > 0.30")

    if not recs:
        rec("Keep going - usage looks stable",
            "Stable consumption profile.",
            "No efficiency rule thresholds were triggered by your dataset.",
            "Maintain current operational schedules and continue monitoring regular bills.",
            0.0,
            "Based on adherence to existing baseline.",
            "High",
            "no rules triggered")

    score = 100 - 30 * min(cv / 0.4, 1) - (40 * min(max(change, 0) / 30, 1) if change is not None else 0) - 5 * min(len(anoms), 6)

    # Action Center: Identify top problem to fix & progress tracking
    top_rec = max(recs, key=lambda x: x["saving_kwh_month"])
    cur_series = daily[daily.index > end - pd.Timedelta(days=7)]
    cur_7_avg = round(float(cur_series.mean()), 2) if len(cur_series) else round(avg, 2)
    prev_7_avg = round(float(prev.mean()), 2) if len(prev) >= 4 else round(base_avg, 2)
    
    cur_win = f"{cur_series.index.min().strftime('%d %b')} – {cur_series.index.max().strftime('%d %b %Y')}" if len(cur_series) else ""
    prev_win = f"{prev.index.min().strftime('%d %b')} – {prev.index.max().strftime('%d %b %Y')}" if len(prev) else "Historical baseline"
    
    # Target reduction dynamically tailored to the identified problem
    target_pct = min(25.0, max(5.0, round(top_rec["saving_kwh_month"] / (avg * 30) * 100, 1))) if avg else 8.0
    target_7d_avg = round(cur_7_avg * (1 - target_pct / 100), 2)

    action_center = {
        "problem": top_rec["problem"],
        "title": top_rec["title"],
        "evidence": top_rec["evidence"],
        "action": top_rec["action"],
        "impact": {
            "saving_kwh_month": top_rec["saving_kwh_month"],
            "saving_cost_month": top_rec["saving_cost_month"],
            "saving_co2_month": top_rec["saving_co2_month"],
        },
        "assumptions": top_rec["assumptions"],
        "confidence": top_rec["confidence"],
        "progress": {
            "current_7d_avg": cur_7_avg,
            "baseline_7d_avg": prev_7_avg,
            "current_window": cur_win,
            "baseline_window": prev_win,
            "target_reduction_pct": target_pct,
            "target_7d_avg": target_7d_avg,
            "change_pct": change,
            "status": "Needs Attention" if (change and change > 5) or score < 70 else "On Track"
        }
    }

    return {
        "empty": False, "has_demo": any(r.get("demo") for r in records), "settings": s,
        "totals": {"kwh": round(total, 2), "cost": round(cost, 2), "co2": round(total * ef, 2), "avg_daily": round(avg, 2), "days": n},
        "change_pct": change, "last7_kwh": round(cur, 2),
        "saved": {"kwh": round(saved_kwh, 2), "cost": round(saved_kwh * avg_tariff, 2), "baseline_avg": round(base_avg, 2)},
        "score": int(max(0, min(100, round(score)))),
        "score_rule": "Heuristic consumption stability index (100 minus: load variability max 30, week-over-week rise max 40, anomalies 5 each max 30)",
        "categories": categories, "high_days": high, "anomalies": anoms[-5:], "weekday_weekend": wdwe,
        "recommendations": recs, "recommendation_basis": "Transparent rule-based logic on your records. No ML model is used here.",
        "action_center": action_center,
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

DEFAULT_APPLIANCES = [
    {
        "id": "app_ac_1",
        "name": "1.5 Ton Split AC (Office / Hall)",
        "category": "Cooling",
        "wattage": 1500,
        "quantity": 2,
        "hours_per_day": 8.0,
        "days_per_month": 26,
        "efficiency_upgrade": "Upgrade to 5-Star Inverter AC (1050W)",
        "upgrade_wattage": 1050,
        "sim_wattage": 1500,
        "sim_quantity": 2,
        "sim_hours": 8.0,
        "sim_days": 26
    },
    {
        "id": "app_fan_1",
        "name": "Ceiling Fans (Standard Induction)",
        "category": "Cooling",
        "wattage": 75,
        "quantity": 6,
        "hours_per_day": 10.0,
        "days_per_month": 26,
        "efficiency_upgrade": "Upgrade to 5-Star BLDC Motor (28W)",
        "upgrade_wattage": 28,
        "sim_wattage": 75,
        "sim_quantity": 6,
        "sim_hours": 10.0,
        "sim_days": 26
    },
    {
        "id": "app_light_1",
        "name": "Tubelights / Conventional Fixtures",
        "category": "Lighting",
        "wattage": 40,
        "quantity": 12,
        "hours_per_day": 9.0,
        "days_per_month": 26,
        "efficiency_upgrade": "Retrofit to 20W LED Battens",
        "upgrade_wattage": 20,
        "sim_wattage": 40,
        "sim_quantity": 12,
        "sim_hours": 9.0,
        "sim_days": 26
    },
    {
        "id": "app_pc_1",
        "name": "Desktop Workstations & Monitors",
        "category": "Office Equipment",
        "wattage": 180,
        "quantity": 4,
        "hours_per_day": 8.0,
        "days_per_month": 24,
        "efficiency_upgrade": "Switch to 60W Mini-PCs or Laptops",
        "upgrade_wattage": 60,
        "sim_wattage": 180,
        "sim_quantity": 4,
        "sim_hours": 8.0,
        "sim_days": 24
    },
    {
        "id": "app_fridge_1",
        "name": "Refrigerator (Frost-Free 300L)",
        "category": "Appliances",
        "wattage": 180,
        "quantity": 1,
        "hours_per_day": 12.0,
        "days_per_month": 30,
        "efficiency_upgrade": "5-Star Inverter Refrigerator (110W duty)",
        "upgrade_wattage": 110,
        "sim_wattage": 180,
        "sim_quantity": 1,
        "sim_hours": 12.0,
        "sim_days": 30
    },
    {
        "id": "app_printer_1",
        "name": "Network Printer / Photocopier",
        "category": "Office Equipment",
        "wattage": 80,
        "quantity": 1,
        "hours_per_day": 6.0,
        "days_per_month": 24,
        "efficiency_upgrade": "Eco-Sleep Auto-Standby Mode (25W)",
        "upgrade_wattage": 25,
        "sim_wattage": 80,
        "sim_quantity": 1,
        "sim_hours": 6.0,
        "sim_days": 24
    }
]

def digital_twin_estimate(appliances, tariff, ef, measured_monthly_kwh=None):
    items = []
    base_total_kwh = 0.0
    sim_total_kwh = 0.0
    base_cats = {}
    sim_cats = {}

    for a in appliances:
        w = max(0.0, float(a.get("wattage", 0)))
        q = max(0, int(a.get("quantity", 1)))
        h = min(24.0, max(0.0, float(a.get("hours_per_day", 0))))
        d = min(31, max(0, int(a.get("days_per_month", 30))))
        cat = str(a.get("category", "General"))

        sw = max(0.0, float(a.get("sim_wattage", w)))
        sq = max(0, int(a.get("sim_quantity", q)))
        sh = min(24.0, max(0.0, float(a.get("sim_hours", h))))
        sd = min(31, max(0, int(a.get("sim_days", d))))

        base_kwh_month = (w * q * h * d) / 1000.0
        sim_kwh_month = (sw * sq * sh * sd) / 1000.0
        saved_kwh = max(0.0, base_kwh_month - sim_kwh_month)

        base_total_kwh += base_kwh_month
        sim_total_kwh += sim_kwh_month

        base_cats[cat] = base_cats.get(cat, 0.0) + base_kwh_month
        sim_cats[cat] = sim_cats.get(cat, 0.0) + sim_kwh_month

        items.append({
            "id": a.get("id"),
            "name": a.get("name", "Unnamed Appliance"),
            "category": cat,
            "wattage": w,
            "quantity": q,
            "hours_per_day": h,
            "days_per_month": d,
            "baseline_kwh": round(base_kwh_month, 2),
            "baseline_cost": round(base_kwh_month * tariff, 0),
            "baseline_co2": round(base_kwh_month * ef, 1),
            "sim_wattage": sw,
            "sim_quantity": sq,
            "sim_hours": sh,
            "sim_days": sd,
            "simulated_kwh": round(sim_kwh_month, 2),
            "simulated_cost": round(sim_kwh_month * tariff, 0),
            "simulated_co2": round(sim_kwh_month * ef, 1),
            "saved_kwh": round(saved_kwh, 2),
            "saved_cost": round(saved_kwh * tariff, 0),
            "saving_pct": round((saved_kwh / base_kwh_month * 100) if base_kwh_month else 0.0, 1),
            "efficiency_upgrade": a.get("efficiency_upgrade"),
            "upgrade_wattage": a.get("upgrade_wattage")
        })

    saved_total_kwh = max(0.0, base_total_kwh - sim_total_kwh)
    reduction_pct = round((saved_total_kwh / base_total_kwh * 100) if base_total_kwh else 0.0, 1)

    category_breakdown = []
    all_cats = sorted(set(list(base_cats.keys()) + list(sim_cats.keys())))
    for c in all_cats:
        bk = round(base_cats.get(c, 0.0), 1)
        sk = round(sim_cats.get(c, 0.0), 1)
        category_breakdown.append({
            "category": c,
            "baseline_kwh": bk,
            "simulated_kwh": sk,
            "saved_kwh": round(max(0.0, bk - sk), 1),
            "baseline_share": round((bk / base_total_kwh * 100) if base_total_kwh else 0.0, 1)
        })

    result = {
        "baseline": {
            "monthly_kwh": round(base_total_kwh, 1),
            "daily_kwh": round(base_total_kwh / 30.0, 2),
            "monthly_cost": round(base_total_kwh * tariff, 0),
            "annual_cost": round(base_total_kwh * tariff * 12, 0),
            "monthly_co2": round(base_total_kwh * ef, 1),
            "annual_co2": round(base_total_kwh * ef * 12, 1)
        },
        "simulated": {
            "monthly_kwh": round(sim_total_kwh, 1),
            "daily_kwh": round(sim_total_kwh / 30.0, 2),
            "monthly_cost": round(sim_total_kwh * tariff, 0),
            "annual_cost": round(sim_total_kwh * tariff * 12, 0),
            "monthly_co2": round(sim_total_kwh * ef, 1),
            "annual_co2": round(sim_total_kwh * ef * 12, 1)
        },
        "impact": {
            "saved_monthly_kwh": round(saved_total_kwh, 1),
            "saved_annual_kwh": round(saved_total_kwh * 12, 1),
            "saved_monthly_cost": round(saved_total_kwh * tariff, 0),
            "saved_annual_cost": round(saved_total_kwh * tariff * 12, 0),
            "saved_monthly_co2": round(saved_total_kwh * ef, 1),
            "saved_annual_co2": round(saved_total_kwh * ef * 12, 1),
            "reduction_pct": reduction_pct
        },
        "appliances": items,
        "categories": category_breakdown
    }

    if measured_monthly_kwh is not None and measured_monthly_kwh > 0:
        gap = round(float(measured_monthly_kwh) - base_total_kwh, 1)
        result["meter_comparison"] = {
            "measured_monthly_kwh": round(float(measured_monthly_kwh), 1),
            "twin_baseline_kwh": round(base_total_kwh, 1),
            "gap_kwh": gap,
            "gap_cost": round(gap * tariff, 0),
            "explanation": "Actual metered bill exceeds appliance inventory (suggests standby phantom loads or auxiliary machinery)." if gap > 0 else "Appliance inventory fully accounts for metered electricity consumption."
        }

    return result

