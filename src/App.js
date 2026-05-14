import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { PHASES, STATUS, STATUS_CONFIG, G, G2, G3, getOverallProgress, getCurrentPhase, countOverdue, isPhaseOverdue, daysDiff, formatCurrency, labelStyle, fieldStyle, dateInputStyle, cardStyle, tabBtnStyle, btnGreen, btnOutline, Icons } from "./utils";
import InterestTab from "./components/InterestTab";
import PhaseChecklist from "./components/PhaseChecklist";
import PunchListTab from "./components/PunchListTab";

const OWNER_EMAIL = "derekselman@gmail.com";

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
          <img src="/logo192.png" alt="Dev Tracker" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: 20, fontFamily: "'DM Serif Display', serif", color: "#0f172a", fontWeight: 400, lineHeight: 1.2 }}>Dev Tracker</div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>Derek Selman</div>
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
          <img src="/logo192.png" alt="Dev Tracker" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase" }}>Project Update · Selman & Associates</div>
            <div style={{ fontSize: 20, fontFamily: "'DM Serif Display', serif", color: "#fff" }}>{lot?.address || "Development Project"}</div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[{ label: "Overall Progress", value: `${prog.pct}%`, color: G2 }, { label: "Phases Complete", value: `${prog.complete}/${prog.total}`, color: "#0f172a" }, { label: "In Progress", value: prog.inProgress, color: "#f59e0b" }].map(s => (
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
            <div style={{ width: `${prog.pct}%`, height: "100%", background: `linear-gradient(90deg, #000, ${G})`, borderRadius: 99 }} />
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
function PhaseRow({ phase, lotId, onUpdate, isMobile, user, isOwner }) {
  const [expanded, setExpanded] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [checklistStatus, setChecklistStatus] = useState({ total: 0, done: 0, allDone: true });
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
    const nextStatus = order[(order.indexOf(phase.status) + 1) % 3];
    if (nextStatus === STATUS.COMPLETE && !checklistStatus.allDone) {
      setExpanded(true);
      alert(`⚠️ This phase has ${checklistStatus.total - checklistStatus.done} unchecked item${checklistStatus.total - checklistStatus.done > 1 ? "s" : ""} on the checklist. Please review before marking complete.`);
      return;
    }
    await supabase.from("phases").update({ status: nextStatus }).eq("id", phase.id);
    await logActivity("status_change", `${phase.phase_name} changed to ${STATUS_CONFIG[nextStatus].label}`);
    onUpdate();
  };

  const updateField = async (field, value) => {
    await supabase.from("phases").update({ [field]: value || null }).eq("id", phase.id);
    await logActivity("date_change", `${phase.phase_name} ${field.replace(/_/g, " ")} set to ${value}`);
    onUpdate();
  };

  const uploadPhoto = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const path = `photos/${lotId}/${phase.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("lot-files").upload(path, file);
      if (!error) {
        await supabase.from("phase_photos").insert({ lot_id: lotId, phase_id: phase.id, file_name: file.name, file_path: path, uploaded_by: user.id, uploaded_by_email: user.email });
        await logActivity("photo_upload", `Photo uploaded to ${phase.phase_name} by ${user.email}`);
      }
    }
    loadPhotos();
    setUploading(false);
  };

  const getPhotoUrl = (path) => supabase.storage.from("lot-files").getPublicUrl(path).data.publicUrl;
  const hasChecklistWarning = !checklistStatus.allDone && phase.status === STATUS.IN_PROGRESS;

  // Smart date warnings
  const today = new Date().toISOString().split("T")[0];
  const endDate = phase.projected_end;
  const startDate = phase.projected_start;
  const daysUntilEnd = endDate ? Math.round((new Date(endDate) - new Date()) / 86400000) : null;
  const daysUntilStart = startDate ? Math.round((new Date(startDate) - new Date()) / 86400000) : null;
  const startingSoon = startDate && daysUntilStart !== null && daysUntilStart >= 0 && daysUntilStart <= 3 && phase.status === STATUS.NOT_STARTED;
  const endingSoon = endDate && daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 3 && phase.status === STATUS.IN_PROGRESS;
  const notStartedLate = startDate && startDate < today && phase.status === STATUS.NOT_STARTED;

  // CHANGE 8: Phase start alert — flag if start date was 0-2 days ago and still not started
  const daysSinceStart = startDate ? Math.round((new Date() - new Date(startDate + "T00:00:00")) / 86400000) : null;
  const dueToStart = startDate && phase.status === STATUS.NOT_STARTED && daysSinceStart !== null && daysSinceStart >= 0 && daysSinceStart <= 2;

  const statusColors = {
    [STATUS.NOT_STARTED]: { bg: "#f8fafc", border: "#e2e8f0" },
    [STATUS.IN_PROGRESS]: { bg: "#fffbeb", border: "#fde68a" },
    [STATUS.COMPLETE]: { bg: G3, border: "#bbf7d0" },
  };
  const sc = overdue ? { bg: "#fef2f2", border: "#fecaca" }
    : notStartedLate ? { bg: "#fef2f2", border: "#fecaca" }
    : endingSoon ? { bg: "#fff7ed", border: "#fed7aa" }
    : startingSoon ? { bg: "#fffbeb", border: "#fde68a" }
    : statusColors[phase.status];

  if (isMobile) {
    return (
      <div style={{ marginBottom: 8 }}>
        <div onClick={() => setExpanded(p => !p)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: expanded ? "12px 12px 0 0" : 12, background: sc.bg, border: `1.5px solid ${sc.border}`, cursor: "pointer" }}>
          <button onClick={e => { e.stopPropagation(); cycleStatus(); }} style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, border: `2px solid ${overdue ? "#ef4444" : hasChecklistWarning ? "#f59e0b" : cfg.dot}`, background: phase.status === STATUS.COMPLETE ? cfg.dot : "#fff", color: phase.status === STATUS.COMPLETE ? "#fff" : overdue ? "#ef4444" : hasChecklistWarning ? "#f59e0b" : cfg.dot, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
            {phase.status === STATUS.COMPLETE ? <Icons.Check /> : phase.status === STATUS.IN_PROGRESS ? (hasChecklistWarning ? "!" : "▶") : ""}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: overdue ? "#991b1b" : phase.status === STATUS.COMPLETE ? "#94a3b8" : "#1e293b", textDecoration: phase.status === STATUS.COMPLETE ? "line-through" : "none", marginBottom: 3, fontWeight: 500 }}>{phase.phase_name}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: overdue ? "#ef4444" : hasChecklistWarning ? "#f59e0b" : cfg.dot, fontWeight: 700 }}>{overdue ? `${diff}d overdue` : hasChecklistWarning ? `${checklistStatus.total - checklistStatus.done} open items` : cfg.label}</span>
              {dueToStart && <span style={{ fontSize: 11, color: "#d97706", fontWeight: 700, background: "#fffbeb", padding: "1px 6px", borderRadius: 10 }}>⏰ Due to start</span>}
              {photos.length > 0 && <span style={{ fontSize: 11, color: G2, fontWeight: 600 }}>{photos.length} photo{photos.length > 1 ? "s" : ""}</span>}
              {checklistStatus.total > 0 && <span style={{ fontSize: 11, color: "#64748b" }}>{checklistStatus.done}/{checklistStatus.total} checklist</span>}
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); photoInputRef.current?.click(); }} style={{ background: "#000", border: `1.5px solid ${G}`, borderRadius: 8, color: G, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Icons.Camera />
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" capture="environment" multiple onChange={uploadPhoto} style={{ display: "none" }} />
        </div>
        {expanded && (
          <div style={{ background: "#f8fafc", border: `1.5px solid ${sc.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Start Date</div><input type="date" defaultValue={phase.projected_start || ""} onBlur={e => updateField("projected_start", e.target.value)} style={dateInputStyle} /></div>
              <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>End Date</div><input type="date" defaultValue={phase.projected_end || ""} onBlur={e => updateField("projected_end", e.target.value)} style={dateInputStyle} /></div>
            </div>
            <input defaultValue={phase.notes || ""} onBlur={e => updateField("notes", e.target.value)} placeholder="Notes..." style={{ ...fieldStyle, fontSize: 13, padding: "8px 10px", marginBottom: 10 }} />
            <PhaseChecklist phaseId={phase.id} lotId={lotId} user={user} onChecklistStatus={setChecklistStatus} phaseName={phase.phase_name} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: photos.length > 0 ? 10 : 0 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, background: "#000", border: `1.5px solid ${G}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: G, flex: 1, justifyContent: "center", fontWeight: 600 }}>
                <Icons.Camera />{uploading ? "Uploading..." : "Take Photo"}
                <input type="file" accept="image/*" capture="environment" multiple onChange={uploadPhoto} style={{ display: "none" }} />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#475569", flex: 1, justifyContent: "center" }}>
                <Icons.Upload />Upload
                <input type="file" accept="image/*" multiple onChange={uploadPhoto} style={{ display: "none" }} />
              </label>
            </div>
            {photos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 10 }}>
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

  return (
    <div style={{ marginBottom: 6 }}>
      {/* CHANGE 6 FIX: aligned grid to match header — 36px | 1fr | 140px | 140px | 180px */}
      <div onClick={() => setExpanded(p => !p)} style={{ display: "grid", gridTemplateColumns: "36px 1fr 140px 140px 180px", gap: 8, alignItems: "center", padding: "10px 14px", borderRadius: expanded ? "10px 10px 0 0" : 10, background: sc.bg, border: `1.5px solid ${sc.border}`, cursor: "pointer" }}>
        <button onClick={e => { e.stopPropagation(); cycleStatus(); }} style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${overdue ? "#ef4444" : hasChecklistWarning ? "#f59e0b" : cfg.dot}`, background: phase.status === STATUS.COMPLETE ? cfg.dot : "#fff", color: phase.status === STATUS.COMPLETE ? "#fff" : overdue ? "#ef4444" : hasChecklistWarning ? "#f59e0b" : cfg.dot, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {phase.status === STATUS.COMPLETE ? <Icons.Check /> : phase.status === STATUS.IN_PROGRESS ? (hasChecklistWarning ? "!" : "▶") : ""}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: overdue ? "#991b1b" : phase.status === STATUS.COMPLETE ? "#94a3b8" : "#1e293b", textDecoration: phase.status === STATUS.COMPLETE ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>{phase.phase_name}</span>
          {overdue && <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#fee2e2", color: "#991b1b", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}><Icons.Warn />{diff}d late</span>}
          {dueToStart && <span style={{ background: "#fffbeb", color: "#d97706", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0 }}>⏰ Due to start</span>}
          {hasChecklistWarning && <span style={{ background: "#fffbeb", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0 }}>⚠ {checklistStatus.total - checklistStatus.done} open</span>}
          {photos.length > 0 && <span style={{ background: G3, color: G2, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0 }}>{photos.length} photo{photos.length > 1 ? "s" : ""}</span>}
        </div>
        {/* These two inputs are now in columns 3 and 4, matching header exactly */}
        <input type="date" defaultValue={phase.projected_start || ""} onBlur={e => updateField("projected_start", e.target.value)} onClick={e => e.stopPropagation()} style={dateInputStyle} placeholder="Start" title="Start Date" />
        <input type="date" defaultValue={phase.projected_end || ""} onBlur={e => updateField("projected_end", e.target.value)} onClick={e => e.stopPropagation()} style={dateInputStyle} placeholder="End" title="End Date" />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <button onClick={e => { e.stopPropagation(); cycleStatus(); }} style={{ padding: "3px 8px", borderRadius: 20, border: `1.5px solid ${overdue ? "#fecaca" : hasChecklistWarning ? "#fde68a" : sc.border}`, background: sc.bg, color: overdue ? "#ef4444" : hasChecklistWarning ? "#d97706" : "#64748b", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", whiteSpace: "nowrap" }}>{overdue ? "Overdue" : hasChecklistWarning ? "Check List!" : cfg.label}</button>
          <label title="Upload photo" style={{ background: "#000", border: `1.5px solid ${G}`, borderRadius: 7, color: G, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icons.Camera />
            <input type="file" accept="image/*" multiple onChange={uploadPhoto} style={{ display: "none" }} />
          </label>
          <button onClick={e => { e.stopPropagation(); setExpanded(p => !p); }} style={{ background: (phase.notes || photos.length > 0 || checklistStatus.total > 0) ? G3 : "#fff", border: `1.5px solid ${(phase.notes || photos.length > 0 || checklistStatus.total > 0) ? G : "#e2e8f0"}`, borderRadius: 7, color: (phase.notes || photos.length > 0 || checklistStatus.total > 0) ? G2 : "#94a3b8", width: 28, height: 28, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✎</button>
        </div>
      </div>
      {expanded && (
        <div style={{ background: "#f8fafc", border: `1.5px solid ${sc.border}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "12px 14px" }}>
          <input defaultValue={phase.notes || ""} onBlur={e => updateField("notes", e.target.value)} placeholder="Notes for this phase..." style={{ ...fieldStyle, fontSize: 13, padding: "8px 10px", marginBottom: 12 }} />
          <PhaseChecklist phaseId={phase.id} lotId={lotId} user={user} onChecklistStatus={setChecklistStatus} phaseName={phase.phase_name} />
          {photos.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 6, marginTop: 12 }}>
              {photos.map(photo => (
                <div key={photo.id} style={{ borderRadius: 8, overflow: "hidden", cursor: "pointer", aspectRatio: "1", background: "#e2e8f0" }} onClick={() => window.open(getPhotoUrl(photo.file_path), "_blank")}>
                  <img src={getPhotoUrl(photo.file_path)} alt={photo.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
          {photos.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>No photos yet — use the camera icon to upload.</div>}
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
              <span style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}><Icons.Clock />{fmt(entry.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Team Tab
function TeamTab({ lotId, user, isOwner }) {
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
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
    await supabase.from("lot_members").insert({ lot_id: lotId, user_email: inviteEmail, full_name: inviteName, role: inviteRole, invited_by: user.id });
    setMsg(`${inviteName || inviteEmail} added. Share your app link so they can sign in.`);
    setInviteEmail(""); setInviteName("");
    loadMembers();
    setSaving(false);
  };

  const remove = async (id) => {
    await supabase.from("lot_members").delete().eq("id", id);
    loadMembers();
  };

  if (!isOwner) return <div style={{ color: "#94a3b8", fontSize: 14 }}>Contact the owner to manage team members.</div>;

  return (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>Add Team Member</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={labelStyle}>Name</label><input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="e.g. Micah" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
          <div><label style={labelStyle}>Email</label><input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@example.com" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
          <div><label style={labelStyle}>Role</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }}>
              <option value="contractor">Contractor</option>
              <option value="manager">Manager</option>
              <option value="investor">Investor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={invite} disabled={saving} style={{ ...btnGreen, padding: "9px 18px", width: "100%", justifyContent: "center" }}>{saving ? "Adding..." : "Add Member"}</button>
          </div>
        </div>
        {msg && <div style={{ fontSize: 12, color: G2, background: G3, padding: "8px 12px", borderRadius: 8 }}>{msg}</div>}
      </div>
      {members.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Team Members</div>
          {members.map(m => (
            <div key={m.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#000", border: `2px solid ${G}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: G, fontWeight: 700 }}>
                {(m.full_name || m.user_email || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{m.full_name || m.user_email}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{m.user_email} · <span style={{ textTransform: "capitalize" }}>{m.role}</span></div>
              </div>
              <button onClick={() => remove(m.id)} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer" }}><Icons.Trash /></button>
            </div>
          ))}
        </div>
      )}
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
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const path = `docs/${lotId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("lot-files").upload(path, file);
      if (!error) await supabase.from("lot_documents").insert({ lot_id: lotId, file_name: file.name, file_path: path, file_type: file.type, uploaded_by: user.id, uploaded_by_email: user.email });
    }
    loadDocs();
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
          <Icons.Upload />{uploading ? "Uploading..." : "Upload Documents"}
          <input type="file" multiple onChange={upload} style={{ display: "none" }} />
        </label>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Select multiple files at once. Plans, permits, pool specs, surveys.</div>
      </div>
      {docs.length === 0 ? <div style={{ color: "#94a3b8", fontSize: 14 }}>No documents yet.</div> :
        docs.map(doc => (
          <div key={doc.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ color: "#64748b" }}><Icons.File /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.file_name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{doc.uploaded_by_email} · {fmt(doc.created_at)}</div>
            </div>
            <button onClick={() => openDoc(doc.file_path)} style={{ background: G3, border: `1px solid ${G}`, borderRadius: 7, color: G2, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Open</button>
            <button onClick={() => deleteDoc(doc)} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer" }}><Icons.Trash /></button>
          </div>
        ))
      }
    </div>
  );
}

// Investor Tab
function InvestorTab({ lotId, user, isOwner }) {
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
  const copyLink = (token) => { navigator.clipboard.writeText(getLink(token)); setCopied(token); setTimeout(() => setCopied(null), 2000); };
  const deleteToken = async (id) => { await supabase.from("investor_tokens").delete().eq("id", id); loadTokens(); };

  if (!isOwner) return <div style={{ color: "#94a3b8", fontSize: 14 }}>Contact the owner to manage investor links.</div>;

  return (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>Share Progress with Investors</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>Create a private link for each investor. They view project progress and photos — no login needed.</div>
        <button onClick={createLink} disabled={creating} style={btnGreen}><Icons.Link />{creating ? "Creating..." : "Create Investor Link"}</button>
      </div>
      {tokens.map(token => (
        <div key={token.id} style={{ ...cardStyle, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{token.label}</div>
            <button onClick={() => deleteToken(token.id)} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer" }}><Icons.Trash /></button>
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
function LotDetail({ lot, onBack, onDelete, onUpdate, isMobile, user, isOwner, userRole }) {
  const [phases, setPhases] = useState([]);
  const [local, setLocal] = useState(lot);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("phases");

  const isMicah = userRole === "micah";

  const toggleMicahProject = async () => {
    const newType = local.lot_type === "micah" ? "spec" : "micah";
    await supabase.from("lots").update({ lot_type: newType }).eq("id", lot.id);
    setLocal(p => ({ ...p, lot_type: newType }));
    onUpdate();
  };

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

  const allTabs = [
    { id: "phases", label: "Phases", roles: ["owner", "manager", "contractor"] },
    { id: "timeline", label: "Timeline", roles: ["owner", "manager"] },
    { id: "punch", label: "Punch List", roles: ["owner", "manager", "contractor"] },
    { id: "docs", label: "Documents", roles: ["owner", "manager", "contractor"] },
    { id: "warranties", label: "Warranties", roles: ["owner", "manager"] },
    { id: "interest", label: "Interest", roles: ["owner", "manager"] },
    { id: "investor", label: "Investor", roles: ["owner", "manager"] },
    { id: "finishes", label: "Finishes", roles: ["owner", "manager", "contractor"] },
    { id: "activity", label: "Activity", roles: ["owner", "manager", "contractor"] },
  ];
  const tabs = allTabs.filter(t => t.roles.includes(userRole));

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: isMobile ? "12px 16px" : "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1150, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "1.5px solid #333", color: "#94a3b8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}><Icons.Back />{!isMobile && " Dashboard"}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input defaultValue={local.address} onBlur={e => { setLocal(p => ({ ...p, address: e.target.value })); saveField("address", e.target.value); }} placeholder="Enter address..." style={{ background: "transparent", border: "none", color: "#fff", fontSize: isMobile ? 15 : 19, fontWeight: 700, fontFamily: "'DM Serif Display', serif", outline: "none", width: "100%" }} readOnly={!isOwner} />
          </div>
          {saving && <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0 }}>Saving...</span>}
          {isOwner && !isMobile && <button onClick={() => { if (window.confirm("Delete this address?")) onDelete(lot.id); }} style={{ background: "transparent", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><Icons.Trash /> Delete</button>}
        </div>
      </div>

      <div style={{ maxWidth: 1150, margin: "0 auto", padding: isMobile ? "16px 16px 100px" : "20px 24px" }}>
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: "#1e293b", fontWeight: 600 }}>{lot.address || "This address"}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: G2 }}>{prog.pct}%</span>
          </div>
          <div style={{ background: "#f1f5f9", borderRadius: 99, height: 10, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ width: `${prog.pct}%`, height: "100%", background: `linear-gradient(90deg, #000, ${G})`, borderRadius: 99, transition: "width 0.4s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
            <span>{prog.complete}/{prog.total} phases complete</span>
            {overdueCnt > 0 && <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}><Icons.Warn />{overdueCnt} overdue</span>}
          </div>
        </div>

        {isOwner && !isMobile && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div><label style={labelStyle}>Owner</label><input defaultValue={local.owner} onBlur={e => saveField("owner", e.target.value)} placeholder="Owner / Developer" style={fieldStyle} /></div>
            <div><label style={labelStyle}>Budget</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14 }}>$</span>
                <input type="number" defaultValue={local.budget} onBlur={e => saveField("budget", e.target.value)} placeholder="0" style={{ ...fieldStyle, paddingLeft: 24 }} />
              </div>
            </div>
            <div><label style={labelStyle}>Type</label>
              <select defaultValue={local.lot_type || "spec"} onBlur={e => saveField("lot_type", e.target.value)} style={{ ...fieldStyle }}>
                <option value="spec">Spec Home</option>
                <option value="customer">Customer Home</option>
                <option value="vacant">Vacant Lot</option>
                <option value="micah">Micah's Project</option>
              </select>
            </div>
            <div><label style={labelStyle}>Notes</label><input defaultValue={local.notes} onBlur={e => saveField("notes", e.target.value)} placeholder="General notes..." style={fieldStyle} /></div>
          </div>
        )}
        {/* Type dropdown on mobile for all users */}
        {isMobile && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Type</label>
            <select
              value={local.lot_type || "spec"}
              onChange={async e => {
                const val = e.target.value;
                setLocal(p => ({ ...p, lot_type: val }));
                await saveField("lot_type", val);
              }}
              style={{ ...fieldStyle }}
            >
              <option value="spec">Spec Home</option>
              <option value="customer">Customer Home</option>
              <option value="vacant">Vacant Lot</option>
              <option value="micah">Micah's Project</option>
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4, borderBottom: "2px solid #f1f5f9" }}>
          {tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabBtnStyle(activeTab === tab.id)}>{tab.label}</button>)}
        </div>

        {activeTab === "phases" && (
          <>
            {!isMobile && (
              // CHANGE 6 FIX: Column header grid matches PhaseRow grid exactly: 36px | 1fr | 140px | 140px | 180px
              <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 140px 140px 180px", gap: 8, padding: "4px 14px", marginBottom: 6 }}>
                <div />
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Phase</div>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Start Date</div>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>End Date</div>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Status / Actions</div>
              </div>
            )}
            {isOwner && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={async () => {
                  if (!window.confirm("Mark ALL phases as complete?")) return;
                  for (const phase of phases) {
                    await supabase.from("phases").update({ status: "complete" }).eq("id", phase.id);
                  }
                  loadPhases();
                }} style={{ background: "#000", border: `1.5px solid ${G}`, color: G, borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                  ✓ Mark All Complete
                </button>
                <button onClick={async () => {
                  if (!window.confirm("Reset ALL phases to Not Started?")) return;
                  for (const phase of phases) {
                    await supabase.from("phases").update({ status: "not_started" }).eq("id", phase.id);
                  }
                  loadPhases();
                }} style={{ background: "#fff", border: "1.5px solid #e2e8f0", color: "#64748b", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                  Reset All
                </button>
              </div>
            )}
            {phases.map(phase => <PhaseRow key={phase.id} phase={phase} lotId={lot.id} onUpdate={loadPhases} isMobile={isMobile} user={user} isOwner={isOwner} />)}
            {isMicah && isMobile && (
              <button onClick={toggleMicahProject} style={{ width: "100%", marginTop: 20, background: local.lot_type === "micah" ? G3 : "#fff", border: `1.5px solid ${local.lot_type === "micah" ? G : "#e2e8f0"}`, color: local.lot_type === "micah" ? G2 : "#64748b", borderRadius: 10, padding: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                {local.lot_type === "micah" ? "✓ My Project — Tap to Remove" : "+ Add to My Projects"}
              </button>
            )}
            {isOwner && isMobile && (
              <button onClick={() => { if (window.confirm("Delete this address?")) onDelete(lot.id); }} style={{ width: "100%", marginTop: 12, background: "#fff", border: "1.5px solid #fecaca", color: "#ef4444", borderRadius: 10, padding: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                <Icons.Trash /> Delete Address
              </button>
            )}
          </>
        )}
        {activeTab === "timeline" && <LotTimeline lot={lot} phases={phases} />}
        {activeTab === "punch" && <PunchListWithSignoff lotId={lot.id} lot={lot} user={user} isOwner={isOwner} />}
        {activeTab === "docs" && <DocumentsTab lotId={lot.id} user={user} />}
        {activeTab === "team" && <TeamTab lotId={lot.id} user={user} isOwner={isOwner} />}
        {activeTab === "warranties" && <WarrantiesTab lotId={lot.id} lot={lot} />}
        {activeTab === "interest" && <InterestTab lotId={lot.id} />}
        {activeTab === "investor" && <InvestorTab lotId={lot.id} user={user} isOwner={isOwner} />}
        {activeTab === "finishes" && <FinishesTab lotId={lot.id} lot={lot} user={user} userRole={userRole} />}
        {activeTab === "activity" && <ActivityLog lotId={lot.id} />}
      </div>
    </div>
  );
}

// Prospective Lots (inline - no separate file needed)
function ProspectiveLots({ user, onConvert, isMobile }) {
  const [lots, setLots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [adding, setAdding] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [docs, setDocs] = useState([]);
  const STATUSES = ["Scouting", "Interested", "Offer Made", "Under Contract", "Passed"];
  const STATUS_COLORS = {
    "Scouting":       { bg: "#f8fafc", border: "#e2e8f0", color: "#64748b" },
    "Interested":     { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
    "Offer Made":     { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af" },
    "Under Contract": { bg: G3,        border: "#bbf7d0", color: "#166534" },
    "Passed":         { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" },
  };

  useEffect(() => { loadLots(); }, []);

  const loadLots = async () => {
    const { data } = await supabase.from("prospective_lots").select("*").order("created_at", { ascending: false });
    if (data) setLots(data);
  };

  const addLot = async () => {
    setAdding(true);
    const { data } = await supabase.from("prospective_lots").insert({ address: "", status: "Scouting", created_by: user.id }).select().single();
    if (data) { loadLots(); setSelected(data); }
    setAdding(false);
  };

  const deleteLot = async (id) => {
    await supabase.from("prospective_lots").delete().eq("id", id);
    setSelected(null); loadLots();
  };

  const convertLot = async (lot) => {
    const { data: newLot } = await supabase.from("lots").insert({ address: lot.address, notes: lot.notes, budget: lot.estimated_value, lot_type: "spec" }).select().single();
    if (newLot) {
      const phaseRows = PHASES.map(name => ({ lot_id: newLot.id, phase_name: name, status: "not_started" }));
      await supabase.from("phases").insert(phaseRows);
      await supabase.from("prospective_lots").update({ status: "Under Contract" }).eq("id", lot.id);
      alert(`Converted! "${lot.address}" is now an active development.`);
      setSelected(null); loadLots(); onConvert();
    }
  };

  const saveField = async (id, field, value) => {
    await supabase.from("prospective_lots").update({ [field]: value || null }).eq("id", id);
    if (selected && selected.id === id) setSelected(p => ({ ...p, [field]: value }));
    loadLots();
  };

  const uploadPhoto = async (lotId, files) => {
    for (const file of files) {
      const path = `prospective/${lotId}/photos/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("lot-files").upload(path, file);
      if (!error) await supabase.from("prospective_photos").insert({ lot_id: lotId, file_name: file.name, file_path: path, uploaded_by: user.id });
    }
  };

  const sc = (status) => STATUS_COLORS[status] || STATUS_COLORS["Scouting"];
  const filtered = filterStatus === "all" ? lots : lots.filter(l => l.status === filterStatus);
  const followUpDue = lots.filter(l => { if (!l.follow_up_date) return false; const today = new Date().toISOString().split("T")[0]; return l.follow_up_date <= today && l.status !== "Passed"; });

  const getUrl = (path) => supabase.storage.from("lot-files").getPublicUrl(path).data.publicUrl;

  useEffect(() => {
    if (!selected) return;
    supabase.from("prospective_photos").select("*").eq("lot_id", selected.id).order("created_at", { ascending: false }).then(({ data }) => { if (data) setPhotos(data); else setPhotos([]); });
    supabase.from("prospective_docs").select("*").eq("lot_id", selected.id).order("created_at", { ascending: false }).then(({ data }) => { if (data) setDocs(data); else setDocs([]); });
  }, [selected?.id]);

  if (selected) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => { setSelected(null); loadLots(); }} style={{ ...btnOutline, padding: "7px 12px" }}><Icons.Back /> Pipeline</button>
          <div style={{ flex: 1, fontSize: 18, fontFamily: "'DM Serif Display', serif", color: "#1e293b" }}>{selected.address || "New Prospective Address"}</div>
          <button onClick={() => { if (window.confirm("Convert to active development?")) convertLot(selected); }} style={{ ...btnGreen, padding: "7px 14px", fontSize: 12 }}><Icons.Convert /> Convert</button>
          <button onClick={() => { if (window.confirm("Delete?")) deleteLot(selected.id); }} style={{ background: "transparent", border: "1px solid #fecaca", color: "#ef4444", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><Icons.Trash /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div><label style={labelStyle}>Address</label><input defaultValue={selected.address || ""} onBlur={e => saveField(selected.id, "address", e.target.value)} placeholder="Address or description" style={fieldStyle} /></div>
          <div><label style={labelStyle}>Status</label>
            <select value={selected.status} onChange={e => saveField(selected.id, "status", e.target.value)} style={fieldStyle}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Est. Value</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>$</span>
              <input type="number" defaultValue={selected.estimated_value || ""} onBlur={e => saveField(selected.id, "estimated_value", e.target.value)} placeholder="0" style={{ ...fieldStyle, paddingLeft: 24 }} />
            </div>
          </div>
          <div><label style={labelStyle}>Follow-up Date</label><input type="date" defaultValue={selected.follow_up_date || ""} onBlur={e => saveField(selected.id, "follow_up_date", e.target.value)} style={fieldStyle} /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Notes</label><textarea defaultValue={selected.notes || ""} onBlur={e => saveField(selected.id, "notes", e.target.value)} placeholder="Notes about this address..." rows={3} style={{ ...fieldStyle, resize: "vertical" }} /></div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Photos</label>
              <label style={{ ...btnGreen, padding: "6px 12px", fontSize: 12 }}>
                <Icons.Camera />Add Photos
                <input type="file" accept="image/*" multiple capture="environment" onChange={async e => { await uploadPhoto(selected.id, Array.from(e.target.files)); const { data } = await supabase.from("prospective_photos").select("*").eq("lot_id", selected.id).order("created_at", { ascending: false }); if (data) setPhotos(data); }} style={{ display: "none" }} />
              </label>
            </div>
            {photos.length === 0 ? <div style={{ ...cardStyle, textAlign: "center", padding: 30, color: "#94a3b8" }}>No photos yet</div> :
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {photos.map(p => <div key={p.id} style={{ borderRadius: 10, overflow: "hidden", aspectRatio: "1" }} onClick={() => window.open(getUrl(p.file_path), "_blank")}><img src={getUrl(p.file_path)} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} /></div>)}
              </div>
            }
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Documents</label>
              <label style={{ ...btnOutline, padding: "6px 12px", fontSize: 12 }}>
                <Icons.Upload />Upload
                <input type="file" multiple onChange={async e => { for (const file of Array.from(e.target.files)) { const path = `prospective/${selected.id}/docs/${Date.now()}_${file.name}`; const { error } = await supabase.storage.from("lot-files").upload(path, file); if (!error) await supabase.from("prospective_docs").insert({ lot_id: selected.id, file_name: file.name, file_path: path, uploaded_by: user.id }); } const { data } = await supabase.from("prospective_docs").select("*").eq("lot_id", selected.id).order("created_at", { ascending: false }); if (data) setDocs(data); }} style={{ display: "none" }} />
              </label>
            </div>
            {docs.length === 0 ? <div style={{ ...cardStyle, textAlign: "center", padding: 30, color: "#94a3b8" }}>No documents yet</div> :
              docs.map(doc => (
                <div key={doc.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 10, marginBottom: 6, padding: "10px 12px" }}>
                  <Icons.File />
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: "#1e293b", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.file_name}</div>
                  <button onClick={() => window.open(getUrl(doc.file_path), "_blank")} style={{ background: G3, border: `1px solid ${G}`, borderRadius: 6, color: G2, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Open</button>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {followUpDue.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <Icons.Bell />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>{followUpDue.length} follow-up{followUpDue.length > 1 ? "s" : ""} due</div>
            <div style={{ fontSize: 12, color: "#b45309" }}>{followUpDue.map(l => l.address || "Unnamed").join(", ")}</div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {["all", ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${filterStatus === s ? G : "#e2e8f0"}`, background: filterStatus === s ? G3 : "#fff", color: filterStatus === s ? G2 : "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: filterStatus === s ? 700 : 500, whiteSpace: "nowrap" }}>{s === "all" ? "All" : s}</button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button onClick={() => setShowMap(!showMap)} style={{ padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${showMap ? G : "#e2e8f0"}`, background: showMap ? G3 : "#fff", color: showMap ? G2 : "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
            <Icons.Map />{showMap ? "List View" : "Map View"}
          </button>
        </div>
      </div>
      {showMap && (
        <div style={{ ...cardStyle, marginBottom: 16, padding: 0, overflow: "hidden" }}>
          <div style={{ height: 360 }}>
            <iframe title="Map" width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
              src={lots.filter(l => l.address && l.status !== "Passed").length > 0
                ? `https://maps.google.com/maps?q=${lots.filter(l => l.address && l.status !== "Passed").map(l => encodeURIComponent(l.address)).join("|")}&output=embed`
                : `https://maps.google.com/maps?q=Lake+Havasu+City,+Arizona&z=12&output=embed`}
              allowFullScreen />
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, color: "#1e293b", fontWeight: 600, marginBottom: 6 }}>No prospective addresses yet</div>
          <p style={{ fontSize: 14, margin: 0, color: "#94a3b8" }}>Add addresses you're scouting.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 80 }}>
          {filtered.map(lot => {
            const s = sc(lot.status);
            const today = new Date().toISOString().split("T")[0];
            const followUp = lot.follow_up_date && lot.follow_up_date <= today;
            return (
              <div key={lot.id} onClick={() => setSelected(lot)} style={{ background: "#fff", border: `1.5px solid ${followUp ? "#fde68a" : s.border}`, borderRadius: 14, padding: 16, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", fontFamily: "'DM Serif Display', serif", flex: 1, marginRight: 8 }}>
                    {lot.address || <span style={{ color: "#cbd5e1", fontStyle: "italic", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>No address set</span>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap", flexShrink: 0 }}>{lot.status}</span>
                </div>
                {lot.estimated_value && <div style={{ fontSize: 13, color: "#475569", fontWeight: 600, marginBottom: 6 }}>{formatCurrency(lot.estimated_value)}</div>}
                {lot.notes && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{lot.notes}</div>}
                {lot.follow_up_date && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: followUp ? "#d97706" : "#64748b", fontWeight: followUp ? 700 : 400 }}><Icons.Bell />{followUp ? "Follow-up due!" : `Follow up: ${lot.follow_up_date}`}</div>}
              </div>
            );
          })}
        </div>
      )}
      {/* CHANGE 1: FAB button raised above mobile nav, renamed to New Address */}
      <div style={{ position: "fixed", bottom: 80, right: 24, zIndex: 50 }}>
        <button onClick={addLot} disabled={adding} style={{ ...btnGreen, borderRadius: "50%", padding: 16, boxShadow: `0 4px 20px rgba(74,222,128,0.3)` }}><Icons.Plus /></button>
      </div>
    </div>
  );
}


// Action Items Dashboard Component
function ActionItemsDashboard({ lots, phases: allPhasesMap, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { loadItems(); }, [lots]);

  const loadItems = async () => {
    if (!lots.length) { setLoading(false); return; }
    setLoading(true);
    try {
      const lotIds = lots.map(l => l.id);
      const { data: checklistItems } = await supabase
        .from("phase_checklist")
        .select("*, phases(phase_name, lot_id)")
        .eq("completed", false)
        .eq("is_preset", false)
        .in("lot_id", lotIds);

      // CHANGE 8: Phase start alerts — phases due to start (0–2 days ago, still not_started)
      const today = new Date();
      const startAlerts = [];
      for (const lot of lots) {
        const phases = allPhasesMap[lot.id] || [];
        for (const phase of phases) {
          if (phase.projected_start && phase.status === "not_started") {
            const startDate = new Date(phase.projected_start + "T00:00:00");
            const daysSince = Math.round((today - startDate) / 86400000);
            if (daysSince >= 0 && daysSince <= 2) {
              startAlerts.push({
                id: `start-alert-${phase.id}`,
                item: `${phase.phase_name} due to start`,
                lot_id: lot.id,
                lot_address: lot.address,
                phase_name: "Start Alert",
                isStartAlert: true,
              });
            }
          }
        }
      }

      if (checklistItems) {
        const lotMap = {};
        lots.forEach(l => { lotMap[l.id] = l.address; });
        const allItems = checklistItems.map(item => ({
          ...item,
          lot_address: lotMap[item.lot_id] || "Unknown",
          phase_name: item.phases?.phase_name || "Unknown Phase",
        }));
        setItems([...startAlerts, ...allItems]);
      } else {
        setItems(startAlerts);
      }
    } catch(e) {
      console.error("Error loading action items:", e);
    }
    setLoading(false);
  };

  const completeItem = async (item) => {
    if (item.isStartAlert) return; // start alerts auto-dismiss, not manually completable
    await supabase.from("phase_checklist").update({ completed: true, completed_by: user.id, completed_at: new Date().toISOString() }).eq("id", item.id);
    loadItems();
  };

  if (loading) return null;
  if (items.length === 0) return null;

  const grouped = items.reduce((acc, item) => {
    const key = item.lot_address || item.lot_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div style={{ marginBottom: 24, background: "linear-gradient(135deg, #000 0%, #0f172a 100%)", border: `2px solid ${G}`, borderRadius: 16, overflow: "hidden" }}>
      <div onClick={() => setCollapsed(p => !p)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: G, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>Open Action Items</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{items.length} item{items.length > 1 ? "s" : ""} need attention across {Object.keys(grouped).length} lot{Object.keys(grouped).length > 1 ? "s" : ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: G, color: "#000", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 800 }}>{items.length}</div>
          <div style={{ color: "#64748b", fontSize: 16 }}>{collapsed ? "▼" : "▲"}</div>
        </div>
      </div>

      {!collapsed && (
        <div style={{ borderTop: `1px solid #1e293b` }}>
          {Object.entries(grouped).map(([lotAddress, lotItems]) => (
            <div key={lotAddress} style={{ borderBottom: "1px solid #1e293b" }}>
              <div style={{ padding: "8px 18px 4px", fontSize: 11, color: G, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                🏠 {lotAddress || "Unnamed"}
              </div>
              {lotItems.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 18px" }}>
                  {item.isStartAlert ? (
                    <div style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>⏰</div>
                  ) : (
                    <button onClick={() => completeItem(item)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${G}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = G; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                    </button>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: item.isStartAlert ? "#fde68a" : "#e5e7eb" }}>{item.item}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{item.phase_name}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// Lot Timeline / Gantt Chart
function LotTimeline({ lot, phases }) {
  const phasesWithDates = phases.filter(p => p.projected_start || p.projected_end);
  
  if (phasesWithDates.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>No dates entered yet</div>
        <div style={{ fontSize: 13 }}>Add Start and End dates to your phases to see the timeline.</div>
      </div>
    );
  }

  const allDates = phasesWithDates.flatMap(p => [p.projected_start, p.projected_end].filter(Boolean));
  const minDate = new Date(Math.min(...allDates.map(d => new Date(d + "T00:00:00"))));
  const maxDate = new Date(Math.max(...allDates.map(d => new Date(d + "T00:00:00"))));
  const totalDays = Math.max(1, Math.round((maxDate - minDate) / 86400000)) + 7;
  const today = new Date(); today.setHours(0,0,0,0);
  const todayOffset = Math.round((today - minDate) / 86400000);

  const getLeft = (dateStr) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr + "T00:00:00");
    return Math.max(0, Math.round((d - minDate) / 86400000) / totalDays * 100);
  };

  const getWidth = (startStr, endStr) => {
    if (!startStr || !endStr) return 2;
    const start = new Date(startStr + "T00:00:00");
    const end = new Date(endStr + "T00:00:00");
    return Math.max(1, Math.round((end - start) / 86400000) / totalDays * 100);
  };

  const getBarColor = (phase) => {
    if (phase.status === "complete") return G2;
    if (phase.status === "in_progress") return "#f59e0b";
    const today = new Date().toISOString().split("T")[0];
    if (phase.projected_end && phase.projected_end < today) return "#ef4444";
    return "#3b82f6";
  };

  const fmtDate = (d) => {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const projectedEnd = phases.filter(p => p.projected_end).map(p => p.projected_end).sort().pop();

  return (
    <div>
      {projectedEnd && (
        <div style={{ ...cardStyle, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Projected Completion</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", fontFamily: "'DM Serif Display', serif" }}>{fmtDate(projectedEnd)}</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {[{ color: G2, label: "Complete" }, { color: "#f59e0b", label: "In Progress" }, { color: "#3b82f6", label: "Upcoming" }, { color: "#ef4444", label: "Overdue" }].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b" }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ ...cardStyle, overflowX: "auto" }}>
        <div style={{ minWidth: 600 }}>
          {phasesWithDates.map((phase, i) => (
            <div key={phase.id} style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 6 }}>
              <div style={{ width: 160, flexShrink: 0, fontSize: 11, color: phase.status === "complete" ? "#94a3b8" : "#1e293b", fontWeight: 500, paddingRight: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {phase.phase_name}
              </div>
              <div style={{ flex: 1, position: "relative", height: 28, background: "#f1f5f9", borderRadius: 4 }}>
                {todayOffset >= 0 && todayOffset <= totalDays && (
                  <div style={{ position: "absolute", left: `${todayOffset / totalDays * 100}%`, top: 0, bottom: 0, width: 2, background: "#ef4444", zIndex: 2 }} />
                )}
                {(phase.projected_start || phase.projected_end) && (
                  <div style={{ position: "absolute", left: `${getLeft(phase.projected_start || phase.projected_end)}%`, width: `${getWidth(phase.projected_start, phase.projected_end) || 2}%`, top: 4, height: 20, background: getBarColor(phase), borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6, minWidth: 4 }} title={`${phase.phase_name}: ${fmtDate(phase.projected_start)} - ${fmtDate(phase.projected_end)}`}>
                    <span style={{ fontSize: 9, color: "#fff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden" }}>
                      {fmtDate(phase.projected_start)}{phase.projected_end ? ` - ${fmtDate(phase.projected_end)}` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Calendar View
function CalendarView({ onBack, isMobile, userRole }) {
  const [lots, setLots] = useState([]);
  const [phases, setPhases] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => { 
    supabase.from("lots").select("*").then(({ data }) => {
      if (data) { setLots(data); }
    });
  }, []);

  useEffect(() => { if (lots.length > 0) loadAllPhases(); }, [lots]);

  const loadAllPhases = async () => {
    setLoading(true);
    const allPhases = {};
    for (const lot of lots) {
      const { data } = await supabase.from("phases").select("*").eq("lot_id", lot.id);
      if (data) allPhases[lot.id] = { lot, phases: data.filter(p => p.projected_start || p.projected_end) };
    }
    setPhases(allPhases);
    setLoading(false);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return { days, firstDayOfWeek: firstDay.getDay() };
  };

  const getPhaseColor = (phase) => {
    if (phase.status === "complete") return { bg: G2, text: "#fff" };
    if (phase.status === "in_progress") return { bg: "#f59e0b", text: "#fff" };
    return { bg: "#3b82f6", text: "#fff" };
  };

  const getPhasesForDay = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    const result = [];
    Object.values(phases).forEach(({ lot, phases: lotPhases }) => {
      lotPhases.forEach(phase => {
        const start = phase.projected_start;
        const end = phase.projected_end;
        if (start && end && dateStr >= start && dateStr <= end) {
          result.push({ ...phase, lotAddress: lot.address });
        } else if (start && !end && dateStr === start) {
          result.push({ ...phase, lotAddress: lot.address });
        }
      });
    });
    return result;
  };

  const { days, firstDayOfWeek } = getDaysInMonth(currentMonth);
  const today = new Date().toISOString().split("T")[0];
  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const overlappingDays = days.filter(day => getPhasesForDay(day).length > 2).map(d => d.toISOString().split("T")[0]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "1.5px solid #333", color: "#94a3b8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><Icons.Back /> Dashboard</button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} style={{ background: "#1e293b", border: `2px solid ${G}`, color: G, borderRadius: 10, padding: "8px 20px", cursor: "pointer", fontSize: 20, fontWeight: 700 }}>‹</button>
            <div style={{ fontSize: 18, fontFamily: "'DM Serif Display', serif", color: "#fff", minWidth: 200, textAlign: "center" }}>{monthName}</div>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} style={{ background: "#1e293b", border: `2px solid ${G}`, color: G, borderRadius: 10, padding: "8px 20px", cursor: "pointer", fontSize: 20, fontWeight: 700 }}>›</button>
          </div>
          <button onClick={() => setCurrentMonth(new Date())} style={{ background: "transparent", border: `1px solid ${G}`, color: G, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>Today</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>Loading calendar...</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
              {[{ color: "#3b82f6", label: "Not Started" }, { color: "#f59e0b", label: "In Progress" }, { color: G2, label: "Complete" }, { color: "#ef4444", label: "Overlap (3+ jobs)" }].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                  <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {Array(firstDayOfWeek).fill(null).map((_, i) => (
                  <div key={`empty-${i}`} style={{ minHeight: isMobile ? 60 : 100, borderRight: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", background: "#fafafa" }} />
                ))}
                {days.map(day => {
                  const dateStr = day.toISOString().split("T")[0];
                  const isToday = dateStr === today;
                  const dayPhases = getPhasesForDay(day);
                  const hasOverlap = dayPhases.length >= 3;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div key={dateStr} style={{ minHeight: isMobile ? 60 : 100, borderRight: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", padding: "6px", background: hasOverlap ? "#fef2f2" : isWeekend ? "#fafafa" : "#fff", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? "#fff" : hasOverlap ? "#ef4444" : "#1e293b", background: isToday ? "#000" : "transparent", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {day.getDate()}
                        </span>
                        {hasOverlap && <span style={{ fontSize: 9, background: "#ef4444", color: "#fff", borderRadius: 10, padding: "1px 5px", fontWeight: 700 }}>⚠ {dayPhases.length}</span>}
                      </div>
                      {dayPhases.slice(0, isMobile ? 1 : 3).map((phase, i) => {
                        const c = getPhaseColor(phase);
                        return (
                          <div key={phase.id + i} style={{ background: c.bg, color: c.text, fontSize: 9, borderRadius: 4, padding: "2px 4px", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={`${phase.lotAddress} - ${phase.phase_name}`}>
                            {isMobile ? phase.phase_name.substring(0,8) : `${(phase.lotAddress || "").split(" ").slice(0,2).join(" ")} · ${phase.phase_name}`}
                          </div>
                        );
                      })}
                      {dayPhases.length > (isMobile ? 1 : 3) && (
                        <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>+{dayPhases.length - (isMobile ? 1 : 3)} more</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {overlappingDays.length > 0 && (
              <div style={{ marginTop: 16, background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>⚠ Scheduling Conflicts</div>
                {overlappingDays.map(dateStr => {
                  const date = new Date(dateStr + "T00:00:00");
                  const dayPhases = getPhasesForDay(date);
                  return (
                    <div key={dateStr} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#dc2626" }}>{date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} — {dayPhases.length} jobs overlapping</div>
                      {dayPhases.map(p => <div key={p.id} style={{ fontSize: 11, color: "#64748b", marginLeft: 10 }}>• {p.lotAddress} · {p.phase_name}</div>)}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Team Chat
function TeamChat({ user, onBack, userRole }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [globalTeam, setGlobalTeam] = useState([]);
  // CHANGE 3: Chat keyword search
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { 
    loadMessages(); 
    loadTeam();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!searchQuery) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, searchQuery]);

  const loadMessages = async () => {
    const { data } = await supabase.from("team_messages").select("*").order("created_at", { ascending: true }).limit(200);
    if (data) setMessages(data);
  };

  const loadTeam = async () => {
    const { data } = await supabase.from("global_team").select("*");
    if (data) setGlobalTeam(data);
  };

  const getMemberName = (email) => {
    if (email === "derekselman@gmail.com") return "Derek";
    const member = globalTeam.find(m => m.email === email);
    return member ? member.full_name.split(" ")[0] : email.split("@")[0];
  };

  const getInitial = (email) => getMemberName(email)[0].toUpperCase();

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    await supabase.from("team_messages").insert({ user_id: user.id, user_email: user.email, message: newMessage.trim() });
    setNewMessage("");
    loadMessages();
    setSending(false);
  };

  const fmt = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.message.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const groupedMessages = filteredMessages.reduce((acc, msg, i) => {
    const prev = filteredMessages[i - 1];
    const isFirst = !prev || prev.user_email !== msg.user_email || 
      (new Date(msg.created_at) - new Date(prev.created_at)) > 300000 || searchQuery;
    acc.push({ ...msg, isFirst });
    return acc;
  }, []);

  // Highlight matching text
  const highlight = (text) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} style={{ background: "#fde68a", color: "#92400e", borderRadius: 2, padding: "0 2px" }}>{part}</mark>
        : part
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "1.5px solid #333", color: "#94a3b8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><Icons.Back /> Dashboard</button>
          <div style={{ fontSize: 18, fontFamily: "'DM Serif Display', serif", color: "#fff" }}>Team Chat</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {/* CHANGE 3: Search toggle */}
            <button onClick={() => { setShowSearch(p => !p); if (showSearch) setSearchQuery(""); }} style={{ background: showSearch ? G3 : "transparent", border: `1px solid ${showSearch ? G : "#333"}`, color: showSearch ? G2 : "#94a3b8", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
              🔍{!showSearch && " Search"}
            </button>
            {!showSearch && <div style={{ fontSize: 12, color: "#64748b" }}>Updates every 10s</div>}
          </div>
        </div>
        {/* CHANGE 3: Search bar */}
        {showSearch && (
          <div style={{ maxWidth: 800, margin: "8px auto 0", position: "relative" }}>
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages by keyword..."
              style={{ width: "100%", background: "#1e293b", border: `1.5px solid ${G}`, borderRadius: 10, color: "#f1f5f9", fontSize: 14, padding: "10px 14px 10px 36px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }}
            />
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            {searchQuery && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#64748b" }}>{filteredMessages.length} result{filteredMessages.length !== 1 ? "s" : ""}</div>}
          </div>
        )}
      </div>

      <div style={{ flex: 1, maxWidth: 800, margin: "0 auto", width: "100%", padding: "16px 24px", paddingBottom: 100, overflowY: "auto" }}>
        {searchQuery && filteredMessages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14 }}>No messages found for "{searchQuery}"</div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>No messages yet</div>
            <div style={{ fontSize: 13 }}>Start the conversation with your team!</div>
          </div>
        ) : (
          groupedMessages.map(msg => {
            const isMe = msg.user_email === user.email;
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 10, marginBottom: msg.isFirst ? 16 : 4, alignItems: "flex-end" }}>
                {!isMe && msg.isFirst && (
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#000", border: `2px solid ${G}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: G, fontWeight: 700, flexShrink: 0 }}>
                    {getInitial(msg.user_email)}
                  </div>
                )}
                {!isMe && !msg.isFirst && <div style={{ width: 34, flexShrink: 0 }} />}
                <div style={{ maxWidth: "70%" }}>
                  {msg.isFirst && !isMe && (
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 600 }}>
                      {getMemberName(msg.user_email)} · {fmt(msg.created_at)}
                    </div>
                  )}
                  {msg.isFirst && isMe && (
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, textAlign: "right" }}>
                      {fmt(msg.created_at)}
                    </div>
                  )}
                  <div style={{ background: isMe ? "#000" : "#fff", color: isMe ? G : "#1e293b", border: isMe ? `1.5px solid ${G}` : "1.5px solid #e2e8f0", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", fontSize: 14, lineHeight: 1.5, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    {highlight(msg.message)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1.5px solid #e2e8f0", padding: "12px 24px", zIndex: 10 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", gap: 10 }}>
          <input 
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)} 
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
            placeholder="Type a message..." 
            style={{ ...fieldStyle, flex: 1, fontSize: 14, padding: "12px 16px" }} 
          />
          <button onClick={sendMessage} disabled={sending || !newMessage.trim()} style={{ background: newMessage.trim() ? "#000" : "#f1f5f9", color: newMessage.trim() ? G : "#cbd5e1", border: `2px solid ${newMessage.trim() ? G : "#e2e8f0"}`, borderRadius: 10, padding: "12px 20px", cursor: newMessage.trim() ? "pointer" : "default", fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap" }}>
            {sending ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================================================
// WARRANTY & PUNCH LIST SIGN PAGES
// ============================================================

function WarrantySignPage({ token }) {
  const [warranty, setWarranty] = useState(null);
  const [items, setItems] = useState([]);
  const [sig, setSig] = useState(null);
  const [name, setName] = useState("");
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [token]);

  const loadData = async () => {
    const { data: sigData } = await supabase.from("warranty_signatures").select("*").eq("token", token).single();
    if (!sigData) { setLoading(false); return; }
    setSig(sigData);
    if (sigData.homeowner_name) setSigned(true);
    const { data: w } = await supabase.from("warranties").select("*").eq("id", sigData.warranty_id).single();
    if (w) setWarranty(w);
    const { data: i } = await supabase.from("warranty_items").select("*").eq("warranty_id", sigData.warranty_id).order("created_at");
    if (i) setItems(sigData.signature_type === "completion" ? i.filter(x => x.completed) : i);
    setLoading(false);
  };

  const sign = async () => {
    if (!name.trim()) return;
    await supabase.from("warranty_signatures").update({ homeowner_name: name.trim(), signed_at: new Date().toISOString() }).eq("token", token);
    setSigned(true);
  };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", color: "#64748b" }}>Loading...</div>;
  if (!warranty) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", color: "#ef4444" }}>Invalid or expired link.</div>;

  const isCompletion = sig?.signature_type === "completion";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; } body { margin: 0; }`}</style>
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ background: "#000", borderRadius: "14px 14px 0 0", padding: "20px 24px", borderBottom: "3px solid #4ade80" }}>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Figley Contracting LLC</div>
          <div style={{ fontSize: 20, fontFamily: "'DM Serif Display', serif", color: "#fff" }}>{isCompletion ? "Warranty Completion Sign-off" : "Warranty Work Order"}</div>
        </div>
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 14px 14px", padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Property</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{warranty.property_address}</div></div>
            {warranty.homeowner_name && <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Homeowner</div><div style={{ fontSize: 14, color: "#1e293b" }}>{warranty.homeowner_name}</div></div>}
            {warranty.expiration_date && <div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Warranty Expires</div><div style={{ fontSize: 14, color: "#1e293b" }}>{new Date(warranty.expiration_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div></div>}
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 10 }}>{isCompletion ? "Work Completed" : "Work to be Performed"}</div>
            {items.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, background: isCompletion ? "#16a34a" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {isCompletion && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.5 }}>{item.description}{item.assigned_to ? <span style={{ color: "#64748b" }}> — {item.assigned_to}</span> : ""}</div>
              </div>
            ))}
          </div>
          {signed ? (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#16a34a" }}>Signed by {sig?.homeowner_name}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{new Date(sig?.signed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 14, lineHeight: 1.6, background: "#f8fafc", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                {isCompletion ? "By signing below, I confirm that all warranty work listed above has been completed to my satisfaction." : "By signing below, I confirm that the warranty work listed above is accurate and I authorize Figley Contracting LLC to proceed."}
              </div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Type your full name to sign" style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 12, boxSizing: "border-box", outline: "none" }} />
              <button onClick={sign} disabled={!name.trim()} style={{ width: "100%", background: name.trim() ? "#000" : "#f1f5f9", color: name.trim() ? "#4ade80" : "#cbd5e1", border: `2px solid ${name.trim() ? "#4ade80" : "#e2e8f0"}`, borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 700, cursor: name.trim() ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}>
                ✍️ Sign & Submit
              </button>
            </div>
          )}
          <div style={{ marginTop: 20, textAlign: "center", fontSize: 10, color: "#cbd5e1" }}>Figley Contracting LLC · Powered by Dev Tracker</div>
        </div>
      </div>
    </div>
  );
}

function PunchSignPage({ token }) {
  const [lot, setLot] = useState(null);
  const [items, setItems] = useState([]);
  const [sig, setSig] = useState(null);
  const [name, setName] = useState("");
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [token]);

  const loadData = async () => {
    const { data: sigData } = await supabase.from("punch_signatures").select("*").eq("token", token).single();
    if (!sigData) { setLoading(false); return; }
    setSig(sigData);
    if (sigData.homeowner_name) setSigned(true);
    const { data: l } = await supabase.from("lots").select("*").eq("id", sigData.lot_id).single();
    if (l) setLot(l);
    const { data: i } = await supabase.from("punch_list").select("*").eq("lot_id", sigData.lot_id).order("created_at");
    if (i) setItems(sigData.signature_type === "completion" ? i.filter(x => x.completed) : i);
    setLoading(false);
  };

  const sign = async () => {
    if (!name.trim()) return;
    await supabase.from("punch_signatures").update({ homeowner_name: name.trim(), signed_at: new Date().toISOString() }).eq("token", token);
    setSigned(true);
  };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", color: "#64748b" }}>Loading...</div>;
  if (!lot) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", color: "#ef4444" }}>Invalid or expired link.</div>;

  const isCompletion = sig?.signature_type === "completion";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; } body { margin: 0; }`}</style>
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ background: "#000", borderRadius: "14px 14px 0 0", padding: "20px 24px", borderBottom: "3px solid #4ade80" }}>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Figley Contracting LLC</div>
          <div style={{ fontSize: 20, fontFamily: "'DM Serif Display', serif", color: "#fff" }}>{isCompletion ? "Punch List Completion Sign-off" : "Punch List Walkthrough Agreement"}</div>
        </div>
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 14px 14px", padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Property</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{lot.address}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Walkthrough Date: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 10 }}>{isCompletion ? "Completed Items" : "Punch List Items"}</div>
            {items.length === 0 ? <div style={{ fontSize: 13, color: "#94a3b8" }}>No items.</div> : items.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, background: isCompletion ? "#16a34a" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {isCompletion && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.5 }}>{item.item}</div>
              </div>
            ))}
          </div>
          {signed ? (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#16a34a" }}>Signed by {sig?.homeowner_name}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{new Date(sig?.signed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 14, lineHeight: 1.6, background: "#f8fafc", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                {isCompletion ? "By signing below, I confirm that all punch list items above have been completed to my satisfaction." : "By signing below, I confirm this is the complete and agreed upon punch list. No additional items will be added after this signature."}
              </div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Type your full name to sign" style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 12, boxSizing: "border-box", outline: "none" }} />
              <button onClick={sign} disabled={!name.trim()} style={{ width: "100%", background: name.trim() ? "#000" : "#f1f5f9", color: name.trim() ? "#4ade80" : "#cbd5e1", border: `2px solid ${name.trim() ? "#4ade80" : "#e2e8f0"}`, borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 700, cursor: name.trim() ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}>
                ✍️ Sign & Submit
              </button>
            </div>
          )}
          <div style={{ marginTop: 20, textAlign: "center", fontSize: 10, color: "#cbd5e1" }}>Figley Contracting LLC · Powered by Dev Tracker</div>
        </div>
      </div>
    </div>
  );
}

// Warranties Tab
function WarrantiesTab({ lotId, lot }) {
  const [warranties, setWarranties] = useState([]);
  const [warrantyItems, setWarrantyItems] = useState({});
  const [signatures, setSignatures] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({ property_address: lot?.address || "", homeowner_name: "", homeowner_email: "", homeowner_phone: "", expiration_date: "", priority: "normal", status: "Pending", notes: "" });

  const PRIORITIES = { urgent: { color: "#ef4444", bg: "#fef2f2", label: "Urgent" }, normal: { color: "#f59e0b", bg: "#fffbeb", label: "Normal" }, low: { color: "#64748b", bg: "#f8fafc", label: "Low" } };
  const TEAM = ["Micah Figley", "Chris Ropchak", "Morgan Figley"];

  useEffect(() => { loadWarranties(); }, [lotId]);

  const loadWarranties = async () => {
    const { data: w } = await supabase.from("warranties").select("*").eq("lot_id", lotId).order("created_at", { ascending: false });
    if (w) {
      setWarranties(w);
      for (const warranty of w) {
        const { data: i } = await supabase.from("warranty_items").select("*").eq("warranty_id", warranty.id).order("created_at");
        if (i) setWarrantyItems(p => ({ ...p, [warranty.id]: i }));
        const { data: s } = await supabase.from("warranty_signatures").select("*").eq("warranty_id", warranty.id);
        if (s) setSignatures(p => ({ ...p, [warranty.id]: s }));
      }
    }
  };

  const saveWarranty = async () => {
    setSaving(true);
    const { data } = await supabase.from("warranties").insert({ ...form, lot_id: lotId }).select().single();
    if (data) { setExpandedId(data.id); loadWarranties(); }
    setForm({ property_address: lot?.address || "", homeowner_name: "", homeowner_email: "", homeowner_phone: "", expiration_date: "", priority: "normal", status: "Pending", notes: "" });
    setShowForm(false);
    setSaving(false);
  };

  const addItem = async (warrantyId) => {
    if (!newItem.trim()) return;
    await supabase.from("warranty_items").insert({ warranty_id: warrantyId, description: newItem.trim() });
    setNewItem("");
    loadWarranties();
  };

  const toggleItem = async (item) => {
    await supabase.from("warranty_items").update({ completed: !item.completed, completed_at: !item.completed ? new Date().toISOString() : null }).eq("id", item.id);
    loadWarranties();
  };

  const updateItemAssignee = async (itemId, assignee) => {
    await supabase.from("warranty_items").update({ assigned_to: assignee }).eq("id", itemId);
    loadWarranties();
  };

  const deleteItem = async (id) => {
    await supabase.from("warranty_items").delete().eq("id", id);
    loadWarranties();
  };

  const updateWarranty = async (id, field, value) => {
    await supabase.from("warranties").update({ [field]: value }).eq("id", id);
    loadWarranties();
  };

  const deleteWarranty = async (id) => {
    if (!window.confirm("Delete this warranty record?")) return;
    await supabase.from("warranties").delete().eq("id", id);
    loadWarranties();
  };

  const createSignatureLink = async (warrantyId, type) => {
    const { data } = await supabase.from("warranty_signatures").insert({ warranty_id: warrantyId, signature_type: type }).select().single();
    if (data) {
      const url = `${window.location.origin}?warranty=${data.token}`;
      navigator.clipboard.writeText(url);
      setCopied(`${warrantyId}-${type}`);
      setTimeout(() => setCopied(null), 3000);
      loadWarranties();
    }
  };

  const getSignature = (warrantyId, type) => (signatures[warrantyId] || []).find(s => s.signature_type === type);
  const pr = (priority) => PRIORITIES[priority] || PRIORITIES.normal;

  return (
    <div>
      {showForm && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 14 }}>New Warranty Record</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Property Address</label><input value={form.property_address} onChange={e => setForm(p => ({ ...p, property_address: e.target.value }))} style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
            <div><label style={labelStyle}>Homeowner Name</label><input value={form.homeowner_name} onChange={e => setForm(p => ({ ...p, homeowner_name: e.target.value }))} placeholder="Full name" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
            <div><label style={labelStyle}>Phone</label><input value={form.homeowner_phone} onChange={e => setForm(p => ({ ...p, homeowner_phone: e.target.value }))} placeholder="Phone number" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
            <div><label style={labelStyle}>Email</label><input value={form.homeowner_email} onChange={e => setForm(p => ({ ...p, homeowner_email: e.target.value }))} placeholder="Email" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
            <div><label style={labelStyle}>Warranty Expiration</label><input type="date" value={form.expiration_date} onChange={e => setForm(p => ({ ...p, expiration_date: e.target.value }))} style={fieldStyle} /></div>
            <div><label style={labelStyle}>Priority</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} style={fieldStyle}>
                <option value="urgent">Urgent</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes..." rows={2} style={{ ...fieldStyle, resize: "vertical", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveWarranty} disabled={saving} style={btnGreen}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowForm(false)} style={btnOutline}>Cancel</button>
          </div>
        </div>
      )}

      {warranties.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏠</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>No warranty records yet</div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>Add warranty items for this property.</div>
        </div>
      ) : warranties.map(warranty => {
        const items = warrantyItems[warranty.id] || [];
        const complete = items.filter(i => i.completed).length;
        const workOrderSig = getSignature(warranty.id, "work_order");
        const completionSig = getSignature(warranty.id, "completion");
        const isExpanded = expandedId === warranty.id;
        const p = pr(warranty.priority);
        const daysUntilExp = warranty.expiration_date ? Math.round((new Date(warranty.expiration_date) - new Date()) / 86400000) : null;

        return (
          <div key={warranty.id} style={{ ...cardStyle, marginBottom: 14, borderColor: warranty.priority === "urgent" ? "#fecaca" : "#e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div onClick={() => setExpandedId(isExpanded ? null : warranty.id)} style={{ cursor: "pointer", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: p.bg, color: p.color, border: `1px solid ${p.color}20` }}>{p.label}</span>
                  <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{warranty.status}</span>
                  {daysUntilExp !== null && daysUntilExp <= 30 && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>⚠ Expires in {daysUntilExp}d</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{warranty.homeowner_name || "Unnamed Homeowner"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{warranty.homeowner_phone}{warranty.homeowner_email ? ` · ${warranty.homeowner_email}` : ""}</div>
                {warranty.expiration_date && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Expires: {new Date(warranty.expiration_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={warranty.status} onChange={e => updateWarranty(warranty.id, "status", e.target.value)} onClick={e => e.stopPropagation()} style={{ fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 6px", color: "#64748b", fontFamily: "'DM Sans', sans-serif", outline: "none" }}>
                  {["Pending","Scheduled","In Progress","Complete"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => deleteWarranty(warranty.id)} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer" }}><Icons.Trash /></button>
              </div>
            </div>
            {items.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ background: "#f1f5f9", borderRadius: 99, height: 6, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ width: `${items.length > 0 ? (complete/items.length)*100 : 0}%`, height: "100%", background: `linear-gradient(90deg, #000, #4ade80)`, borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{complete}/{items.length} items complete</div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: isExpanded ? 12 : 0, flexWrap: "wrap" }}>
              {workOrderSig?.homeowner_name ? (
                <span style={{ fontSize: 11, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", padding: "3px 8px", borderRadius: 20, fontWeight: 600 }}>✓ Work Order Signed by {workOrderSig.homeowner_name}</span>
              ) : (
                <button onClick={() => createSignatureLink(warranty.id, "work_order")} style={{ fontSize: 11, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", padding: "3px 10px", borderRadius: 20, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                  {copied === `${warranty.id}-work_order` ? "Link Copied!" : "📋 Send Work Order"}
                </button>
              )}
              {completionSig?.homeowner_name ? (
                <span style={{ fontSize: 11, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", padding: "3px 8px", borderRadius: 20, fontWeight: 600 }}>✓ Completion Signed by {completionSig.homeowner_name}</span>
              ) : (
                <button onClick={() => createSignatureLink(warranty.id, "completion")} style={{ fontSize: 11, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "3px 10px", borderRadius: 20, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                  {copied === `${warranty.id}-completion` ? "Link Copied!" : "✅ Send Completion Sign-off"}
                </button>
              )}
            </div>
            {isExpanded && (
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Warranty Items</div>
                {items.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <button onClick={() => toggleItem(item)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.completed ? "#16a34a" : "#cbd5e1"}`, background: item.completed ? "#16a34a" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                      {item.completed && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                    <div style={{ flex: 1, fontSize: 13, color: item.completed ? "#94a3b8" : "#1e293b", textDecoration: item.completed ? "line-through" : "none" }}>{item.description}</div>
                    <select value={item.assigned_to || ""} onChange={e => updateItemAssignee(item.id, e.target.value)} style={{ fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, padding: "2px 6px", color: "#64748b", fontFamily: "'DM Sans', sans-serif", outline: "none" }}>
                      <option value="">Assign to...</option>
                      {TEAM.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => deleteItem(item.id)} style={{ background: "transparent", border: "none", color: "#e2e8f0", cursor: "pointer" }}><Icons.Trash /></button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem(warranty.id)} placeholder="Add warranty item..." style={{ ...fieldStyle, fontSize: 13, padding: "7px 10px", flex: 1 }} />
                  <button onClick={() => addItem(warranty.id)} disabled={!newItem.trim()} style={{ ...btnGreen, padding: "7px 14px", fontSize: 13, opacity: !newItem.trim() ? 0.5 : 1 }}>Add</button>
                </div>
                {warranty.notes && <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", fontStyle: "italic" }}>{warranty.notes}</div>}
              </div>
            )}
          </div>
        );
      })}
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{ ...btnOutline, marginTop: 8 }}><Icons.Plus /> Add Warranty Record</button>
      )}
    </div>
  );
}

// Punch List with Sign-off
function PunchListWithSignoff({ lotId, lot, user, isOwner }) {
  const [signatures, setSignatures] = useState([]);
  const [copied, setCopied] = useState(null);

  useEffect(() => { loadSigs(); }, [lotId]);

  const loadSigs = async () => {
    const { data } = await supabase.from("punch_signatures").select("*").eq("lot_id", lotId).order("created_at");
    if (data) setSignatures(data);
  };

  const createLink = async (type) => {
    const { data } = await supabase.from("punch_signatures").insert({ lot_id: lotId, signature_type: type }).select().single();
    if (data) {
      const url = `${window.location.origin}?punch=${data.token}`;
      navigator.clipboard.writeText(url);
      setCopied(type);
      setTimeout(() => setCopied(null), 3000);
      loadSigs();
    }
  };

  const walkSig = signatures.find(s => s.signature_type === "walkthrough");
  const compSig = signatures.find(s => s.signature_type === "completion");

  return (
    <div>
      {isOwner && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>Homeowner Sign-off — Figley Contracting LLC</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {walkSig?.homeowner_name ? (
              <span style={{ fontSize: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", padding: "5px 12px", borderRadius: 20, fontWeight: 600 }}>✓ Walkthrough signed by {walkSig.homeowner_name}</span>
            ) : (
              <button onClick={() => createLink("walkthrough")} style={{ fontSize: 12, background: "#fffbeb", border: "1.5px solid #fde68a", color: "#92400e", padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                {copied === "walkthrough" ? "✓ Link Copied!" : "📋 Send Walkthrough Sign-off"}
              </button>
            )}
            {compSig?.homeowner_name ? (
              <span style={{ fontSize: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", padding: "5px 12px", borderRadius: 20, fontWeight: 600 }}>✓ Completion signed by {compSig.homeowner_name}</span>
            ) : (
              <button onClick={() => createLink("completion")} style={{ fontSize: 12, background: "#f0fdf4", border: "1.5px solid #bbf7d0", color: "#166534", padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                {copied === "completion" ? "✓ Link Copied!" : "✅ Send Completion Sign-off"}
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>Links are copied to clipboard — paste into a text or email to the homeowner.</div>
        </div>
      )}
      <PunchListTab lotId={lotId} user={user} />
    </div>
  );
}

// Global Team Management
function GlobalTeam({ onBack }) {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("contractor");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const ROLES = [
    { value: "manager", label: "Manager", desc: "Full access - same as owner" },
    { value: "micah", label: "Micah Figley", desc: "Phases, Docs, Punch List, Activity, Chat" },
    { value: "morgan", label: "Morgan Figley", desc: "Phases, Docs, Punch List, Activity, Chat" },
    { value: "chris", label: "Chris Ropchak", desc: "Phases, Docs, Punch List, Activity, Chat" },
  ];

  const ROLE_COLORS = {
    manager: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
    superintendent: { bg: "#f5f3ff", color: "#5b21b6", border: "#ddd6fe" },
    contractor: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
    viewer: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  };

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    const { data } = await supabase.from("global_team").select("*").order("created_at");
    if (data) setMembers(data);
  };

  const addMember = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("global_team").insert({ full_name: name.trim(), email: email.trim().toLowerCase(), role });
    if (error) {
      if (error.code === "23505") setMsg("That email is already on the team.");
      else setMsg("Error adding member.");
    } else {
      setMsg(`${name} added as ${role}!`);
      setName(""); setEmail("");
      loadMembers();
    }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const updateRole = async (id, newRole) => {
    await supabase.from("global_team").update({ role: newRole }).eq("id", id);
    loadMembers();
  };

  const removeMember = async (id) => {
    if (!window.confirm("Remove this team member?")) return;
    await supabase.from("global_team").delete().eq("id", id);
    loadMembers();
  };

  const rc = (role) => ROLE_COLORS[role] || ROLE_COLORS.viewer;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "1.5px solid #333", color: "#94a3b8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><Icons.Back /> Dashboard</button>
          <div style={{ fontSize: 18, fontFamily: "'DM Serif Display', serif", color: "#fff" }}>Team Management</div>
        </div>
      </div>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 24 }}>
          {ROLES.map(r => (
            <div key={r.value} style={{ background: rc(r.value).bg, border: `1.5px solid ${rc(r.value).border}`, borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: rc(r.value).color }}>{r.label}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{r.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: 20, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 14 }}>Add Team Member</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>Full Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Micah Figley" style={{ ...fieldStyle, fontSize: 13, padding: "9px 12px" }} /></div>
            <div><label style={labelStyle}>Email</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" type="email" style={{ ...fieldStyle, fontSize: 13, padding: "9px 12px" }} /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Role</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {ROLES.map(r => (
                <button key={r.value} onClick={() => setRole(r.value)} style={{ padding: "8px 6px", borderRadius: 8, border: `2px solid ${role === r.value ? rc(r.value).border : "#e2e8f0"}`, background: role === r.value ? rc(r.value).bg : "#fff", color: role === r.value ? rc(r.value).color : "#64748b", fontSize: 12, fontWeight: role === r.value ? 700 : 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{r.label}</button>
              ))}
            </div>
          </div>
          {msg && <div style={{ fontSize: 12, color: msg.includes("Error") || msg.includes("already") ? "#ef4444" : G2, background: msg.includes("Error") || msg.includes("already") ? "#fef2f2" : G3, padding: "8px 12px", borderRadius: 8, marginBottom: 10 }}>{msg}</div>}
          <button onClick={addMember} disabled={saving || !name.trim() || !email.trim()} style={{ ...btnGreen, padding: "10px 20px", opacity: (!name.trim() || !email.trim()) ? 0.5 : 1 }}>{saving ? "Adding..." : "Add Member"}</button>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10 }}>They need to sign up at your app URL using this email to access the app.</div>
        </div>
        {members.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 }}>No team members yet.</div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Team Members ({members.length})</div>
            {members.map(m => (
              <div key={m.id} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#000", border: `2px solid ${G}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: G, fontWeight: 700, flexShrink: 0 }}>
                  {(m.full_name || m.email || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{m.full_name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{m.email}</div>
                </div>
                <select value={m.role} onChange={e => updateRole(m.id, e.target.value)} style={{ background: rc(m.role).bg, border: `1.5px solid ${rc(m.role).border}`, borderRadius: 8, color: rc(m.role).color, fontSize: 12, fontWeight: 700, padding: "5px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", outline: "none" }}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button onClick={() => removeMember(m.id)} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", flexShrink: 0 }}><Icons.Trash /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// CHANGE 5: Sort lots by completion % desc, then alphabetical
function sortLots(lotList, phasesMap) {
  return [...lotList].sort((a, b) => {
    const progA = getOverallProgress(phasesMap[a.id] || []).pct;
    const progB = getOverallProgress(phasesMap[b.id] || []).pct;
    if (progB !== progA) return progB - progA;
    return (a.address || "").localeCompare(b.address || "");
  });
}

// Dashboard
function Dashboard({ user, onSelect, onSignOut, isMobile, onShowPipeline, onShowTeam, onShowChat, onShowCalendar, onToggleNotifications, onMarkChatRead, notifications, unreadChat, isOwner, userLotIds, theme, toggleTheme, userRole }) {
  const [lots, setLots] = useState([]);
  const [filterBy, setFilterBy] = useState("all");
  const [lotPhases, setLotPhases] = useState({});
  const [lotInterest, setLotInterest] = useState({});
  const [searchQuery, setSearchQuery] = useState(""); // CHANGE 2
  const [lotsLoaded, setLotsLoaded] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // CHANGE 7: Draggable section order for Micah & Chris
  const [sectionOrder, setSectionOrder] = useState(["spec", "customer", "vacant", "micah"]);
  const [draggedSection, setDraggedSection] = useState(null);
  const isDark = theme === "dark";

  const isMicahOrChris = userRole === "micah" || userRole === "chris";

  useEffect(() => { loadLots(); }, []);

  // CHANGE 7: Load saved section order from user_preferences
  useEffect(() => {
    if (!isMicahOrChris) return;
    supabase.from("user_preferences").select("section_order").eq("id", user.id).single().then(({ data }) => {
      if (data?.section_order) {
        try { setSectionOrder(JSON.parse(data.section_order)); } catch(e) {}
      }
    });
  }, [user.id, isMicahOrChris]);

  const saveSectionOrder = async (newOrder) => {
    await supabase.from("user_preferences").upsert({ id: user.id, section_order: JSON.stringify(newOrder) });
  };

  const handleDragStart = (e, section) => {
    setDraggedSection(section);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, section) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === section) return;
    const newOrder = [...sectionOrder];
    const fromIdx = newOrder.indexOf(draggedSection);
    const toIdx = newOrder.indexOf(section);
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedSection);
    setSectionOrder(newOrder);
  };

  const handleDrop = async () => {
    setDraggedSection(null);
    if (isMicahOrChris) await saveSectionOrder(sectionOrder);
  };

  const loadLots = async () => {
    const { data: lotsData } = await supabase.from("lots").select("*").order("created_at");
    if (lotsData) {
      setLots(lotsData);
      setLotsLoaded(true);
      for (const lot of lotsData) {
        const { data: phases } = await supabase.from("phases").select("*").eq("lot_id", lot.id);
        if (phases) setLotPhases(p => ({ ...p, [lot.id]: phases }));
        if (isOwner) {
          const { data: loans } = await supabase.from("interest_loans").select("*").eq("lot_id", lot.id);
          const { data: draws } = loans ? await supabase.from("loan_draws").select("*").in("loan_id", loans.map(l => l.id)) : { data: [] };
          if (loans && draws) {
            let dailyBurn = 0;
            for (const loan of loans) {
              const loanDraws = draws.filter(d => d.loan_id === loan.id);
              for (const draw of loanDraws) {
                if (draw.amount && draw.draw_date) {
                  dailyBurn += (parseFloat(draw.amount) * (loan.interest_rate / 100)) / 365;
                }
              }
            }
            setLotInterest(p => ({ ...p, [lot.id]: dailyBurn }));
          }
        }
      }
    }
  };

  // CHANGE 1: Add New Address button
  const addLot = async () => {
    const { data: lotData } = await supabase.from("lots").insert({ address: "", owner: "", budget: "", notes: "", lot_type: "spec" }).select().single();
    if (lotData) {
      const phaseRows = PHASES.map(name => ({ lot_id: lotData.id, phase_name: name, status: STATUS.NOT_STARTED }));
      await supabase.from("phases").insert(phaseRows);
      loadLots();
      onSelect(lotData);
    }
  };

  const getPhases = (lotId) => lotPhases[lotId] || [];

  const duplicateLot = async (lot) => {
    if (!window.confirm(`Duplicate "${lot.address || "this address"}"?`)) return;
    const { data: newLot } = await supabase.from("lots").insert({ address: (lot.address || "") + " (Copy)", owner: lot.owner, budget: lot.budget, notes: lot.notes, lot_type: lot.lot_type }).select().single();
    if (newLot) {
      const phaseRows = PHASES.map(name => ({ lot_id: newLot.id, phase_name: name, status: "not_started" }));
      await supabase.from("phases").insert(phaseRows);
      loadLots();
      alert("Address duplicated!");
    }
  };

  // CHANGE 4: Micah's Projects section (lot_type === "micah")
  const specLots = lots.filter(l => !l.lot_type || l.lot_type === "spec" || l.lot_type === "construction");
  const customerLots = lots.filter(l => l.lot_type === "customer");
  const vacantLots = lots.filter(l => l.lot_type === "vacant");
  const micahLots = lots.filter(l => l.lot_type === "micah");

  const filtered = (lotList) => {
    const base = lotList.filter(l => {
      const phases = getPhases(l.id);
      // CHANGE 2: Search Address
      if (searchQuery && !((l.address || "").toLowerCase().includes(searchQuery.toLowerCase()) || (l.owner || "").toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      if (filterBy === "inprogress") return phases.some(p => p.status === STATUS.IN_PROGRESS);
      if (filterBy === "overdue") return countOverdue(phases) > 0;
      if (filterBy === "complete") return getOverallProgress(phases).pct === 100;
      if (filterBy === "notstarted") return getOverallProgress(phases).pct === 0;
      return true;
    });
    // CHANGE 5: Sort by completion % desc, then alphabetical
    return sortLots(base, lotPhases);
  };

  const totalOverdue = lots.reduce((s, l) => s + countOverdue(getPhases(l.id)), 0);
  const totalDailyBurn = Object.values(lotInterest).reduce((s, v) => s + v, 0);

  // CHANGE 4: Micah can toggle own property into Micah's Projects section
  const isMicah = userRole === "micah";
  const toggleMicahProject = async (lot) => {
    const newType = lot.lot_type === "micah" ? "spec" : "micah";
    await supabase.from("lots").update({ lot_type: newType }).eq("id", lot.id);
    loadLots();
  };

  const LotCard = ({ lot, showMicahToggle }) => {
    const phases = getPhases(lot.id);
    const prog = getOverallProgress(phases);
    const overdue = countOverdue(phases);
    const dailyBurn = lotInterest[lot.id] || 0;
    return (
      <div onClick={() => onSelect(lot)}
        style={{ ...cardStyle, cursor: "pointer", borderColor: overdue > 0 ? "#fecaca" : "#e2e8f0" }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; e.currentTarget.style.borderColor = overdue > 0 ? "#ef4444" : G; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = overdue > 0 ? "#fecaca" : "#e2e8f0"; }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", fontFamily: "'DM Serif Display', serif", flex: 1, marginRight: 8 }}>
            {lot.address || <span style={{ color: "#cbd5e1", fontStyle: "italic", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400 }}>No address set</span>}
          </div>
          {overdue > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#fee2e2", color: "#991b1b", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}><Icons.Warn />{overdue} overdue</span>}
        </div>
        {lot.owner && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{lot.owner}</div>}
        {lot.budget && <div style={{ fontSize: 13, color: "#475569", marginBottom: 8, fontWeight: 600 }}>{formatCurrency(lot.budget)}</div>}
        {isOwner && dailyBurn > 0 && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8, fontWeight: 600 }}>{formatCurrency(dailyBurn)}/day interest</div>}
        <div style={{ background: "#f1f5f9", borderRadius: 99, height: 7, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ width: `${prog.pct}%`, height: "100%", background: prog.pct === 100 ? G2 : `linear-gradient(90deg, #000, ${G})`, borderRadius: 99 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{prog.complete}/{prog.total} phases</span>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: prog.pct === 100 ? G3 : "#f0fdf4", color: prog.pct === 100 ? G2 : "#16a34a", fontWeight: 700, border: `1px solid ${prog.pct === 100 ? G : "#bbf7d0"}` }}>{prog.pct}%</span>
        </div>
        <div style={{ paddingTop: 8, borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>
          <span style={{ color: "#64748b", fontWeight: 500 }}>Current: </span>{getCurrentPhase(phases)}
        </div>
        {lot.notes && <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontStyle: "italic" }}>{lot.notes}</div>}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {lot.last_activity ? (
            <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
              <Icons.Clock />
              {(() => {
                const diff = Math.round((new Date() - new Date(lot.last_activity)) / 60000);
                if (diff < 60) return `${diff}m ago`;
                if (diff < 1440) return `${Math.round(diff/60)}h ago`;
                return `${Math.round(diff/1440)}d ago`;
              })()}
            </div>
          ) : <div />}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* CHANGE 4: Micah toggle */}
            {showMicahToggle && isMicah && (
              <button onClick={e => { e.stopPropagation(); toggleMicahProject(lot); }} style={{ background: lot.lot_type === "micah" ? G3 : "transparent", border: `1px solid ${lot.lot_type === "micah" ? G : "#e2e8f0"}`, borderRadius: 6, color: lot.lot_type === "micah" ? G2 : "#94a3b8", padding: "3px 8px", cursor: "pointer", fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                {lot.lot_type === "micah" ? "✓ My Project" : "+ My Project"}
              </button>
            )}
            {isOwner && <button onClick={e => { e.stopPropagation(); duplicateLot(lot); }} style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 6, color: "#94a3b8", padding: "3px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Duplicate</button>}
          </div>
        </div>
      </div>
    );
  };

  // CHANGE 4 & 7: Section definitions for rendering and drag
  const sectionDefs = {
    spec: { key: "spec", label: "Spec Homes", lots: specLots, badge: { bg: "#fffbeb", border: "#fde68a", color: "#92400e" } },
    customer: { key: "customer", label: "Customer Homes", lots: customerLots, badge: { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af" } },
    vacant: { key: "vacant", label: "Vacant Lots / Inventory", lots: vacantLots, badge: { bg: "#f1f5f9", border: "#e2e8f0", color: "#64748b" } },
    micah: { key: "micah", label: "Micah's Projects", lots: micahLots, badge: { bg: G3, border: G, color: G2 } },
  };

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#0a0f1a" : "#f8fafc", fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: isMobile ? "14px 16px" : "16px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo192.png" alt="Dev Tracker" style={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: 8, objectFit: "cover" }} />
            <div style={{ fontSize: isMobile ? 18 : 22, fontFamily: "'DM Serif Display', serif", color: "#fff", fontWeight: 400, lineHeight: 1.2 }}>Dev Tracker</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!isMobile && <span style={{ fontSize: 12, color: "#475569" }}>{user.email}</span>}
            <div style={{ position: "relative" }}>
              <button onClick={onToggleNotifications} style={{ background: "transparent", border: "1px solid #333", color: notifications.length > 0 ? G : "#94a3b8", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center" }}>🔔</button>
              {notifications.length > 0 && (
                <div style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                  {notifications.length > 9 ? "9+" : notifications.length}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <button onClick={() => { onShowChat(); onMarkChatRead(); }} style={{ background: "transparent", border: `1px solid ${unreadChat > 0 ? G : "#333"}`, color: unreadChat > 0 ? G : "#94a3b8", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                💬 {!isMobile && "Chat"}
              </button>
              {unreadChat > 0 && (
                <div style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                  {unreadChat > 9 ? "9+" : unreadChat}
                </div>
              )}
            </div>
            <button onClick={onSignOut} style={{ background: "transparent", border: "1px solid #333", color: "#94a3b8", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Sign Out</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "16px" : "24px 32px" }}>
        {isOwner && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <button style={{ ...btnGreen, padding: "8px 18px", fontSize: 13 }}>Active Developments</button>
            <button onClick={onShowPipeline} style={{ ...btnOutline, padding: "8px 18px", fontSize: 13 }}><Icons.Map /> Prospective Pipeline</button>
            <button onClick={onShowTeam} style={{ ...btnOutline, padding: "8px 18px", fontSize: 13 }}>👥 Team</button>
            <button onClick={onShowCalendar} style={{ ...btnOutline, padding: "8px 18px", fontSize: 13 }}>📅 Calendar</button>
            {/* CHANGE 2: Search Address placeholder */}
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search Address..." style={{ width: "100%", background: isDark ? "#1e293b" : "#fff", border: `1.5px solid ${isDark ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: isDark ? "#f1f5f9" : "#1e293b", fontSize: 13, padding: "8px 14px 8px 36px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <button onClick={toggleTheme} style={{ background: isDark ? "#1e293b" : "#fff", border: `1.5px solid ${isDark ? "#334155" : "#e2e8f0"}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 18, lineHeight: 1 }} title="Toggle dark/light mode">
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        )}

        {lots.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : isOwner ? "repeat(6, 1fr)" : "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
            {[
              { label: "Total Lots", value: lots.length, color: "#1e293b" },
              { label: "Spec Homes", value: specLots.length, color: "#d97706" },
              { label: "Customer Homes", value: customerLots.length, color: "#3b82f6" },
              { label: "Vacant Lots", value: vacantLots.length, color: "#64748b" },
              { label: "Complete", value: lots.filter(l => getOverallProgress(getPhases(l.id)).pct === 100).length, color: G2 },
              { label: "Overdue Phases", value: totalOverdue, color: totalOverdue > 0 ? "#ef4444" : "#94a3b8" },
            ].filter((_, i) => isOwner || i < 4).map(s => (
              <div key={s.label} style={{ ...cardStyle, borderColor: s.label === "Overdue Phases" && totalOverdue > 0 ? "#fecaca" : "#e2e8f0" }}>
                <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 700, color: s.color, fontFamily: "'DM Serif Display', serif" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* CHANGE 8: Pass lotPhases to ActionItemsDashboard */}
        {lotsLoaded && lots.length > 0 && <ActionItemsDashboard lots={lots} phases={lotPhases} user={user} />}

        {isOwner && totalDailyBurn > 0 && (
          <div style={{ background: "#fff", border: "1.5px solid #fecaca", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Portfolio Interest Burn</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444", fontFamily: "'DM Serif Display', serif" }}>{formatCurrency(totalDailyBurn)}/day</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Monthly</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#d97706" }}>{formatCurrency(totalDailyBurn * 30)}/mo</div>
            </div>
          </div>
        )}

        {lots.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {[["all","All"],["inprogress","Active"],["overdue","Overdue"],["complete","Done"],["notstarted","Not Started"]].map(([val,lbl]) => (
              <button key={val} onClick={() => setFilterBy(val)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${filterBy === val ? G : "#e2e8f0"}`, background: filterBy === val ? G3 : "#fff", color: filterBy === val ? G2 : "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: filterBy === val ? 700 : 500, whiteSpace: "nowrap", flexShrink: 0 }}>{lbl}</button>
            ))}
          </div>
        )}

        {lots.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏗️</div>
            <div style={{ fontSize: 18, color: "#1e293b", fontWeight: 600, marginBottom: 6 }}>No addresses yet</div>
            <p style={{ fontSize: 14, margin: 0, color: "#94a3b8" }}>Add your first development to get started.</p>
          </div>
        ) : (
          <>
            {/* CHANGE 4 & 7: Render sections in sectionOrder, draggable for Micah/Chris */}
            {sectionOrder.map(sectionKey => {
              const def = sectionDefs[sectionKey];
              if (!def) return null;
              const sectionLots = filtered(def.lots);
              if (sectionLots.length === 0) return null;
              const draggable = isMicahOrChris;
              return (
                <div
                  key={sectionKey}
                  draggable={draggable}
                  onDragStart={draggable ? (e) => handleDragStart(e, sectionKey) : undefined}
                  onDragOver={draggable ? (e) => handleDragOver(e, sectionKey) : undefined}
                  onDrop={draggable ? handleDrop : undefined}
                  style={{ marginBottom: 28, opacity: draggedSection === sectionKey ? 0.5 : 1, transition: "opacity 0.15s", cursor: draggable ? "grab" : "default" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    {draggable && <span style={{ fontSize: 14, color: "#94a3b8", cursor: "grab" }}>⠿</span>}
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{def.label}</div>
                    <div style={{ background: def.badge.bg, border: `1px solid ${def.badge.border}`, borderRadius: 20, padding: "2px 8px", fontSize: 11, color: def.badge.color, fontWeight: 700 }}>{sectionLots.length}</div>
                    {sectionKey === "micah" && <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>Micah's tracked properties</div>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                    {sectionLots.map(lot => <LotCard key={lot.id} lot={lot} showMicahToggle={true} />)}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* CHANGE 1: Renamed to "New Address", raised above mobile nav */}
      {isOwner && (
        <div style={{ position: "fixed", bottom: isMobile ? 80 : 24, right: 24, zIndex: 50 }}>
          <button onClick={addLot} style={{ display: "flex", alignItems: "center", gap: 8, background: "#000", color: G, border: `2px solid ${G}`, borderRadius: isMobile ? "50%" : 12, padding: isMobile ? 16 : "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: `0 4px 20px rgba(74,222,128,0.3)` }}>
            <Icons.Plus />{!isMobile && "New Address"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [investorToken, setInvestorToken] = useState(null);
  const [warrantyToken, setWarrantyToken] = useState(null);
  const [punchToken, setPunchToken] = useState(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const [userLotIds, setUserLotIds] = useState([]);
  const [userRole, setUserRole] = useState("owner");
  const [theme, setTheme] = useState("light");
  const [showTeam, setShowTeam] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("investor");
    if (token) setInvestorToken(token);
    const wToken = params.get("warranty");
    if (wToken) setWarrantyToken(wToken);
    const pToken = params.get("punch");
    if (pToken) setPunchToken(pToken);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_preferences").select("theme").eq("id", user.id).single().then(({ data }) => {
      if (data?.theme) setTheme(data.theme);
    });
    const loadNotifs = async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_email", user.email).eq("read", false).order("created_at", { ascending: false }).limit(20);
      if (data) setNotifications(data);
      const { data: msgs } = await supabase.from("team_messages").select("id, read_by").order("created_at", { ascending: false }).limit(50);
      if (msgs) setUnreadChat(msgs.filter(m => !m.read_by?.includes(user.email)).length);
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 15000);

    // Load user role
    if (user.email === OWNER_EMAIL) { setUserRole("owner"); return () => clearInterval(interval); }
    supabase.from("global_team").select("role").eq("email", user.email).single().then(({ data }) => {
      if (data) {
        const r = data.role;
        if (r === "manager") setUserRole("manager");
        else if (r === "micah") setUserRole("micah");
        else if (r === "chris") setUserRole("chris");
        else setUserRole("contractor");
      }
    });
    return () => clearInterval(interval);
  }, [user]);

  const isOwner = userRole === "owner";
  const signOut = () => supabase.auth.signOut();

  const markNotificationsRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_email", user?.email).eq("read", false);
    setNotifications([]);
    setShowNotifications(false);
  };

  const markChatRead = async () => {
    const { data: msgs } = await supabase.from("team_messages").select("id, read_by").order("created_at", { ascending: false }).limit(50);
    if (msgs) {
      for (const msg of msgs.filter(m => !m.read_by?.includes(user?.email))) {
        await supabase.from("team_messages").update({ read_by: [...(msg.read_by || []), user?.email] }).eq("id", msg.id);
      }
    }
    setUnreadChat(0);
  };

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    await supabase.from("user_preferences").upsert({ id: user?.id, theme: newTheme });
  };

  const reloadLot = async () => {
    if (!selectedLot) return;
    const { data } = await supabase.from("lots").select("*").eq("id", selectedLot.id).single();
    if (data) setSelectedLot(data);
  };

  if (warrantyToken) return <WarrantySignPage token={warrantyToken} />;
  if (punchToken) return <PunchSignPage token={punchToken} />;
  if (investorToken) return <InvestorView token={investorToken} />;
  if (!user) return <AuthScreen />;

  const getLotUserRole = (lotId) => {
    if (isOwner) return "owner";
    return userRole;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        button, a, input, select { touch-action: manipulation; cursor: pointer; }
        input:focus, select:focus, textarea:focus { border-color: ${G} !important; outline: none; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        body { margin: 0; background: #f8fafc; }
        textarea { font-family: 'DM Sans', sans-serif; }
      `}</style>
      {/* Mobile bottom nav */}
      {isMobile && user && !showChat && !showTeam && !showPipeline && !showCalendar && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#000", borderTop: `2px solid ${G}`, display: "flex", zIndex: 100, fontFamily: "'DM Sans', sans-serif", paddingBottom: "env(safe-area-inset-bottom)" }}>
          {[
            { label: "Home", icon: "🏗️", action: () => { setSelectedLot(null); setShowPipeline(false); setShowTeam(false); setShowCalendar(false); } },
            { label: "Chat", icon: "💬", action: () => { setShowChat(true); markChatRead(); }, badge: unreadChat },
            { label: "Actions", icon: "⚡", action: () => { setSelectedLot(null); setShowPipeline(false); } },
            { label: "Calendar", icon: "📅", action: () => setShowCalendar(true) },
            { label: "Alerts", icon: "🔔", action: () => setShowNotifications(p => !p), badge: notifications.length },
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{ flex: 1, background: "transparent", border: "none", color: "#94a3b8", padding: "10px 0 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative" }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 9, color: "#64748b" }}>{item.label}</span>
              {item.badge > 0 && (
                <div style={{ position: "absolute", top: 6, right: "50%", marginRight: -18, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>
                  {item.badge > 9 ? "9+" : item.badge}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {showCalendar ? (
        <CalendarView onBack={() => setShowCalendar(false)} isMobile={isMobile} userRole={userRole} />
      ) : showChat ? (
        <TeamChat user={user} onBack={() => setShowChat(false)} userRole={userRole} />
      ) : showTeam ? (
        <GlobalTeam onBack={() => setShowTeam(false)} />
      ) : showPipeline ? (
        <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => { setShowPipeline(false); }} style={{ background: "transparent", border: "1.5px solid #333", color: "#94a3b8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><Icons.Back /> Dashboard</button>
              <img src="/logo192.png" alt="Dev Tracker" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
              <div style={{ fontSize: 18, fontFamily: "'DM Serif Display', serif", color: "#fff" }}>Prospective Pipeline</div>
            </div>
          </div>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px" }}>
            <ProspectiveLots user={user} onConvert={() => setShowPipeline(false)} isMobile={isMobile} />
          </div>
        </div>
      ) : selectedLot ? (
        <LotDetail
          lot={selectedLot}
          onBack={() => setSelectedLot(null)}
          onDelete={async (id) => { await supabase.from("lots").delete().eq("id", id); setSelectedLot(null); }}
          onUpdate={reloadLot}
          isMobile={isMobile}
          user={user}
          isOwner={isOwner}
          userRole={getLotUserRole(selectedLot.id)}
          theme={theme}
        />
      ) : (
        <Dashboard
          user={user}
          onSelect={setSelectedLot}
          onSignOut={signOut}
          isMobile={isMobile}
          onShowPipeline={() => setShowPipeline(true)}
          onShowTeam={() => setShowTeam(true)}
          onShowChat={() => setShowChat(true)}
          onShowCalendar={() => setShowCalendar(true)}
          onToggleNotifications={() => setShowNotifications(p => !p)}
          onMarkChatRead={markChatRead}
          notifications={notifications}
          unreadChat={unreadChat}
          isOwner={isOwner}
          userLotIds={userLotIds}
          theme={theme}
          toggleTheme={toggleTheme}
          userRole={userRole}
        />
      )}
    </>
  );
}

// ============================================================
// FINISHES TAB
// ============================================================
function FinishesTab({ lotId, lot, user, userRole }) {
  const [finishes, setFinishes] = useState(null);
  const [visionFiles, setVisionFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [log, setLog] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const INITIALS = {
    "derekselman@gmail.com": "DS",
    "derekdonna@yahoo.com": "DT",
  };

  const getInitials = (email) => {
    if (INITIALS[email]) return INITIALS[email];
    if (userRole === "micah") return "MF";
    if (userRole === "morgan") return "MO";
    if (userRole === "chris") return "CR";
    return (email || "?")[0].toUpperCase();
  };

  const initials = getInitials(user.email);

  const EMPTY = {
    date: "", buyer: "",
    roof_tile: "", stucco_color: "", stucco_finish: "", stucco_corners: "", patio_finish: "",
    window_color: "", garage_door_type: "", garage_door_color: "", front_door_type: "", exterior_door_colors: "",
    drywall_finish: "",
    interior_ceiling: "", interior_walls: "", interior_trim: "", interior_garage: "",
    cabinet_type: "", cabinet_pulls: "",
    floor_tile: "", floor_tile_grout: "", bedroom_floor: "", bedroom_floor_color: "",
    master_shower_wall: "", master_shower_side: "", master_shower_pan: "",
    master_shower_wall_grout: "", master_shower_pan_grout: "", master_shower_upgrades: "",
    master_shower_glass: "",
    guest_tub_wall: "", guest_tub_grout: "", guest_tub_options: "",
    fireplace_size: "", fireplace_tile: "",
    countertop_color: "", countertop_edge: "", countertop_options: "",
    kitchen_backsplash: "",
    interior_door_style: "", interior_door_hardware: "",
    plumbing_fixture: "", electrical_fixture: "", exterior_wall_lights: "",
    appliance_type: "", appliance_color: "",
    insulation_options: "",
    garage_options: "",
  };

  useEffect(() => { loadFinishes(); }, [lotId]);

  const loadFinishes = async () => {
    const { data } = await supabase.from("finishes").select("*").eq("lot_id", lotId).single();
    setFinishes(data ? data.data : { ...EMPTY });
    const { data: logData } = await supabase.from("finishes_log").select("*").eq("lot_id", lotId).order("created_at", { ascending: false }).limit(50);
    if (logData) setLog(logData);
    const { data: visionData } = await supabase.from("finishes_vision").select("*").eq("lot_id", lotId).order("created_at", { ascending: false });
    if (visionData) setVisionFiles(visionData);
  };

  const uploadVisionBoard = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const path = `finishes/${lotId}/vision/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("lot-files").upload(path, file);
      if (!error) {
        await supabase.from("finishes_vision").insert({
          lot_id: lotId, file_name: file.name, file_path: path,
          file_type: file.type, uploaded_by: user.id, uploaded_by_initials: initials,
        });
      }
    }
    loadFinishes();
    setUploading(false);
  };

  const deleteVisionFile = async (vf) => {
    await supabase.storage.from("lot-files").remove([vf.file_path]);
    await supabase.from("finishes_vision").delete().eq("id", vf.id);
    loadFinishes();
  };

  const getFileUrl = (path) => supabase.storage.from("lot-files").getPublicUrl(path).data.publicUrl;

  const saveField = async (field, value, label) => {
    setSaving(true);
    const updated = { ...(finishes || EMPTY), [field]: value };
    setFinishes(updated);
    const now = new Date().toISOString();
    const { data: existing } = await supabase.from("finishes").select("id").eq("lot_id", lotId).single();
    if (existing) {
      await supabase.from("finishes").update({ data: updated, updated_at: now }).eq("lot_id", lotId);
    } else {
      await supabase.from("finishes").insert({ lot_id: lotId, data: updated, created_at: now, updated_at: now });
    }
    // Log the change
    await supabase.from("finishes_log").insert({
      lot_id: lotId,
      field_label: label,
      new_value: Array.isArray(value) ? value.join(", ") : value,
      changed_by: initials,
      changed_by_email: user.email,
      created_at: now,
    });
    loadFinishes();
    setSavedMsg(`${initials} · saved`);
    setTimeout(() => setSavedMsg(""), 2000);
    setSaving(false);
  };

  const f = finishes || EMPTY;

  const Field = ({ label, fieldKey, placeholder }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <input
        defaultValue={f[fieldKey] || ""}
        onBlur={e => { if (e.target.value !== (f[fieldKey] || "")) saveField(fieldKey, e.target.value, label); }}
        placeholder={placeholder || ""}
        style={fieldStyle}
      />
    </div>
  );

  const RadioField = ({ label, fieldKey, options }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", background: f[fieldKey] === opt.value ? "#000" : "#fff", border: `1.5px solid ${f[fieldKey] === opt.value ? G : "#e2e8f0"}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, color: f[fieldKey] === opt.value ? G : "#475569", fontFamily: "'DM Sans', sans-serif", fontWeight: f[fieldKey] === opt.value ? 700 : 400, transition: "all 0.15s" }}>
            <input type="radio" name={fieldKey} value={opt.value} checked={f[fieldKey] === opt.value} onChange={() => saveField(fieldKey, opt.value, label)} style={{ display: "none" }} />
            {opt.label}
            {opt.upgrade && <span style={{ fontSize: 10, color: f[fieldKey] === opt.value ? "#fde68a" : "#94a3b8", marginLeft: 2 }}>↑</span>}
          </label>
        ))}
      </div>
    </div>
  );

  const CheckboxGroup = ({ label, fieldKey, options }) => {
    const current = Array.isArray(f[fieldKey]) ? f[fieldKey] : (f[fieldKey] ? f[fieldKey].split(", ") : []);
    const toggle = (val) => {
      const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
      saveField(fieldKey, next, label);
    };
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{label}</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          {options.map(opt => {
            const checked = current.includes(opt.value);
            return (
              <label key={opt.value} onClick={() => toggle(opt.value)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", background: checked ? "#000" : "#fff", border: `1.5px solid ${checked ? G : "#e2e8f0"}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, color: checked ? G : "#475569", fontFamily: "'DM Sans', sans-serif", fontWeight: checked ? 700 : 400, transition: "all 0.15s" }}>
                {checked ? "✓ " : ""}{opt.label}
                {opt.upgrade && <span style={{ fontSize: 10, color: checked ? "#fde68a" : "#94a3b8", marginLeft: 2 }}>↑</span>}
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const Section = ({ title, children }) => (
    <div style={{ ...cardStyle, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid ${G3}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 4, height: 16, background: G, borderRadius: 2 }} />
        {title}
      </div>
      {children}
    </div>
  );

  const fmt = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div>
      {/* Header with save indicator */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>Figley Contracting LLC · Arizona License #323084</div>
        {savedMsg && <div style={{ fontSize: 12, color: G2, background: G3, border: `1px solid ${G}`, padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}>{savedMsg}</div>}
      </div>

      <Section title="Vision Board">
        <div style={{ marginBottom: 12 }}>
          <label style={{ ...btnGreen, cursor: "pointer" }}>
            <Icons.Upload />{uploading ? "Uploading..." : "Upload Vision Board"}
            <input type="file" accept="image/*,application/pdf" multiple onChange={uploadVisionBoard} style={{ display: "none" }} />
          </label>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Photos, PDFs, inspiration boards — any file type works.</div>
        </div>
        {visionFiles.length > 0 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 10 }}>
              {visionFiles.filter(vf => vf.file_type && vf.file_type.startsWith("image/")).map(vf => (
                <div key={vf.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "1", background: "#f1f5f9", cursor: "pointer" }} onClick={() => window.open(getFileUrl(vf.file_path), "_blank")}>
                  <img src={getFileUrl(vf.file_path)} alt={vf.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={e => { e.stopPropagation(); deleteVisionFile(vf); }} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✕</button>
                </div>
              ))}
            </div>
            {visionFiles.filter(vf => !vf.file_type || !vf.file_type.startsWith("image/")).map(vf => (
              <div key={vf.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "10px 12px" }}>
                <Icons.File />
                <div style={{ flex: 1, fontSize: 12, color: "#1e293b", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{vf.file_name}</div>
                <button onClick={() => window.open(getFileUrl(vf.file_path), "_blank")} style={{ background: G3, border: `1px solid ${G}`, borderRadius: 6, color: G2, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Open</button>
                <button onClick={() => deleteVisionFile(vf)} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer" }}><Icons.Trash /></button>
              </div>
            ))}
          </div>
        )}
        {visionFiles.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8" }}>No files uploaded yet.</div>}
      </Section>

      <Section title="General">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Date" fieldKey="date" />
          <Field label="Buyer" fieldKey="buyer" />
        </div>
      </Section>

      <Section title="Exterior">
        <Field label="Roof Tile Color and Type" fieldKey="roof_tile" />
        <Field label="Stucco Color" fieldKey="stucco_color" />
        <RadioField label="Stucco Finish" fieldKey="stucco_finish" options={[
          { value: "standard_lace", label: "Standard Lace" },
          { value: "dash", label: "Dash" },
          { value: "synthetic", label: "Synthetic", upgrade: true },
        ]} />
        <RadioField label="Stucco Corners" fieldKey="stucco_corners" options={[
          { value: "round", label: "Round (standard)" },
          { value: "square", label: "Square", upgrade: true },
        ]} />
        <RadioField label="Patio Finish" fieldKey="patio_finish" options={[
          { value: "drywall", label: "Drywall (standard)" },
          { value: "stucco", label: "Stucco", upgrade: true },
        ]} />
        <Field label="Window Color" fieldKey="window_color" />
        <Field label="Garage Door Type" fieldKey="garage_door_type" />
        <Field label="Garage Door Color" fieldKey="garage_door_color" />
        <Field label="Front Door Type" fieldKey="front_door_type" />
        <Field label="Exterior Door Colors" fieldKey="exterior_door_colors" />
        <Field label="Exterior Wall Lights" fieldKey="exterior_wall_lights" />
      </Section>

      <Section title="Interior Finishes">
        <RadioField label="Drywall Finish" fieldKey="drywall_finish" options={[
          { value: "hand_texture", label: "Hand Texture Interior" },
          { value: "orange_peel_garage", label: "Orange Peel Garage" },
          { value: "upgrade_hand_garage", label: "Upgrade Hand Texture Garage", upgrade: true },
        ]} />
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, fontStyle: "italic" }}>Interior Colors</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Ceilings" fieldKey="interior_ceiling" />
          <Field label="Walls" fieldKey="interior_walls" />
          <Field label="Trim" fieldKey="interior_trim" />
          <Field label="Garage" fieldKey="interior_garage" />
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 4, marginBottom: 14 }}>Typical: Ceilings Flat, Walls Eggshell, Trim Semi-Gloss, Garage Semi-Gloss</div>
        <Field label="Interior Door Style" fieldKey="interior_door_style" />
        <Field label="Interior Door Hardware Color" fieldKey="interior_door_hardware" />
      </Section>

      <Section title="Cabinets">
        <Field label="Cabinet Type" fieldKey="cabinet_type" />
        <Field label="Cabinet Pulls" fieldKey="cabinet_pulls" />
      </Section>

      <Section title="Flooring">
        <Field label="Floor Tile" fieldKey="floor_tile" />
        <Field label="Floor Tile Grout Color" fieldKey="floor_tile_grout" />
        <RadioField label="Bedroom Floor Finish" fieldKey="bedroom_floor" options={[
          { value: "carpet", label: "Carpet (standard)" },
          { value: "tile", label: "Tile", upgrade: true },
        ]} />
        <Field label="Bedroom Floor Color" fieldKey="bedroom_floor_color" />
      </Section>

      <Section title="Master Shower">
        <Field label="Wall Tile" fieldKey="master_shower_wall" />
        <Field label="Side Walls" fieldKey="master_shower_side" />
        <Field label="Pan Tile" fieldKey="master_shower_pan" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Wall Grout Color" fieldKey="master_shower_wall_grout" />
          <Field label="Pan Grout Color" fieldKey="master_shower_pan_grout" />
        </div>
        <Field label="Upgrades" fieldKey="master_shower_upgrades" />
        <CheckboxGroup label="Glass Options (Extra Charge)" fieldKey="master_shower_glass" options={[
          { value: "glass_door", label: "Glass Door", upgrade: true },
          { value: "glass_door_partition", label: "Glass Door + Partition Wall", upgrade: true },
        ]} />
      </Section>

      <Section title="Guest Tub">
        <Field label="Wall Tile" fieldKey="guest_tub_wall" />
        <Field label="Wall Tile Grout Color" fieldKey="guest_tub_grout" />
        <Field label="Upgrades" fieldKey="guest_tub_options" />
      </Section>

      <Section title="Fireplace">
        <Field label="Fireplace Size" fieldKey="fireplace_size" />
        <Field label="Tile & Grout Color" fieldKey="fireplace_tile" />
      </Section>

      <Section title="Countertops">
        <Field label="Countertop Color (same throughout / standard 4\" backsplash in bathrooms)" fieldKey="countertop_color" />
        <RadioField label="Edge Finish" fieldKey="countertop_edge" options={[
          { value: "round", label: "Round" },
          { value: "square", label: "Square" },
        ]} />
        <CheckboxGroup label="Countertop Upgrades" fieldKey="countertop_options" options={[
          { value: "waterfall_island", label: "Waterfall Edges at Island", upgrade: true },
          { value: "counter_backsplash", label: "Counter Material for Kitchen Backsplash", upgrade: true },
        ]} />
        <Field label="Kitchen Backsplash Type / Grout Color" fieldKey="kitchen_backsplash" />
      </Section>

      <Section title="Fixtures & Appliances">
        <Field label="Plumbing Fixture Color" fieldKey="plumbing_fixture" />
        <Field label="Electrical Fixture Color" fieldKey="electrical_fixture" />
        <Field label="Appliance Type (microwave, stove, dishwasher)" fieldKey="appliance_type" />
        <Field label="Appliance Color" fieldKey="appliance_color" placeholder="Stainless standard — other may be extra charge" />
      </Section>

      <Section title="Insulation">
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, fontStyle: "italic" }}>Standard: wall/ceiling batts, blow-in ceiling as necessary</div>
        <CheckboxGroup label="Insulation Upgrades" fieldKey="insulation_options" options={[
          { value: "spray_foam_ceiling", label: "Spray Foam Ceiling", upgrade: true },
          { value: "spray_foam_walls", label: "Spray Foam Walls", upgrade: true },
          { value: "batts_interior", label: "Batts on All Interior Walls", upgrade: true },
        ]} />
      </Section>

      <Section title="Garage Options">
        <CheckboxGroup label="Garage Upgrades" fieldKey="garage_options" options={[
          { value: "mini_split", label: "Mini Split(s)", upgrade: true },
          { value: "epoxy", label: "Epoxy", upgrade: true },
          { value: "deep_sink", label: "Deep Sink / Wash Tub", upgrade: true },
        ]} />
      </Section>

      {/* Change Log */}
      {log.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 4, height: 16, background: "#94a3b8", borderRadius: 2 }} />
            Change Log
          </div>
          {log.map(entry => (
            <div key={entry.id} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f1f5f9", alignItems: "flex-start" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#000", border: `2px solid ${G}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: G, fontWeight: 700, flexShrink: 0 }}>
                {entry.changed_by}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 500 }}>{entry.field_label}</div>
                <div style={{ fontSize: 12, color: "#475569" }}>{entry.new_value || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>cleared</span>}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{fmt(entry.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
