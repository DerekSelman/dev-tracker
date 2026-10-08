// Daily Dev Tracker activity digest.
// Runs once a day (pg_cron -> pg_net), reads the last 24h of activity_log,
// and emails a summary grouped by address via Resend.
//
// Required secret (Supabase Dashboard > Edge Functions > Secrets):
//   RESEND_API_KEY   - API key from resend.com
// Optional secrets:
//   DIGEST_TO        - recipient (default derekselman@gmail.com)
//   DIGEST_FROM      - sender (default "Dev Tracker <onboarding@resend.dev>")
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CRON_TOKEN = "__CRON_TOKEN__";
const TZ = "America/Phoenix";

const ACTION_LABELS: Record<string, string> = {
  status_change: "Status change",
  date_change: "Date change",
  photo_upload: "Photo upload",
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" });

Deno.serve(async (req: Request) => {
  if (req.headers.get("x-cron-token") !== CRON_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return new Response("RESEND_API_KEY secret is not set", { status: 500 });
  const to = Deno.env.get("DIGEST_TO") ?? "derekselman@gmail.com";
  const from = Deno.env.get("DIGEST_FROM") ?? "Dev Tracker <onboarding@resend.dev>";

  const body = await req.json().catch(() => ({}));
  const hours = Number(body?.hours) > 0 ? Number(body.hours) : 24;
  const force = body?.force === true; // send even if there was no activity (for testing)

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("activity_log")
    .select("created_at, action, details, user_email, lot_id, phase_id, lots(address), phases(phase_name)")
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) return new Response("Query failed: " + error.message, { status: 500 });

  const items = rows ?? [];
  if (items.length === 0 && !force) {
    return Response.json({ sent: false, reason: "no activity" });
  }

  // Group by address
  const groups = new Map<string, typeof items>();
  for (const r of items) {
    // deno-lint-ignore no-explicit-any
    const addr = ((r as any).lots?.address || "Unknown address").trim();
    if (!groups.has(addr)) groups.set(addr, []);
    groups.get(addr)!.push(r);
  }
  const people = new Set(items.map((r) => r.user_email).filter(Boolean));
  const today = fmtDate(new Date());

  let html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;color:#1e293b">
  <div style="background:#000;color:#fff;padding:16px 20px;border-bottom:3px solid #22c55e">
    <div style="font-size:20px;font-weight:bold">Dev Tracker - Daily Activity</div>
    <div style="font-size:13px;color:#94a3b8">${esc(today)}</div>
  </div>
  <div style="padding:16px 20px;font-size:14px;background:#f8fafc">
    <b>${items.length}</b> update${items.length === 1 ? "" : "s"} across <b>${groups.size}</b> address${groups.size === 1 ? "" : "es"}
    by <b>${people.size}</b> ${people.size === 1 ? "person" : "people"} in the last ${hours} hours.
  </div>`;

  if (items.length === 0) {
    html += `<div style="padding:20px;font-size:14px;color:#64748b">No activity recorded.</div>`;
  }

  for (const [addr, list] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    html += `<div style="padding:14px 20px 4px"><div style="font-size:16px;font-weight:bold;margin-bottom:6px">${esc(addr)}
      <span style="font-size:12px;color:#64748b;font-weight:normal">(${list.length})</span></div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">`;
    for (const r of list) {
      // deno-lint-ignore no-explicit-any
      const phase = (r as any).phases?.phase_name;
      html += `<tr style="border-top:1px solid #e2e8f0">
        <td style="padding:6px 8px 6px 0;color:#64748b;white-space:nowrap;vertical-align:top">${esc(fmtTime(r.created_at))}</td>
        <td style="padding:6px 8px;vertical-align:top">${phase ? `<b>${esc(phase)}</b> - ` : ""}${esc(r.details || ACTION_LABELS[r.action] || r.action)}</td>
        <td style="padding:6px 0;color:#94a3b8;vertical-align:top;font-size:12px">${esc(r.user_email || "")}</td>
      </tr>`;
    }
    html += `</table></div>`;
  }
  html += `<div style="padding:16px 20px;font-size:12px;color:#94a3b8">Sent automatically by Dev Tracker.</div></div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Dev Tracker: ${items.length} update${items.length === 1 ? "" : "s"} - ${today}`,
      html,
    }),
  });
  const out = await res.text();
  if (!res.ok) return new Response("Resend error: " + out, { status: 502 });
  return Response.json({ sent: true, count: items.length, resend: JSON.parse(out) });
});
