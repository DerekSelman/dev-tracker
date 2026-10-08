import { supabase } from "../supabase";
import { thumbPath } from "../thumbs";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

const photoUrl = (path) => supabase.storage.from("lot-files").getPublicUrl(path).data.publicUrl;

// Opens a print-ready page (punch list + photos). From the print dialog the user
// can print it or choose "Save as PDF".
export async function printPunchList(lot) {
  // Open the window synchronously so browsers (esp. iPhone Safari) don't block the popup.
  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups for this site to print the punch list.");
    return;
  }
  w.document.write(`<p style="font-family:Arial,sans-serif;padding:24px;color:#64748b">Preparing punch list...</p>`);

  try {
    const lotId = lot.id;
    if (lot.address === undefined) {
      const { data: full } = await supabase.from("lots").select("id, address, owner").eq("id", lotId).single();
      if (full) lot = full;
    }
    const [{ data: punchItems }, { data: phases }] = await Promise.all([
      supabase.from("punch_list").select("*").eq("lot_id", lotId).order("created_at"),
      supabase.from("phases").select("id, phase_name").eq("lot_id", lotId).eq("phase_name", "Punch List"),
    ]);
    const punchPhase = (phases || [])[0];

    let checklist = [];
    let photos = [];
    if (punchPhase) {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("phase_checklist").select("*").eq("phase_id", punchPhase.id).order("created_at"),
        supabase.from("phase_photos").select("*").eq("phase_id", punchPhase.id).order("created_at"),
      ]);
      checklist = c || [];
      photos = p || [];
    }

    // Combine Punch List tab items + Punch List phase checklist items (skip exact duplicates)
    const seen = new Set();
    const items = [];
    for (const i of [...(punchItems || []).map(x => ({ text: x.item, completed: x.completed, completed_at: x.completed_at })),
                     ...checklist.map(x => ({ text: x.item, completed: x.completed, completed_at: x.completed_at }))]) {
      const key = (i.text || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push(i);
    }
    const open = items.filter(i => !i.completed);
    const done = items.filter(i => i.completed);
    const pct = items.length ? Math.round((done.length / items.length) * 100) : 0;

    const row = (i, n) => `
      <tr>
        <td class="num">${n}</td>
        <td class="box">${i.completed ? "&#10003;" : ""}</td>
        <td class="${i.completed ? "done" : ""}">${esc(i.text)}</td>
        <td class="date">${i.completed ? esc(fmtDate(i.completed_at)) : ""}</td>
      </tr>`;

    const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Punch List - ${esc(lot.address || "Property")}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 0; padding: 28px; font-size: 13px; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #22c55e; padding-bottom: 10px; margin-bottom: 14px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #64748b; font-size: 12px; }
  .stats { display: flex; gap: 18px; margin: 0 0 16px; font-size: 12px; color: #475569; }
  .stats b { color: #1e293b; font-size: 14px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: #475569; margin: 18px 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { border-bottom: 1px solid #e2e8f0; padding: 7px 6px; vertical-align: top; }
  td.num { width: 28px; color: #94a3b8; }
  td.box { width: 26px; }
  td.box { font-weight: bold; color: #16a34a; }
  td.date { width: 90px; color: #64748b; font-size: 11px; text-align: right; }
  td.done { color: #64748b; text-decoration: line-through; }
  .open td.box { border: none; }
  .open td.box span, .chk { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #94a3b8; border-radius: 3px; }
  .photos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .photo { min-width: 0; break-inside: avoid; page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; }
  .photo img { width: 100%; height: 260px; object-fit: cover; display: block; border-radius: 4px; background: #f1f5f9; }
  .cap { font-size: 11px; color: #64748b; margin-top: 4px; }
  .empty { color: #94a3b8; padding: 8px 0; }
  .sign { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; font-size: 11px; color: #64748b; }
  .sign div { border-top: 1px solid #94a3b8; padding-top: 4px; }
  .toolbar { position: sticky; top: 0; background: #fff; padding: 0 0 12px; display: flex; gap: 8px; }
  .toolbar button { background: #000; color: #22c55e; border: 2px solid #22c55e; border-radius: 8px; padding: 8px 16px; font-weight: bold; cursor: pointer; font-size: 13px; }
  @media print { .toolbar { display: none; } body { padding: 0; } @page { margin: 0.5in; } h2 { break-after: avoid; } tr { break-inside: avoid; } }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button><button onclick="window.close()" style="background:#fff;color:#475569;border-color:#e2e8f0">Close</button></div>
<div class="head">
  <div><h1>Punch List</h1><div class="sub">${esc(lot.address || "")}${lot.owner ? " &middot; " + esc(lot.owner) : ""}</div></div>
  <div class="sub" style="text-align:right">Figley Contracting LLC<br>Printed ${esc(fmtDate(new Date().toISOString()))}</div>
</div>
<div class="stats">
  <div><b>${items.length}</b> items</div>
  <div><b>${open.length}</b> open</div>
  <div><b>${done.length}</b> completed</div>
  <div><b>${pct}%</b> complete</div>
  <div><b>${photos.length}</b> photos</div>
</div>

<h2>Open Items (${open.length})</h2>
${open.length ? `<table class="open">${open.map((i, n) => row(i, n + 1).replace('<td class="box"></td>', '<td class="box"><span class="chk"></span></td>')).join("")}</table>` : `<div class="empty">No open items.</div>`}

<h2>Completed (${done.length})</h2>
${done.length ? `<table>${done.map((i, n) => row(i, n + 1)).join("")}</table>` : `<div class="empty">No completed items yet.</div>`}

<h2>Photos (${photos.length})</h2>
${photos.length ? `<div class="photos">${photos.map((p, n) => `
  <div class="photo"><img src="${esc(photoUrl(thumbPath(p.file_path)))}" data-full="${esc(photoUrl(p.file_path))}" alt="">
    <div class="cap">Photo ${n + 1}${p.caption ? " &middot; " + esc(p.caption) : ""} &middot; ${esc(fmtDate(p.created_at))}</div></div>`).join("")}</div>` : `<div class="empty">No punch list photos.</div>`}

<div class="sign"><div>Homeowner signature / date</div><div>Contractor signature / date</div></div>

<script>
  (function () {
    var imgs = Array.prototype.slice.call(document.images);
    var left = imgs.length, fired = false;
    function go() { if (fired) return; fired = true; setTimeout(function () { window.print(); }, 300); }
    if (!left) return go();
    imgs.forEach(function (im) {
      var done = function () { if (--left === 0) go(); };
      im.onload = done;
      im.onerror = function () {
        var full = im.getAttribute("data-full");
        if (full && im.src !== full) { im.onerror = done; im.src = full; } else { done(); }
      };
      if (im.complete) { if (im.naturalWidth) { im.onload = null; im.onerror = null; done(); } else { im.onerror(); } }
    });
    setTimeout(go, 8000);
  })();
</script>
</body></html>`;

    w.document.open();
    w.document.write(html);
    w.document.close();
  } catch (e) {
    w.document.body.innerHTML = `<p style="font-family:Arial,sans-serif;padding:24px;color:#ef4444">Could not build the punch list: ${esc(e.message)}</p>`;
  }
}
