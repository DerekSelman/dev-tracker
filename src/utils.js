export const PHASES = [
  "Survey",
  "Plans / Engineer",
  "City Permit",
  "Grading Lot",
  "Walls",
  "Pool",
  "House Layout",
  "Underground",
  "Foundation",
  "Framing",
  "Roof Dry In",
  "Rough Mechanicals",
  "Electrical Rough",
  "HVAC Rough",
  "Plumbing Rough",
  "Low Voltage",
  "Insulation",
  "Lathing",
  "Brown & Stucco",
  "Drywall / Tape / Texture",
  "Install Trim",
  "Paint",
  "Cabinets",
  "Electrical Trim Out",
  "Plumbing Trim Out",
  "Floor Tile & Showers",
  "Trim Out",
  "Cleaning",
  "Punch List",
];

export const STATUS = { NOT_STARTED: "not_started", IN_PROGRESS: "in_progress", COMPLETE: "complete" };
export const STATUS_CONFIG = {
  [STATUS.NOT_STARTED]: { label: "Not Started", dot: "#94a3b8" },
  [STATUS.IN_PROGRESS]: { label: "In Progress", dot: "#f59e0b" },
  [STATUS.COMPLETE]:    { label: "Complete",    dot: "#22c55e" },
};

export const G = "#4ade80";
export const G2 = "#16a34a";
export const G3 = "#f0fdf4";

export const PROSPECTIVE_STATUSES = ["Scouting","Interested","Offer Made","Under Contract","Passed"];

// Phase checklist presets
// - Rough Mechanicals: inspection items REMOVED per Derek
// - Plumbing Rough: Gas Lines added
// - Pool and Trim Out: unchanged
export const PHASE_PRESETS = {
  "Pool": [
    "Plan Submitted",
    "Dig",
    "Plumbing",
    "Rebar",
    "Shotcrete",
    "Tile",
    "Coping",
    "Plaster",
    "Lights",
    "Pool Equipment",
  ],
  "Rough Mechanicals": [
    // Inspection items removed — electrical, plumbing, HVAC inspections now have their own phases
  ],
  "Plumbing Rough": [
    "Gas Lines",
  ],
  "Trim Out": [
    "Countertops",
    "Plumbing Fixtures",
    "Electrical",
    "Appliances",
  ],
};

export function getOverallProgress(phases) {
  const total = PHASES.length;
  const complete = phases.filter(p => p.status === STATUS.COMPLETE).length;
  const inProgress = phases.filter(p => p.status === STATUS.IN_PROGRESS).length;
  return { complete, inProgress, total, pct: Math.round((complete / total) * 100) };
}

export function getCurrentPhase(phases) {
  const ip = phases.find(p => p.status === STATUS.IN_PROGRESS);
  if (ip) return ip.phase_name;
  const next = phases.find(p => p.status === STATUS.NOT_STARTED);
  return next ? next.phase_name : "Complete";
}

export function countOverdue(phases) {
  const today = new Date().toISOString().split("T")[0];
  return phases.filter(p => p.projected_end && p.projected_end < today && p.status !== STATUS.COMPLETE).length;
}

export function isPhaseOverdue(ph) {
  const today = new Date().toISOString().split("T")[0];
  return ph.projected_end && ph.projected_end < today && ph.status !== STATUS.COMPLETE;
}

export function daysDiff(date) {
  if (!date) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(date + "T00:00:00"); d.setHours(0,0,0,0);
  return Math.round((today - d) / 86400000);
}

export function formatCurrency(n) {
  if (!n && n !== 0) return "$0";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function calcDailyInterest(amount, rate) {
  return (amount * (rate / 100)) / 365;
}

export function calcInterestSinceDate(amount, rate, drawDate) {
  if (!drawDate || !amount || !rate) return 0;
  const days = daysDiff(drawDate);
  if (days <= 0) return 0;
  return amount * (rate / 100) / 365 * days;
}

export const labelStyle = { display: "block", fontSize: 11, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 };
export const fieldStyle = { width: "100%", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, color: "#1e293b", fontSize: 14, padding: "9px 12px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" };
export const dateInputStyle = { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 6, color: "#475569", fontSize: 11, padding: "4px 6px", width: "100%", fontFamily: "'DM Sans', sans-serif", outline: "none" };
export const cardStyle = { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
export const tabBtnStyle = (active) => ({ padding: "8px 16px", borderRadius: 8, border: active ? `2px solid ${G}` : "2px solid transparent", background: active ? G3 : "transparent", color: active ? G2 : "#64748b", fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", transition: "all 0.15s" });
export const btnGreen = { background: "#000", color: G, border: `2px solid ${G}`, borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", gap: 7 };
export const btnOutline = { background: "#fff", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", gap: 7 };

export const Icons = {
  HardHat: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 18h20v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2z"/><path d="M12 2a8 8 0 0 1 8 8v2H4v-2a8 8 0 0 1 8-8z"/><path d="M12 2v10"/></svg>,
  Plus: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Back: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>,
  Trash: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  Warn: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Upload: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  File: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Chevron: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>,
  Camera: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Link: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Clock: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Map: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  Bell: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Convert: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  Dollar: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
};
