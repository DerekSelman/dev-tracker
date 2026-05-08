import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { fieldStyle, G, G2, G3, Icons } from "../utils";

const PHASE_PRESETS = {
  "Pool": ["Plan Submitted", "Dig", "Plumbing", "Rebar", "Shotcrete", "Tile", "Coping", "Plaster", "Lights", "Pool Equipment"],
  "Trim Out": ["Countertops", "Plumbing Fixtures", "Electrical", "Appliances"],
  "Rough Mechanicals": ["Electrical Rough", "HVAC Rough", "Plumbing Rough", "Low Voltage", "Gas Lines", "Insulation", "— Electrical Inspection Passed", "— Plumbing Inspection Passed", "— HVAC Inspection Passed"],
};

export default function PhaseChecklist({ phaseId, lotId, user, onChecklistStatus, phaseName }) {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadItems(); }, [phaseId]);

  const loadItems = async () => {
    const { data } = await supabase.from("phase_checklist").select("*").eq("phase_id", phaseId).order("created_at");
    if (data) {
      // If no items and phase has presets, auto-populate
      if (data.length === 0 && phaseName && PHASE_PRESETS[phaseName]) {
        const presets = PHASE_PRESETS[phaseName];
        for (const item of presets) {
          await supabase.from("phase_checklist").insert({ phase_id: phaseId, lot_id: lotId, item });
        }
        const { data: fresh } = await supabase.from("phase_checklist").select("*").eq("phase_id", phaseId).order("created_at");
        if (fresh) {
          setItems(fresh);
          onChecklistStatus({ total: fresh.length, done: fresh.filter(i => i.completed).length, allDone: false });
        }
        return;
      }
      setItems(data);
      const total = data.length;
      const done = data.filter(i => i.completed).length;
      onChecklistStatus({ total, done, allDone: total === 0 || done === total });
    }
  };

  const addItem = async () => {
    if (!newItem.trim()) return;
    setAdding(true);
    await supabase.from("phase_checklist").insert({ phase_id: phaseId, lot_id: lotId, item: newItem.trim() });
    setNewItem("");
    loadItems();
    setAdding(false);
  };

  const toggleItem = async (item) => {
    await supabase.from("phase_checklist").update({ completed: !item.completed, completed_by: user.id, completed_at: new Date().toISOString() }).eq("id", item.id);
    loadItems();
  };

  const deleteItem = async (id) => {
    await supabase.from("phase_checklist").delete().eq("id", id);
    loadItems();
  };

  const complete = items.filter(i => i.completed).length;
  const total = items.length;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Checklist</div>
        {total > 0 && <div style={{ fontSize: 11, color: complete === total ? G2 : "#d97706", fontWeight: 700 }}>{complete}/{total} done</div>}
      </div>

      {items.map(item => (
        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
          <button onClick={() => toggleItem(item)} style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${item.completed ? G2 : "#cbd5e1"}`, background: item.completed ? G2 : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}>
            {item.completed && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
          </button>
          <span style={{ flex: 1, fontSize: 13, color: item.completed ? "#94a3b8" : "#1e293b", textDecoration: item.completed ? "line-through" : "none" }}>{item.item}</span>
          <button onClick={() => deleteItem(item.id)} style={{ background: "transparent", border: "none", color: "#e2e8f0", cursor: "pointer", padding: 2, flexShrink: 0 }}><Icons.Trash /></button>
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()} placeholder="Add checklist item..." style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px", flex: 1 }} />
        <button onClick={addItem} disabled={adding || !newItem.trim()} style={{ background: newItem.trim() ? "#000" : "#f1f5f9", color: newItem.trim() ? G : "#cbd5e1", border: `1.5px solid ${newItem.trim() ? G : "#e2e8f0"}`, borderRadius: 8, padding: "6px 12px", cursor: newItem.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>Add</button>
      </div>
    </div>
  );
}
