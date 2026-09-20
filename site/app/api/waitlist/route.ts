import { Resend } from "resend";
import { REPO_URL, SITE_URL } from "@/lib/site";

// Mac waitlist: adds the address to a Resend segment and sends one welcome email.
// Needs RESEND_API_KEY and RESEND_SEGMENT_ID (Vercel env vars).
const FROM = process.env.WAITLIST_FROM ?? "GoatBar <goatbar@vantageconnections.com>";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Best-effort per-instance rate limit: plenty for a waitlist, no extra infrastructure.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; company?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (typeof body?.company === "string" && body.company) return Response.json({ ok: true }); // honeypot: quietly accept
  if (!EMAIL.test(email) || email.length > 254) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return Response.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });

  const key = process.env.RESEND_API_KEY;
  const segmentId = process.env.RESEND_SEGMENT_ID;
  if (!key || !segmentId) {
    console.error("waitlist: RESEND_API_KEY or RESEND_SEGMENT_ID is not set");
    return Response.json({ error: "The waitlist is temporarily unavailable." }, { status: 503 });
  }
  const resend = new Resend(key);

  const contact = await resend.contacts.create({ email, unsubscribed: false, segments: [{ id: segmentId }] });
  if (contact.error) {
    if (!/already exists/i.test(contact.error.message ?? "")) {
      console.error("waitlist: contact create failed", contact.error);
      return Response.json({ error: "Couldn't add you right now. Please try again." }, { status: 502 });
    }
    // Known contact: if they're already on this waitlist, say yes again without a second email.
    const current = await resend.contacts.segments.list({ email });
    if (current.data?.data.some((s) => s.id === segmentId)) return Response.json({ ok: true });
    const added = await resend.contacts.segments.add({ email, segmentId });
    if (added.error) {
      console.error("waitlist: segment add failed", added.error);
      return Response.json({ error: "Couldn't add you right now. Please try again." }, { status: 502 });
    }
  }

  const sent = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "You're on the GoatBar for Mac waitlist",
    text: welcomeText(),
    html: welcomeHtml(),
    headers: { "List-Unsubscribe": `<mailto:goatbar@vantageconnections.com?subject=unsubscribe>` },
  });
  if (sent.error) console.error("waitlist: welcome email failed", sent.error); // they're still on the list

  return Response.json({ ok: true });
}

function welcomeText() {
  return [
    "Thanks for joining the GoatBar for Mac waitlist.",
    "",
    "GoatBar shows every running Claude Code and Codex chat in your taskbar, so you can see which agents are working and which are waiting on you.",
    "",
    "The Mac menu bar version is in progress. You'll get one email when it ships.",
    "",
    `On Windows today? It's free and open source: ${REPO_URL}`,
    `Site: ${SITE_URL}`,
    "",
    "Reply to this email with 'unsubscribe' to be removed.",
  ].join("\n");
}

function welcomeHtml() {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#16181a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dde1da;border-radius:16px">
      <tr><td style="padding:28px 28px 8px">
        <img src="${SITE_URL}/goat-head.png" width="56" height="56" alt="GoatBar goat" style="display:block">
        <h1 style="font-size:20px;line-height:1.3;margin:16px 0 8px">You're on the GoatBar for Mac waitlist</h1>
        <p style="font-size:15px;line-height:1.6;color:#555c62;margin:0 0 16px">GoatBar shows every running Claude Code and Codex chat in your taskbar, so you can see which agents are working and which are waiting on you.</p>
        <p style="font-size:15px;line-height:1.6;color:#555c62;margin:0 0 16px">The Mac menu bar version is in progress. You'll get one email when it ships.</p>
      </td></tr>
      <tr><td style="padding:0 28px 28px">
        <a href="${REPO_URL}" style="display:inline-block;background:#1f7a4c;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 18px;border-radius:10px">On Windows? Get it free on GitHub</a>
      </td></tr>
    </table>
    <p style="font-size:12px;color:#555c62;margin:16px 0 0">Reply with "unsubscribe" to be removed.</p>
  </td></tr></table></body></html>`;
}
