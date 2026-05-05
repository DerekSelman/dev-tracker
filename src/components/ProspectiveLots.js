import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { formatCurrency, cardStyle, fieldStyle, labelStyle, btnGreen, btnOutline, G, G2, G3, PROSPECTIVE_STATUSES, Icons } from "../utils";

const STATUS_COLORS = {
  "Scouting":      { bg: "#f8fafc", border: "#e2e8f0", color: "#64748b" },
  "Interested":    { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
  "Offer Made":    { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af" },
  "Under Contract":{ bg: G3,        border: "#bbf7d0", color: "#166534" },
  "Passed":        { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" },
};

function ProspectiveDetail({ lot, onBack, onDelete, onConvert, user }) {
  const [local, setLocal] = useState(lot);
  const [photos, setPhotos] = useState([]);
  const [docs, setDocs] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const photoRef = useRef(null);

  useEffect(() => { loadPhotos(); loadDocs(); }, [lot.id]);

  const loadPhotos = async () => {
    const { data } = await supabase.from("prospective_photos").select("*").eq("lot_id", lot.id).order("created_at", { ascending: false });
    if (data) setPhotos(data);
  };

  const loadDocs = async () => {
    const { data } = await supabase.from("prospective_docs").select("*").eq("lot_id", lot.id).order("created_at", { ascending: false });
    if (data) setDocs(data);
  };

  const saveField = async (field, value) => {
    setSaving(true);
    await supabase.from("prospective_lots").update({ [field]: value || null }).eq("id", lot.id);
    setLocal(p => ({ ...p, [field]: value }));
    setSaving(false);
  };

  const uploadPhoto = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPhoto(true);
    for (const file of files) {
      const path = `prospective/${lot.id}/photos/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("lot-files").upload(path, file);
      if (!error) await supabase.from("prospective_photos").insert({ lot_id: lot.id, file_name: file.name, file_path: path, uploaded_by: user.id });
    }
    loadPhotos();
    setUploadingPhoto(false);
  };

  const uploadDoc = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingDoc(true);
    for (const file of files) {
      const path = `prospective/${lot.id}/docs/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("lot-files").upload(path, file);
      if (!error) await supabase.from("prospective_docs").insert({ lot_id: lot.id, file_name: file.name, file_path: path, uploaded_by: user.id });
    }
    loadDocs();
    setUploadingDoc(false);
  };

  const deletePhoto = async (photo) => {
    await supabase.storage.from("lot-files").remove([photo.file_path]);
    await supabase.from("prospective_photos").delete().eq("id", photo.id);
    loadPhotos();
  };

  const deleteDoc = async (doc) => {
    await supabase.storage.from("lot-files").remove([doc.file_path]);
    await supabase.from("prospective_docs").delete().eq("id", doc.id);
    loadDocs();
  };

  const getUrl = (path) => supabase.storage.from("lot-files").getPublicUrl(path).data.publicUrl;
  const sc = STATUS_COLORS[local.status] || STATUS_COLORS["Scouting"];

  const daysUntilFollowUp = local.follow_up_date ? daysDiff(local.follow_up_date) * -1 : null;

  function daysDiff(date) {
    if (!date) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(date + "T00:00:00"); d.setHours(0,0,0,0);
    return Math.round((today - d) / 86400000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "#000", borderBottom: `3px solid ${G}`, padding: "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "1.5px solid #333", color: "#94a3b8", borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><Icons.Back /> Pipeline</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input defaultValue={local.address} onBlur={e => saveField("address", e.target.value)} placeholder="Enter address or description..." style={{ background: "transparent", border: "none", color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'DM Serif Display', serif", outline: "none", width: "100%" }} />
          </div>
          {saving && <span style={{ fontSize: 12, color: "#64748b" }}>Saving...</span>}
          <button onClick={() => { if (window.confirm("Convert to active development? This will create a new lot with this address.")) onConvert(lot); }} style={{ ...btnGreen, padding: "7px 14px", fontSize: 12 }}>
            <Icons.Convert /> Convert to Active
          </button>
          <button onClick={() => { if (window.confirm("Delete this prospective lot?")) onDelete(lot.id); }} style={{ background: "transparent", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><Icons.Trash /></button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={local.status} onChange={e => saveField("status", e.target.value)} style={{ ...fieldStyle, fontSize: 13 }}>
              {PROSPECTIVE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Estimated Value</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14 }}>$</span>
              <input type="number" defaultValue={local.estimated_value || ""} onBlur={e => saveField("estimated_value", e.target.value)} placeholder="0" style={{ ...fieldStyle, paddingLeft: 24 }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Follow-up Date</label>
            <input type="date" defaultValue={local.follow_up_date || ""} onBlur={e => saveField("follow_up_date", e.target.value)} style={fieldStyle} />
          </div>
          <div style={{ ...cardStyle, padding: "10px 14px", borderColor: sc.border, background: sc.bg }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Follow-up</div>
            {local.follow_up_date ? (
              <div style={{ fontSize: 15, fontWeight: 700, color: daysUntilFollowUp <= 0 ? "#ef4444" : daysUntilFollowUp <= 3 ? "#d97706" : G2 }}>
                {daysUntilFollowUp <= 0 ? "Overdue!" : `${daysUntilFollowUp} days`}
              </div>
            ) : <div style={{ fontSize: 13, color: "#94a3b8" }}>Not set</div>}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Notes</label>
          <textarea defaultValue={local.notes || ""} onBlur={e => saveField("notes", e.target.value)} placeholder="Notes about this lot..." rows={4} style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Photos */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Photos</label>
              <label style={{ ...btnGreen, padding: "6px 12px", fontSize: 12 }}>
                <Icons.Camera />{uploadingPhoto ? "Uploading..." : "Add Photos"}
                <input type="file" accept="image/*" multiple capture="environment" onChange={uploadPhoto} style={{ display: "none" }} />
              </label>
            </div>
            {photos.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: "30px", color: "#94a3b8", fontSize: 13 }}>No photos yet</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {photos.map(photo => (
                  <div key={photo.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "1", background: "#e2e8f0" }}>
                    <img src={getUrl(photo.file_path)} alt={photo.file_name} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} onClick={() => window.open(getUrl(photo.file_path), "_blank")} />
                    <button onClick={() => deletePhoto(photo)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", color: "#fff", width: 24, height: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.Trash /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Documents</label>
              <label style={{ ...btnOutline, padding: "6px 12px", fontSize: 12 }}>
                <Icons.Upload />{uploadingDoc ? "Uploading..." : "Upload"}
                <input type="file" multiple onChange={uploadDoc} style={{ display: "none" }} />
              </label>
            </div>
            {docs.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: "30px", color: "#94a3b8", fontSize: 13 }}>No documents yet</div>
            ) : docs.map(doc => (
              <div key={doc.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 10, marginBottom: 6, padding: "10px 12px" }}>
                <div style={{ color: "#64748b" }}><Icons.File /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.file_name}</div>
                </div>
                <button onClick={() => window.open(getUrl(doc.file_path), "_blank")} style={{ background: G3, border: `1px solid ${G}`, borderRadius: 6, color: G2, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Open</button>
                <button onClick={() => deleteDoc(doc)} style={{ background: "transparent", border: "none", color: "#e2e8f0", cursor: "pointer" }}><Icons.Trash /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProspectiveLots({ user, onConvert }) {
  const [lots, setLots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [adding, setAdding] = useState(false);

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
    setSelected(null);
    loadLots();
  };

  const handleConvert = async (lot) => {
    const { data: newLot } = await supabase.from("lots").insert({ address: lot.address, notes: lot.notes, budget: lot.estimated_value }).select().single();
    if (newLot) {
      const phaseRows = ["Grading Lot","Walls","Pool","House Layout","Underground","Foundation","Framing","Rough Mechanicals","Lathing","Drywall / Tape / Texture","Paint","Cabinets","Floor Tile & Showers","Trim Out","Cleaning","Punch List"].map(name => ({ lot_id: newLot.id, phase_name: name, status: "not_started" }));
      await supabase.from("phases").insert(phaseRows);
      await supabase.from("prospective_lots").update({ status: "Under Contract" }).eq("id", lot.id);
      alert(`Converted! "${lot.address}" is now an active development.`);
      setSelected(null);
      loadLots();
      onConvert();
    }
  };

  const followUpDue = lots.filter(l => {
    if (!l.follow_up_date) return false;
    const today = new Date().toISOString().split("T")[0];
    return l.follow_up_date <= today && l.status !== "Passed";
  });

  if (selected) {
    return <ProspectiveDetail lot={selected} onBack={() => { setSelected(null); loadLots(); }} onDelete={deleteLot} onConvert={handleConvert} user={user} />;
  }

  const filtered = filterStatus === "all" ? lots : lots.filter(l => l.status === filterStatus);
  const sc = (status) => STATUS_COLORS[status] || STATUS_COLORS["Scouting"];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {followUpDue.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <Icons.Bell />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>{followUpDue.length} follow-up{followUpDue.length > 1 ? "s" : ""} due</div>
            <div style={{ fontSize: 12, color: "#b45309" }}>{followUpDue.map(l => l.address || "Unnamed lot").join(", ")}</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {["all", ...PROSPECTIVE_STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${filterStatus === s ? G : "#e2e8f0"}`, background: filterStatus === s ? G3 : "#fff", color: filterStatus === s ? G2 : "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: filterStatus === s ? 700 : 500, whiteSpace: "nowrap" }}>{s === "all" ? "All" : s}</button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button onClick={() => setShowMap(!showMap)} style={{ padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${showMap ? G : "#e2e8f0"}`, background: showMap ? G3 : "#fff", color: showMap ? G2 : "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: showMap ? 700 : 500, display: "flex", alignItems: "center", gap: 5 }}>
            <Icons.Map />{showMap ? "List View" : "Map View"}
          </button>
        </div>
      </div>

      {showMap && (
        <div style={{ ...cardStyle, marginBottom: 16, padding: 0, overflow: "hidden" }}>
          <div style={{ height: 360, position: "relative" }}>
            <iframe
              title="Prospective Lots Map"
              width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
              src={`https://maps.google.com/maps?q=${lots.filter(l => l.address).map(l => encodeURIComponent(l.address)).join("|")}&output=embed`}
              allowFullScreen
            />
            <div style={{ position: "absolute", top: 10, left: 10, background: "#000", color: G, fontSize: 11, padding: "4px 10px", borderRadius: 20, fontWeight: 700 }}>
              {lots.filter(l => l.address && l.status !== "Passed").length} prospective lots
            </div>
          </div>
          <div style={{ padding: "10px 14px", borderTop: "1px solid #f1f5f9" }}>
            {lots.filter(l => l.address && l.status !== "Passed").map(lot => (
              <div key={lot.id} onClick={() => setSelected(lot)} style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "4px", padding: "4px 10px", background: sc(lot.status).bg, border: `1px solid ${sc(lot.status).border}`, borderRadius: 20, cursor: "pointer", fontSize: 12, color: sc(lot.status).color, fontWeight: 600 }}>
                {lot.address || "Unnamed"}
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, color: "#1e293b", fontWeight: 600, marginBottom: 6 }}>No prospective lots yet</div>
          <p style={{ fontSize: 14, margin: 0, color: "#94a3b8" }}>Add lots you're scouting to track them here.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 20 }}>
          {filtered.map(lot => {
            const s = sc(lot.status);
            const today = new Date().toISOString().split("T")[0];
            const followUpDue = lot.follow_up_date && lot.follow_up_date <= today;
            return (
              <div key={lot.id} onClick={() => setSelected(lot)} style={{ background: "#fff", border: `1.5px solid ${followUpDue ? "#fde68a" : s.border}`, borderRadius: 14, padding: 16, cursor: "pointer", transition: "all 0.15s", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", fontFamily: "'DM Serif Display', serif", flex: 1, marginRight: 8 }}>
                    {lot.address || <span style={{ color: "#cbd5e1", fontStyle: "italic", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 400 }}>No address set</span>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap", flexShrink: 0 }}>{lot.status}</span>
                </div>
                {lot.estimated_value && <div style={{ fontSize: 13, color: "#475569", fontWeight: 600, marginBottom: 6 }}>{formatCurrency(lot.estimated_value)}</div>}
                {lot.notes && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{lot.notes}</div>}
                {lot.follow_up_date && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: followUpDue ? "#d97706" : "#64748b", fontWeight: followUpDue ? 700 : 400 }}>
                    <Icons.Bell />{followUpDue ? "Follow-up due!" : `Follow up: ${lot.follow_up_date}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button onClick={addLot} disabled={adding} style={{ ...btnGreen, position: "fixed", bottom: 24, right: 24, borderRadius: 50, padding: 16, boxShadow: `0 4px 20px rgba(74,222,128,0.3)` }}>
        <Icons.Plus />
      </button>
    </div>
  );
}
