import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase";
import { G, Icons } from "../utils";

const PAGE = 200;

const CATEGORY = (action = "") => {
  if (action.startsWith("status")) return "Status";
  if (action.startsWith("date")) return "Dates";
  if (action.startsWith("photo")) return "Photos";
  if (action.startsWith("checklist")) return "Checklist";
  if (action.startsWith("punch") || action.startsWith("signature")) return "Punch List";
  if (action.startsWith("note") || action === "lot_edit") return "Notes & Edits";
  if (action.startsWith("lot_")) return "Properties";
  if (action.startsWith("document") || action.startsWith("finishes")) return "Documents";
  if (action.startsWith("loan")) return "Loans";
  if (action.startsWith("warranty")) return "Warranty";
  if (action.startsWith("prospect")) return "Pipeline";
  return "Other";
};

const dayLabel = (d) => {
  const today = new Date(); const y = new Date(); y.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, y)) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
};

export default function GlobalActivity({ onBack, onSelectLot, isMobile }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [person, setPerson] = useState("all");
  const [property, setProperty] = useState("all");
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");

  const load = async (before) => {
    setLoading(true);
    let q = supabase.from("activity_log").select("id, created_at, action, details, user_email, lot_id, address, lots(id, address, owner, budget, notes, lot_type, archived, last_activity, created_at)")
      .order("created_at", { ascending: false }).limit(PAGE);
    if (before) q = q.lt("created_at", before);
    const { data } = await q;
    const list = data || [];
    setRows(p => before ? [...p, ...list] : list);
    setHasMore(list.length === PAGE);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addr = (r) => (r.lots?.address || r.address || "Unknown").trim();
  const people = useMemo(() => [...new Set(rows.map(r => r.user_email).filter(Boolean))].sort(), [rows]);
  const properties = useMemo(() => [...new Set(rows.map(addr))].sort(), [rows]);
  const kinds = useMemo(() => [...new Set(rows.map(r => CATEGORY(r.action)))].sort(), [rows]);

  const shown = rows.filter(r =>
    (person === "all" || r.user_email === person) &&
    (property === "all" || addr(r) === property) &&
    (kind === "all" || CATEGORY(r.action) === kind) &&
    (!search || `${r.details} ${addr(r)} ${r.user_email}`.toLowerCase().includes(search.toLowerCase()))
  );

  const groups = [];
  for (const r of shown) {
    const label = dayLabel(new Date(r.created_at));
    if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, items: [] });
    groups[groups.length - 1].items.push(r);
  }

  const sel = { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "#1e293b", fontFamily: "'DM Sans', sans-serif", minWidth: 0, flex: isMobile ? "1 1 45%" : "0 1 auto" };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "1.5px solid #333", color: "#94a3b8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><Icons.Back /> Dashboard</button>
          <div style={{ fontSize: 18, fontFamily: "'DM Serif Display', serif", color: "#fff" }}>Activity</div>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "16px" : "20px 24px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activity..." style={{ ...sel, flex: "1 1 200px" }} />
          <select value={person} onChange={e => setPerson(e.target.value)} style={sel}>
            <option value="all">Everyone</option>
            {people.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={property} onChange={e => setProperty(e.target.value)} style={sel}>
            <option value="all">All properties</option>
            {properties.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={kind} onChange={e => setKind(e.target.value)} style={sel}>
            <option value="all">All changes</option>
            {kinds.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {!loading && shown.length === 0 && <div style={{ textAlign: "center", padding: "50px 0", color: "#94a3b8", fontSize: 14 }}>No activity matches these filters.</div>}

        {groups.map(g => (
          <div key={g.label} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{g.label} <span style={{ color: "#94a3b8" }}>({g.items.length})</span></div>
            <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              {g.items.map((r, i) => (
                <div key={r.id} style={{ display: "flex", gap: 12, padding: "11px 14px", borderTop: i ? "1px solid #f1f5f9" : "none", alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#000", border: `2px solid ${G}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, color: G, fontWeight: 700 }}>
                    {(r.user_email || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 500, marginBottom: 3, wordBreak: "break-word" }}>{r.details}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 11 }}>
                      {r.lots ? (
                        <button onClick={() => onSelectLot(r.lots)} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{addr(r)}</button>
                      ) : (
                        <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 20, padding: "1px 8px", fontWeight: 600 }}>{addr(r)}</span>
                      )}
                      <span style={{ color: "#64748b" }}>{r.user_email}</span>
                      <span style={{ color: "#cbd5e1" }}>·</span>
                      <span style={{ color: "#94a3b8" }}>{new Date(r.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {loading && <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>Loading...</div>}
        {!loading && hasMore && rows.length > 0 && (
          <div style={{ textAlign: "center" }}>
            <button onClick={() => load(rows[rows.length - 1].created_at)} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 18px", fontSize: 13, cursor: "pointer", color: "#475569", fontFamily: "'DM Sans', sans-serif" }}>Load older activity</button>
          </div>
        )}
      </div>
    </div>
  );
}
