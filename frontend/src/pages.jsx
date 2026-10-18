import { useState, useRef, useEffect, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line, Legend } from "recharts";
import { Zap, IndianRupee, Leaf, PiggyBank, Trash2, Pencil, Download, Upload, AlertTriangle, CheckCircle, Search, Filter, Calendar, TrendingUp, Info, ChevronLeft, ChevronRight, Target, ArrowRight } from "lucide-react";
import { api, BASE } from "./api";
import { Card, Stat, Notice, Field, Btn, Tabs, Errors, inr, num } from "./ui.jsx";

const GREEN = "#166534", TEAL = "#0f766e";

const Empty = ({ go }) => (
  <Card className="text-center">
    <p className="font-medium">No consumption data yet</p>
    <p className="mb-3 text-sm text-slate-500">Add a record or upload a CSV to see analytics.</p>
    <Btn onClick={() => go("data")}>Add data</Btn>
  </Card>
);

const DemoBanner = ({ a }) =>
  a.has_demo ? (
    <Notice tone="warn">
      Showing demo data (clearly labeled). Replace it with your own records on the Data page.
    </Notice>
  ) : null;

const Chart = ({ rows, kind }) => (
  <div className="h-64">
    <ResponsiveContainer>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(val) => [`${num(val)} ${kind === "kwh" ? "kWh" : "₹"}`, kind === "kwh" ? "Consumption" : "Cost"]} />
        <Bar dataKey={kind} fill={GREEN} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export function ActionCenterCard({ ac, go }) {
  if (!ac) return null;
  const isAttention = ac.progress.status === "Needs Attention";
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${isAttention ? "border-amber-300 bg-amber-50/40" : "border-emerald-300 bg-emerald-50/40"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-800 text-white font-bold text-xs">AI</span>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-green-950">WattWise Action Center</h2>
            <p className="text-xs text-slate-500">Top Problem to Fix & Targeted 7-Day Progress</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isAttention ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-emerald-100 text-emerald-900 border border-emerald-300"}`}>
          {isAttention ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
          {ac.progress.status}
        </span>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Problem Identified</span>
            <p className="font-semibold text-slate-900">{ac.problem}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Evidence</span>
            <p className="text-sm text-slate-700">{ac.evidence}</p>
          </div>
          <div className="rounded-lg bg-white/80 p-3 border border-slate-200/80">
            <span className="text-xs font-semibold text-green-900 uppercase tracking-wide flex items-center gap-1">
              <CheckCircle size={14} className="text-green-700" /> Suggested Action
            </span>
            <p className="mt-1 text-sm font-medium text-slate-800">{ac.action}</p>
          </div>
          <div className="text-xs text-slate-500 pt-1">
            <b>Assumptions:</b> {ac.assumptions} · <span className="font-medium text-slate-700">Confidence: {ac.confidence}</span>
          </div>
        </div>

        <div className="flex flex-col justify-between space-y-3 rounded-lg bg-white p-4 border border-slate-200/90 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Potential Monthly Impact</span>
            <div className="mt-2 grid grid-cols-3 gap-1 text-center">
              <div className="rounded bg-green-50 p-1.5 border border-green-100">
                <div className="text-sm font-bold text-green-900">{num(ac.impact.saving_kwh_month)}</div>
                <div className="text-[10px] text-green-700">kWh/mo</div>
              </div>
              <div className="rounded bg-teal-50 p-1.5 border border-teal-100">
                <div className="text-sm font-bold text-teal-900">{inr(ac.impact.saving_cost_month)}</div>
                <div className="text-[10px] text-teal-700">bill/mo</div>
              </div>
              <div className="rounded bg-emerald-50 p-1.5 border border-emerald-100">
                <div className="text-sm font-bold text-emerald-900">{num(ac.impact.saving_co2_month)}</div>
                <div className="text-[10px] text-emerald-700">kg CO₂e</div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>7-Day Tracking</span>
              <span>{ac.progress.current_7d_avg} kWh/d (avg)</span>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>Prior baseline: {ac.progress.baseline_7d_avg} kWh/d</span>
              <span>Target: {ac.progress.target_7d_avg} kWh/d</span>
            </div>
            {ac.progress.change_pct != null && (
              <p className={`mt-1.5 text-xs font-medium ${ac.progress.change_pct > 0 ? "text-amber-800" : "text-emerald-700"}`}>
                {ac.progress.change_pct > 0 ? `+${ac.progress.change_pct}% rise vs prior week` : `${ac.progress.change_pct}% reduction achieved`}
              </p>
            )}
          </div>

          {go && (
            <Btn kind="ghost" className="w-full text-xs py-1.5" onClick={() => go("insights")}>
              View All Insights <ArrowRight size={12} />
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

const Rec = ({ r }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold text-slate-900">{r.title}</h3>
      <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-800 border border-green-200">
        Est. saving {num(r.saving_kwh_month)} kWh/mo ≈ {inr(r.saving_cost_month)}/mo
      </span>
    </div>
    <div className="grid gap-2 sm:grid-cols-2 text-xs">
      <div>
        <span className="font-semibold text-slate-600 uppercase tracking-wide">Evidence:</span>
        <p className="mt-0.5 text-slate-700">{r.evidence || r.why}</p>
      </div>
      <div>
        <span className="font-semibold text-green-900 uppercase tracking-wide">Suggested Action:</span>
        <p className="mt-0.5 text-slate-800 font-medium">{r.action || "Follow standard energy-conservation schedules."}</p>
      </div>
    </div>
    <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-500 flex flex-wrap justify-between gap-1">
      <span><b>Assumptions:</b> {r.assumptions || `Rule: ${r.rule}`}</span>
      <span><b>Confidence:</b> {r.confidence || "Rule-based"}</span>
    </div>
  </div>
);

export function Dashboard({ a, go }) {
  const [per, setPer] = useState("daily");
  if (a.empty) return <Empty go={go} />;
  const rows = a.periods[per].slice(per === "daily" ? -30 : -12), t = a.totals;
  const isSavedPositive = a.saved.kwh >= 0;

  return (
    <div className="space-y-4">
      <DemoBanner a={a} />
      
      {/* Action Center - Top Problem to Fix */}
      {a.action_center && <ActionCenterCard ac={a.action_center} go={go} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Zap} label="Consumption" value={`${num(t.kwh)} kWh`} sub={`${t.days} days · avg ${num(t.avg_daily)} kWh/day`} />
        <Stat icon={IndianRupee} label="Estimated bill" value={inr(t.cost)} sub="kWh × tariff per record" />
        <Stat icon={Leaf} label="Estimated emissions" value={`${num(t.co2)} kg CO₂e`} sub={`Factor ${a.settings.emission_factor} kg/kWh (CEA Verified)`} />
        <Stat icon={PiggyBank} 
          label={isSavedPositive ? "Saved vs baseline" : "Net vs baseline"} 
          value={isSavedPositive ? `${num(a.saved.kwh)} kWh` : `+${num(Math.abs(a.saved.kwh))} kWh excess`} 
          sub={isSavedPositive ? `${inr(a.saved.cost)} saved · baseline ${num(a.saved.baseline_avg)} kWh/day` : `${inr(Math.abs(a.saved.cost))} over baseline (${num(a.saved.baseline_avg)} kWh/day)`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Consumption" className="lg:col-span-2">
          <div className="mb-2"><Tabs value={per} set={setPer} options={["daily", "weekly", "monthly"]} /></div>
          <Chart rows={rows} kind="kwh" />
        </Card>
        <Card title="Consumption stability score (heuristic indicator)">
          <div className="text-4xl font-semibold text-green-800">{a.score}<span className="text-lg text-slate-400">/100</span></div>
          <p className="mt-2 text-sm font-medium">Last 7 days: {num(a.last7_kwh)} kWh {a.change_pct == null ? "(no previous week to compare)" : `(${a.change_pct > 0 ? "+" : ""}${a.change_pct}% vs previous 7 days)`}</p>
          <p className="mt-2 text-xs text-slate-500">{a.score_rule}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Top categories">
          {a.categories.map((c) => (
            <div key={c.category} className="mb-2 text-sm">
              <div className="flex justify-between"><span>{c.category}</span><span>{num(c.kwh)} kWh · {c.share}%</span></div>
              <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-teal-600" style={{ width: `${c.share}%` }} /></div>
            </div>
          ))}
        </Card>
        <Card title="Renewable energy insight">
          <p className="text-sm">At your average of {num(t.avg_daily)} kWh/day, roughly <b>{a.solar_hint_kw} kW</b> of rooftop solar could cover it (assuming 5 sun hours, 75% performance). Use the Solar planner for your own inputs.</p>
          <Btn kind="ghost" className="mt-3" onClick={() => go("solar")}>Open solar planner</Btn>
        </Card>
      </div>

      <Card title="Top recommendations">
        <p className="mb-2 text-xs text-slate-500">{a.recommendation_basis}</p>
        <div className="space-y-3">{a.recommendations.slice(0, 3).map((r) => <Rec key={r.title} r={r} />)}</div>
      </Card>
    </div>
  );
}

const blank = (tariff) => ({ date: new Date().toISOString().slice(0, 10), consumption_kwh: "", tariff, category: "Appliances", notes: "" });

export function DataPage({ records, settings, refresh }) {
  const [f, setF] = useState(blank(settings.tariff)), [editId, setEditId] = useState(null), [errs, setErrs] = useState([]), [msg, setMsg] = useState(""), file = useRef();
  const [search, setSearch] = useState(""), [catFilter, setCatFilter] = useState("All"), [startDate, setStartDate] = useState(""), [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const run = async (fn, ok) => { setErrs([]); setMsg(""); try { await fn(); setMsg(ok); await refresh(); } catch (e) { setErrs(e.details || [e.message]); } };

  // Check duplicate record in real-time
  const isDuplicate = useMemo(() => {
    if (!f.date || !f.category) return false;
    return records.some((r) => r.date === f.date && r.category === f.category && r.id !== editId);
  }, [records, f.date, f.category, editId]);

  const submit = (e) => {
    e.preventDefault();
    const l = [];
    if (!f.date) l.push("Pick a date.");
    if (f.consumption_kwh === "" || +f.consumption_kwh < 0) l.push("Enter consumption of 0 kWh or more.");
    if (!(+f.tariff > 0)) l.push("Tariff must be greater than 0.");
    if (l.length) return setErrs(l);
    run(async () => {
      await api(editId ? `/consumption/${editId}` : "/consumption", { method: editId ? "PUT" : "POST", body: f });
      setF(blank(settings.tariff));
      setEditId(null);
    }, editId ? "Record updated." : "Record added.");
  };

  const upload = (e) => {
    const fl = e.target.files[0];
    if (!fl) return;
    const fd = new FormData();
    fd.append("file", fl);
    run(async () => {
      const r = await api("/upload-csv", { method: "POST", body: fd });
      if (r.skipped) throw new Error(`Added ${r.added}, skipped ${r.skipped}. ` + r.errors.join(" "));
    }, "CSV imported.");
    e.target.value = "";
  };

  const template = () => {
    const b = new Blob(["date,consumption_kwh,category,tariff,notes\n2026-10-01,12.5,Cooling,7.0,Example row\n"], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "wattwise_template.csv";
    a.click();
  };

  // Filtered and paginated records
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (catFilter !== "All" && r.category !== catFilter) return false;
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchNote = (r.notes || "").toLowerCase().includes(q);
        const matchCat = (r.category || "").toLowerCase().includes(q);
        const matchDate = (r.date || "").includes(q);
        const matchKwh = String(r.consumption_kwh).includes(q);
        if (!matchNote && !matchCat && !matchDate && !matchKwh) return false;
      }
      return true;
    });
  }, [records, search, catFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentRecords = useMemo(() => {
    const s = (page - 1) * PAGE_SIZE;
    return filtered.slice(s, s + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [search, catFilter, startDate, endDate]);

  return (
    <div className="space-y-4">
      <Card title={editId ? "Edit record" : "Add record"}>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Date" type="date" value={f.date} onChange={set("date")} />
          <Field label="Consumption (kWh)" type="number" step="0.01" min="0" value={f.consumption_kwh} onChange={set("consumption_kwh")} />
          <Field label="Tariff (₹/kWh)" type="number" step="0.01" min="0" value={f.tariff} onChange={set("tariff")} />
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Category</span>
            <select value={f.category} onChange={set("category")} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              {["Lighting", "Cooling", "Appliances", "Office Equipment", "General"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <div className="sm:col-span-1 lg:col-span-2">
            <Field label="Notes (optional)" value={f.notes} onChange={set("notes")} maxLength={200} />
          </div>

          {/* Real-time duplicate warning alert */}
          {isDuplicate && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Notice tone="warn">
                ⚠️ <b>Duplicate Warning:</b> An existing record for <b>{f.date}</b> under category <b>{f.category}</b> is already logged. Submitting will create another record on the same date.
              </Notice>
            </div>
          )}

          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <Btn type="submit">{editId ? "Save changes" : "Add record"}</Btn>
            {editId && (
              <Btn kind="ghost" type="button" onClick={() => { setEditId(null); setF(blank(settings.tariff)); }}>
                Cancel
              </Btn>
            )}
          </div>
        </form>
        <div className="mt-3 space-y-2">
          <Errors list={errs} />
          {msg && <Notice>{msg}</Notice>}
        </div>
      </Card>

      <Card title="Import and demo data">
        <div className="flex flex-wrap gap-2">
          <input ref={file} type="file" accept=".csv" onChange={upload} hidden />
          <Btn kind="ghost" onClick={() => file.current.click()}><Upload size={16} />Upload CSV</Btn>
          <Btn kind="ghost" onClick={template}><Download size={16} />Download template</Btn>
          <Btn kind="ghost" onClick={() => run(() => api("/demo", { method: "POST", body: { mode: "reset" } }), "Demo data reset.")}>Reset demo data</Btn>
          <Btn kind="ghost" onClick={() => run(() => api("/demo", { method: "POST", body: { mode: "clear" } }), "Demo data removed.")}>Remove demo data</Btn>
        </div>
      </Card>

      {/* Record filter & search bar */}
      <Card title={`Records (${records.length} total)`}>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search date, notes, kWh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="All">All Categories</option>
              {["Lighting", "Cooling", "Appliances", "Office Equipment", "General"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="date"
              placeholder="From Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              title="Start Date"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              placeholder="To Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              title="End Date"
            />
            {(search || catFilter !== "All" || startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setCatFilter("All"); setStartDate(""); setEndDate(""); }}
                className="whitespace-nowrap rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {!filtered.length ? (
          <p className="py-4 text-center text-sm text-slate-500">No records found matching filters.</p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="py-2 px-2">Date</th>
                    <th className="px-2">Category</th>
                    <th className="px-2">kWh</th>
                    <th className="px-2">Tariff</th>
                    <th className="px-2">Est. Cost</th>
                    <th className="px-2">Notes</th>
                    <th className="px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="py-2 px-2 font-medium">{r.date}</td>
                      <td className="px-2">
                        {r.category}
                        {r.demo && <span className="ml-1 rounded bg-amber-100 px-1 text-xs text-amber-800">demo</span>}
                      </td>
                      <td className="px-2 font-semibold text-slate-800">{r.consumption_kwh}</td>
                      <td className="px-2 text-slate-600">₹{r.tariff}</td>
                      <td className="px-2 font-medium text-slate-700">₹{num(r.consumption_kwh * r.tariff, 1)}</td>
                      <td className="px-2 text-xs text-slate-500 max-w-[150px] truncate">{r.notes || "—"}</td>
                      <td className="whitespace-nowrap px-2 text-right">
                        <button
                          aria-label="Edit"
                          className="p-1 hover:text-green-800"
                          onClick={() => {
                            setEditId(r.id);
                            setF({ date: r.date, consumption_kwh: r.consumption_kwh, tariff: r.tariff, category: r.category, notes: r.notes });
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          aria-label="Delete"
                          className="p-1 text-red-700 hover:text-red-900"
                          onClick={() => confirm("Delete this record?") && run(() => api(`/consumption/${r.id}`, { method: "DELETE" }), "Record deleted.")}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
              </span>
              <div className="flex items-center gap-1">
                <Btn kind="ghost" className="px-2 py-1 text-xs" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft size={14} /> Prev
                </Btn>
                <span className="px-2 font-medium text-slate-700">
                  Page {page} of {totalPages}
                </span>
                <Btn kind="ghost" className="px-2 py-1 text-xs" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next <ChevronRight size={14} />
                </Btn>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export function Insights({ a, go }) {
  if (a.empty) return <Empty go={go} />;
  return (
    <div className="space-y-4">
      <DemoBanner a={a} />
      
      {/* WattWise Action Center */}
      {a.action_center && <ActionCenterCard ac={a.action_center} />}

      <Notice>{a.recommendation_basis}</Notice>
      
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="High-consumption days">
          {a.high_days.length ? (
            <div className="space-y-1.5">
              {a.high_days.map((d) => (
                <div key={d.date} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                  <span className="font-medium text-slate-700">{d.date}</span>
                  <span className="font-semibold text-red-700">{d.kwh} kWh</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">None above average + 1.5 standard deviations (needs 7+ days).</p>
          )}
        </Card>
        
        <Card title="Weekday vs weekend">
          {a.weekday_weekend ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Weekday Average:</span><b>{a.weekday_weekend.weekday_avg} kWh</b></div>
              <div className="flex justify-between"><span>Weekend Average:</span><b>{a.weekday_weekend.weekend_avg} kWh</b></div>
              <div className="rounded bg-slate-50 p-2 text-xs text-slate-600">
                Weekend load is <b>{a.weekday_weekend.diff_pct > 0 ? `+${a.weekday_weekend.diff_pct}%` : `${a.weekday_weekend.diff_pct}%`}</b> relative to weekdays.
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Needs at least 4 weekdays and 4 weekend days.</p>
          )}
        </Card>
        
        <Card title="Unusual increases">
          {a.anomalies.length ? (
            <div className="space-y-2">
              {a.anomalies.map((d) => (
                <div key={d.date} className="rounded border border-amber-200 bg-amber-50/50 p-2 text-xs">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>{d.date}</span>
                    <span className="text-amber-800">+{d.pct_above}% surge</span>
                  </div>
                  <div className="mt-1 text-slate-600">Actual: {d.kwh} kWh vs {d.expected} kWh expected</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No day exceeded its trailing 7-day average by 30%.</p>
          )}
        </Card>
      </div>

      <Card title="Evidence-Based Efficiency Recommendations">
        <div className="space-y-3">
          {a.recommendations.map((r) => (
            <Rec key={r.title} r={r} />
          ))}
        </div>
      </Card>
    </div>
  );
}

export function Forecast() {
  const [h, setH] = useState(7), [d, setD] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState("");

  const go = async (horizonValue = h) => {
    setBusy(true);
    setErr("");
    try {
      setD(await api("/forecast", { method: "POST", body: { horizon: +horizonValue } }));
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  useEffect(() => {
    go(7);
  }, []);

  const changeHorizon = (val) => {
    setH(val);
    go(val);
  };

  const rows = d?.status === "ok" ? [...d.history, ...d.forecast.map((x) => ({ ...x }))] : [];
  if (rows.length && d?.history?.length) {
    const i = d.history.length - 1;
    rows[i] = { ...rows[i], forecast: rows[i].actual };
  }

  return (
    <div className="space-y-4">
      <Notice>
        Forecasts are estimates based on historical trend and day-of-week seasonality. The Scikit-learn Ridge regression model is rigorously evaluated against a 7-day trailing baseline on held-out chronological test observations.
      </Notice>

      <Card title="Machine Learning Energy Forecast">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="w-28">
            <Field label="Days ahead" type="number" min="1" max="30" value={h} onChange={(e) => setH(e.target.value)} />
          </div>
          <div className="flex gap-1.5 pb-0.5">
            <Btn kind={+h === 7 ? "primary" : "ghost"} type="button" onClick={() => changeHorizon(7)}>7 days</Btn>
            <Btn kind={+h === 14 ? "primary" : "ghost"} type="button" onClick={() => changeHorizon(14)}>14 days</Btn>
            <Btn kind={+h === 30 ? "primary" : "ghost"} type="button" onClick={() => changeHorizon(30)}>30 days</Btn>
          </div>
          <Btn onClick={() => go(h)} disabled={busy}>{busy ? "Running…" : "Run forecast"}</Btn>
        </div>

        {err && <Notice tone="error">{err}</Notice>}
        {d?.status === "insufficient" && <Notice tone="warn">{d.message}</Notice>}

        {d?.status === "ok" && (
          <div className="space-y-4">
            {d.uses_demo_data && <Notice tone="warn">This forecast is computed using demo records.</Notice>}
            
            {/* Model Evaluation & Summary KPI Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-xs font-semibold uppercase text-slate-500">Expected Total Energy</span>
                <div className="mt-1 text-xl font-bold text-slate-900">{num(d.summary?.total_kwh)} kWh</div>
                <div className="text-xs text-slate-500">{h} days · {num(d.summary?.avg_daily_kwh)} kWh/day</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-xs font-semibold uppercase text-slate-500">Projected Bill</span>
                <div className="mt-1 text-xl font-bold text-green-900">{inr(d.summary?.total_cost)}</div>
                <div className="text-xs text-slate-500">Calculated with active tariff</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-xs font-semibold uppercase text-slate-500">Projected Emissions</span>
                <div className="mt-1 text-xl font-bold text-emerald-900">{num(d.summary?.total_co2)} kg</div>
                <div className="text-xs text-slate-500">CO₂e footprint</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-xs font-semibold uppercase text-slate-500">Model Accuracy (MAE)</span>
                {d.metrics ? (
                  <>
                    <div className="mt-1 text-xl font-bold text-teal-900">{d.metrics.model_mae_kwh} <span className="text-xs font-normal text-slate-600">kWh/day</span></div>
                    <div className="text-[11px] text-slate-500">Baseline MAE: {d.metrics.baseline_mae_kwh} kWh/day ({d.metrics.test_days}d test)</div>
                  </>
                ) : (
                  <div className="mt-1 text-xs text-slate-500">Baseline used (not enough test split)</div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
              <b>Selected Model:</b> {d.method}. {d.message}
            </div>

            {/* Actual vs Forecast Chart */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">Historical vs. Forecast Projection</h3>
              <div className="h-72">
                <ResponsiveContainer>
                  <ComposedChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, n) => [`${num(v)} kWh`, n === "actual" ? "Actual Historical" : "Forecasted Demand"]} />
                    <Legend />
                    <Line dataKey="actual" name="Actual History" stroke={GREEN} dot={false} strokeWidth={2} />
                    <Line dataKey="forecast" name="Predicted Forecast" stroke={TEAL} strokeDasharray="5 4" dot={false} strokeWidth={2.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Day-by-Day Forecast Breakdown Table */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">Itemized Forecast & Estimated Bills</h3>
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="px-3">Day</th>
                      <th className="px-3">Predicted Demand</th>
                      <th className="px-3">Estimated Daily Bill</th>
                      <th className="px-3">Estimated CO₂e</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.forecast.map((r) => (
                      <tr key={r.date} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium text-slate-900">{r.date}</td>
                        <td className="px-3 text-slate-600">{r.day}</td>
                        <td className="px-3 font-semibold text-slate-800">{r.forecast} kWh</td>
                        <td className="px-3 font-medium text-green-900">₹{r.cost}</td>
                        <td className="px-3 text-slate-600">{r.co2} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export function Calculator({ settings, refresh, a }) {
  const [s, setS] = useState(settings), [cur, setCur] = useState(a.empty ? 300 : Math.round(a.totals.avg_daily * 30)), [red, setRed] = useState(15), [r, setR] = useState(null), [errs, setErrs] = useState([]), [msg, setMsg] = useState("");

  const save = async () => {
    setErrs([]); setMsg("");
    try {
      await api("/settings", { method: "PUT", body: s });
      setMsg("Settings saved.");
      refresh();
    } catch (e) {
      setErrs(e.details || [e.message]);
    }
  };

  const calc = async () => {
    setErrs([]);
    try {
      setR(await api("/scenario", { method: "POST", body: { current_kwh: cur, reduction_pct: red } }));
    } catch (e) {
      setErrs(e.details || [e.message]);
    }
  };

  const setCEA = (factor, label) => {
    setS({
      ...s,
      emission_factor: factor,
      emission_source: `Central Electricity Authority (CEA), Govt. of India — CO2 Baseline Database for the Indian Power Sector, User Guide Version 19.0 (2023-24): ${label}`
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Errors list={errs} />
      <Card title="Tariff and Verified Emissions Factor">
        <div className="space-y-3">
          <Field label="Default tariff (₹/kWh)" type="number" step="0.1" value={s.tariff} onChange={(e) => setS({ ...s, tariff: e.target.value })} hint="Used across all bill calculations in Dashboard, Reports, and Forecasts." />
          <Field label="Emissions factor (kg CO₂e/kWh)" type="number" step="0.01" value={s.emission_factor} onChange={(e) => setS({ ...s, emission_factor: e.target.value })} />
          
          <div>
            <span className="text-xs font-semibold text-slate-600">Quick CEA Official Presets (India):</span>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCEA(0.82, "National Grid Weighted Average (0.82 kg CO₂e/kWh)")}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                CEA National Grid (0.82)
              </button>
              <button
                type="button"
                onClick={() => setCEA(0.71, "Southern / High-Renewable Region (0.71 kg CO₂e/kWh)")}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                CEA Renewable-Rich (0.71)
              </button>
            </div>
          </div>

          <Field label="Emissions factor source" value={s.emission_source} onChange={(e) => setS({ ...s, emission_source: e.target.value })} hint="Source attribution for carbon audits." />

          <div className="rounded-lg bg-teal-50 p-2.5 text-xs text-teal-900 border border-teal-200 space-y-1">
            <div className="font-semibold flex items-center gap-1"><CheckCircle size={13} /> Verified Standard Reference:</div>
            <div>Central Electricity Authority (CEA), Ministry of Power, Government of India — <i>CO2 Baseline Database for the Indian Power Sector, Version 19.0 (Published Dec 2023)</i>. National grid combined margin factor = 0.82 kg CO₂/kWh.</div>
          </div>

          <Btn onClick={save}>Save settings</Btn>
          {msg && <Notice>{msg}</Notice>}
        </div>
      </Card>

      <Card title="What-If Savings Simulator">
        <div className="space-y-3">
          <Field label="Current monthly consumption (kWh)" type="number" value={cur} onChange={(e) => setCur(e.target.value)} />
          <Field label="Proposed reduction goal (%)" type="number" value={red} onChange={(e) => setRed(e.target.value)} />
          <Btn onClick={calc}>Calculate Impact</Btn>
          {r && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-1">Scenario</th>
                    <th>kWh</th>
                    <th>Est. Bill</th>
                    <th>kg CO₂e</th>
                  </tr>
                </thead>
                <tbody>
                  {["current", "proposed", "saved"].map((k) => (
                    <tr key={k} className={`border-t border-slate-100 ${k === "saved" ? "font-semibold text-green-900 bg-green-50/50" : ""}`}>
                      <td className="py-2 capitalize">{k}</td>
                      <td>{num(r[k].kwh)}</td>
                      <td>{inr(r[k].cost)}</td>
                      <td>{num(r[k].co2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-slate-500">Bill = kWh × tariff (₹{s.tariff}); emissions = kWh × factor ({s.emission_factor} kg/kWh). Directly aligned with institutional accounts.</p>
        </div>
      </Card>
    </div>
  );
}

export function Solar({ a }) {
  const [f, setF] = useState({ daily_kwh: a.empty ? 10 : Math.round(a.totals.avg_daily), area_m2: 30, sun_hours: 5, capacity_kw: "", performance_factor: 0.75 }), [r, setR] = useState(null), [errs, setErrs] = useState([]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = async () => { setErrs([]); try { setR(await api("/solar-estimate", { method: "POST", body: { ...f, capacity_kw: f.capacity_kw || 0 } })); } catch (e) { setErrs(e.details || [e.message]); setR(null); } };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Solar planner">
        <div className="space-y-3">
          <Field label="Average daily consumption (kWh)" type="number" value={f.daily_kwh} onChange={set("daily_kwh")} />
          <Field label="Rooftop area (m²)" type="number" value={f.area_m2} onChange={set("area_m2")} />
          <Field label="Peak sun hours per day" type="number" step="0.1" value={f.sun_hours} onChange={set("sun_hours")} />
          <Field label="System capacity (kW, optional)" type="number" step="0.1" value={f.capacity_kw} onChange={set("capacity_kw")} hint="Leave blank to estimate from area." />
          <Field label="Performance factor (0.3 to 1)" type="number" step="0.01" value={f.performance_factor} onChange={set("performance_factor")} hint="Accounts for system losses." />
          <Btn onClick={go}>Estimate</Btn>
          <Errors list={errs} />
        </div>
      </Card>
      
      <Card title="Physical Sizing & Financial Payback">
        {!r ? (
          <p className="text-sm text-slate-500">Enter your details and press Estimate.</p>
        ) : (
          <div className="space-y-2 text-sm">
            <p>Capacity: <b>{r.capacity_kw} kW</b> ({r.capacity_source})</p>
            <p>Generation: <b>{r.daily_generation_kwh} kWh/day</b> · {r.monthly_generation_kwh} kWh/month</p>
            <p>Covers <b>{r.offset_pct}%</b> of your daily use · saves about <b>{inr(r.monthly_savings)}</b>/month</p>
            <p>CO₂e avoided: ~{num(r.annual_co2_avoided_kg, 0)} kg/year</p>
            <p>To cover 100%: {r.required_capacity_kw} kW (~{r.area_needed_m2} m²)</p>
            {r.payback_years != null && (
              <div className="rounded-lg bg-green-50 p-2.5 border border-green-200">
                <p className="font-semibold text-green-900">Est. Turnkey Benchmark: {inr(r.estimated_install_cost)}</p>
                <p className="text-xs text-green-800">Simple Payback Period: <b>{r.payback_years} years</b></p>
              </div>
            )}
            {r.area_limit_exceeded && <Notice tone="warn">Entered capacity needs more roof area than you listed.</Notice>}
            <p className="pt-2 text-xs text-slate-500">{r.assumptions}. Preliminary estimate only: real output depends on location, weather, shading, orientation and equipment.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

export function Reports({ a, go }) {
  const [per, setPer] = useState("monthly");
  if (a.empty) return <Empty go={go} />;
  const rows = [...a.periods[per]].reverse();

  return (
    <div className="space-y-4">
      <DemoBanner a={a} />
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={per} set={setPer} options={["daily", "weekly", "monthly"]} />
        <a href={`${BASE}/export?kind=report&period=${per}`}><Btn kind="ghost"><Download size={16} />Export report CSV</Btn></a>
        <a href={`${BASE}/export?kind=records`}><Btn kind="ghost"><Download size={16} />Export records CSV</Btn></a>
      </div>
      <Card title={`${per[0].toUpperCase() + per.slice(1)} summary${per === "weekly" ? " (week ending Sunday)" : ""}`}>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-slate-500 font-semibold uppercase text-xs">
              <tr>
                <th className="py-2">Period</th>
                <th>kWh</th>
                <th>Cost</th>
                <th>kg CO₂e (est.)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.period} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="py-2 font-medium">{r.period}</td>
                  <td className="font-semibold text-slate-800">{r.kwh}</td>
                  <td>{inr(r.cost)}</td>
                  <td className="text-slate-600">{r.co2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Trend">
        <Chart rows={a.periods[per].slice(-24)} kind="kwh" />
      </Card>
      <Card title="Recommendations">
        <div className="space-y-3">{a.recommendations.map((r) => <Rec key={r.title} r={r} />)}</div>
      </Card>
    </div>
  );
}
