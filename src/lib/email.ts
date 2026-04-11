import "server-only";
import { Resend } from "resend";

/**
 * Email helper — transactional emails via Resend.
 *
 * Replaces the earlier Supabase edge function invocation pattern
 * (send-enquiry-email) which was never actually deployed and was
 * silently failing. All call sites now get real errors in the
 * Vercel function logs when delivery fails.
 *
 * Environment variables required (set on Vercel):
 *   - RESEND_API_KEY    — from https://resend.com/api-keys
 *   - EMAIL_FROM        — verified sender address e.g. "Ardhi Verified <hello@ardhiverified.com>"
 *   - ADMIN_EMAIL       — where admin notifications are routed (default: hello@ardhiverified.com)
 *
 * Fails gracefully when RESEND_API_KEY is missing in local dev —
 * logs a warning and returns { sent: false } so nothing breaks,
 * but in production the missing key should surface as an alert.
 */

const DEFAULT_FROM = "Ardhi Verified <hello@ardhiverified.com>";
const DEFAULT_ADMIN = "hello@ardhiverified.com";

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  error?: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

/**
 * Low-level send — use this for bespoke emails with custom HTML.
 * Most code should call one of the typed helpers below instead.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY not set — email will NOT be delivered. " +
      "Add the key to Vercel environment variables and redeploy."
    );
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const from = process.env.EMAIL_FROM || DEFAULT_FROM;
  const resend = new Resend(apiKey);

  // Resend v6 requires exactly one of { html, text, react, template }.
  // We always prefer HTML; if only text is provided, we wrap it in a
  // minimal HTML envelope so the Resend API is satisfied and the
  // recipient still gets a readable email. If neither is provided,
  // bail early.
  const html = opts.html ?? (opts.text ? `<pre style="font-family: -apple-system, sans-serif; white-space: pre-wrap;">${opts.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>` : undefined);

  if (!html) {
    return { sent: false, error: "No email body (html or text) provided" };
  }

  try {
    const result = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html,
      ...(opts.text ? { text: opts.text } : {}),
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });

    if (result.error) {
      console.error(`[email] Resend API error: ${result.error.message}`);
      return { sent: false, error: result.error.message };
    }

    return { sent: true, id: result.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] send failed: ${msg}`);
    return { sent: false, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Typed helpers — the actual call sites across the app
// ═══════════════════════════════════════════════════════════════════

/**
 * Notifies the admin inbox about a new form submission (enquiry,
 * concierge, contact, community flag, EOI, waitlist). Replaces the
 * old ghost-edge-function notifyAdmin helper.
 */
export async function notifyAdminNewSubmission(data: {
  subject: string;        // used as email subject AND the "source" label
  name: string;
  email: string;
  phone?: string;
  message: string;
  listingTitle?: string;
}): Promise<SendEmailResult> {
  const to = process.env.ADMIN_EMAIL || DEFAULT_ADMIN;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1A1A2E;">
  <div style="border-left: 4px solid #00A550; padding-left: 16px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 8px 0; color: #00A550; font-family: Georgia, serif;">Ardhi Verified</h2>
    <p style="margin: 0; color: #6B7280; font-size: 13px;">New ${escapeHtml(data.subject)}</p>
  </div>

  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; color: #6B7280; width: 120px; vertical-align: top;">Name</td>
      <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(data.name)}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #6B7280; vertical-align: top;">Email</td>
      <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(data.email)}" style="color: #00A550;">${escapeHtml(data.email)}</a></td>
    </tr>
    ${data.phone ? `
    <tr>
      <td style="padding: 8px 0; color: #6B7280; vertical-align: top;">Phone</td>
      <td style="padding: 8px 0;">${escapeHtml(data.phone)}</td>
    </tr>
    ` : ""}
    ${data.listingTitle ? `
    <tr>
      <td style="padding: 8px 0; color: #6B7280; vertical-align: top;">Context</td>
      <td style="padding: 8px 0;">${escapeHtml(data.listingTitle)}</td>
    </tr>
    ` : ""}
    <tr>
      <td style="padding: 8px 0; color: #6B7280; vertical-align: top;">Message</td>
      <td style="padding: 8px 0; white-space: pre-wrap;">${escapeHtml(data.message)}</td>
    </tr>
  </table>

  <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E8E8E8; color: #6B7280; font-size: 12px;">
    This is an automated notification from ardhiverified.com. Reply directly to this email to respond to the sender.
  </p>
</body>
</html>`.trim();

  return sendEmail({
    to,
    subject: `[Ardhi] ${data.subject} — ${data.name}`,
    html,
    text: renderAdminText(data),
    replyTo: data.email,
  });
}

/**
 * Notifies the admin inbox about a partner portal status update,
 * especially fee-triggering events (deposited / completed).
 */
export async function notifyAdminPortalEvent(data: {
  subject: string;        // e.g. "[FEE] AV-2026-UK-00001 marked COMPLETED"
  body: string;           // plain-text body from the portal action
  partnerEmail: string;   // the partner user who triggered the action
}): Promise<SendEmailResult> {
  const to = process.env.ADMIN_EMAIL || DEFAULT_ADMIN;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1A1A2E;">
  <div style="border-left: 4px solid #C4A44A; padding-left: 16px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 4px 0; color: #0B5730; font-family: Georgia, serif;">Ardhi Verified Partner Portal</h2>
    <p style="margin: 0; color: #6B7280; font-size: 13px;">Reported by ${escapeHtml(data.partnerEmail)}</p>
  </div>

  <pre style="font-family: 'SF Mono', Menlo, Monaco, monospace; font-size: 13px; background: #F5F9F5; padding: 16px; border-radius: 6px; border-left: 3px solid #00A550; white-space: pre-wrap; color: #0B5730;">${escapeHtml(data.body)}</pre>

  <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E8E8E8; color: #6B7280; font-size: 12px;">
    This is an automated notification from the Ardhi Verified Partner Portal. An invoice should be raised if the subject line begins with [FEE].
  </p>
</body>
</html>`.trim();

  return sendEmail({
    to,
    subject: data.subject,
    html,
    text: data.body,
    replyTo: data.partnerEmail,
  });
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderAdminText(data: {
  subject: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  listingTitle?: string;
}): string {
  const lines = [
    `Ardhi Verified — new ${data.subject}`,
    "",
    `Name:    ${data.name}`,
    `Email:   ${data.email}`,
  ];
  if (data.phone) lines.push(`Phone:   ${data.phone}`);
  if (data.listingTitle) lines.push(`Context: ${data.listingTitle}`);
  lines.push("", "Message:", data.message, "", "— ardhiverified.com");
  return lines.join("\n");
}
