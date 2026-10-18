import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, PenLine, Lightbulb, LineChart, Calculator as CalcIcon, Sun, FileText, Menu, X, Zap, Cpu } from "lucide-react";
import { api } from "./api";
import { Notice, Btn } from "./ui.jsx";
import { Dashboard, DataPage, Insights, DigitalTwin, Forecast, Calculator, Solar, Reports } from "./pages.jsx";

const NAV = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["data", "Energy data", PenLine],
  ["insights", "Insights", Lightbulb],
  ["twin", "Digital Twin", Cpu],
  ["forecast", "Forecast", LineChart],
  ["calculator", "Cost & carbon", CalcIcon],
  ["solar", "Solar planner", Sun],
  ["reports", "Reports", FileText]
];

export default function App() {
  const [page, setPage] = useState("dashboard"), [open, setOpen] = useState(false), [a, setA] = useState(null), [records, setRecords] = useState([]), [settings, setSettings] = useState(null), [err, setErr] = useState("");
  const refresh = useCallback(async () => {
    try { const [an, c] = await Promise.all([api("/analytics"), api("/consumption")]); setA(an); setRecords(c.records); setSettings(c.settings); setErr(""); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const go = (p) => { setPage(p); setOpen(false); window.scrollTo(0, 0); };
  const nav = (<nav className="space-y-1 p-3">{NAV.map(([k, label, I]) => (<button key={k} onClick={() => go(k)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm ${page === k ? "bg-green-800 text-white" : "text-slate-700 hover:bg-slate-100"}`}><I size={17} />{label}</button>))}</nav>);
  const body = () => {
    if (err) return <div className="space-y-3"><Notice tone="error">{err}</Notice><Btn onClick={refresh}>Retry</Btn></div>;
    if (!a) return <p className="text-sm text-slate-500" role="status">Loading your energy data…</p>;
    const p = { a, go, records, settings, refresh };
    return { dashboard: <Dashboard {...p} />, data: <DataPage {...p} />, insights: <Insights {...p} />, twin: <DigitalTwin {...p} />, forecast: <Forecast />, calculator: <Calculator key={JSON.stringify(settings)} {...p} />, solar: <Solar {...p} />, reports: <Reports {...p} /> }[page];
  };
  return (<div className="min-h-screen lg:flex">
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block"><div className="flex items-center gap-2 p-5 text-lg font-semibold text-green-800"><Zap size={20} />WattWise AI</div>{nav}</aside>
    <header className="flex items-center justify-between border-b border-slate-200 bg-white p-3 lg:hidden"><div className="flex items-center gap-2 font-semibold text-green-800"><Zap size={18} />WattWise AI</div>
      <button aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></header>
    {open && <div className="border-b border-slate-200 bg-white lg:hidden">{nav}</div>}
    <main className="min-w-0 flex-1 p-4 sm:p-6"><h1 className="mb-4 text-xl font-semibold">{NAV.find((n) => n[0] === page)[1]}</h1>{body()}</main></div>);
}
