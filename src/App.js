import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const PHASES = [
  "Grading Lot","Walls","Pool","House Layout","Underground","Foundation",
  "Framing","Rough Mechanicals","Lathing","Drywall / Tape / Texture",
  "Paint","Cabinets","Floor Tile & Showers","Trim Out","Cleaning","Punch List",
];

const STATUS = { NOT_STARTED: "not_started", IN_PROGRESS: "in_progress", COMPLETE: "complete" };
const STATUS_CONFIG = {
  [STATUS.NOT_STARTED]: { label: "Not Started", dot: "#94a3b8" },
  [STATUS.IN_PROGRESS]: { label: "In Progress", dot: "#f59e0b" },
  [STATUS.COMPLETE]:    { label: "Complete",    dot: "#22c55e" },
};

const G = "#4ade80"; // lime green accent
const G2 = "#16a34a"; // darker green
const G3 = "#f0fdf4"; // light green bg

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

function formatCurrency(n) {
  if (!n) return "$0";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function calcMonthlyInterest(amount, rate) { return (amount * (rate / 100)) / 12; }
function calcDailyInterest(amount, rate) { return (amount * (rate / 100)) / 365; }

// Icons
const IconHardHat = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 18h20v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2z"/><path d="M12 2a8 8 0 0 1 8 8v2H4v-2a8 8 0 0 1 8-8z"/><path d="M12 2v10"/></svg>;
const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconBack = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const IconTrash = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const IconWarn = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconUpload = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IconFile = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconChevron = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;
const IconCamera = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const IconLink = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IconClock = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

const labelStyle = { display: "block", fontSize: 11, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 };
const fieldStyle = { width: "100%", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, color: "#1e293b", fontSize: 14, padding: "9px 12px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" };
const dateInputStyle = { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 6, color: "#475569", fontSize: 11, padding: "4px 6px", width: "100%", fontFamily: "'DM Sans', sans-serif", outline: "none" };
const cardStyle = { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const tabBtnStyle = (active) => ({ padding: "8px 16px", borderRadius: 8, border: active ? `2px solid ${G}` : "2px solid transparent", background: active ? G3 : "transparent", color: active ? G2 : "#64748b", fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", transition: "all 0.15s" });
const btnGreen = { background: "#000", color: G, border: `2px solid ${G}`, borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", gap: 7, transition: "all 0.15s" };
const btnOutline = { background: "#fff", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", gap: 7 };

// Auth Screen
function AuthScreen() {
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
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 20, padding: 36, width: "100%", maxWidth: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ background: "#000", borderRadius: 10, padding: 8, color: G }}><IconHardHat /></div>
          <div>
            <div style={{ fontSize: 20, fontFamily: "'DM Serif Display', serif", color: "#0f172a", fontWeight: 400, lineHeight: 1.2 }}>Dev Tracker</div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>Selman & Associates</div>
          </div>
        </div>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${G}, #000)`, borderRadius: 2, marginBottom: 24 }} />
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={fieldStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" style={fieldStyle} onKeyDown={e => e.key === "Enter" && handle()} />
        </div>
        {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 14, background: "#fef2f2", padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
        <button onClick={handle} disabled={loading} style={{ width: "100%", background: "#000", color: G, border: `2px solid ${G}`, borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 14 }}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
        <div style={{ textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
          {mode === "login" ? "Need an account? " : "Already have an account? "}
          <span onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{ color: G2, cursor: "pointer", fontWeight: 600 }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </span>
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
    </div>
  );
}

// Investor View
function InvestorView({ token }) {
  const [lot, setLot] = useState(null);
  const [phases, setPhases] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, [token]);

  const loadData = async () => {
    const { data: tokenData } = await supabase.from("investor_tokens").select("*").eq("token", token).single();
    if (!tokenData) { setError("Invalid or expired link."); setLoading(false); return; }
    const { data: lotData } = await supabase.from("lots").select("*").eq("id", tokenData.lot_id).single();
    if (lotData) setLot(lotData);
    const { data: phasesData } = await supabase.from("phases").select("*").eq("lot_id", tokenData.lot_id);
    if (phasesData) setPhases(phasesData.sort((a, b) => PHASES.indexOf(a.phase_name) - PHASES.indexOf(b.phase_name)));
    const { data: photosData } = await supabase.from("phase_photos").select("*").eq("lot_id", tokenData.lot_id).order("created_at", { ascending: false });
    if (photosData) setPhotos(photosData);
    setLoading(false);
  };

  const getPhotoUrl = (path) => supabase.storage.from("lot-files").getPublicUrl(path).data.publicUrl;

  if (loading) return <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>;
  if (error) return <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontFamily: "'DM Sans', sans-serif" }}>{error}</div>;

  const prog = getOverallProgress(phases);
  const inProgress = phases.filter(p => p.status === STATUS.IN_PROGRESS);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; } body { margin: 0; }`}</style>
      <div style={{ background: "#000", padding: "20px 24px", borderBottom: `3px solid ${G}` }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ color: G }}><IconHardHat /></div>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase" }}>Project Update · Selman & Associates</div>
            <div style={{ fontSize: 20, fontFamily: "'DM Serif Display', serif", color: "#fff" }}>{lot?.address || "Development Project"}</div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Overall Progress", value: `${prog.pct}%`, color: G2 },
            { label: "Phases Complete", value: `${prog.complete}/${prog.total}`, color: "#0f172a" },
            { label: "In Progress", value: prog.inProgress, color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ ...cardStyle, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: "'DM Serif Display', serif" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Construction Progress</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: G2 }}>{prog.pct}%</span>
          </div>
          <div style={{ background: "#f1f5f9", borderRadius: 99, height: 12, overflow: "hidden" }}>
            <div style={{ width: `${prog.pct}%`, height: "100%", background: `linear-gradient(90deg, #000, ${G})`, borderRadius: 99, transition: "width 0.4s" }} />
          </div>
        </div>
        {inProgress.length > 0 && (
          <div style={{ ...cardStyle, borderLeft: `4px solid ${G}`, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: G2, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Currently In Progress</div>
            {inProgress.map(p => <div key={p.id} style={{ fontSize: 14, color: "#1e293b", marginBottom: 4, fontWeight: 500 }}>{p.phase_name}</div>)}
          </div>
        )}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Phase Status</div>
          {phases.map(phase => {
            const cfg = STATUS_CONFIG[phase.status];
            return (
              <div key={phase.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, color: phase.status === STATUS.COMPLETE ? "#94a3b8" : "#1e293b", textDecoration: phase.status === STATUS.COMPLETE ? "line-through" : "none" }}>{phase.phase_name}</span>
                <span style={{ fontSize: 12, color: cfg.dot, fontWeight: 700 }}>{cfg.label}</span>
                {phase.projected_end && <span style={{ fontSize: 11, color: "#94a3b8" }}>{phase.projected_end}</span>}
              </div>
            );
          })}
        </div>
        {photos.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Project Photos</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
              {photos.map(photo => (
                <div key={photo.id} onClick={() => window.open(getPhotoUrl(photo.file_path), "_blank")} style={{ borderRadius: 10, overflow: "hidden", cursor: "pointer", aspectRatio: "1", background: "#f1f5f9" }}>
                  <img src={getPhotoUrl(photo.file_path)} alt={photo.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "#cbd5e1" }}>Selman & Associates · Dev Tracker</div>
      </div>
    </div>
  );
}

// Phase Row
function PhaseRow({ phase, lotId, onUpdate, isMobile, user }) {
  const [expanded, setExpanded] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const overdue = isPhaseOverdue(phase);
  const cfg = STATUS_CONFIG[phase.status];
  const diff = overdue ? daysDiff(phase.projected_end) : null;
  const photoInputRef = useRef(null);

  useEffect(() => { loadPhotos(); }, []);

  const loadPhotos = async () => {
    const { data } = await supabase.from("phase_photos").select("*").eq("phase_id", phase.id).order("created_at", { ascending: false });
    if (data) setPhotos(data);
  };

  const logActivity = async (action, details) => {
    await supabase.from("activity_log").insert({ lot_id: lotId, phase_id: phase.id, user_id: user.id, user_email: user.email, action, details });
  };

  const cycleStatus = async () => {
    const order = [STATUS.NOT_STARTED, STATUS.IN_PROGRESS, STATUS.COMPLETE];
    const newStatus = order[(order.indexOf(phase.status) + 1) % 3];
    await supabase.from("phases").update({ status: newStatus }).eq("id", phase.id);
    await logActivity("status_change", `${phase.phase_name} changed to ${STATUS_CONFIG[newStatus].label}`);
    onUpdate();
  };

  const updateField = async (field, value) => {
    await supabase.from("phases").update({ [field]: value || null }).eq("id", phase.id);
    await logActivity("date_change", `${phase.phase_name} ${field.replace(/_/g, " ")} set to ${value}`);
    onUpdate();
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const path = `photos/${lotId}/${phase.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("lot-files").upload(path, file);
    if (!error) {
      await supabase.from("phase_photos").insert({ lot_id: lotId, phase_id: phase.id, file_name: file.name, file_path: path, uploaded_by: user.id, uploaded_by_email: user.email });
      await logActivity("photo_upload", `Photo uploaded to ${phase.phase_name}`);
      loadPhotos();
    }
    setUploading(false);
  };

  const getPhotoUrl = (path) => supabase.storage.from("lot-files").getPublicUrl(path).data.publicUrl;

  const statusColors = {
    [STATUS.NOT_STARTED]: { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b" },
    [STATUS.IN_PROGRESS]: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    [STATUS.COMPLETE]: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  };
  const sc = overdue ? { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" } : statusColors[phase.status];

  if (isMobile) {
    return (
      <div style={{ marginBottom: 8 }}>
        <div onClick={() => setExpanded(p => !p)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: expanded ? "12px 12px 0 0" : 12, background: sc.bg, border: `1.5px solid ${sc.border}`, cursor: "pointer" }}>
          <button onClick={e => { e.stopPropagation(); cycleStatus(); }} style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, border: `2px solid ${overdue ? "#ef4444" : cfg.dot}`, background: phase.status === STATUS.COMPLETE ? cfg.dot : "#fff", color: phase.status === STATUS.COMPLETE ? "#fff" : overdue ? "#ef4444" : cfg.dot, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
            {phase.status === STATUS.COMPLETE ? <IconCheck /> : phase.status === STATUS.IN_PROGRESS ? "▶" : ""}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: sc.text, textDecoration: phase.status === STATUS.COMPLETE ? "line-through" : "none", marginBottom: 3, fontWeight: 500 }}>{phase.phase_name}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: overdue ? "#ef4444" : cfg.dot, fontWeight: 700 }}>{overdue ? `${diff}d overdue` : cfg.label}</span>
              {phase.projected_end && <span style={{ fontSize: 11, color: "#94a3b8" }}>Due {phase.projected_end}</span>}
              {photos.length > 0 && <span style={{ fontSize: 11, color: G2, fontWeight: 600 }}>{photos.length} photo{photos.length > 1 ? "s" : ""}</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={e => { e.stopPropagation(); photoInputRef.current?.click(); }} style={{ background: "#000", border: `1.5px solid ${G}`, borderRadius: 8, color: G, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <IconCamera />
            </button>
            <div style={{ color: "#94a3b8", transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}><IconChevron /></div>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={uploadPhoto} style={{ display: "none" }} />
        </div>
        {expanded && (
          <div style={{ background: "#f8fafc", border: `1.5px solid ${sc.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Proj. Start</div><input type="date" defaultValue={phase.projected_start || ""} onBlur={e => updateField("projected_start", e.target.value)} style={dateInputStyle} /></div>
              <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Proj. End</div><input type="date" defaultValue={phase.projected_end || ""} onBlur={e => updateField("projected_end", e.target.value)} style={dateInputStyle} /></div>
              <div><div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Act. Start</div><input type="date" defaultValue={phase.actual_start || ""} onBlur={e => updateField("actual_start", e.target.value)} style={{ ...dateInputStyle, borderColor: "#bfdbfe" }} /></div>
              <div><div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Act. End</div><input type="date" defaultValue={phase.actual_end || ""} onBlur={e => updateField("actual_end", e.target.value)} style={{ ...dateInputStyle, borderColor: "#bfdbfe" }} /></div>
            </div>
            <input defaultValue={phase.notes || ""} onBlur={e => updateField("notes", e.target.value)} placeholder="Notes..." style={{ ...fieldStyle, fontSize: 13, padding: "8px 10px", marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: photos.length > 0 ? 10 : 0 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, background: "#000", border: `1.5px solid ${G}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: G, flex: 1, justifyContent: "center", fontWeight: 600 }}>
                <IconCamera />{uploading ? "Uploading..." : "Take Photo"}
                <input type="file" accept="image/*" capture="environment" onChange={uploadPhoto} style={{ display: "none" }} />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#475569", flex: 1, justifyContent: "center" }}>
                <IconUpload />Upload
                <input type="file" accept="image/*" onChange={uploadPhoto} style={{ display: "none" }} />
              </label>
            </div>
            {photos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {photos.map(photo => (
                  <div key={photo.id} onClick={() => window.open(getPhotoUrl(photo.file_path), "_blank")} style={{ borderRadius: 8, overflow: "hidden", cursor: "pointer", aspectRatio: "1", background: "#e2e8f0" }}>
                    <img src={getPhotoUrl(photo.file_path)} alt={photo.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 108px 108px 108px 108px 150px", gap: 8, alignItems: "center", padding: "10px 14px", borderRadius: expanded ? "10px 10px 0 0" : 10, background: sc.bg, border: `1.5px solid ${sc.border}`, transition: "all 0.15s" }}>
        <button onClick={cycleStatus} style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${overdue ? "#ef4444" : cfg.dot}`, background: phase.status === STATUS.COMPLETE ? cfg.dot : "#fff", color: phase.status === STATUS.COMPLETE ? "#fff" : overdue ? "#ef4444" : cfg.dot, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
          {phase.status === STATUS.COMPLETE ? <IconCheck /> : phase.status === STATUS.IN_PROGRESS ? "▶" : ""}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: sc.text, textDecoration: phase.status === STATUS.COMPLETE ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>{phase.phase_name}</span>
          {overdue && <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#fee2e2", color: "#991b1b", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}><IconWarn />{diff}d late</span>}
          {photos.length > 0 && <span style={{ background: G3, color: G2, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0 }}>{photos.length} photo{photos.length > 1 ? "s" : ""}</span>}
        </div>
        <input type="date" defaultValue={phase.projected_start || ""} onBlur={e => updateField("projected_start", e.target.value)} style={dateInputStyle} />
        <input type="date" defaultValue={phase.projected_end || ""} onBlur={e => updateField("projected_end", e.target.value)} style={dateInputStyle} />
        <input type="date" defaultValue={phase.actual_start || ""} onBlur={e => updateField("actual_start", e.target.value)} style={{ ...dateInputStyle, borderColor: "#bfdbfe" }} />
        <input type="date" defaultValue={phase.actual_end || ""} onBlur={e => updateField("actual_end", e.target.value)} style={{ ...dateInputStyle, borderColor: "#bfdbfe" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <button onClick={cycleStatus} style={{ padding: "3px 10px", borderRadius: 20, border: `1.5px solid ${overdue ? "#fecaca" : sc.border}`, background: sc.bg, color: overdue ? "#ef4444" : sc.text, fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", whiteSpace: "nowrap" }}>{overdue ? "Overdue" : cfg.label}</button>
          <label title="Upload photo" style={{ background: "#000", border: `1.5px solid ${G}`, borderRadius: 7, color: G, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconCamera />
            <input type="file" accept="image/*" onChange={uploadPhoto} style={{ display: "none" }} />
          </label>
          <button onClick={() => setExpanded(p => !p)} style={{ background: photos.length > 0 ? G3 : "#fff", border: `1.5px solid ${photos.length > 0 ? G : "#e2e8f0"}`, borderRadius: 7, color: photos.length > 0 ? G2 : "#94a3b8", width: 28, height: 28, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✎</button>
        </div>
      </div>
      {expanded && (
        <div style={{ background: "#f8fafc", border: `1.5px solid ${sc.border}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "12px 14px" }}>
          <input defaultValue={phase.notes || ""} onBlur={e => updateField("notes", e.target.value)} placeholder="Notes for this phase..." style={{ ...fieldStyle, fontSize: 13, padding: "8px 10px", marginBottom: 10 }} />
          {photos.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 6 }}>
              {photos.map(photo => (
                <div key={photo.id} style={{ borderRadius: 8, overflow: "hidden", cursor: "pointer", aspectRatio: "1", background: "#e2e8f0" }} onClick={() => window.open(getPhotoUrl(photo.file_path), "_blank")}>
                  <img src={getPhotoUrl(photo.file_path)} alt={photo.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
          {photos.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8" }}>No photos yet — use the camera icon to upload.</div>}
        </div>
      )}
    </div>
  );
}

// Activity Log
function ActivityLog({ lotId }) {
  const [log, setLog] = useState([]);
  useEffect(() => {
    supabase.from("activity_log").select("*").eq("lot_id", lotId).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setLog(data); });
  }, [lotId]);

  const fmt = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  if (log.length === 0) return <div style={{ color: "#94a3b8", fontSize: 14, padding: "20px 0" }}>No activity yet.</div>;

  return (
    <div>
      {log.map(entry => (
        <div key={entry.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#000", border: `2px solid ${G}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, color: G, fontWeight: 700 }}>
            {(entry.user_email || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "#1e293b", marginBottom: 3, fontWeight: 500 }}>{entry.details}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>{entry.user_email}</span>
              <span style={{ fontSize: 11, color: "#cbd5e1" }}>·</span>
              <span style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}><IconClock />{fmt(entry.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Team Tab
function TeamTab({ lotId, user }) {
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("contractor");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    const { data } = await supabase.from("lot_members").select("*").eq("lot_id", lotId);
    if (data) setMembers(data);
  };

  const invite = async () => {
    if (!inviteEmail) return;
    setSaving(true);
    await supabase.from("lot_members").insert({ lot_id: lotId, user_email: inviteEmail, role: inviteRole, invited_by: user.id });
    setMsg(`${inviteEmail} added. Share your app link so they can sign in.`);
    setInviteEmail("");
    loadMembers();
    setSaving(false);
  };

  const remove = async (id) => {
    await supabase.from("lot_members").delete().eq("id", id);
    loadMembers();
  };

  return (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>Add Team Member</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email address" style={{ ...fieldStyle, flex: 1, minWidth: 200, fontSize: 13, padding: "8px 12px" }} />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px", width: "auto" }}>
            <option value="contractor">Contractor</option>
            <option value="investor">Investor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button onClick={invite} disabled={saving} style={{ ...btnGreen, padding: "8px 18px" }}>
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
        {msg && <div style={{ marginTop: 10, fontSize: 12, color: G2, background: G3, padding: "8px 12px", borderRadius: 8 }}>{msg}</div>}
      </div>
      {members.map(m => (
        <div key={m.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#000", border: `2px solid ${G}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: G, fontWeight: 700 }}>
            {(m.user_email || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{m.user_email}</div>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>{m.role}</div>
          </div>
          <button onClick={() => remove(m.id)} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", padding: 4 }}><IconTrash /></button>
        </div>
      ))}
      {members.length === 0 && <div style={{ color: "#94a3b8", fontSize: 14 }}>No team members yet.</div>}
    </div>
  );
}

// Documents Tab
function DocumentsTab({ lotId, user }) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadDocs(); }, []);

  const loadDocs = async () => {
    const { data } = await supabase.from("lot_documents").select("*").eq("lot_id", lotId).order("created_at", { ascending: false });
    if (data) setDocs(data);
  };

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const path = `docs/${lotId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("lot-files").upload(path, file);
    if (!error) {
      await supabase.from("lot_documents").insert({ lot_id: lotId, file_name: file.name, file_path: path, file_type: file.type, uploaded_by: user.id, uploaded_by_email: user.email });
      loadDocs();
    }
    setUploading(false);
  };

  const openDoc = (path) => window.open(supabase.storage.from("lot-files").getPublicUrl(path).data.publicUrl, "_blank");

  const deleteDoc = async (doc) => {
    await supabase.storage.from("lot-files").remove([doc.file_path]);
    await supabase.from("lot_documents").delete().eq("id", doc.id);
    loadDocs();
  };

  const fmt = (ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={btnGreen}>
          <IconUpload />{uploading ? "Uploading..." : "Upload Document"}
          <input type="file" onChange={upload} style={{ display: "none" }} />
        </label>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Plans, permits, pool specs, surveys — anything related to this lot.</div>
      </div>
      {docs.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 14 }}>No documents yet.</div>
      ) : docs.map(doc => (
        <div key={doc.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ color: "#64748b" }}><IconFile /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.file_name}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{doc.uploaded_by_email} · {fmt(doc.created_at)}</div>
          </div>
          <button onClick={() => openDoc(doc.file_path)} style={{ background: G3, border: `1px solid ${G}`, borderRadius: 7, color: G2, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Open</button>
          <button onClick={() => deleteDoc(doc)} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", padding: 4 }}><IconTrash /></button>
        </div>
      ))}
    </div>
  );
}

// Interest Tab
function InterestTab({ lotId }) {
  const [loans, setLoans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ lender_name: "", loan_amount: "", interest_rate: "", draw_date: "", payment_due_day: "1", payment_frequency: "monthly", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadLoans(); }, []);

  const loadLoans = async () => {
    const { data } = await supabase.from("interest_loans").select("*").eq("lot_id", lotId).order("created_at");
    if (data) setLoans(data);
  };

  const save = async () => {
    setSaving(true);
    await supabase.from("interest_loans").insert({ ...form, lot_id: lotId, loan_amount: parseFloat(form.loan_amount), interest_rate: parseFloat(form.interest_rate), payment_due_day: parseInt(form.payment_due_day) });
    setForm({ lender_name: "", loan_amount: "", interest_rate: "", draw_date: "", payment_due_day: "1", payment_frequency: "monthly", notes: "" });
    setShowForm(false);
    loadLoans();
    setSaving(false);
  };

  const deleteLoan = async (id) => {
    await supabase.from("interest_loans").delete().eq("id", id);
    loadLoans();
  };

  const totalMonthly = loans.reduce((s, l) => s + calcMonthlyInterest(l.loan_amount, l.interest_rate), 0);
  const totalDaily = loans.reduce((s, l) => s + calcDailyInterest(l.loan_amount, l.interest_rate), 0);
  const totalExposure = loans.reduce((s, l) => s + (l.loan_amount || 0), 0);

  const getNextDueDate = (loan) => {
    const today = new Date();
    const due = new Date(today.getFullYear(), today.getMonth(), loan.payment_due_day);
    if (due <= today) due.setMonth(due.getMonth() + 1);
    return due;
  };

  const daysUntilDue = (loan) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const due = getNextDueDate(loan); due.setHours(0,0,0,0);
    return Math.round((due - today) / 86400000);
  };

  return (
    <div>
      {loans.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Total Loan Exposure", value: formatCurrency(totalExposure), color: "#1e293b" },
            { label: "Monthly Interest Burn", value: formatCurrency(totalMonthly), color: "#d97706" },
            { label: "Daily Interest Burn", value: formatCurrency(totalDaily), color: "#ef4444" },
          ].map(s => (
            <div key={s.label} style={cardStyle}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'DM Serif Display', serif" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loans.map(loan => {
        const monthly = calcMonthlyInterest(loan.loan_amount, loan.interest_rate);
        const daily = calcDailyInterest(loan.loan_amount, loan.interest_rate);
        const daysLeft = daysUntilDue(loan);
        const urgent = daysLeft <= 7;
        return (
          <div key={loan.id} style={{ ...cardStyle, marginBottom: 12, borderColor: urgent ? "#fecaca" : "#e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{loan.lender_name}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{loan.interest_rate}% · {loan.payment_frequency}</div>
              </div>
              <button onClick={() => deleteLoan(loan.id)} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer" }}><IconTrash /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 10 }}>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Loan Amount</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{formatCurrency(loan.loan_amount)}</div>
              </div>
              <div style={{ background: "#fffbeb", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Monthly Interest</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#d97706" }}>{formatCurrency(monthly)}</div>
              </div>
              <div style={{ background: "#fef2f2", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Daily Interest</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#ef4444" }}>{formatCurrency(daily)}</div>
              </div>
              <div style={{ background: urgent ? "#fef2f2" : G3, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Next Payment Due</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: urgent ? "#ef4444" : G2 }}>{daysLeft === 0 ? "TODAY" : `${daysLeft} days`}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Day {loan.payment_due_day} of month</div>
              </div>
            </div>
            {loan.draw_date && <div style={{ fontSize: 12, color: "#64748b" }}>Draw date: {loan.draw_date}</div>}
            {loan.notes && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{loan.notes}</div>}
          </div>
        );
      })}

      {showForm && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 14 }}>Add Loan</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>Lender Name</label><input value={form.lender_name} onChange={e => setForm(p => ({ ...p, lender_name: e.target.value }))} placeholder="Lender name" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
            <div><label style={labelStyle}>Loan Amount</label><input type="number" value={form.loan_amount} onChange={e => setForm(p => ({ ...p, loan_amount: e.target.value }))} placeholder="500000" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
            <div><label style={labelStyle}>Interest Rate %</label><input type="number" step="0.01" value={form.interest_rate} onChange={e => setForm(p => ({ ...p, interest_rate: e.target.value }))} placeholder="8.5" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
            <div><label style={labelStyle}>Draw Date</label><input type="date" value={form.draw_date} onChange={e => setForm(p => ({ ...p, draw_date: e.target.value }))} style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
            <div><label style={labelStyle}>Payment Due Day</label><input type="number" min="1" max="28" value={form.payment_due_day} onChange={e => setForm(p => ({ ...p, payment_due_day: e.target.value }))} placeholder="1" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
            <div><label style={labelStyle}>Frequency</label>
              <select value={form.payment_frequency} onChange={e => setForm(p => ({ ...p, payment_frequency: e.target.value }))} style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          </div>
          <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} disabled={saving} style={btnGreen}>{saving ? "Saving..." : "Save Loan"}</button>
            <button onClick={() => setShowForm(false)} style={btnOutline}>Cancel</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)} style={btnOutline}>
          <IconPlus /> Add Loan
        </button>
      )}
    </div>
  );
}

// Investor Tab
function InvestorTab({ lotId, user }) {
  const [tokens, setTokens] = useState([]);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => { loadTokens(); }, []);

  const loadTokens = async () => {
    const { data } = await supabase.from("investor_tokens").select("*").eq("lot_id", lotId).order("created_at", { ascending: false });
    if (data) setTokens(data);
  };

  const createLink = async () => {
    setCreating(true);
    const label = prompt("Label for this link (e.g. investor name):");
    if (label) {
      await supabase.from("investor_tokens").insert({ lot_id: lotId, label, created_by: user.id });
      loadTokens();
    }
    setCreating(false);
  };

  const getLink = (token) => `${window.location.origin}?investor=${token}`;

  const copyLink = (token) => {
    navigator.clipboard.writeText(getLink(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const deleteToken = async (id) => {
    await supabase.from("investor_tokens").delete().eq("id", id);
    loadTokens();
  };

  return (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>Share Progress with Investors</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>Create a private link for each investor. They can view project progress and photos without needing an account.</div>
        <button onClick={createLink} disabled={creating} style={btnGreen}>
          <IconLink />{creating ? "Creating..." : "Create Investor Link"}
        </button>
      </div>
      {tokens.map(token => (
        <div key={token.id} style={{ ...cardStyle, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{token.label}</div>
            <button onClick={() => deleteToken(token.id)} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer" }}><IconTrash /></button>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#94a3b8", wordBreak: "break-all", marginBottom: 8 }}>{getLink(token.token)}</div>
          <button onClick={() => copyLink(token.token)} style={{ background: copied === token.token ? G3 : "#fff", border: `1.5px solid ${copied === token.token ? G : "#e2e8f0"}`, borderRadius: 8, color: copied === token.token ? G2 : "#64748b", padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
            {copied === token.token ? "Copied!" : "Copy Link"}
          </button>
        </div>
      ))}
      {tokens.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8" }}>No investor links created yet.</div>}
    </div>
  );
}

// Lot Detail
function LotDetail({ lot, onBack, onDelete, onUpdate, isMobile, user }) {
  const [phases, setPhases] = useState([]);
  const [local, setLocal] = useState(lot);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("phases");

  useEffect(() => { loadPhases(); }, [lot.id]);

  const loadPhases = async () => {
    const { data } = await supabase.from("phases").select("*").eq("lot_id", lot.id).order("id");
    if (data) setPhases(data.sort((a, b) => PHASES.indexOf(a.phase_name) - PHASES.indexOf(b.phase_name)));
  };

  const saveField = async (field, value) => {
    setSaving(true);
    await supabase.from("lots").update({ [field]: value }).eq("id", lot.id);
    onUpdate();
    setSaving(false);
  };

  const prog = getOverallProgress(phases);
  const overdueCnt = countOverdue(phases);
  const tabs = ["phases", "docs", "team", "interest", "investor", "activity"];
  const tabLabels = { phases: "Phases", docs: "Documents", team: "Team", interest: "Interest", investor: "Investor", activity: "Activity" };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: isMobile ? "12px 16px" : "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1150, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "transparent", border: `1.5px solid #333`, color: "#94a3b8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}><IconBack />{!isMobile && " Dashboard"}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input defaultValue={local.address} onBlur={e => { setLocal(p => ({ ...p, address: e.target.value })); saveField("address", e.target.value); }} placeholder="Enter lot address..." style={{ background: "transparent", border: "none", color: "#fff", fontSize: isMobile ? 15 : 19, fontWeight: 700, fontFamily: "'DM Serif Display', serif", outline: "none", width: "100%" }} />
          </div>
          {saving && <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0 }}>Saving...</span>}
          {!isMobile && <button onClick={() => { if (window.confirm("Delete this lot?")) onDelete(lot.id); }} style={{ background: "transparent", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><IconTrash /> Delete</button>}
        </div>
      </div>

      <div style={{ maxWidth: 1150, margin: "0 auto", padding: isMobile ? "16px" : "20px 24px" }}>
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: "#1e293b", fontWeight: 600 }}>{lot.address || "This lot"}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: G2 }}>{prog.pct}%</span>
          </div>
          <div style={{ background: "#f1f5f9", borderRadius: 99, height: 10, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ width: `${prog.pct}%`, height: "100%", background: `linear-gradient(90deg, #000, ${G})`, borderRadius: 99, transition: "width 0.4s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
            <span>{prog.complete}/{prog.total} phases complete</span>
            {overdueCnt > 0 && <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}><IconWarn />{overdueCnt} overdue</span>}
          </div>
        </div>

        {!isMobile && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div><label style={labelStyle}>Owner</label><input defaultValue={local.owner} onBlur={e => saveField("owner", e.target.value)} placeholder="Owner / Developer" style={fieldStyle} /></div>
            <div><label style={labelStyle}>Budget</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14 }}>$</span>
                <input type="number" defaultValue={local.budget} onBlur={e => saveField("budget", e.target.value)} placeholder="0" style={{ ...fieldStyle, paddingLeft: 24 }} />
              </div>
            </div>
            <div><label style={labelStyle}>Notes</label><input defaultValue={local.notes} onBlur={e => saveField("notes", e.target.value)} placeholder="General notes..." style={fieldStyle} /></div>
          </div>
        )}

        <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4, borderBottom: "2px solid #f1f5f9" }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={tabBtnStyle(activeTab === tab)}>{tabLabels[tab]}</button>
          ))}
        </div>

        {activeTab === "phases" && (
          <>
            {!isMobile && (
              <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 108px 108px 108px 108px 150px", gap: 8, padding: "4px 14px", marginBottom: 6 }}>
                <div /><div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Phase</div>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Proj. Start</div>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Proj. End</div>
                <div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase", fontWeight: 600 }}>Act. Start</div>
                <div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase", fontWeight: 600 }}>Act. End</div>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Status / Photo</div>
              </div>
            )}
            {phases.map(phase => (
              <PhaseRow key={phase.id} phase={phase} lotId={lot.id} onUpdate={loadPhases} isMobile={isMobile} user={user} />
            ))}
            {isMobile && (
              <button onClick={() => { if (window.confirm("Delete this lot?")) onDelete(lot.id); }} style={{ width: "100%", marginTop: 20, background: "#fff", border: "1.5px solid #fecaca", color: "#ef4444", borderRadius: 10, padding: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                <IconTrash /> Delete Lot
              </button>
            )}
          </>
        )}
        {activeTab === "docs" && <DocumentsTab lotId={lot.id} user={user} />}
        {activeTab === "team" && <TeamTab lotId={lot.id} user={user} />}
        {activeTab === "interest" && <InterestTab lotId={lot.id} />}
        {activeTab === "investor" && <InvestorTab lotId={lot.id} user={user} />}
        {activeTab === "activity" && <ActivityLog lotId={lot.id} />}
      </div>
    </div>
  );
}

// Dashboard
function Dashboard({ user, onSelect, onSignOut, isMobile }) {
  const [lots, setLots] = useState([]);
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

  const getPhases = (lotId) => lotPhases[lotId] || [];

  const filtered = lots.filter(l => {
    const phases = getPhases(l.id);
    if (filterBy === "inprogress") return phases.some(p => p.status === STATUS.IN_PROGRESS);
    if (filterBy === "overdue") return countOverdue(phases) > 0;
    if (filterBy === "complete") return getOverallProgress(phases).pct === 100;
    if (filterBy === "notstarted") return getOverallProgress(phases).pct === 0;
    return true;
  });

  const totalOverdue = lots.reduce((s, l) => s + countOverdue(getPhases(l.id)), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: isMobile ? "14px 16px" : "16px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: G }}><IconHardHat /></div>
            <div>
              <div style={{ fontSize: isMobile ? 18 : 22, fontFamily: "'DM Serif Display', serif", color: "#fff", fontWeight: 400, lineHeight: 1.2 }}>Dev Tracker</div>
              {!isMobile && <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase" }}>Selman & Associates</div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!isMobile && <span style={{ fontSize: 12, color: "#475569" }}>{user.email}</span>}
            <button onClick={onSignOut} style={{ background: "transparent", border: "1px solid #333", color: "#94a3b8", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Sign Out</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "16px" : "24px 32px" }}>
        {lots.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Lots", value: lots.length, color: "#1e293b" },
              { label: "In Progress", value: lots.filter(l => getPhases(l.id).some(p => p.status === STATUS.IN_PROGRESS)).length, color: "#d97706" },
              { label: "Complete", value: lots.filter(l => getOverallProgress(getPhases(l.id)).pct === 100).length, color: G2 },
              { label: "Overdue Phases", value: totalOverdue, color: totalOverdue > 0 ? "#ef4444" : "#94a3b8" },
            ].map(s => (
              <div key={s.label} style={{ ...cardStyle, borderColor: s.label === "Overdue Phases" && totalOverdue > 0 ? "#fecaca" : "#e2e8f0" }}>
                <div style={{ fontSize: isMobile ? 28 : 32, fontWeight: 700, color: s.color, fontFamily: "'DM Serif Display', serif" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {lots.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {[["all","All"],["inprogress","Active"],["overdue","Overdue"],["complete","Done"],["notstarted","Not Started"]].map(([val,lbl]) => (
              <button key={val} onClick={() => setFilterBy(val)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${filterBy === val ? G : "#e2e8f0"}`, background: filterBy === val ? G3 : "#fff", color: filterBy === val ? G2 : "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: filterBy === val ? 700 : 500, whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}>{lbl}</button>
            ))}
          </div>
        )}

        {lots.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏗️</div>
            <div style={{ fontSize: 18, color: "#1e293b", fontWeight: 600, marginBottom: 6 }}>No lots yet</div>
            <p style={{ fontSize: 14, margin: 0, color: "#94a3b8" }}>Add your first development to get started.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: 15, margin: 0, color: "#94a3b8" }}>No lots match this filter.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {filtered.map(lot => {
              const phases = getPhases(lot.id);
              const prog = getOverallProgress(phases);
              const overdue = countOverdue(phases);
              return (
                <div key={lot.id} onClick={() => onSelect(lot)}
                  style={{ ...cardStyle, cursor: "pointer", transition: "all 0.15s", borderColor: overdue > 0 ? "#fecaca" : "#e2e8f0" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.1)`; e.currentTarget.style.borderColor = overdue > 0 ? "#ef4444" : G; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = overdue > 0 ? "#fecaca" : "#e2e8f0"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", fontFamily: "'DM Serif Display', serif", flex: 1, marginRight: 8, lineHeight: 1.3 }}>
                      {lot.address || <span style={{ color: "#cbd5e1", fontStyle: "italic", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400 }}>No address set</span>}
                    </div>
                    {overdue > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#fee2e2", color: "#991b1b", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}><IconWarn />{overdue} overdue</span>}
                  </div>
                  {lot.owner && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{lot.owner}</div>}
                  {lot.budget && <div style={{ fontSize: 13, color: "#475569", marginBottom: 10, fontWeight: 600 }}>{formatCurrency(lot.budget)}</div>}
                  <div style={{ background: "#f1f5f9", borderRadius: 99, height: 7, overflow: "hidden", marginBottom: 10, marginTop: lot.budget ? 0 : 10 }}>
                    <div style={{ width: `${prog.pct}%`, height: "100%", background: prog.pct === 100 ? G2 : `linear-gradient(90deg, #000, ${G})`, borderRadius: 99, transition: "width 0.4s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{prog.complete}/{prog.total} phases</span>
                    <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: prog.pct === 100 ? G3 : "#f0fdf4", color: prog.pct === 100 ? G2 : "#16a34a", fontWeight: 700, border: `1px solid ${prog.pct === 100 ? G : "#bbf7d0"}` }}>{prog.pct}%</span>
                  </div>
                  <div style={{ paddingTop: 10, borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>
                    <span style={{ color: "#64748b", fontWeight: 500 }}>Current: </span>{getCurrentPhase(phases)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50 }}>
        <button onClick={addLot} style={{ display: "flex", alignItems: "center", gap: 8, background: "#000", color: G, border: `2px solid ${G}`, borderRadius: isMobile ? "50%" : 12, padding: isMobile ? 16 : "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: `0 4px 20px rgba(74,222,128,0.3)` }}>
          <IconPlus />{!isMobile && "Add New Lot"}
        </button>
      </div>
    </div>
  );
}

// App Root
export default function App() {
  const [user, setUser] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [investorToken, setInvestorToken] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("investor");
    if (token) setInvestorToken(token);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  if (investorToken) return <InvestorView token={investorToken} />;
  if (!user) return <AuthScreen />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input:focus, select:focus { border-color: ${G} !important; outline: none; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        body { margin: 0; background: #f8fafc; }
      `}</style>
      {selectedLot
        ? <LotDetail lot={selectedLot} onBack={() => setSelectedLot(null)} onDelete={async (id) => { await supabase.from("lots").delete().eq("id", id); setSelectedLot(null); }} onUpdate={reloadLot} isMobile={isMobile} user={user} />
        : <Dashboard user={user} onSelect={setSelectedLot} onSignOut={signOut} isMobile={isMobile} />}
    </>
  );
}
