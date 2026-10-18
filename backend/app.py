import io, os
import pandas as pd
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import store, calc
from forecast import forecast

def ok(data, status=200):
    return jsonify({"success": True, "data": data}), status

def fail(msg, status=400, details=None):
    return jsonify({"success": False, "error": msg, "details": details}), status

def num(body, key, label, lo=0, hi=1e7, default=None):
    v = body.get(key, default)
    try:
        v = float(v)
        if not lo <= v <= hi: raise ValueError
        return v, None
    except (TypeError, ValueError):
        return None, f"{label} must be a number between {lo} and {hi}."

def create_app():
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024
    origins = os.environ.get("FRONTEND_ORIGIN", "*")
    if origins == "*":
        CORS(app, resources={r"/api/*": {"origins": "*"}})
    else:
        allowed = list(set([o.strip() for o in origins.split(",") if o.strip()] + ["http://localhost:5173", "http://127.0.0.1:5173"]))
        CORS(app, origins=allowed)

    @app.errorhandler(404)
    def nf(e): return fail("Route not found.", 404)
    @app.errorhandler(413)
    def big(e): return fail("File too large (max 1 MB).", 413)
    @app.errorhandler(Exception)
    def boom(e): return fail("Internal server error.", 500, str(e))

    @app.get("/api/health")
    def health(): return ok({"status": "healthy"})

    @app.get("/api/consumption")
    def list_records():
        db = store.load()
        return ok({"records": sorted(db["records"], key=lambda r: r["date"], reverse=True), "settings": db["settings"]})

    @app.post("/api/consumption")
    def add():
        db = store.load()
        rec, errs = calc.validate(request.get_json(silent=True) or {}, db["settings"]["tariff"])
        if errs: return fail("Validation failed.", 422, errs)
        rec.update(id=store.new_id(), demo=False)
        db["records"].append(rec); store.save(db)
        return ok(rec, 201)

    @app.put("/api/consumption/<rid>")
    def update(rid):
        db = store.load()
        for i, r in enumerate(db["records"]):
            if r["id"] == rid:
                rec, errs = calc.validate(request.get_json(silent=True) or {}, db["settings"]["tariff"])
                if errs: return fail("Validation failed.", 422, errs)
                rec.update(id=rid, demo=False); db["records"][i] = rec; store.save(db)
                return ok(rec)
        return fail("Record not found.", 404)

    @app.delete("/api/consumption/<rid>")
    def delete(rid):
        db = store.load(); n = len(db["records"])
        db["records"] = [r for r in db["records"] if r["id"] != rid]
        if len(db["records"]) == n: return fail("Record not found.", 404)
        store.save(db)
        return ok({"deleted": rid})

    @app.post("/api/upload-csv")
    def upload():
        f = request.files.get("file")
        if not f or not f.filename.lower().endswith(".csv"): return fail("Upload a .csv file in the 'file' field.", 400)
        try:
            df = pd.read_csv(io.BytesIO(f.read()))
        except Exception:
            return fail("Could not read this file as CSV.", 400)
        df.columns = [c.strip().lower() for c in df.columns]
        if not {"date", "consumption_kwh"} <= set(df.columns):
            return fail("CSV needs columns: date, consumption_kwh (optional: category, tariff, notes).", 422)
        db, added, errors = store.load(), 0, []
        for i, row in df.iterrows():
            rec, errs = calc.validate(row.to_dict(), db["settings"]["tariff"])
            if errs: errors.append(f"Row {i + 2}: " + " ".join(errs)); continue
            rec.update(id=store.new_id(), demo=False); db["records"].append(rec); added += 1
        store.save(db)
        return ok({"added": added, "skipped": len(errors), "errors": errors[:10]}, 201 if added else 422)

    @app.get("/api/analytics")
    def analytics():
        db = store.load()
        b = request.args.get("baseline", type=float)
        return ok(calc.analytics(db["records"], db["settings"], b))

    @app.post("/api/forecast")
    def fc():
        db = store.load()
        h, e = num(request.get_json(silent=True) or {}, "horizon", "Horizon", 1, 30, 7)
        if e: return fail(e, 422)
        if not db["records"]: return ok({"status": "insufficient", "message": "No data yet. Add records first."})
        df = calc._df(db["records"])
        s = db["settings"]
        out = forecast(df.groupby("date").consumption_kwh.sum().sort_index(), int(h), float(s.get("tariff", 7.0)), float(s.get("emission_factor", 0.82)))
        out["uses_demo_data"] = any(r.get("demo") for r in db["records"])
        return ok(out)

    @app.post("/api/solar-estimate")
    def solar():
        b, db = request.get_json(silent=True) or {}, store.load()
        vals, errs = {}, []
        for k, lbl, lo, hi, d in (("daily_kwh", "Daily consumption", 0, 100000, None), ("area_m2", "Rooftop area", 0, 1e6, 0),
                                  ("sun_hours", "Peak sun hours", 0.5, 12, 5), ("capacity_kw", "Capacity", 0, 1e5, 0),
                                  ("performance_factor", "Performance factor", 0.3, 1, 0.75)):
            vals[k], e = num(b, k, lbl, lo, hi, d)
            if e: errs.append(e)
        if not errs and vals["capacity_kw"] == 0 and vals["area_m2"] == 0: errs.append("Enter rooftop area or system capacity.")
        if errs: return fail("Validation failed.", 422, errs)
        s = db["settings"]
        return ok(calc.solar_estimate(vals["daily_kwh"], vals["area_m2"], vals["sun_hours"], vals["capacity_kw"],
                                      vals["performance_factor"], s["tariff"], s["emission_factor"]))

    @app.post("/api/scenario")
    def scen():
        b, s = request.get_json(silent=True) or {}, store.load()["settings"]
        k, e1 = num(b, "current_kwh", "Current consumption")
        r, e2 = num(b, "reduction_pct", "Reduction", 0, 100)
        if e1 or e2: return fail("Validation failed.", 422, [e for e in (e1, e2) if e])
        return ok(calc.scenario(k, r, s["tariff"], s["emission_factor"]))

    @app.get("/api/digital-twin")
    def get_digital_twin():
        db = store.load()
        s = db["settings"]
        apps = db.get("appliances", calc.DEFAULT_APPLIANCES)
        measured = None
        if db["records"]:
            df = calc._df(db["records"])
            daily = df.groupby("date").consumption_kwh.sum()
            measured = float(daily.mean() * 30.0) if len(daily) else None
        res = calc.digital_twin_estimate(apps, float(s.get("tariff", 7.0)), float(s.get("emission_factor", 0.82)), measured)
        return ok(res)

    @app.post("/api/digital-twin/simulate")
    def simulate_digital_twin():
        b = request.get_json(silent=True) or {}
        apps = b.get("appliances")
        if not isinstance(apps, list): return fail("appliances list is required", 422)
        db = store.load()
        s = db["settings"]
        measured = None
        if db["records"]:
            df = calc._df(db["records"])
            daily = df.groupby("date").consumption_kwh.sum()
            measured = float(daily.mean() * 30.0) if len(daily) else None
        res = calc.digital_twin_estimate(apps, float(s.get("tariff", 7.0)), float(s.get("emission_factor", 0.82)), measured)
        return ok(res)

    @app.put("/api/digital-twin")
    def save_digital_twin():
        b = request.get_json(silent=True) or {}
        apps = b.get("appliances")
        if not isinstance(apps, list): return fail("appliances list is required", 422)
        db = store.load()
        db["appliances"] = apps
        store.save(db)
        s = db["settings"]
        measured = None
        if db["records"]:
            df = calc._df(db["records"])
            daily = df.groupby("date").consumption_kwh.sum()
            measured = float(daily.mean() * 30.0) if len(daily) else None
        res = calc.digital_twin_estimate(apps, float(s.get("tariff", 7.0)), float(s.get("emission_factor", 0.82)), measured)
        return ok(res)

    @app.route("/api/settings", methods=["GET", "PUT"])
    def settings():
        db = store.load()
        if request.method == "PUT":
            b = request.get_json(silent=True) or {}
            t, e1 = num(b, "tariff", "Tariff", 0.01, 1000)
            f, e2 = num(b, "emission_factor", "Emission factor", 0, 5)
            if e1 or e2: return fail("Validation failed.", 422, [e for e in (e1, e2) if e])
            old_t = float(db["settings"].get("tariff", 7.0))
            db["settings"] = {"tariff": t, "emission_factor": f, "emission_source": str(b.get("emission_source", ""))[:200]}
            if b.get("update_records", True):
                for r in db["records"]:
                    if r.get("demo") or abs(float(r.get("tariff", 0)) - old_t) < 1e-4:
                        r["tariff"] = t
            store.save(db)
        return ok(db["settings"])

    @app.post("/api/demo")
    def demo():
        db, mode = store.load(), (request.get_json(silent=True) or {}).get("mode", "reset")
        mine = [r for r in db["records"] if not r.get("demo")]
        db["records"] = mine + (store.demo_records(db["settings"]["tariff"]) if mode == "reset" else [])
        store.save(db)
        return ok({"records": len(db["records"])})

    @app.get("/api/export")
    def export():
        db, kind = store.load(), request.args.get("kind", "records")
        if kind == "records":
            df = pd.DataFrame(db["records"], columns=["date", "category", "consumption_kwh", "tariff", "notes", "demo"]).sort_values("date")
        else:
            a = calc.analytics(db["records"], db["settings"])
            if a.get("empty"): return fail("No data to report.", 400)
            df = pd.DataFrame(a["periods"].get(request.args.get("period", "monthly"), []))
        return Response(df.to_csv(index=False), mimetype="text/csv", headers={"Content-Disposition": f"attachment; filename=wattwise_{kind}.csv"})
    return app
 
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "0") == "1")
