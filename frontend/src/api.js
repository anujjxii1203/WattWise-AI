export const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export async function api(path, { method = "GET", body } = {}) {
  const isForm = body instanceof FormData;
  let res;
  try {
    res = await fetch(BASE + path, { method, headers: isForm || !body ? {} : { "Content-Type": "application/json" }, body: isForm ? body : body ? JSON.stringify(body) : undefined });
  } catch { throw new Error("Cannot reach the backend. Start it with: python app.py"); }
  let json;
  try { json = await res.json(); } catch { throw new Error("Backend returned an invalid response."); }
  if (!json.success) { const e = new Error(json.error || "Request failed"); e.details = json.details; throw e; }
  return json.data;
}
