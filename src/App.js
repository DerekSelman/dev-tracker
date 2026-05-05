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
          <div style={{ background: "#000", borderRadius: 10, padding: 8, color: G }}><Icons.HardHat /></div>
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
          <div style={{ color: G }}><Icons.HardHat /></div>
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
  const statusColors = {
    [STATUS.NOT_STARTED]: { bg: "#f8fafc", border: "#e2e8f0" },
    [STATUS.IN_PROGRESS]: { bg: "#fffbeb", border: "#fde68a" },
    [STATUS.COMPLETE]: { bg: G3, border: "#bbf7d0" },
  };
  const sc = overdue ? { bg: "#fef2f2", border: "#fecaca" } : statusColors[phase.status];

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
              <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Proj. Start</div><input type="date" defaultValue={phase.projected_start || ""} onBlur={e => updateField("projected_start", e.target.value)} style={dateInputStyle} /></div>
              <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Proj. End</div><input type="date" defaultValue={phase.projected_end || ""} onBlur={e => updateField("projected_end", e.target.value)} style={dateInputStyle} /></div>
              <div><div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Act. Start</div><input type="date" defaultValue={phase.actual_start || ""} onBlur={e => updateField("actual_start", e.target.value)} style={{ ...dateInputStyle, borderColor: "#bfdbfe" }} /></div>
              <div><div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Act. End</div><input type="date" defaultValue={phase.actual_end || ""} onBlur={e => updateField("actual_end", e.target.value)} style={{ ...dateInputStyle, borderColor: "#bfdbfe" }} /></div>
            </div>
            <input defaultValue={phase.notes || ""} onBlur={e => updateField("notes", e.target.value)} placeholder="Notes..." style={{ ...fieldStyle, fontSize: 13, padding: "8px 10px", marginBottom: 10 }} />
            <PhaseChecklist phaseId={phase.id} lotId={lotId} user={user} onChecklistStatus={setChecklistStatus} />
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
      <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 108px 108px 108px 108px 160px", gap: 8, alignItems: "center", padding: "10px 14px", borderRadius: expanded ? "10px 10px 0 0" : 10, background: sc.bg, border: `1.5px solid ${sc.border}` }}>
        <button onClick={cycleStatus} style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${overdue ? "#ef4444" : hasChecklistWarning ? "#f59e0b" : cfg.dot}`, background: phase.status === STATUS.COMPLETE ? cfg.dot : "#fff", color: phase.status === STATUS.COMPLETE ? "#fff" : overdue ? "#ef4444" : hasChecklistWarning ? "#f59e0b" : cfg.dot, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {phase.status === STATUS.COMPLETE ? <Icons.Check /> : phase.status === STATUS.IN_PROGRESS ? (hasChecklistWarning ? "!" : "▶") : ""}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: overdue ? "#991b1b" : phase.status === STATUS.COMPLETE ? "#94a3b8" : "#1e293b", textDecoration: phase.status === STATUS.COMPLETE ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>{phase.phase_name}</span>
          {overdue && <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#fee2e2", color: "#991b1b", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}><Icons.Warn />{diff}d late</span>}
          {hasChecklistWarning && <span style={{ background: "#fffbeb", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0 }}>⚠ {checklistStatus.total - checklistStatus.done} open</span>}
          {photos.length > 0 && <span style={{ background: G3, color: G2, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0 }}>{photos.length} photo{photos.length > 1 ? "s" : ""}</span>}
        </div>
        <input type="date" defaultValue={phase.projected_start || ""} onBlur={e => updateField("projected_start", e.target.value)} style={dateInputStyle} />
        <input type="date" defaultValue={phase.projected_end || ""} onBlur={e => updateField("projected_end", e.target.value)} style={dateInputStyle} />
        <input type="date" defaultValue={phase.actual_start || ""} onBlur={e => updateField("actual_start", e.target.value)} style={{ ...dateInputStyle, borderColor: "#bfdbfe" }} />
        <input type="date" defaultValue={phase.actual_end || ""} onBlur={e => updateField("actual_end", e.target.value)} style={{ ...dateInputStyle, borderColor: "#bfdbfe" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <button onClick={cycleStatus} style={{ padding: "3px 8px", borderRadius: 20, border: `1.5px solid ${overdue ? "#fecaca" : hasChecklistWarning ? "#fde68a" : sc.border}`, background: sc.bg, color: overdue ? "#ef4444" : hasChecklistWarning ? "#d97706" : "#64748b", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", whiteSpace: "nowrap" }}>{overdue ? "Overdue" : hasChecklistWarning ? "Check List!" : cfg.label}</button>
          <label title="Upload photo" style={{ background: "#000", border: `1.5px solid ${G}`, borderRadius: 7, color: G, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icons.Camera />
            <input type="file" accept="image/*" multiple onChange={uploadPhoto} style={{ display: "none" }} />
          </label>
          <button onClick={() => setExpanded(p => !p)} style={{ background: (phase.notes || photos.length > 0 || checklistStatus.total > 0) ? G3 : "#fff", border: `1.5px solid ${(phase.notes || photos.length > 0 || checklistStatus.total > 0) ? G : "#e2e8f0"}`, borderRadius: 7, color: (phase.notes || photos.length > 0 || checklistStatus.total > 0) ? G2 : "#94a3b8", width: 28, height: 28, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✎</button>
        </div>
      </div>
      {expanded && (
        <div style={{ background: "#f8fafc", border: `1.5px solid ${sc.border}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "12px 14px" }}>
          <input defaultValue={phase.notes || ""} onBlur={e => updateField("notes", e.target.value)} placeholder="Notes for this phase..." style={{ ...fieldStyle, fontSize: 13, padding: "8px 10px", marginBottom: 12 }} />
          <PhaseChecklist phaseId={phase.id} lotId={lotId} user={user} onChecklistStatus={setChecklistStatus} />
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

  // Tabs based on role
  const allTabs = [
    { id: "phases", label: "Phases", roles: ["owner", "manager", "contractor", "viewer"] },
    { id: "punch", label: "Punch List", roles: ["owner", "manager", "contractor"] },
    { id: "docs", label: "Documents", roles: ["owner", "manager", "contractor", "viewer"] },
    { id: "team", label: "Team", roles: ["owner", "manager"] },
    { id: "interest", label: "Interest", roles: ["owner", "manager"] },
    { id: "investor", label: "Investor", roles: ["owner"] },
    { id: "activity", label: "Activity", roles: ["owner", "manager", "contractor", "viewer"] },
  ];
  const tabs = allTabs.filter(t => t.roles.includes(userRole));

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: isMobile ? "12px 16px" : "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1150, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "1.5px solid #333", color: "#94a3b8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}><Icons.Back />{!isMobile && " Dashboard"}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input defaultValue={local.address} onBlur={e => { setLocal(p => ({ ...p, address: e.target.value })); saveField("address", e.target.value); }} placeholder="Enter lot address..." style={{ background: "transparent", border: "none", color: "#fff", fontSize: isMobile ? 15 : 19, fontWeight: 700, fontFamily: "'DM Serif Display', serif", outline: "none", width: "100%" }} readOnly={!isOwner} />
          </div>
          {saving && <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0 }}>Saving...</span>}
          {isOwner && !isMobile && <button onClick={() => { if (window.confirm("Delete this lot?")) onDelete(lot.id); }} style={{ background: "transparent", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><Icons.Trash /> Delete</button>}
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
              <select defaultValue={local.lot_type || "construction"} onBlur={e => saveField("lot_type", e.target.value)} style={{ ...fieldStyle }}>
                <option value="construction">Under Construction</option>
                <option value="vacant">Vacant Lot</option>
              </select>
            </div>
            <div><label style={labelStyle}>Notes</label><input defaultValue={local.notes} onBlur={e => saveField("notes", e.target.value)} placeholder="General notes..." style={fieldStyle} /></div>
          </div>
        )}

        <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4, borderBottom: "2px solid #f1f5f9" }}>
          {tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabBtnStyle(activeTab === tab.id)}>{tab.label}</button>)}
        </div>

        {activeTab === "phases" && (
          <>
            {!isMobile && (
              <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 108px 108px 108px 108px 160px", gap: 8, padding: "4px 14px", marginBottom: 6 }}>
                <div /><div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Phase</div>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Proj. Start</div>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Proj. End</div>
                <div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase", fontWeight: 600 }}>Act. Start</div>
                <div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase", fontWeight: 600 }}>Act. End</div>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Status / Actions</div>
              </div>
            )}
            {phases.map(phase => <PhaseRow key={phase.id} phase={phase} lotId={lot.id} onUpdate={loadPhases} isMobile={isMobile} user={user} isOwner={isOwner} />)}
            {isOwner && isMobile && (
              <button onClick={() => { if (window.confirm("Delete this lot?")) onDelete(lot.id); }} style={{ width: "100%", marginTop: 20, background: "#fff", border: "1.5px solid #fecaca", color: "#ef4444", borderRadius: 10, padding: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                <Icons.Trash /> Delete Lot
              </button>
            )}
          </>
        )}
        {activeTab === "punch" && <PunchListTab lotId={lot.id} user={user} />}
        {activeTab === "docs" && <DocumentsTab lotId={lot.id} user={user} />}
        {activeTab === "team" && <TeamTab lotId={lot.id} user={user} isOwner={isOwner} />}
        {activeTab === "interest" && <InterestTab lotId={lot.id} />}
        {activeTab === "investor" && <InvestorTab lotId={lot.id} user={user} isOwner={isOwner} />}
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
    const { data: newLot } = await supabase.from("lots").insert({ address: lot.address, notes: lot.notes, budget: lot.estimated_value, lot_type: "construction" }).select().single();
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

  if (selected) {
    const [photos, setPhotos] = useState([]);
    const [docs, setDocs] = useState([]);

    useEffect(() => {
      supabase.from("prospective_photos").select("*").eq("lot_id", selected.id).order("created_at", { ascending: false }).then(({ data }) => { if (data) setPhotos(data); });
      supabase.from("prospective_docs").select("*").eq("lot_id", selected.id).order("created_at", { ascending: false }).then(({ data }) => { if (data) setDocs(data); });
    }, [selected.id]);

    const getUrl = (path) => supabase.storage.from("lot-files").getPublicUrl(path).data.publicUrl;

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => { setSelected(null); loadLots(); }} style={{ ...btnOutline, padding: "7px 12px" }}><Icons.Back /> Pipeline</button>
          <div style={{ flex: 1, fontSize: 18, fontFamily: "'DM Serif Display', serif", color: "#1e293b" }}>{selected.address || "New Prospective Lot"}</div>
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
        <div style={{ marginBottom: 16 }}><label style={labelStyle}>Notes</label><textarea defaultValue={selected.notes || ""} onBlur={e => saveField(selected.id, "notes", e.target.value)} placeholder="Notes about this lot..." rows={3} style={{ ...fieldStyle, resize: "vertical" }} /></div>
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
          <div style={{ fontSize: 16, color: "#1e293b", fontWeight: 600, marginBottom: 6 }}>No prospective lots yet</div>
          <p style={{ fontSize: 14, margin: 0, color: "#94a3b8" }}>Add lots you're scouting.</p>
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
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50 }}>
        <button onClick={addLot} disabled={adding} style={{ ...btnGreen, borderRadius: "50%", padding: 16, boxShadow: `0 4px 20px rgba(74,222,128,0.3)` }}><Icons.Plus /></button>
      </div>
    </div>
  );
}

// Dashboard
function Dashboard({ user, onSelect, onSignOut, isMobile, onShowPipeline, isOwner, userLotIds }) {
  const [lots, setLots] = useState([]);
  const [filterBy, setFilterBy] = useState("all");
  const [lotPhases, setLotPhases] = useState({});
  const [lotInterest, setLotInterest] = useState({});

  useEffect(() => { loadLots(); }, []);

  const loadLots = async () => {
    let query = supabase.from("lots").select("*").order("created_at");
    const { data: lotsData } = await query;
    if (lotsData) {
      // Filter lots based on role
      const visibleLots = isOwner ? lotsData : lotsData.filter(l => userLotIds.includes(l.id));
      setLots(visibleLots);
      for (const lot of visibleLots) {
        const { data: phases } = await supabase.from("phases").select("*").eq("lot_id", lot.id);
        if (phases) setLotPhases(p => ({ ...p, [lot.id]: phases }));
        // Load interest for daily burn
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

  const addLot = async () => {
    const { data: lotData } = await supabase.from("lots").insert({ address: "", owner: "", budget: "", notes: "", lot_type: "construction" }).select().single();
    if (lotData) {
      const phaseRows = PHASES.map(name => ({ lot_id: lotData.id, phase_name: name, status: STATUS.NOT_STARTED }));
      await supabase.from("phases").insert(phaseRows);
      loadLots();
      onSelect(lotData);
    }
  };

  const getPhases = (lotId) => lotPhases[lotId] || [];

  const constructionLots = lots.filter(l => !l.lot_type || l.lot_type === "construction");
  const vacantLots = lots.filter(l => l.lot_type === "vacant");

  const filtered = (lotList) => lotList.filter(l => {
    const phases = getPhases(l.id);
    if (filterBy === "inprogress") return phases.some(p => p.status === STATUS.IN_PROGRESS);
    if (filterBy === "overdue") return countOverdue(phases) > 0;
    if (filterBy === "complete") return getOverallProgress(phases).pct === 100;
    if (filterBy === "notstarted") return getOverallProgress(phases).pct === 0;
    return true;
  });

  const totalOverdue = lots.reduce((s, l) => s + countOverdue(getPhases(l.id)), 0);
  const totalDailyBurn = Object.values(lotInterest).reduce((s, v) => s + v, 0);

  const LotCard = ({ lot }) => {
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
        {lot.owner && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{l
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
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: isMobile ? "14px 16px" : "16px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: G }}><Icons.HardHat /></div>
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
        {isOwner && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button style={{ ...btnGreen, padding: "8px 18px", fontSize: 13 }}>Active Developments</button>
            <button onClick={onShowPipeline} style={{ ...btnOutline, padding: "8px 18px", fontSize: 13 }}><Icons.Map /> Prospective Pipeline</button>
          </div>
        )}

        {lots.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : isOwner ? "repeat(5, 1fr)" : "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
            {[
              { label: "Total Lots", value: lots.length, color: "#1e293b" },
              { label: "Under Construction", value: constructionLots.length, color: "#d97706" },
              { label: "Vacant Lots", value: vacantLots.length, color: "#64748b" },
              { label: "Complete", value: lots.filter(l => getOverallProgress(getPhases(l.id)).pct === 100).length, color: G2 },
              { label: "Overdue Phases", value: totalOverdue, color: totalOverdue > 0 ? "#ef4444" : "#94a3b8" },
            ].filter((_, i) => isOwner || i < 3).map(s => (
              <div key={s.label} style={{ ...cardStyle, borderColor: s.label === "Overdue Phases" && totalOverdue > 0 ? "#fecaca" : "#e2e8f0" }}>
                <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 700, color: s.color, fontFamily: "'DM Serif Display', serif" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

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
            <div style={{ fontSize: 18, color: "#1e293b", fontWeight: 600, marginBottom: 6 }}>No lots yet</div>
            <p style={{ fontSize: 14, margin: 0, color: "#94a3b8" }}>Add your first development to get started.</p>
          </div>
        ) : (
          <>
            {filtered(constructionLots).length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Under Construction</div>
                  <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 20, padding: "2px 8px", fontSize: 11, color: "#92400e", fontWeight: 700 }}>{filtered(constructionLots).length}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                  {filtered(constructionLots).map(lot => <LotCard key={lot.id} lot={lot} />)}
                </div>
              </div>
            )}
            {filtered(vacantLots).length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Vacant Lots / Inventory</div>
                  <div style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20, padding: "2px 8px", fontSize: 11, color: "#64748b", fontWeight: 700 }}>{filtered(vacantLots).length}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                  {filtered(vacantLots).map(lot => <LotCard key={lot.id} lot={lot} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isOwner && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50 }}>
          <button onClick={addLot} style={{ display: "flex", alignItems: "center", gap: 8, background: "#000", color: G, border: `2px solid ${G}`, borderRadius: isMobile ? "50%" : 12, padding: isMobile ? 16 : "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: `0 4px 20px rgba(74,222,128,0.3)` }}>
            <Icons.Plus />{!isMobile && "Add New Lot"}
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
  const [showPipeline, setShowPipeline] = useState(false);
  const [userLotIds, setUserLotIds] = useState([]);
  const [userRole, setUserRole] = useState("owner");

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

  useEffect(() => {
    if (!user) return;
    if (user.email === OWNER_EMAIL) { setUserRole("owner"); return; }
    supabase.from("lot_members").select("*").eq("user_email", user.email).then(({ data }) => {
      if (data && data.length > 0) {
        setUserLotIds(data.map(m => m.lot_id));
        const roles = data.map(m => m.role);
        if (roles.includes("manager")) setUserRole("manager");
        else if (roles.includes("contractor")) setUserRole("contractor");
        else setUserRole("viewer");
      }
    });
  }, [user]);

  const isOwner = userRole === "owner";
  const signOut = () => supabase.auth.signOut();

  const reloadLot = async () => {
    if (!selectedLot) return;
    const { data } = await supabase.from("lots").select("*").eq("id", selectedLot.id).single();
    if (data) setSelectedLot(data);
  };

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
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input:focus, select:focus, textarea:focus { border-color: ${G} !important; outline: none; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        body { margin: 0; background: #f8fafc; }
        textarea { font-family: 'DM Sans', sans-serif; }
      `}</style>
      {showPipeline ? (
        <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setShowPipeline(false)} style={{ background: "transparent", border: "1.5px solid #333", color: "#94a3b8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><Icons.Back /> Dashboard</button>
              <div style={{ color: G }}><Icons.Map /></div>
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
        />
      ) : (
        <Dashboard
          user={user}
          onSelect={setSelectedLot}
          onSignOut={signOut}
          isMobile={isMobile}
          onShowPipeline={() => setShowPipeline(true)}
          isOwner={isOwner}
          userLotIds={userLotIds}
        />
      )}
    </>
  );
}
