import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { G, Icons } from "../utils";
import { uploadThumbnail, thumbPath } from "../thumbs";

export const IDEA_CATEGORIES = ["Kitchen", "Bath", "Exterior", "Garage/RV", "Pool/Yard", "Electrical", "Plumbing", "Finishes", "Other"];
const STATUSES = [
  { id: "new", label: "New", bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af" },
  { id: "planned", label: "Planned", bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
  { id: "used", label: "Used", bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
  { id: "not_doing", label: "Not doing", bg: "#f1f5f9", border: "#e2e8f0", color: "#64748b" },
];
const statusOf = (id) => STATUSES.find(s => s.id === id) || STATUSES[0];
const url = (p) => supabase.storage.from("lot-files").getPublicUrl(p).data.publicUrl;

export default function IdeaBoard({ onBack, user, isMobile }) {
  const [ideas, setIdeas] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Other");
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("open");
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const fileRef = useRef(null);

  const load = async () => {
    const [{ data: i }, { data: l }] = await Promise.all([
      supabase.from("ideas").select("*").order("created_at", { ascending: false }),
      supabase.from("lots").select("id, address, archived").order("address"),
    ]);
    setIdeas(i || []);
    setLots((l || []).filter(x => x.address && x.address.trim()));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addIdea = async () => {
    if (!text.trim()) return;
    setSaving(true);
    let photo_path = null;
    if (photo) {
      const path = `ideas/${Date.now()}_${photo.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("lot-files").upload(path, photo);
      if (!error) { photo_path = path; await uploadThumbnail(photo, path); }
    }
    const { error } = await supabase.from("ideas").insert({ idea: text.trim(), category, photo_path, created_by: user.id, created_by_email: user.email });
    if (error) alert("Could not save idea: " + error.message);
    setText(""); setPhoto(null); if (fileRef.current) fileRef.current.value = "";
    setSaving(false);
    load();
  };

  const update = async (id, fields) => {
    setIdeas(p => p.map(i => i.id === id ? { ...i, ...fields } : i));
    const { error } = await supabase.from("ideas").update(fields).eq("id", id);
    if (error) { alert("Could not update: " + error.message); load(); }
  };

  const remove = async (idea) => {
    if (!window.confirm("Delete this idea?")) return;
    await supabase.from("ideas").delete().eq("id", idea.id);
    if (idea.photo_path) await supabase.storage.from("lot-files").remove([idea.photo_path, thumbPath(idea.photo_path)]);
    load();
  };

  const shown = ideas.filter(i =>
    (statusFilter === "all" || (statusFilter === "open" ? ["new", "planned"].includes(i.status || "new") : (i.status || "new") === statusFilter)) &&
    (catFilter === "all" || i.category === catFilter) &&
    (!search || i.idea.toLowerCase().includes(search.toLowerCase()))
  );

  const field = { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#1e293b", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" };
  const counts = Object.fromEntries(STATUSES.map(s => [s.id, ideas.filter(i => (i.status || "new") === s.id).length]));

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "1.5px solid #333", color: "#94a3b8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><Icons.Back /> Dashboard</button>
          <div style={{ fontSize: 18, fontFamily: "'DM Serif Display', serif", color: "#fff" }}>Idea Board</div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? 16 : "20px 24px" }}>
        {/* Quick add */}
        <div style={{ background: "#fff", border: `1.5px solid ${G}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="What should the next house have? e.g. Outlet inside the pantry for the microwave"
            style={{ ...field, width: "100%", resize: "vertical", fontSize: 14, marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={category} onChange={e => setCategory(e.target.value)} style={field}>
              {IDEA_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <label style={{ ...field, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: photo ? "#15803d" : "#64748b" }}>
              <Icons.Camera /> {photo ? "Photo added" : "Add photo"}
              <input ref={fileRef} type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0] || null)} style={{ display: "none" }} />
            </label>
            <div style={{ flex: 1 }} />
            <button onClick={addIdea} disabled={saving || !text.trim()} style={{ background: text.trim() ? "#000" : "#f1f5f9", color: text.trim() ? G : "#cbd5e1", border: `2px solid ${text.trim() ? G : "#e2e8f0"}`, borderRadius: 10, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: text.trim() ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}>
              {saving ? "Saving..." : "Add Idea"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
          {[["open", `Open (${counts.new + counts.planned})`], ...STATUSES.map(s => [s.id, `${s.label} (${counts[s.id]})`]), ["all", `All (${ideas.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => setStatusFilter(id)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${statusFilter === id ? G : "#e2e8f0"}`, background: statusFilter === id ? "#f0fdf4" : "#fff", color: statusFilter === id ? "#15803d" : "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: statusFilter === id ? 700 : 500, whiteSpace: "nowrap", flexShrink: 0 }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas..." style={{ ...field, flex: "1 1 200px" }} />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={field}>
            <option value="all">All categories</option>
            {IDEA_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>Loading...</div> :
          shown.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 0", color: "#94a3b8", fontSize: 14 }}>
              {ideas.length === 0 ? "No ideas yet. Add the first one from your next walkthrough." : "No ideas match these filters."}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
              {shown.map(i => {
                const st = statusOf(i.status);
                return (
                  <div key={i.id} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8, opacity: i.status === "not_doing" ? 0.7 : 1 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      {i.photo_path && (
                        <img src={url(thumbPath(i.photo_path))} onError={e => { if (!e.currentTarget.dataset.f) { e.currentTarget.dataset.f = 1; e.currentTarget.src = url(i.photo_path); } }}
                          onClick={() => window.open(url(i.photo_path), "_blank")} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, flexShrink: 0, cursor: "pointer", background: "#f1f5f9" }} />
                      )}
                      <textarea defaultValue={i.idea} rows={Math.min(5, Math.max(2, Math.ceil(i.idea.length / 38)))}
                        onBlur={e => { const v = e.target.value.trim(); if (v && v !== i.idea) update(i.id, { idea: v }); }}
                        style={{ flex: 1, border: "none", resize: "none", fontSize: 14, color: "#1e293b", fontFamily: "'DM Sans', sans-serif", outline: "none", padding: 0, background: "transparent", textDecoration: i.status === "not_doing" ? "line-through" : "none" }} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <select value={i.category || "Other"} onChange={e => update(i.id, { category: e.target.value })} style={{ ...field, padding: "3px 6px", fontSize: 11, fontWeight: 600, color: "#475569" }}>
                        {IDEA_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <select value={i.status || "new"} onChange={e => update(i.id, { status: e.target.value })} style={{ ...field, padding: "3px 6px", fontSize: 11, fontWeight: 700, background: st.bg, borderColor: st.border, color: st.color }}>
                        {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <select value={i.target_lot_id || ""} onChange={e => update(i.id, { target_lot_id: e.target.value || null, ...(e.target.value && (i.status || "new") === "new" ? { status: "planned" } : {}) })} style={{ ...field, padding: "3px 6px", fontSize: 11, flex: 1, minWidth: 120, color: i.target_lot_id ? "#1e293b" : "#94a3b8" }}>
                        <option value="">For which house?</option>
                        {lots.filter(l => !l.archived || l.id === i.target_lot_id).map(l => <option key={l.id} value={l.id}>{l.address}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#94a3b8", borderTop: "1px solid #f1f5f9", paddingTop: 6 }}>
                      <span>{i.created_by_email || "Unknown"} · {new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <button onClick={() => remove(i)} title="Delete idea" style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer" }}><Icons.Trash /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}
