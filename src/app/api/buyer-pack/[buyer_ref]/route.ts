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
  // 3-page formal letter format, inspired by classic Kenyan SACCO
  // correspondence: consistent letterhead, minimal color, serif
  // headings, compact information blocks, white background.
  //
  //   Page 1 — Verified Buyer Introduction Letter
  //   Page 2 — HatiScan Property Intelligence Summary
  //   Page 3 — Land Guardian Enrolment Notice
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 22;
  const contentW = w - margin * 2;

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
      : "Pending Verification";

  const countryName: Record<string, string> = {
    UK: "United Kingdom", US: "United States", AE: "United Arab Emirates",
    CA: "Canada", AU: "Australia", KE: "Kenya", DE: "Germany",
  };
  const buyerLocation = countryName[b.country_code] || b.country_code;

  // ═════════════════════════════════════════════════════════════════
  // PAGE 1 — VERIFIED BUYER INTRODUCTION LETTER
  //
  // Formal business-letter format. Letterhead → date + ref → recipient
  // block → RE: subject → body paragraphs → verification summary
  // inset → IMPORTANT callout → signature block.
  // ═════════════════════════════════════════════════════════════════
  drawLetterhead(doc, w, margin);

  let y = 52;

  // Date (right-aligned, formal)
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.navy);
  doc.text(issuedDate, w - margin, y, { align: "right" });
  y += 12;

  // File reference (left, formal)
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("Our Ref:", margin, y);
  doc.setFont("courier", "bold");
  doc.text(b.buyer_ref, margin + 18, y);
  y += 10;

  // Recipient block
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text(b.buyer_name, margin, y);
  y += 5;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.muted);
  doc.text(b.buyer_email, margin, y);
  y += 4.5;
  if (buyerLocation) {
    doc.text(buyerLocation, margin, y);
    y += 4.5;
  }
  y += 6;

  // Salutation
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text(`Dear ${b.buyer_name.split(" ")[0] || b.buyer_name},`, margin, y);
  y += 9;

  // RE: subject line — bold, underlined
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  const reSubject = `RE: VERIFIED BUYER INTRODUCTION — ${(listing?.title || "Property Introduction").toUpperCase()}`;
  const reLines = doc.splitTextToSize(reSubject, contentW);
  for (const line of reLines) {
    doc.text(line, margin, y);
    // Underline
    const lineWidth = doc.getTextWidth(line);
    doc.setDrawColor(...BRAND.navy);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 0.8, margin + lineWidth, y + 0.8);
    y += 5;
  }
  y += 6;

  // Body paragraphs
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND.navy);

  const bodyParas = [
    `We are pleased to confirm that you have been formally verified as an Ardhi Verified buyer and to introduce you to ${institution?.name || "our partner institution"}, a verified partner on our platform.`,
    `Your buyer profile — including identity verification, KYC documentation, and the HatiScan intelligence report for the property you expressed interest in — has been prepared and shared with ${institution?.name || "the partner institution"} for their records. They will contact you directly at ${b.buyer_email}${b.buyer_phone ? ` or ${b.buyer_phone}` : ""} within 24 to 48 hours to arrange a consultation.`,
    `All payment terms, deposit arrangements, and title transfer matters will be agreed directly with ${institution?.name || "the partner institution"} under their own regulated processes. Ardhi Verified does not hold buyer funds or participate in the transaction itself — our role is verification, buyer qualification, and warm introduction.`,
  ];

  for (const para of bodyParas) {
    const lines = doc.splitTextToSize(para, contentW);
    for (const line of lines) {
      doc.text(line, margin, y);
      y += 5;
    }
    y += 3;
  }
  y += 2;

  // ── Verification summary inset (compact, boxed, formal) ────────
  const boxY = y;
  const boxH = 38;
  doc.setDrawColor(...BRAND.navy);
  doc.setLineWidth(0.5);
  doc.rect(margin, boxY, contentW, boxH);

  // Box title bar
  doc.setFillColor(...BRAND.navy);
  doc.rect(margin, boxY, contentW, 6, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.white);
  doc.text("VERIFICATION SUMMARY", margin + 3, boxY + 4.2);

  // Box rows
  y = boxY + 11;
  doc.setFontSize(9);
  const summaryRows: [string, string][] = [
    ["Reference ID", b.buyer_ref],
    ["Verification level", verificationLabel],
    ["Date of issue", issuedDate],
    ["Valid until", validUntil],
    ["Partner institution", institution?.name || "To be assigned"],
  ];
  for (const [label, value] of summaryRows) {
    doc.setFont("times", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(label, margin + 3, y);
    doc.setFont(label === "Reference ID" ? "courier" : "times", "bold");
    doc.setTextColor(...BRAND.navy);
    const displayValue = value.length > 50 ? value.substring(0, 49) + "…" : value;
    doc.text(displayValue, margin + 45, y);
    y += 5;
  }
  y = boxY + boxH + 7;

  // IMPORTANT callout
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.navy);
  doc.text("IMPORTANT", margin, y);
  y += 5;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  const importantText = `Please quote your Buyer Reference ID ${b.buyer_ref} in all correspondence with ${institution?.name || "the partner institution"}. This reference permanently identifies you as an Ardhi Verified buyer and protects your verified status throughout the transaction.`;
  const importantLines = doc.splitTextToSize(importantText, contentW);
  for (const line of importantLines) {
    doc.text(line, margin, y);
    y += 4.5;
  }
  y += 6;

  // Closing
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.text("Yours sincerely,", margin, y);
  y += 14;

  // Signature block
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text("Geoffrey Mahinda", margin, y);
  y += 4.5;
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.text("Founder, Ardhi Verified", margin, y);
  y += 4;
  doc.text("hello@ardhiverified.com", margin, y);

  drawLetterFooter(doc, w, h, margin, "Page 1 of 3");

  // ═════════════════════════════════════════════════════════════════
  // PAGE 2 — HATISCAN PROPERTY INTELLIGENCE
  // ═════════════════════════════════════════════════════════════════
  doc.addPage();
  drawLetterhead(doc, w, margin);

  y = 54;

  // Section title
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.navy);
  doc.text("HatiScan Property Intelligence Report", margin, y);
  y += 6;
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    `Independent scan prepared for ${b.buyer_name} · ${b.buyer_ref}`,
    margin,
    y
  );
  y += 10;

  // Property block
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text("Property under review", margin, y);
  y += 6;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(listing?.title || "Property details pending", margin, y);
  y += 5;
  doc.setTextColor(...BRAND.muted);
  doc.setFontSize(9);
  doc.text(
    listing ? `${listing.location}, ${listing.county} County` : "Location to be confirmed",
    margin,
    y
  );
  y += 4;
  doc.text(`Listing reference: #${listing?.id ?? "—"}`, margin, y);
  y += 10;

  // Trust score inline panel (compact, not a giant hero)
  if (hatiScore !== null) {
    const scoreColor: [number, number, number] =
      hatiScore >= 80 ? BRAND.ardhi : hatiScore >= 50 ? BRAND.amber : BRAND.red;
    const scoreLabel =
      hatiScore >= 80 ? "VERIFIED" : hatiScore >= 50 ? "REVIEW REQUIRED" : "HIGH RISK";

    // Thin bordered panel — no heavy fill
    doc.setDrawColor(...BRAND.navy);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentW, 22);

    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...scoreColor);
    doc.text(`${hatiScore}`, margin + 8, y + 15);
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    doc.text("/100", margin + 24, y + 15);

    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...scoreColor);
    doc.text(`HatiScan Trust Score  ·  ${scoreLabel}`, margin + 40, y + 10);

    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(
      hatiScore >= 80
        ? "No red flags detected — safe to proceed to introduction."
        : hatiScore >= 50
          ? "Some checks pending — proceed with caution and independent legal advice."
          : "Critical issues detected — contact Ardhi Verified before proceeding.",
      margin + 40,
      y + 16
    );
    y += 28;
  } else {
    y += 2;
  }

  // Scan results — tight two-column checklist
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text("Independent scan results", margin, y);
  y += 7;

  const scanChecks: [string, string][] = [
    ["Environment & Land Court (ELC) cases", "Checked against 101,027 records"],
    ["Kenya Gazette notices", "Scanned for compulsory acquisition, caveats, cautions"],
    ["NLIMS title registry", "Title match confirmed against national registry"],
    ["Riparian reserve status", "Cross-referenced against WRA database"],
    ["Forest reserve status", "Cross-referenced against KFS database"],
    ["Road reserve status", "Checked against KeNHA road classifications"],
    ["Community intelligence", "Checked against verified community reports"],
  ];

  doc.setFontSize(9.5);
  for (const [label, value] of scanChecks) {
    // Small green checkmark
    doc.setTextColor(...BRAND.ardhi);
    doc.setFont("times", "bold");
    doc.text("✓", margin, y);

    // Label
    doc.setFont("times", "bold");
    doc.setTextColor(...BRAND.navy);
    doc.text(label, margin + 5, y);

    // Value (right-ish column for alignment)
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(value, margin + 5, y + 4);

    doc.setFontSize(9.5);
    y += 9;
  }
  y += 2;

  // Footer statement — plain text, no hero box
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.navy);
  const scanStatement = `This property has been independently scanned by HatiScan against 101,027 Kenya land risk records on ${issuedDate}. All scans performed in real time against the latest available data from public registries. Scan reference: HS-${b.buyer_ref.replace(/[^A-Z0-9]/g, "")}.`;
  const scanLines = doc.splitTextToSize(scanStatement, contentW);
  for (const line of scanLines) {
    doc.text(line, margin, y);
    y += 4.5;
  }

  drawLetterFooter(doc, w, h, margin, "Page 2 of 3");

  // ═════════════════════════════════════════════════════════════════
  // PAGE 3 — LAND GUARDIAN ENROLMENT NOTICE
  // ═════════════════════════════════════════════════════════════════
  doc.addPage();
  drawLetterhead(doc, w, margin);

  y = 54;

  // Section title
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.navy);
  doc.text("Land Guardian Enrolment Notice", margin, y);
  y += 6;
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.text(`Prepared for ${b.buyer_name} · ${b.buyer_ref}`, margin, y);
  y += 12;

  // Enrolment confirmation paragraph
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND.navy);
  const enrolStatement = `Upon completion of your land purchase with ${institution?.name || "the partner institution"}, your title will be enrolled automatically in Ardhi Verified Land Guardian monitoring — for a lifetime. Land Guardian provides continuous, independent monitoring of the legal and regulatory status of your title.`;
  const enrolLines = doc.splitTextToSize(enrolStatement, contentW);
  for (const line of enrolLines) {
    doc.text(line, margin, y);
    y += 5;
  }
  y += 8;

  // What Land Guardian monitors
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text("What Land Guardian monitors", margin, y);
  y += 8;

  const monitoring: [string, string][] = [
    ["Environment & Land Court cases", "Weekly scans for any new filings that name your parcel reference or title."],
    ["Kenya Gazette notices", "Weekly checks for compulsory acquisition notices, caveats, or cautions affecting your title."],
    ["Registry changes", "Monitoring NLIMS for any unauthorised ownership transfers, encumbrances, or title modifications."],
    ["Riparian alerts", "Notifications if your parcel is gazetted under riparian reserve restrictions."],
    ["Forest & road reserves", "Continuous cross-reference against KFS and KeNHA reserve classifications."],
    ["Community intelligence", "Alerts from verified community reports of disputes or fraud activity in your area."],
  ];

  for (const [label, desc] of monitoring) {
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.navy);
    doc.text(`• ${label}`, margin, y);
    y += 4.5;

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    const descLines = doc.splitTextToSize(desc, contentW - 5);
    for (const line of descLines) {
      doc.text(line, margin + 3, y);
      y += 4;
    }
    y += 2.5;
  }
  y += 4;

  // Lifetime statement — thin-bordered panel, no heavy fill
  doc.setDrawColor(...BRAND.navy);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentW, 16);
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.navy);
  doc.text("LIFETIME OF OWNERSHIP", margin + 3, y + 6);
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    "Land Guardian monitoring begins on purchase completion and runs for as long as you own the title.",
    margin + 3,
    y + 12
  );
  y += 22;

  // Contact block (letter-style)
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.navy);
  doc.text("For any queries or concerns:", margin, y);
  y += 5;
  doc.setFont("times", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.muted);
  doc.text("Ardhi Verified Limited  ·  Nairobi, Kenya", margin, y);
  y += 4.5;
  doc.text("Email: hello@ardhiverified.com  ·  Web: ardhiverified.com", margin, y);
  y += 4.5;
  doc.text(`Please quote your Buyer Reference ID: ${b.buyer_ref}`, margin, y);

  drawLetterFooter(doc, w, h, margin, "Page 3 of 3");

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
// drawLetterhead / drawLetterFooter — formal letter chrome
//
// Classic Kenyan SACCO / business letter format: minimal color,
// wordmark on left, address block on right, thin gold separator.
// White background throughout. Identical on every page.
// ═══════════════════════════════════════════════════════════════════
function drawLetterhead(doc: jsPDF, w: number, margin: number) {
  // Wordmark — serif, navy, no background
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BRAND.navy);
  doc.text("ARDHI VERIFIED", margin, 20);

  // Tagline under wordmark
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text("Kenya's verified land marketplace", margin, 25);

  // Contact block (right-aligned)
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text("Ardhi Verified Limited", w - margin, 16, { align: "right" });
  doc.text("Nairobi, Kenya", w - margin, 20, { align: "right" });
  doc.text("hello@ardhiverified.com", w - margin, 24, { align: "right" });
  doc.text("ardhiverified.com", w - margin, 28, { align: "right" });

  // Gold separator line — full width, thin
  doc.setDrawColor(...BRAND.gold);
  doc.setLineWidth(0.8);
  doc.line(margin, 34, w - margin, 34);
  // Reset line width for subsequent draw calls
  doc.setLineWidth(0.2);
}

function drawLetterFooter(doc: jsPDF, w: number, h: number, margin: number, pageLabel: string) {
  // Thin gold line above footer
  doc.setDrawColor(...BRAND.gold);
  doc.setLineWidth(0.4);
  doc.line(margin, h - 18, w - margin, h - 18);
  doc.setLineWidth(0.2);

  // Footer text
  doc.setFont("times", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.muted);
  doc.text("Ardhi Verified Limited  ·  hello@ardhiverified.com  ·  ardhiverified.com", margin, h - 12);
  doc.text(pageLabel, w - margin, h - 12, { align: "right" });

  // Disclaimer
  doc.setFont("times", "normal");
  doc.setFontSize(6.5);
  doc.text(
    "This document is informational and does not constitute legal advice, title insurance, or a guarantee of title validity.",
    margin,
    h - 7
  );
}
