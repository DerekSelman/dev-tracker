import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { fieldStyle, cardStyle, G, G2, G3, Icons } from "../utils";

export default function PunchListTab({ lotId, user }) {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadItems(); }, [lotId]);

  const loadItems = async () => {
    const { data } = await supabase.from("punch_list").select("*").eq("lot_id", lotId).order("created_at");
    if (data) setItems(data);
  };

  const addItem = async () => {
    if (!newItem.trim()) return;
    setAdding(true);
    await supabase.from("punch_list").insert({ lot_id: lotId, item: newItem.trim() });
    setNewItem("");
    loadItems();
    setAdding(false);
  };

  const toggleItem = async (item) => {
    await supabase.from("punch_list").update({ completed: !item.completed, completed_by: user.id, completed_at: new Date().toISOString() }).eq("id", item.id);
    loadItems();
  };

  const deleteItem = async (id) => {
    await supabase.from("punch_list").delete().eq("id", id);
    loadItems();
  };

  const complete = items.filter(i => i.completed).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;

  return (
    <div>
      {total > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Final Walkthrough Checklist</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: pct === 100 ? G2 : "#d97706" }}>{pct}%</span>
          </div>
          <div style={{ background: "#f1f5f9", borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, #000, ${G})`, borderRadius: 99, transition: "width 0.4s" }} />
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{complete}/{total} items complete</div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()} placeholder="Add punch list item..." style={{ ...fieldStyle, fontSize: 13, padding: "9px 12px", flex: 1 }} />
          <button onClick={addItem} disabled={adding || !newItem.trim()} style={{ background: newItem.trim() ? "#000" : "#f1f5f9", color: newItem.trim() ? G : "#cbd5e1", border: `2px solid ${newItem.trim() ? G : "#e2e8f0"}`, borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: newItem.trim() ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap" }}>Add Item</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 }}>
          No punch list items yet. Add items from your final walkthrough.
        </div>
      ) : (
        <div>
          {/* Open items */}
          {items.filter(i => !i.completed).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Open Items ({items.filter(i => !i.completed).length})</div>
              {items.filter(i => !i.completed).map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, marginBottom: 6 }}>
                  <button onClick={() => toggleItem(item)} style={{ width: 22, height: 22, borderRadius: 6, border: "2px solid #cbd5e1", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, color: "#1e293b" }}>{item.item}</span>
                  <button onClick={() => deleteItem(item.id)} style={{ background: "transparent", border: "none", color: "#e2e8f0", cursor: "pointer" }}><Icons.Trash /></button>
                </div>
              ))}
            </div>
          )}

          {/* Completed items */}
          {items.filter(i => i.completed).length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: G2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Completed ({items.filter(i => i.completed).length})</div>
              {items.filter(i => i.completed).map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: G3, border: `1.5px solid #bbf7d0`, borderRadius: 10, marginBottom: 6 }}>
                  <button onClick={() => toggleItem(item)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${G2}`, background: G2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <span style={{ flex: 1, fontSize: 14, color: "#94a3b8", textDecoration: "line-through" }}>{item.item}</span>
                  <button onClick={() => deleteItem(item.id)} style={{ background: "transparent", border: "none", color: "#e2e8f0", cursor: "pointer" }}><Icons.Trash /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
