import { useState, useRef } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line, Legend } from "recharts";
import { Zap, IndianRupee, Leaf, PiggyBank, Trash2, Pencil, Download, Upload } from "lucide-react";
import { api, BASE } from "./api";
import { Card, Stat, Notice, Field, Btn, Tabs, Errors, inr, num } from "./ui.jsx";

const GREEN = "#166534", TEAL = "#0f766e";
const Empty = ({ go }) => (<Card className="text-center"><p className="font-medium">No consumption data yet</p>
  <p className="mb-3 text-sm text-slate-500">Add a record or upload a CSV to see analytics.</p><Btn onClick={() => go("data")}>Add data</Btn></Card>);
const DemoBanner = ({ a }) => a.has_demo ? <Notice tone="warn">Showing demo data (clearly labeled). Replace it with your own records on the Data page.</Notice> : null;
const Chart = ({ rows, kind }) => (<div className="h-64"><ResponsiveContainer><BarChart data={rows}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
  <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey={kind} fill={GREEN} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>);
const Rec = ({ r }) => (<div className="rounded-lg border border-slate-200 p-3"><div className="font-medium">{r.title}</div>
  <p className="mt-1 text-sm text-slate-600"><b>Why:</b> {r.why}</p>
  <p className="mt-1 text-xs text-slate-500">Rule: {r.rule} · Est. saving {num(r.saving_kwh_month)} kWh ≈ {inr(r.saving_cost_month)} per month</p></div>);

export function Dashboard({ a, go }) {
  const [per, setPer] = useState("daily");
  if (a.empty) return <Empty go={go} />;
  const rows = a.periods[per].slice(per === "daily" ? -30 : -12), t = a.totals;
  const isSavedPositive = a.saved.kwh >= 0;
  return (<div className="space-y-4"><DemoBanner a={a} />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={Zap} label="Consumption" value={`${num(t.kwh)} kWh`} sub={`${t.days} days · avg ${num(t.avg_daily)} kWh/day`} />
      <Stat icon={IndianRupee} label="Estimated bill" value={inr(t.cost)} sub="kWh × tariff per record" />
      <Stat icon={Leaf} label="Estimated emissions" value={`${num(t.co2)} kg CO₂e`} sub={`Factor ${a.settings.emission_factor} kg/kWh (estimate)`} />
      <Stat icon={PiggyBank} 
        label={isSavedPositive ? "Saved vs baseline" : "Net vs baseline"} 
        value={isSavedPositive ? `${num(a.saved.kwh)} kWh` : `+${num(Math.abs(a.saved.kwh))} kWh excess`} 
        sub={isSavedPositive ? `${inr(a.saved.cost)} saved · baseline ${num(a.saved.baseline_avg)} kWh/day` : `${inr(Math.abs(a.saved.cost))} over baseline (${num(a.saved.baseline_avg)} kWh/day)`} /></div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Consumption" className="lg:col-span-2"><div className="mb-2"><Tabs value={per} set={setPer} options={["daily", "weekly", "monthly"]} /></div><Chart rows={rows} kind="kwh" /></Card>
      <Card title="Consumption stability score (heuristic indicator)"><div className="text-4xl font-semibold text-green-800">{a.score}<span className="text-lg text-slate-400">/100</span></div>
        <p className="mt-2 text-sm">Last 7 days: {num(a.last7_kwh)} kWh {a.change_pct == null ? "(no previous week to compare)" : `(${a.change_pct > 0 ? "+" : ""}${a.change_pct}% vs previous 7 days)`}</p>
        <p className="mt-2 text-xs text-slate-500">{a.score_rule}</p></Card></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Top categories">{a.categories.map((c) => (<div key={c.category} className="mb-2 text-sm"><div className="flex justify-between"><span>{c.category}</span><span>{num(c.kwh)} kWh · {c.share}%</span></div>
        <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-teal-600" style={{ width: `${c.share}%` }} /></div></div>))}</Card>
      <Card title="Renewable energy insight"><p className="text-sm">At your average of {num(t.avg_daily)} kWh/day, roughly <b>{a.solar_hint_kw} kW</b> of rooftop solar could cover it (assuming 5 sun hours, 75% performance). Use the Solar planner for your own inputs.</p>
        <Btn kind="ghost" className="mt-3" onClick={() => go("solar")}>Open solar planner</Btn></Card></div>
    <Card title="Top recommendations"><p className="mb-2 text-xs text-slate-500">{a.recommendation_basis}</p><div className="space-y-2">{a.recommendations.slice(0, 3).map((r) => <Rec key={r.title} r={r} />)}</div></Card></div>);
}

const blank = (tariff) => ({ date: new Date().toISOString().slice(0, 10), consumption_kwh: "", tariff, category: "Appliances", notes: "" });
export function DataPage({ records, settings, refresh }) {
  const [f, setF] = useState(blank(settings.tariff)), [editId, setEditId] = useState(null), [errs, setErrs] = useState([]), [msg, setMsg] = useState(""), file = useRef();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const run = async (fn, ok) => { setErrs([]); setMsg(""); try { await fn(); setMsg(ok); await refresh(); } catch (e) { setErrs(e.details || [e.message]); } };
  const submit = (e) => { e.preventDefault(); const l = [];
    if (!f.date) l.push("Pick a date."); if (f.consumption_kwh === "" || +f.consumption_kwh < 0) l.push("Enter consumption of 0 kWh or more."); if (!(+f.tariff > 0)) l.push("Tariff must be greater than 0.");
    if (l.length) return setErrs(l);
    run(async () => { await api(editId ? `/consumption/${editId}` : "/consumption", { method: editId ? "PUT" : "POST", body: f }); setF(blank(settings.tariff)); setEditId(null); }, editId ? "Record updated." : "Record added."); };
  const upload = (e) => { const fl = e.target.files[0]; if (!fl) return; const fd = new FormData(); fd.append("file", fl);
    run(async () => { const r = await api("/upload-csv", { method: "POST", body: fd }); if (r.skipped) throw new Error(`Added ${r.added}, skipped ${r.skipped}. ` + r.errors.join(" ")); }, "CSV imported."); e.target.value = ""; };
  const template = () => { const b = new Blob(["date,consumption_kwh,category,tariff,notes\n2026-10-01,12.5,Cooling,7.0,Example row\n"], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "wattwise_template.csv"; a.click(); };
  return (<div className="space-y-4">
    <Card title={editId ? "Edit record" : "Add record"}><form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Date" type="date" value={f.date} onChange={set("date")} />
      <Field label="Consumption (kWh)" type="number" step="0.01" min="0" value={f.consumption_kwh} onChange={set("consumption_kwh")} />
      <Field label="Tariff (₹/kWh)" type="number" step="0.01" min="0" value={f.tariff} onChange={set("tariff")} />
      <label className="block text-sm"><span className="font-medium text-slate-700">Category</span><select value={f.category} onChange={set("category")} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        {["Lighting", "Cooling", "Appliances", "Office Equipment", "General"].map((c) => <option key={c}>{c}</option>)}</select></label>
      <div className="sm:col-span-1 lg:col-span-2"><Field label="Notes (optional)" value={f.notes} onChange={set("notes")} maxLength={200} /></div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><Btn type="submit">{editId ? "Save changes" : "Add record"}</Btn>
        {editId && <Btn kind="ghost" type="button" onClick={() => { setEditId(null); setF(blank(settings.tariff)); }}>Cancel</Btn>}</div></form>
      <div className="mt-3 space-y-2"><Errors list={errs} />{msg && <Notice>{msg}</Notice>}</div></Card>
    <Card title="Import and demo data"><div className="flex flex-wrap gap-2">
      <input ref={file} type="file" accept=".csv" onChange={upload} hidden />
      <Btn kind="ghost" onClick={() => file.current.click()}><Upload size={16} />Upload CSV</Btn>
      <Btn kind="ghost" onClick={template}><Download size={16} />Download template</Btn>
      <Btn kind="ghost" onClick={() => run(() => api("/demo", { method: "POST", body: { mode: "reset" } }), "Demo data reset.")}>Reset demo data</Btn>
      <Btn kind="ghost" onClick={() => run(() => api("/demo", { method: "POST", body: { mode: "clear" } }), "Demo data removed.")}>Remove demo data</Btn></div></Card>
    <Card title={`Records (${records.length})`}>{!records.length ? <p className="text-sm text-slate-500">No records yet. Add one above.</p> :
      <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-white text-slate-500"><tr><th className="py-1">Date</th><th>Category</th><th>kWh</th><th>₹/kWh</th><th></th></tr></thead>
        <tbody>{records.map((r) => (<tr key={r.id} className="border-t border-slate-100"><td className="py-1">{r.date}</td><td>{r.category}{r.demo && <span className="ml-1 rounded bg-amber-100 px-1 text-xs text-amber-800">demo</span>}</td><td>{r.consumption_kwh}</td><td>{r.tariff}</td>
          <td className="whitespace-nowrap text-right"><button aria-label="Edit" className="p-1" onClick={() => { setEditId(r.id); setF({ date: r.date, consumption_kwh: r.consumption_kwh, tariff: r.tariff, category: r.category, notes: r.notes }); window.scrollTo(0, 0); }}><Pencil size={15} /></button>
            <button aria-label="Delete" className="p-1 text-red-700" onClick={() => confirm("Delete this record?") && run(() => api(`/consumption/${r.id}`, { method: "DELETE" }), "Record deleted.")}><Trash2 size={15} /></button></td></tr>))}</tbody></table></div>}</Card></div>);
}

export function Insights({ a, go }) {
  if (a.empty) return <Empty go={go} />;
  return (<div className="space-y-4"><DemoBanner a={a} /><Notice>{a.recommendation_basis}</Notice>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="High-consumption days">{a.high_days.length ? a.high_days.map((d) => <div key={d.date} className="flex justify-between text-sm"><span>{d.date}</span><span>{d.kwh} kWh</span></div>) : <p className="text-sm text-slate-500">None above average + 1.5 standard deviations (needs 7+ days).</p>}</Card>
      <Card title="Weekday vs weekend">{a.weekday_weekend ? <p className="text-sm">Weekday avg {a.weekday_weekend.weekday_avg} kWh, weekend avg {a.weekday_weekend.weekend_avg} kWh ({a.weekday_weekend.diff_pct > 0 ? "+" : ""}{a.weekday_weekend.diff_pct}% on weekends).</p> : <p className="text-sm text-slate-500">Needs at least 4 weekdays and 4 weekend days.</p>}</Card>
      <Card title="Unusual increases">{a.anomalies.length ? a.anomalies.map((d) => <div key={d.date} className="text-sm">{d.date}: {d.kwh} kWh vs {d.expected} expected (+{d.pct_above}%)</div>) : <p className="text-sm text-slate-500">No day exceeded its trailing 7-day average by 30%.</p>}</Card></div>
    <Card title="Personalized recommendations"><div className="space-y-2">{a.recommendations.map((r) => <Rec key={r.title} r={r} />)}</div></Card></div>);
}

export function Forecast() {
  const [h, setH] = useState(7), [d, setD] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const go = async () => { setBusy(true); setErr(""); try { setD(await api("/forecast", { method: "POST", body: { horizon: +h } })); } catch (e) { setErr(e.message); } setBusy(false); };
  const rows = d?.status === "ok" ? [...d.history, ...d.forecast.map((x) => ({ ...x }))] : [];
  if (rows.length) { const i = d.history.length - 1; rows[i] = { ...rows[i], forecast: rows[i].actual }; }
  return (<div className="space-y-4"><Notice>Forecasts are estimates, not guarantees. The ML model is only used when enough data exists and it beats a simple baseline on held-out data.</Notice>
    <Card title="Forecast"><div className="mb-3 flex flex-wrap items-end gap-3"><div className="w-28"><Field label="Days ahead" type="number" min="1" max="30" value={h} onChange={(e) => setH(e.target.value)} /></div>
      <div className="flex gap-1.5 pb-0.5">
        <Btn kind={+h === 7 ? "primary" : "ghost"} type="button" onClick={() => setH(7)}>7 days</Btn>
        <Btn kind={+h === 14 ? "primary" : "ghost"} type="button" onClick={() => setH(14)}>14 days</Btn>
        <Btn kind={+h === 30 ? "primary" : "ghost"} type="button" onClick={() => setH(30)}>30 days</Btn>
      </div>
      <Btn onClick={go} disabled={busy}>{busy ? "Running…" : "Run forecast"}</Btn></div>
      {err && <Notice tone="error">{err}</Notice>}
      {d?.status === "insufficient" && <Notice tone="warn">{d.message}</Notice>}
      {d?.status === "ok" && <div className="space-y-2">{d.uses_demo_data && <Notice tone="warn">This forecast uses demo data.</Notice>}
        <p className="text-sm"><b>Method:</b> {d.method}. {d.message}</p>
        {d.metrics ? <p className="text-sm">Hold-out test ({d.metrics.test_days} days): model MAE {d.metrics.model_mae_kwh} kWh/day vs baseline MAE {d.metrics.baseline_mae_kwh} kWh/day.</p> : <p className="text-sm text-slate-500">No accuracy metrics: not enough test observations.</p>}
        <div className="h-72"><ResponsiveContainer><ComposedChart data={rows}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
          <Line dataKey="actual" stroke={GREEN} dot={false} strokeWidth={2} /><Line dataKey="forecast" stroke={TEAL} strokeDasharray="5 4" dot={false} strokeWidth={2} /></ComposedChart></ResponsiveContainer></div></div>}</Card></div>);
}

export function Calculator({ settings, refresh, a }) {
  const [s, setS] = useState(settings), [cur, setCur] = useState(a.empty ? 300 : Math.round(a.totals.avg_daily * 30)), [red, setRed] = useState(15), [r, setR] = useState(null), [errs, setErrs] = useState([]), [msg, setMsg] = useState("");
  const save = async () => { setErrs([]); setMsg(""); try { await api("/settings", { method: "PUT", body: s }); setMsg("Settings saved."); refresh(); } catch (e) { setErrs(e.details || [e.message]); } };
  const calc = async () => { setErrs([]); try { setR(await api("/scenario", { method: "POST", body: { current_kwh: cur, reduction_pct: red } })); } catch (e) { setErrs(e.details || [e.message]); } };
  return (<div className="grid gap-4 lg:grid-cols-2"><Errors list={errs} />
    <Card title="Tariff and emissions factor"><div className="space-y-3"><Field label="Default tariff (₹/kWh)" type="number" value={s.tariff} onChange={(e) => setS({ ...s, tariff: e.target.value })} />
      <Field label="Emissions factor (kg CO₂e/kWh)" type="number" step="0.01" value={s.emission_factor} onChange={(e) => setS({ ...s, emission_factor: e.target.value })} />
      <Field label="Factor source" value={s.emission_source} onChange={(e) => setS({ ...s, emission_source: e.target.value })} hint="Cite a verified source. The default is unverified." />
      <Btn onClick={save}>Save settings</Btn>{msg && <Notice>{msg}</Notice>}</div></Card>
    <Card title="Savings scenario"><div className="space-y-3"><Field label="Current consumption (kWh)" type="number" value={cur} onChange={(e) => setCur(e.target.value)} />
      <Field label="Proposed reduction (%)" type="number" value={red} onChange={(e) => setRed(e.target.value)} /><Btn onClick={calc}>Calculate</Btn>
      {r && <table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th></th><th>kWh</th><th>Cost</th><th>kg CO₂e</th></tr></thead><tbody>
        {["current", "proposed", "saved"].map((k) => <tr key={k} className="border-t border-slate-100"><td className="py-1 capitalize">{k}</td><td>{num(r[k].kwh)}</td><td>{inr(r[k].cost)}</td><td>{num(r[k].co2)}</td></tr>)}</tbody></table>}
      <p className="text-xs text-slate-500">Cost = kWh × tariff; emissions = kWh × factor. All values are estimates.</p></div></Card></div>);
}

export function Solar({ a }) {
  const [f, setF] = useState({ daily_kwh: a.empty ? 10 : Math.round(a.totals.avg_daily), area_m2: 30, sun_hours: 5, capacity_kw: "", performance_factor: 0.75 }), [r, setR] = useState(null), [errs, setErrs] = useState([]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = async () => { setErrs([]); try { setR(await api("/solar-estimate", { method: "POST", body: { ...f, capacity_kw: f.capacity_kw || 0 } })); } catch (e) { setErrs(e.details || [e.message]); setR(null); } };
  return (<div className="grid gap-4 lg:grid-cols-2"><Card title="Solar planner"><div className="space-y-3">
    <Field label="Average daily consumption (kWh)" type="number" value={f.daily_kwh} onChange={set("daily_kwh")} />
    <Field label="Rooftop area (m²)" type="number" value={f.area_m2} onChange={set("area_m2")} />
    <Field label="Peak sun hours per day" type="number" step="0.1" value={f.sun_hours} onChange={set("sun_hours")} />
    <Field label="System capacity (kW, optional)" type="number" step="0.1" value={f.capacity_kw} onChange={set("capacity_kw")} hint="Leave blank to estimate from area." />
    <Field label="Performance factor (0.3 to 1)" type="number" step="0.01" value={f.performance_factor} onChange={set("performance_factor")} hint="Accounts for system losses." />
    <Btn onClick={go}>Estimate</Btn><Errors list={errs} /></div></Card>
    <Card title="Estimate">{!r ? <p className="text-sm text-slate-500">Enter your details and press Estimate.</p> : <div className="space-y-1 text-sm">
      <p>Capacity: <b>{r.capacity_kw} kW</b> ({r.capacity_source})</p><p>Generation: <b>{r.daily_generation_kwh} kWh/day</b> · {r.monthly_generation_kwh} kWh/month</p>
      <p>Covers <b>{r.offset_pct}%</b> of your daily use · saves about <b>{inr(r.monthly_savings)}</b>/month</p><p>CO₂e avoided: ~{num(r.annual_co2_avoided_kg, 0)} kg/year</p>
      <p>To cover 100%: {r.required_capacity_kw} kW (~{r.area_needed_m2} m²)</p>
      {r.payback_years != null && <p>Est. Turnkey Cost: <b>{inr(r.estimated_install_cost)}</b> · Est. Payback: <b>{r.payback_years} years</b></p>}
      {r.area_limit_exceeded && <Notice tone="warn">Entered capacity needs more roof area than you listed.</Notice>}
      <p className="pt-2 text-xs text-slate-500">{r.assumptions}. Preliminary estimate only: real output depends on location, weather, shading, orientation and equipment. Not connected to live solar sensors or meters.</p></div>}</Card></div>);
}

export function Reports({ a, go }) {
  const [per, setPer] = useState("monthly");
  if (a.empty) return <Empty go={go} />;
  const rows = [...a.periods[per]].reverse();
  return (<div className="space-y-4"><DemoBanner a={a} /><div className="flex flex-wrap items-center gap-2"><Tabs value={per} set={setPer} options={["daily", "weekly", "monthly"]} />
    <a href={`${BASE}/export?kind=report&period=${per}`}><Btn kind="ghost"><Download size={16} />Export report CSV</Btn></a>
    <a href={`${BASE}/export?kind=records`}><Btn kind="ghost"><Download size={16} />Export records CSV</Btn></a></div>
    <Card title={`${per[0].toUpperCase() + per.slice(1)} summary${per === "weekly" ? " (week ending Sunday)" : ""}`}><div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-white text-slate-500"><tr><th className="py-1">Period</th><th>kWh</th><th>Cost</th><th>kg CO₂e (est.)</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.period} className="border-t border-slate-100"><td className="py-1">{r.period}</td><td>{r.kwh}</td><td>{inr(r.cost)}</td><td>{r.co2}</td></tr>)}</tbody></table></div></Card>
    <Card title="Trend"><Chart rows={a.periods[per].slice(-24)} kind="kwh" /></Card>
    <Card title="Recommendations"><div className="space-y-2">{a.recommendations.map((r) => <Rec key={r.title} r={r} />)}</div></Card></div>);
}
