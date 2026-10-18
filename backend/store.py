"""JSON-file persistence. Swap load()/save() for a database later; nothing else touches the file."""
import json, os, uuid
from datetime import date, timedelta
import numpy as np

PATH = os.environ.get("WATTWISE_DATA", os.path.join(os.path.dirname(__file__), "data.json"))
DEFAULT_SETTINGS = {"tariff": 7.0, "emission_factor": 0.82,
                    "emission_source": "Central Electricity Authority (CEA), Govt. of India — CO2 Baseline Database for the Indian Power Sector, User Guide Version 19.0 (2023-24): National Grid Weighted Average 0.82 kg CO₂e/kWh"}
CATEGORIES = ["Lighting", "Cooling", "Appliances", "Office Equipment"]

def demo_records(tariff, days=45):
    rng = np.random.RandomState(42)
    base = {"Lighting": 3.0, "Cooling": 9.0, "Appliances": 6.0, "Office Equipment": 4.0}
    start, out = date.today() - timedelta(days=days - 1), []
    for i in range(days):
        d = start + timedelta(days=i)
        wk = d.weekday() >= 5
        for c, b in base.items():
            f = (0.5 if c == "Office Equipment" else 1.2 if c == "Cooling" else 1.1) if wk else 1.0
            v = b * f * (1 + 0.003 * i) * (1 + rng.normal(0, 0.08))
            if i == days - 9 and c == "Cooling":
                v *= 2.0  # deliberate spike so anomaly detection has something to find
            out.append({"id": uuid.uuid4().hex[:8], "date": d.isoformat(), "consumption_kwh": round(float(v), 2),
                        "tariff": tariff, "category": c, "notes": "", "demo": True})
    return out

def load():
    if not os.path.exists(PATH):
        db = {"records": demo_records(DEFAULT_SETTINGS["tariff"]), "settings": dict(DEFAULT_SETTINGS)}
        save(db)
        return db
    with open(PATH) as f:
        return json.load(f)

def save(db):
    with open(PATH, "w") as f:
        json.dump(db, f)

def new_id():
    return uuid.uuid4().hex[:8]
