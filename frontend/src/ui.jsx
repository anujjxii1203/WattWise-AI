export const inr = (n) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
export const num = (n, d = 1) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: d });
export const Card = ({ title, children, className = "" }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
    {title && <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>}{children}</section>);
export const Stat = ({ icon: I, label, value, sub }) => (
  <Card><div className="flex items-center gap-2 text-sm text-slate-500"><I size={16} className="text-green-800" />{label}</div>
    <div className="mt-2 text-2xl font-semibold">{value}</div>{sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}</Card>);
export const Notice = ({ tone = "info", children }) => (
  <div className={`rounded-lg border px-3 py-2 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-800" : tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-teal-200 bg-teal-50 text-teal-900"}`}>{children}</div>);
export const Field = ({ label, hint, ...p }) => (
  <label className="block text-sm"><span className="font-medium text-slate-700">{label}</span>
    <input {...p} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
    {hint && <span className="text-xs text-slate-500">{hint}</span>}</label>);
export const Btn = ({ kind = "primary", ...p }) => (
  <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${kind === "primary" ? "bg-green-800 text-white hover:bg-green-900" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"} ${p.className || ""}`} />);
export const Tabs = ({ value, set, options }) => (
  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
    {options.map((o) => <button key={o} onClick={() => set(o)} className={`rounded-md px-3 py-1 capitalize ${value === o ? "bg-green-800 text-white" : "text-slate-600"}`}>{o}</button>)}</div>);
export const Errors = ({ list }) => list?.length ? <Notice tone="error">{list.map((e, i) => <div key={i}>{e}</div>)}</Notice> : null;
