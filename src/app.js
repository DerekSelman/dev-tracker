import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const PHASES = [
  "Grading Lot","Walls","Pool","House Layout","Underground","Foundation",
  "Framing","Rough Mechanicals","Lathing","Drywall / Tape / Texture",
  "Paint","Cabinets","Floor Tile & Showers","Trim Out","Cleaning","Punch List",
];

const STATUS = { NOT_STARTED: "not_started", IN_PROGRESS: "in_progress", COMPLETE: "complete" };
const STATUS_CONFIG = {
  [STATUS.NOT_STARTED]: { label: "Not Started", dot: "#4b5563" },
  [STATUS.IN_PROGRESS]: { label: "In Progress", dot: "#f59e0b" },
  [STATUS.COMPLETE]:    { label: "Complete",    dot: "#10b981" },
};

function getOverallProgress(phases) {
  const total = PHASES.length;
  const complete = phases.filter(p => p.status === STATUS.COMPLETE).length;
  const inProgress = phases.filter(p => p.status === STATUS.IN_PROGRESS).length;
  return { complete, inProgress, total, pct: Math.round((complete / total) * 100) };
}

function getCurrentPhase(phases) {
  const ip = phases.find(p => p.status === STATUS.IN_PROGRESS);
  if (ip) return ip.phase_name;
  const next = phases.find(p => p.status === STATUS.NOT_STARTED);
  return next ? next.phase_name : "Complete";
}

function countOverdue(phases) {
  const today = new Date().toISOString().split("T")[0];
  return phases.filter(p => p.projected_end && p.projected_end < today && p.status !== STATUS.COMPLETE).length;
}

function isPhaseOverdue(ph) {
  const today = new Date().toISOString().split("T")[0];
  return ph.projected_end && ph.projected_end < today && ph.status !== STATUS.COMPLETE;
}

function daysDiff(date) {
  if (!date) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(date + "T00:00:00"); d.setHours(0,0,0,0);
  return Math.round((today - d) / 86400000);
}

// Icons
const IconHardHat = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 18h20v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2z"/><path d="M12 2a8 8 0 0 1 8 8v2H4v-2a8 8 0 0 1 8-8z"/><path d="M12 2v10"/></svg>;
const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconBack = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const IconWarn = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconUpload = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IconFile = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;

const dateInputStyle = { background: "#111827", border: "1px solid #374151", borderRadius: 6, color: "#9ca3af", fontSize: 11, padding: "4px 6px", width: "100%", fontFamily: "'DM Sans', sans-serif", outline: "none", colorScheme: "dark" };
const labelStyle = { display: "block", fontSize: 11, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" };
const fieldStyle = { width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0", fontSize: 14, padding: "10px 12px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" };

// Auth Screen
function AuthScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");

  const handle = async () => {
    setLoading(true); setError("");
    const { error } = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "40px", width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ color: "#f59e0b" }}><IconHardHat /></div>
          <h1 style={{ margin: 0, fontSize: 22, fontFamily: "'DM Serif Display', serif", color: "#f1f5f9", fontWeight: 400 }}>Dev Tracker</h1>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={fieldStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" style={fieldStyle} onKeyDown={e => e.key === "Enter" && handle()} />
        </div>
        {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <button onClick={handle} disabled={loading} style={{ width: "100%", background: "#f59e0b", color: "#000", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>
        <div style={{ textAlign: "center", fontSize: 13, color: "#64748b" }}>
          {mode === "login" ? "Need an account? " : "Already have an account? "}
          <span onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{ color: "#f59e0b", cursor: "pointer" }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </span>
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
    </div>
  );
}

// Phase Row
function PhaseRow({ phase, lotId, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const overdue = isPhaseOverdue(phase);
  const cfg = STATUS_CONFIG[phase.status];
  const diff = overdue ? daysDiff(phase.projected_end) : null;

  useEffect(() => { loadFiles(); }, []);

  const loadFiles = async () => {
    const { data } = await supabase.from("files").select("*").eq("lot_id", lotId).eq("phase_name", phase.phase_name);
    if (data) setFiles(data);
  };

  const cycleStatus = async () => {
    const order = [STATUS.NOT_STARTED, STATUS.IN_PROGRESS, STATUS.COMPLETE];
    const newStatus = order[(order.indexOf(phase.status) + 1) % 3];
    await supabase.from("phases").update({ status: newStatus }).eq("id", phase.id);
    onUpdate();
  };

  const updateField = async (field, value) => {
    await supabase.from("phases").update({ [field]: value || null }).eq("id", phase.id);
    onUpdate();
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const path = `${lotId}/${phase.phase_name}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("lot-files").upload(path, file);
    if (!error) {
      await supabase.from("files").insert({ lot_id: lotId, phase_name: phase.phase_name, file_name: file.name, file_path: path });
      loadFiles();
    }
    setUploading(false);
  };

  const openFile = async (path) => {
    const { data } = supabase.storage.from("lot-files").getPublicUrl(path);
    window.open(data.publicUrl, "_blank");
  };

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "grid", gridTemplateColumns: "34px 1fr 108px 108px 108px 108px 120px", gap: 7, alignItems: "center", padding: "9px 12px", borderRadius: expanded ? "8px 8px 0 0" : 8, background: overdue ? "#3b0a0a" : phase.status === STATUS.COMPLETE ? "#064e3b18" : phase.status === STATUS.IN_PROGRESS ? "#292006" : "transparent", borderLeft: `3px solid ${overdue ? "#ef4444" : cfg.dot}`, transition: "background 0.2s" }}>
        <button onClick={cycleStatus} style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${overdue ? "#ef4444" : cfg.dot}`, background: phase.status === STATUS.COMPLETE ? cfg.dot : "transparent", color: phase.status === STATUS.COMPLETE ? "#fff" : overdue ? "#ef4444" : cfg.dot, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
          {phase.status === STATUS.COMPLETE ? <IconCheck /> : phase.status === STATUS.IN_PROGRESS ? "▶" : ""}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: overdue ? "#fca5a5" : phase.status === STATUS.COMPLETE ? "#6b7280" : "#e5e7eb", textDecoration: phase.status === STATUS.COMPLETE ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{phase.phase_name}</span>
          {overdue && <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#7f1d1d", color: "#fca5a5", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}><IconWarn />{diff}d late</span>}
          {files.length > 0 && <span style={{ background: "#1e3a5f", color: "#60a5fa", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 20, flexShrink: 0 }}>{files.length} file{files.length > 1 ? "s" : ""}</span>}
        </div>
        <input type="date" defaultValue={phase.projected_start || ""} onBlur={e => updateField("projected_start", e.target.value)} style={dateInputStyle} />
        <input type="date" defaultValue={phase.projected_end || ""} onBlur={e => updateField("projected_end", e.target.value)} style={{ ...dateInputStyle, borderColor: overdue ? "#7f1d1d" : "#374151", color: overdue ? "#fca5a5" : "#9ca3af" }} />
        <input type="date" defaultValue={phase.actual_start || ""} onBlur={e => updateField("actual_start", e.target.value)} style={{ ...dateInputStyle, borderColor: "#1e3a5f", color: phase.actual_start ? "#93c5fd" : "#4b5563" }} />
        <input type="date" defaultValue={phase.actual_end || ""} onBlur={e => updateField("actual_end", e.target.value)} style={{ ...dateInputStyle, borderColor: phase.actual_end ? "#064e3b" : "#1e3a5f", color: phase.actual_end ? "#6ee7b7" : "#4b5563" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <button onClick={cycleStatus} style={{ padding: "3px 8px", borderRadius: 20, border: `1px solid ${overdue ? "#ef444444" : cfg.dot + "44"}`, background: overdue ? "#ef444418" : `${cfg.dot}18`, color: overdue ? "#ef4444" : cfg.dot, fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "uppercase", whiteSpace: "nowrap" }}>{overdue ? "Overdue" : cfg.label}</button>
          <button onClick={() => setExpanded(p => !p)} style={{ background: (phase.notes || files.length > 0) ? "#1e3a5f" : "transparent", border: `1px solid ${(phase.notes || files.length > 0) ? "#2563eb" : "#374151"}`, borderRadius: 6, color: (phase.notes || files.length > 0) ? "#60a5fa" : "#4b5563", width: 26, height: 26, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✎</button>
        </div>
      </div>

      {expanded && (
        <div style={{ background: "#0d1526", border: "1px solid #1e293b", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "12px" }}>
          <input defaultValue={phase.notes || ""} onBlur={e => updateField("notes", e.target.value)} placeholder="Notes for this phase…" style={{ ...fieldStyle, fontSize: 13, padding: "8px 10px", background: "#111827", marginBottom: 10 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "#94a3b8" }}>
              <IconUpload />{uploading ? "Uploading…" : "Upload File"}
              <input type="file" onChange={uploadFile} style={{ display: "none" }} />
            </label>
            {files.map(f => (
              <button key={f.id} onClick={() => openFile(f.file_path)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, color: "#60a5fa" }}>
                <IconFile />{f.file_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Lot Detail
function LotDetail({ lot, onBack, onDelete, onUpdate }) {
  const [phases, setPhases] = useState([]);
  const [local, setLocal] = useState(lot);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPhases(); }, [lot.id]);

  const loadPhases = async () => {
    const { data } = await supabase.from("phases").select("*").eq("lot_id", lot.id).order("id");
    if (data) setPhases(data);
  };

  const saveField = async (field, value) => {
    setSaving(true);
    await supabase.from("lots").update({ [field]: value }).eq("id", lot.id);
    onUpdate();
    setSaving(false);
  };

  const prog = getOverallProgress(phases);
  const overdueCnt = countOverdue(phases);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", color: "#e5e7eb", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1150, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "#1e293b", border: "none", color: "#94a3b8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><IconBack /> Dashboard</button>
          <div style={{ flex: 1 }}>
            <input defaultValue={local.address} onBlur={e => { setLocal(p => ({ ...p, address: e.target.value })); saveField("address", e.target.value); }} placeholder="Enter lot address…" style={{ background: "transparent", border: "none", color: "#f1f5f9", fontSize: 19, fontWeight: 700, fontFamily: "'DM Serif Display', serif", outline: "none", width: "100%" }} />
          </div>
          {saving && <span style={{ fontSize: 12, color: "#64748b" }}>Saving…</span>}
          <button onClick={() => { if (window.confirm("Delete this lot?")) onDelete(lot.id); }} style={{ background: "#7f1d1d44", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><IconTrash /> Delete</button>
        </div>
      </div>

      <div style={{ maxWidth: 1150, margin: "0 auto", padding: "22px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
          <div><label style={labelStyle}>Owner Name</label><input defaultValue={local.owner} onBlur={e => saveField("owner", e.target.value)} placeholder="Owner / Developer" style={fieldStyle} /></div>
          <div><label style={labelStyle}>Budget</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 14 }}>$</span>
              <input type="number" defaultValue={local.budget} onBlur={e => saveField("budget", e.target.value)} placeholder="0" style={{ ...fieldStyle, paddingLeft: 24 }} />
            </div>
          </div>
          <div><label style={labelStyle}>Lot Notes</label><input defaultValue={local.notes} onBlur={e => saveField("notes", e.target.value)} placeholder="General notes…" style={fieldStyle} /></div>
          <div style={{ background: "#0f172a", borderRadius: 12, border: `1px solid ${overdueCnt > 0 ? "#7f1d1d" : "#1e293b"}`, padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Progress</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>{prog.pct}%</span>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 99, height: 7, overflow: "hidden", marginBottom: 7 }}>
              <div style={{ width: `${prog.pct}%`, height: "100%", background: "linear-gradient(90deg, #059669, #10b981)", borderRadius: 99, transition: "width 0.4s" }} />
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{prog.complete}/{prog.total} phases complete</div>
            {overdueCnt > 0 && <div style={{ marginTop: 5, fontSize: 11, color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}><IconWarn />{overdueCnt} overdue</div>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "34px 1fr 108px 108px 108px 108px 120px", gap: 7, padding: "4px 12px", marginBottom: 3 }}>
          <div /><div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>Phase</div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>Proj. Start</div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>Proj. End</div>
          <div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase" }}>Act. Start</div>
          <div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase" }}>Act. End</div>
          <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase" }}>Status</div>
        </div>

        {phases.map(phase => (
          <PhaseRow key={phase.id} phase={phase} lotId={lot.id} onUpdate={loadPhases} />
        ))}
      </div>
    </div>
  );
}

// Dashboard
function Dashboard({ user, onSelect, onSignOut }) {
  const [lots, setLots] = useState([]);
  const [sortBy, setSortBy] = useState("added");
  const [filterBy, setFilterBy] = useState("all");
  const [lotPhases, setLotPhases] = useState({});

  useEffect(() => { loadLots(); }, []);

  const loadLots = async () => {
    const { data: lotsData } = await supabase.from("lots").select("*").order("created_at");
    if (lotsData) {
      setLots(lotsData);
      for (const lot of lotsData) {
        const { data: phases } = await supabase.from("phases").select("*").eq("lot_id", lot.id);
        if (phases) setLotPhases(p => ({ ...p, [lot.id]: phases }));
      }
    }
  };

  const addLot = async () => {
    const { data: lotData } = await supabase.from("lots").insert({ address: "", owner: "", budget: "", notes: "" }).select().single();
    if (lotData) {
      const phaseRows = PHASES.map(name => ({ lot_id: lotData.id, phase_name: name, status: STATUS.NOT_STARTED }));
      await supabase.from("phases").insert(phaseRows);
      loadLots();
      onSelect(lotData);
    }
  };

  const deleteLot = async (id) => {
    await supabase.from("lots").delete().eq("id", id);
    loadLots();
  };

  const getPhases = (lotId) => lotPhases[lotId] || [];

  const filtered = lots.filter(l => {
    const phases = getPhases(l.id);
    if (filterBy === "inprogress") return phases.some(p => p.status === STATUS.IN_PROGRESS);
    if (filterBy === "overdue") return countOverdue(phases) > 0;
    if (filterBy === "complete") return getOverallProgress(phases).pct === 100;
    if (filterBy === "notstarted") return getOverallProgress(phases).pct === 0;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const ap = getPhases(a.id), bp = getPhases(b.id);
    if (sortBy === "progress_desc") return getOverallProgress(bp).pct - getOverallProgress(ap).pct;
    if (sortBy === "progress_asc") return getOverallProgress(ap).pct - getOverallProgress(bp).pct;
    if (sortBy === "overdue") return countOverdue(bp) - countOverdue(ap);
    if (sortBy === "address") return (a.address || "").localeCompare(b.address || "");
    return 0;
  });

  const totalOverdue = lots.reduce((s, l) => s + countOverdue(getPhases(l.id)), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", color: "#e5e7eb", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "linear-gradient(180deg, #0f172a 0%, #0a0f1a 100%)", borderBottom: "1px solid #1e293b", padding: "24px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ color: "#f59e0b" }}><IconHardHat /></div>
              <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#64748b", fontWeight: 600 }}>Construction Management</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 30, fontFamily: "'DM Serif Display', serif", color: "#f1f5f9", fontWeight: 400 }}>Development Tracker</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>{user.email}</span>
            <button onClick={onSignOut} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Sign Out</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px" }}>
        {lots.length > 0 && (
          <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total Lots", value: lots.length, color: "#94a3b8", warn: false },
              { label: "In Progress", value: lots.filter(l => getPhases(l.id).some(p => p.status === STATUS.IN_PROGRESS)).length, color: "#f59e0b", warn: false },
              { label: "Fully Complete", value: lots.filter(l => getOverallProgress(getPhases(l.id)).pct === 100).length, color: "#10b981", warn: false },
              { label: "Overdue Phases", value: totalOverdue, color: totalOverdue > 0 ? "#ef4444" : "#4b5563", warn: totalOverdue > 0 },
            ].map(s => (
              <div key={s.label} style={{ background: "#0f172a", border: `1px solid ${s.warn ? "#7f1d1d" : "#1e293b"}`, borderRadius: 12, padding: "14px 20px", flex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: "'DM Serif Display', serif" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {lots.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
            {[["all","All"],["inprogress","In Progress"],["overdue","Overdue"],["complete","Complete"],["notstarted","Not Started"]].map(([val,lbl]) => (
              <button key={val} onClick={() => setFilterBy(val)} style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${filterBy === val ? "#f59e0b" : "#1e293b"}`, background: filterBy === val ? "#f59e0b18" : "transparent", color: filterBy === val ? "#f59e0b" : "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: filterBy === val ? 700 : 400 }}>{lbl}</button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Sort:</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#94a3b8", fontSize: 12, padding: "5px 10px", fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer" }}>
                <option value="added">Date Added</option>
                <option value="progress_desc">Most Progress</option>
                <option value="progress_asc">Least Progress</option>
                <option value="overdue">Most Overdue</option>
                <option value="address">Address A–Z</option>
              </select>
            </div>
          </div>
        )}

        {lots.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
            <p style={{ fontSize: 18, margin: 0, color: "#4b5563" }}>No lots yet. Add your first development below.</p>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 16, margin: 0, color: "#4b5563" }}>No lots match this filter.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 24 }}>
            {sorted.map(lot => {
              const phases = getPhases(lot.id);
              const prog = getOverallProgress(phases);
              const overdue = countOverdue(phases);
              return (
                <div key={lot.id} onClick={() => onSelect(lot)} style={{ background: "#0f172a", border: `1px solid ${overdue > 0 ? "#7f1d1d" : "#1e293b"}`, borderRadius: 14, padding: "20px", cursor: "pointer", transition: "border-color 0.15s, transform 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = overdue > 0 ? "#ef4444" : "#f59e0b66"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = overdue > 0 ? "#7f1d1d" : "#1e293b"; e.currentTarget.style.transform = "none"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>LOT</div>
                    {overdue > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#7f1d1d", color: "#fca5a5", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}><IconWarn />{overdue} overdue</span>}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Serif Display', serif", marginBottom: 3, minHeight: 26 }}>
                    {lot.address || <span style={{ color: "#374151", fontStyle: "italic", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>No address set</span>}
                  </div>
                  {lot.owner && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 1 }}>{lot.owner}</div>}
                  {lot.budget && <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>${Number(lot.budget).toLocaleString()}</div>}
                  <div style={{ background: "#1e293b", borderRadius: 99, height: 6, overflow: "hidden", marginBottom: 8, marginTop: 10 }}>
                    <div style={{ width: `${prog.pct}%`, height: "100%", background: prog.pct === 100 ? "#10b981" : "linear-gradient(90deg,#d97706,#f59e0b)", borderRadius: 99 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#475569" }}>{prog.complete}/{prog.total} phases</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: prog.pct === 100 ? "#064e3b44" : "#292006", color: prog.pct === 100 ? "#10b981" : "#f59e0b", fontWeight: 600 }}>{prog.pct}%</span>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1e293b", fontSize: 12, color: "#475569" }}>
                    <span style={{ color: "#64748b" }}>Current: </span>{getCurrentPhase(phases)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={addLot} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f59e0b", color: "#000", border: "none", borderRadius: 10, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={e => e.currentTarget.style.background = "#fbbf24"}
          onMouseLeave={e => e.currentTarget.style.background = "#f59e0b"}>
          <IconPlus /> Add New Lot
        </button>
      </div>
    </div>
  );
}

// App Root
export default function App() {
  const [user, setUser] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [lots, setLots] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  const reloadLot = async () => {
    if (!selectedLot) return;
    const { data } = await supabase.from("lots").select("*").eq("id", selectedLot.id).single();
    if (data) setSelectedLot(data);
  };

  if (!user) return <AuthScreen />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0f1a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        select option { background: #0f172a; }
      `}</style>
      {selectedLot
        ? <LotDetail lot={selectedLot} onBack={() => setSelectedLot(null)} onDelete={async (id) => { await supabase.from("lots").delete().eq("id", id); setSelectedLot(null); }} onUpdate={reloadLot} />
        : <Dashboard user={user} onSelect={setSelectedLot} onSignOut={signOut} />}
    </>
  );
}
