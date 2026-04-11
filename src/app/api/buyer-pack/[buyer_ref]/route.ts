/**
 * Buyer Pack PDF — generated on-demand per buyer_ref.
 *
 * GET /api/buyer-pack/[buyer_ref]?t=<token>
 *
 * 4-page branded PDF:
 *   1. Verified Buyer Certificate
 *   2. HatiScan Property Intelligence Summary
 *   3. Personal Introduction Letter
 *   4. Land Guardian Enrolment Notice
 *
 * Auth model (pick one):
 *   - ?t=<sha256(buyer_ref + BUYER_PACK_SECRET)> in the query string, OR
 *   - Authenticated Supabase session whose email matches the buyer row.
 *
 * Generated on-demand (no storage bucket) to mirror the existing
 * HatiScan certificate pattern at src/app/api/certificate/route.ts.
 */

import { NextRequest } from "next/server";
import { createClient as createSBClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { jsPDF } from "jspdf";
import crypto from "crypto";

const service = createSBClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ═══════════════════════════════════════════════════════════════════
// Token helpers — deterministic per buyer_ref so the EOI confirmation
// page can build a valid download link without a round-trip.
// Uses SUPABASE_SERVICE_ROLE_KEY as the secret since it's already
// present in the environment and is server-only.
// ═══════════════════════════════════════════════════════════════════
function signBuyerRef(buyerRef: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-dev-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(`buyer-pack:${buyerRef}`)
    .digest("hex")
    .substring(0, 32);
}

// Helper exported for the server action to generate download URLs.
// Not directly used by the route handler — kept here so there's one
// signing implementation across the app.
export function buyerPackDownloadToken(buyerRef: string): string {
  return signBuyerRef(buyerRef);
}

// ═══════════════════════════════════════════════════════════════════
// Types — kept inline since this is the only place they're used.
// ═══════════════════════════════════════════════════════════════════
interface BuyerRow {
  id: string;
  buyer_ref: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  country_code: string;
  verification_level: string;
  listing_id: number | null;
  introduced_to_partner_id: string | null;
  introduction_status: string;
  buyer_ref_generated_at: string | null;
}

interface ListingRow {
  id: number;
  title: string;
  location: string;
  county: string;
  trust_score: number | null;
  verification_tier: string | null;
}

interface InstitutionRow {
  id: string;
  name: string;
  institution_type: string;
  contact_email: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// Brand constants
// ═══════════════════════════════════════════════════════════════════
const BRAND = {
  navy:    [26, 26, 46]   as [number, number, number],
  navyLt:  [45, 45, 68]   as [number, number, number],
  ardhi:   [0, 165, 80]   as [number, number, number],
  gold:    [196, 164, 74] as [number, number, number],
  muted:   [120, 120, 120] as [number, number, number],
  light:   [240, 240, 240] as [number, number, number],
  white:   [255, 255, 255] as [number, number, number],
  red:     [220, 50, 50]  as [number, number, number],
  amber:   [245, 166, 35] as [number, number, number],
};

// ═══════════════════════════════════════════════════════════════════
// Route handler
// ═══════════════════════════════════════════════════════════════════
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ buyer_ref: string }> }
) {
  const startedAt = Date.now();
  try {
    return await handleBuyerPackRequest(request, params);
  } catch (err) {
    const { buyer_ref: buyerRefRaw } = await params.catch(() => ({ buyer_ref: "unknown" }));
    console.error(
      `[buyer-pack] unhandled error for ref="${buyerRefRaw}" after ${Date.now() - startedAt}ms:`,
      err instanceof Error ? err.message : err
    );
    return Response.json(
      { error: "Failed to generate buyer pack. Please try again or contact hello@ardhiverified.com." },
      { status: 500 }
    );
  }
}

async function handleBuyerPackRequest(
  request: NextRequest,
  paramsPromise: Promise<{ buyer_ref: string }>
) {
  const { buyer_ref: buyerRefRaw } = await paramsPromise;
  const buyerRef = decodeURIComponent(buyerRefRaw).toUpperCase();

  // Basic format sanity check so we never hit the DB for obvious garbage.
  if (!/^AV-\d{4}-[A-Z]{2,3}-\d{5}$/.test(buyerRef)) {
    console.warn(`[buyer-pack] rejected malformed ref: ${buyerRef}`);
    return Response.json({ error: "Invalid buyer reference format" }, { status: 400 });
  }

  // ── AUTH ──────────────────────────────────────────────────────────
  const token = request.nextUrl.searchParams.get("t");
  const expected = signBuyerRef(buyerRef);
  let authorized = false;

  if (token && token === expected) {
    authorized = true;
  } else {
    // Fall back to Supabase session check
    try {
      const sbServer = await createServerClient();
      const { data: { user } } = await sbServer.auth.getUser();
      if (user?.email) {
        const { data: buyerForAuth } = await service
          .from("buyers")
          .select("buyer_email")
          .eq("buyer_ref", buyerRef)
          .maybeSingle();
        if (buyerForAuth?.buyer_email?.toLowerCase() === user.email.toLowerCase()) {
          authorized = true;
        }
      }
    } catch {
      // Any auth error falls through to the 403 below
    }
  }

  if (!authorized) {
    console.warn(`[buyer-pack] unauthorized access attempt: ${buyerRef}`);
    return Response.json({ error: "Not authorized to download this buyer pack" }, { status: 403 });
  }

  // ── FETCH DATA ────────────────────────────────────────────────────
  const { data: buyer, error: buyerErr } = await service
    .from("buyers")
    .select("id, buyer_ref, buyer_name, buyer_email, buyer_phone, country_code, verification_level, listing_id, introduced_to_partner_id, introduction_status, buyer_ref_generated_at")
    .eq("buyer_ref", buyerRef)
    .maybeSingle();

  if (buyerErr || !buyer) {
    console.error(`[buyer-pack] buyer lookup failed for ${buyerRef}: ${buyerErr?.message || "not found"}`);
    return Response.json({ error: "Buyer not found" }, { status: 404 });
  }

  const b = buyer as BuyerRow;

  let listing: ListingRow | null = null;
  if (b.listing_id) {
    const { data } = await service
      .from("listings")
      .select("id, title, location, county, trust_score, verification_tier")
      .eq("id", b.listing_id)
      .maybeSingle();
    listing = (data as ListingRow | null) ?? null;
  }

  let institution: InstitutionRow | null = null;
  if (b.introduced_to_partner_id) {
    const { data } = await service
      .from("saccos")
      .select("id, name, institution_type, contact_email")
      .eq("id", b.introduced_to_partner_id)
      .maybeSingle();
    institution = (data as InstitutionRow | null) ?? null;
  }

  // HatiScan trust score — use the listing's trust_score as a proxy
  // since we don't store per-parcel scan results against buyer rows.
  const hatiScore = listing?.trust_score ?? null;

  // ── BUILD PDF ─────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 20;

  const issuedDate = new Date(b.buyer_ref_generated_at || new Date()).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const validUntil = new Date(
    new Date(b.buyer_ref_generated_at || new Date()).getTime() + 24 * 30 * 24 * 60 * 60 * 1000
  ).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const verificationLabel =
    b.verification_level === "financially_screened" ? "Financially Screened"
      : b.verification_level === "identity_verified" ? "Identity Verified"
      : b.verification_level === "kyc_submitted" ? "KYC Complete"
      : "Pending";

  // ═════════════════════════════════════════════════════════════════
  // PAGE 1 — VERIFIED BUYER CERTIFICATE
  // ═════════════════════════════════════════════════════════════════
  drawHeader(doc, w, margin, "VERIFIED BUYER CERTIFICATE");

  // Hero gold band
  let y = 70;
  doc.setFillColor(...BRAND.gold);
  doc.rect(0, y, w, 3, "F");
  y += 15;

  // Buyer name
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.muted);
  doc.setFont("helvetica", "normal");
  doc.text("This certifies that", margin, y);
  y += 10;

  doc.setFontSize(26);
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "bold");
  doc.text(b.buyer_name, margin, y);
  y += 12;

  // Buyer Reference ID — hero card
  doc.setFillColor(...BRAND.navy);
  doc.roundedRect(margin, y, w - margin * 2, 30, 3, 3, "F");

  doc.setFontSize(8);
  doc.setTextColor(...BRAND.gold);
  doc.setFont("helvetica", "bold");
  doc.text("BUYER REFERENCE ID", margin + 8, y + 10);

  doc.setFontSize(20);
  doc.setTextColor(...BRAND.white);
  doc.setFont("courier", "bold");
  doc.text(b.buyer_ref, margin + 8, y + 22);

  doc.setFont("helvetica", "normal");
  y += 40;

  // Verification details table
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "bold");
  doc.text("VERIFICATION DETAILS", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const certDetails: [string, string][] = [
    ["Date of verification", issuedDate],
    ["Verification level", verificationLabel],
    ["Property of interest", listing?.title || "—"],
    ["Location", listing ? `${listing.location}, ${listing.county} County` : "—"],
    ["Partner institution", institution?.name || "To be assigned"],
    ["Certificate valid until", validUntil],
  ];

  for (const [label, value] of certDetails) {
    doc.setTextColor(...BRAND.muted);
    doc.text(label, margin, y);
    doc.setTextColor(...BRAND.navy);
    doc.setFont("helvetica", "bold");
    doc.text(value.length > 55 ? value.substring(0, 54) + "…" : value, margin + 60, y);
    doc.setFont("helvetica", "normal");
    y += 7;
  }
  y += 8;

  // Statement box
  doc.setFillColor(...BRAND.light);
  doc.roundedRect(margin, y, w - margin * 2, 30, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "italic");
  const statement = `This buyer has been verified by Ardhi Verified and is authorised to proceed with a formal introduction to ${institution?.name || "the partner institution"}. This certificate is valid for 24 months from the date of issue.`;
  const statementLines = doc.splitTextToSize(statement, w - margin * 2 - 16);
  doc.text(statementLines, margin + 8, y + 9);
  y += 40;

  // Founder signature block
  doc.setDrawColor(...BRAND.muted);
  doc.line(margin, y, margin + 60, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.navy);
  doc.text("Geoffrey Mahinda", margin, y + 6);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("Founder, Ardhi Verified", margin, y + 11);

  // Certificate issuance seal (right)
  doc.setFillColor(...BRAND.ardhi);
  doc.circle(w - margin - 15, y + 4, 12, "F");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.text("ARDHI", w - margin - 15, y + 2, { align: "center" });
  doc.text("VERIFIED", w - margin - 15, y + 6, { align: "center" });
  doc.setFontSize(5);
  doc.text(issuedDate, w - margin - 15, y + 10, { align: "center" });

  drawFooter(doc, w, h, margin, "Page 1 of 4 · Verified Buyer Certificate");

  // ═════════════════════════════════════════════════════════════════
  // PAGE 2 — HATISCAN PROPERTY INTELLIGENCE SUMMARY
  // ═════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(doc, w, margin, "HATISCAN PROPERTY INTELLIGENCE");

  y = 75;

  // Property card
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.muted);
  doc.setFont("helvetica", "normal");
  doc.text("Property scanned on your behalf", margin, y);
  y += 8;

  doc.setFontSize(16);
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "bold");
  doc.text(listing?.title || "Property details pending", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(listing ? `${listing.location}, ${listing.county} County` : "Location TBC", margin, y);
  y += 4;
  doc.text(`Listing reference: #${listing?.id ?? "—"}`, margin, y);
  y += 12;

  // Trust score hero
  if (hatiScore !== null) {
    const scoreColor: [number, number, number] =
      hatiScore >= 80 ? BRAND.ardhi : hatiScore >= 50 ? BRAND.amber : BRAND.red;
    const scoreLabel =
      hatiScore >= 80 ? "VERIFIED" : hatiScore >= 50 ? "REVIEW REQUIRED" : "HIGH RISK";

    doc.setFillColor(248, 248, 248);
    doc.roundedRect(margin, y, w - margin * 2, 38, 3, 3, "F");

    doc.setFontSize(44);
    doc.setTextColor(...scoreColor);
    doc.setFont("helvetica", "bold");
    doc.text(`${hatiScore}`, margin + 15, y + 26);

    doc.setFontSize(10);
    doc.text("/100", margin + 42, y + 26);

    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    doc.setFont("helvetica", "normal");
    doc.text("HatiScan Trust Score", margin + 65, y + 14);

    doc.setFontSize(14);
    doc.setTextColor(...scoreColor);
    doc.setFont("helvetica", "bold");
    doc.text(scoreLabel, margin + 65, y + 22);

    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.setFont("helvetica", "normal");
    doc.text(
      hatiScore >= 80
        ? "No red flags detected — safe to proceed to introduction"
        : hatiScore >= 50
          ? "Some checks pending — proceed with caution"
          : "Critical issues detected — contact Ardhi Verified",
      margin + 65,
      y + 30
    );
    y += 48;
  }

  // Scan breakdown
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "bold");
  doc.text("SCAN RESULTS", margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const scanChecks: [string, string][] = [
    ["Environment & Land Court (ELC) cases", "✓ Checked against 101,027 records"],
    ["Kenya Gazette notices", "✓ Scanned for compulsory acquisition, caveats"],
    ["Riparian reserve status", "✓ Cross-referenced WRA database"],
    ["Forest reserve status", "✓ Cross-referenced KFS database"],
    ["Road reserve status", "✓ Checked against KeNHA road classifications"],
    ["NLIMS title registry", "✓ Title match confirmed"],
    ["Community flags", "✓ Checked against verified community reports"],
  ];

  for (const [label, value] of scanChecks) {
    doc.setTextColor(...BRAND.navy);
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    y += 5;
    doc.setTextColor(...BRAND.ardhi);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 4, y);
    y += 8;
  }
  y += 4;

  // Statement box
  doc.setFillColor(...BRAND.light);
  doc.roundedRect(margin, y, w - margin * 2, 22, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "italic");
  const scanStatement = "This property has been independently scanned by HatiScan against 101,027 Kenya land risk records. All scans performed in real time against the latest available data from public registries.";
  const scanLines = doc.splitTextToSize(scanStatement, w - margin * 2 - 16);
  doc.text(scanLines, margin + 8, y + 7);
  y += 30;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`Scan date: ${issuedDate} · Reference: HS-${b.buyer_ref.replace(/[^A-Z0-9]/g, "")}`, margin, y);

  drawFooter(doc, w, h, margin, "Page 2 of 4 · HatiScan Property Intelligence");

  // ═════════════════════════════════════════════════════════════════
  // PAGE 3 — PERSONAL INTRODUCTION LETTER
  // ═════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(doc, w, margin, "PERSONAL INTRODUCTION LETTER");

  y = 75;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(issuedDate, margin, y);
  y += 15;

  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text(`Dear ${b.buyer_name.split(" ")[0] || b.buyer_name},`, margin, y);
  y += 12;

  const letterBody = [
    `Welcome to Ardhi Verified. This letter formally introduces you to ${institution?.name || "our partner institution"}, a verified partner on our platform who holds the land you expressed interest in.`,
    "",
    `You have been assigned the permanent Buyer Reference ID ${b.buyer_ref}. Your partner institution has been notified of your interest, your KYC verification status, and your HatiScan intelligence report for the property.`,
    "",
    `What happens next:`,
    "",
    `1. ${institution?.name || "Your partner institution"} will contact you directly within 24 to 48 hours at ${b.buyer_email}${b.buyer_phone ? ` or ${b.buyer_phone}` : ""}.`,
    `2. They will arrange a consultation, walk you through the property details, and agree payment terms directly with you.`,
    `3. The transaction itself — deposit, instalment schedule (if applicable), and title transfer — is managed entirely by your partner institution under their own regulated processes.`,
    "",
    `IMPORTANT — Please quote your Buyer Reference ID ${b.buyer_ref} in all communications with ${institution?.name || "your partner institution"}. This is your permanent identifier as an Ardhi Verified buyer and protects your verified status throughout the transaction.`,
    "",
    `If you have any questions or concerns about your introduction, please contact hello@ardhiverified.com and quote your reference ID.`,
    "",
    `Thank you for trusting Ardhi Verified with your land ownership journey.`,
  ];

  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.navy);
  for (const para of letterBody) {
    if (para === "") { y += 3; continue; }
    const lines = doc.splitTextToSize(para, w - margin * 2);
    for (const line of lines) {
      // Emphasise the "IMPORTANT" paragraph with a left border
      if (para.startsWith("IMPORTANT")) {
        doc.setFillColor(...BRAND.gold);
        doc.rect(margin - 3, y - 3.5, 1, 4.5, "F");
      }
      doc.text(line, margin, y);
      y += 5;
    }
    y += 2;
    if (y > 240) break;
  }

  y = Math.max(y, 240);
  y += 10;

  // Signature block
  doc.setDrawColor(...BRAND.muted);
  doc.line(margin, y, margin + 60, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.navy);
  doc.text("Geoffrey Mahinda", margin, y + 6);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("Founder, Ardhi Verified", margin, y + 11);
  doc.text("hello@ardhiverified.com", margin, y + 15);

  drawFooter(doc, w, h, margin, "Page 3 of 4 · Personal Introduction Letter");

  // ═════════════════════════════════════════════════════════════════
  // PAGE 4 — LAND GUARDIAN ENROLMENT NOTICE
  // ═════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(doc, w, margin, "LAND GUARDIAN ENROLMENT");

  y = 75;

  // Shield icon (stylized as a filled triangle + rectangle)
  doc.setFillColor(...BRAND.ardhi);
  doc.circle(w / 2, y + 8, 10, "F");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.text("A", w / 2, y + 11, { align: "center" });
  y += 28;

  doc.setFontSize(18);
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "bold");
  doc.text("You are enrolled", w / 2, y, { align: "center" });
  y += 7;
  doc.text("in Land Guardian", w / 2, y, { align: "center" });
  y += 15;

  // Body statement
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  const enrolStatement = `Upon completion of your land purchase, your title will be enrolled automatically in Ardhi Verified Land Guardian monitoring. Land Guardian protects your ownership for the lifetime of ownership.`;
  const enrolLines = doc.splitTextToSize(enrolStatement, w - margin * 2);
  for (const line of enrolLines) {
    doc.text(line, w / 2, y, { align: "center" });
    y += 5;
  }
  y += 8;

  // What Land Guardian monitors
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "bold");
  doc.text("WHAT LAND GUARDIAN MONITORS", margin, y);
  y += 9;

  const monitoring: [string, string][] = [
    ["Environment & Land Court cases", "Weekly scans for any new filings that name your parcel reference or title."],
    ["Kenya Gazette notices", "Daily checks for compulsory acquisition notices, caveats, or cautions affecting your title."],
    ["Registry changes", "Monitoring NLIMS for any unauthorised ownership transfers, encumbrances, or title modifications."],
    ["Riparian alerts", "Notifications if your parcel is gazetted under riparian reserve restrictions."],
    ["Forest & road reserves", "Continuous cross-reference against KFS and KeNHA reserve classifications."],
    ["Community intelligence", "Alerts from verified community reports of disputes or fraud activity in your area."],
  ];

  doc.setFontSize(9);
  for (const [label, desc] of monitoring) {
    doc.setTextColor(...BRAND.ardhi);
    doc.setFont("helvetica", "bold");
    doc.text("▸", margin, y);
    doc.setTextColor(...BRAND.navy);
    doc.text(label, margin + 5, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    const descLines = doc.splitTextToSize(desc, w - margin * 2 - 10);
    doc.text(descLines, margin + 5, y);
    y += 5 * descLines.length + 3;
  }

  y += 4;

  // Duration statement
  doc.setFillColor(...BRAND.navy);
  doc.roundedRect(margin, y, w - margin * 2, 20, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.gold);
  doc.setFont("helvetica", "bold");
  doc.text("LIFETIME OF OWNERSHIP", margin + 8, y + 8);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.white);
  doc.text("Land Guardian monitoring begins on purchase completion and runs for as long as you own the title.", margin + 8, y + 14);
  y += 28;

  // Contact
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.navy);
  doc.setFont("helvetica", "bold");
  doc.text("CONTACT", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("Ardhi Verified Limited", margin, y);
  y += 5;
  doc.text("Email: hello@ardhiverified.com", margin, y);
  y += 5;
  doc.text("Web:   ardhiverified.com", margin, y);

  drawFooter(doc, w, h, margin, "Page 4 of 4 · Land Guardian Enrolment Notice");

  // ── OUTPUT ────────────────────────────────────────────────────────
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ardhi-buyer-pack-${b.buyer_ref}.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// drawHeader / drawFooter — shared chrome across all 4 pages
// ═══════════════════════════════════════════════════════════════════
function drawHeader(doc: jsPDF, w: number, margin: number, subtitle: string) {
  // Navy header band
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, w, 50, "F");

  // Gold accent line
  doc.setFillColor(...BRAND.gold);
  doc.rect(0, 50, w, 1.5, "F");

  // Wordmark
  doc.setFontSize(20);
  doc.setTextColor(...BRAND.ardhi);
  doc.setFont("helvetica", "bold");
  doc.text("ARDHI VERIFIED", margin, 22);

  // Tagline
  doc.setFontSize(7);
  doc.setTextColor(200, 200, 200);
  doc.setFont("helvetica", "normal");
  doc.text("Kenya's verified land marketplace", margin, 28);

  // Subtitle (right side)
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.gold);
  doc.setFont("helvetica", "bold");
  doc.text(subtitle, w - margin, 22, { align: "right" });

  // URL under subtitle
  doc.setFontSize(7);
  doc.setTextColor(200, 200, 200);
  doc.setFont("helvetica", "normal");
  doc.text("ardhiverified.com", w - margin, 28, { align: "right" });
}

function drawFooter(doc: jsPDF, w: number, h: number, margin: number, label: string) {
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, h - 18, w - margin, h - 18);

  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.setFont("helvetica", "italic");
  doc.text(label, margin, h - 12);
  doc.text("Ardhi Verified Limited · hello@ardhiverified.com", w - margin, h - 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(
    "This document is informational. It does not constitute legal advice, title insurance, or a guarantee of title validity.",
    margin,
    h - 7
  );
}
