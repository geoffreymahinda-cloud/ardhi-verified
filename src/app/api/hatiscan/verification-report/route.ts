/**
 * HatiScan Verification Report PDF
 * ==================================
 * POST /api/hatiscan/verification-report
 *
 * Generates a branded verification report PDF, stores it in
 * Supabase Storage (hatiscan-reports bucket), and emails it
 * to the institution liaison officer.
 *
 * Body: { report_number: string }
 *
 * Also callable via GET with ?report=HS-XXXX for manual download.
 *
 * Auth: service role key in Authorization header, or internal webhook secret.
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import { sendVerificationReport } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Brand constants (matching buyer-pack) ──────────────────────────
const B = {
  ardhi:     [0, 165, 80]    as const,
  darkGreen: [11, 87, 48]    as const,
  gold:      [196, 164, 74]  as const,
  goldDark:  [159, 124, 40]  as const,
  muted:     [120, 120, 120] as const,
  light:     [245, 249, 245] as const,
  white:     [255, 255, 255] as const,
  navy:      [26, 26, 46]    as const,
  red:       [220, 50, 50]   as const,
  amber:     [245, 166, 35]  as const,
};

// ── 7 checkpoints ──────────────────────────────────────────────────
interface Checkpoint {
  name: string;
  status: "clear" | "flagged" | "pending";
  detail: string;
}

function buildCheckpoints(report: Record<string, unknown>): Checkpoint[] {
  const breakdown = (report.breakdown || {}) as Record<string, string>;
  const elc = (report.elc_cases_found as number) || 0;
  const gazette = (report.gazette_hits as number) || 0;
  const community = (report.community_flags as number) || 0;
  const forgeryFlags = (report.forgery_flags as unknown[]) || [];
  const titleMatch = !breakdown.hatiscanDetail?.includes("mismatch");
  const isFull = report.scan_tier === "full";

  return [
    {
      name: "ELC Court Cases",
      status: elc > 0 ? "flagged" : "clear",
      detail: elc === 0
        ? "No court cases found"
        : `${elc} case${elc > 1 ? "s" : ""} found`,
    },
    {
      name: "Kenya Gazette Notices",
      status: gazette > 0 ? "flagged" : "clear",
      detail: gazette === 0
        ? "No gazette notices found"
        : `${gazette} notice${gazette > 1 ? "s" : ""} found`,
    },
    {
      name: "Community Intelligence",
      status: community > 0 ? "flagged" : "clear",
      detail: community === 0
        ? "No community flags reported"
        : `${community} flag${community > 1 ? "s" : ""} reported`,
    },
    {
      name: "Title Deed Verification",
      status: !isFull ? "pending" : titleMatch ? "clear" : "flagged",
      detail: !isFull
        ? "Pending full scan"
        : titleMatch
          ? "Title number confirmed"
          : "Title mismatch detected",
    },
    {
      name: "Document Authenticity",
      status: !isFull ? "pending" : forgeryFlags.length > 0 ? "flagged" : "clear",
      detail: !isFull
        ? "Pending full scan"
        : forgeryFlags.length === 0
          ? "No forgery indicators"
          : `${forgeryFlags.length} anomal${forgeryFlags.length > 1 ? "ies" : "y"} detected`,
    },
    {
      name: "Road Reserve Check",
      status: breakdown.spatialDetail?.includes("road") ? "flagged" : "clear",
      detail: breakdown.spatialDetail?.includes("road")
        ? "Road reserve proximity detected"
        : "No road reserve encroachment",
    },
    {
      name: "Riparian Zone Check",
      status: breakdown.spatialDetail?.includes("riparian") ? "flagged" : "clear",
      detail: breakdown.spatialDetail?.includes("riparian")
        ? "Within riparian buffer zone"
        : "Clear of riparian zones",
    },
  ];
}

// ── Spatial summary ────────────────────────────────────────────────
interface SpatialCheck {
  name: string;
  status: "clear" | "flagged";
  detail: string;
}

function buildSpatialChecks(report: Record<string, unknown>): SpatialCheck[] {
  const breakdown = (report.breakdown || {}) as Record<string, string>;
  const spatial = breakdown.spatialDetail || "";

  return [
    {
      name: "Boundary Confirmation",
      status: breakdown.rimDetail?.includes("confirmed") ? "clear" : "flagged",
      detail: breakdown.rimDetail?.includes("confirmed")
        ? "Boundary confirmed on Registry Index Map"
        : breakdown.rimDetail || "RIM check pending",
    },
    {
      name: "Road Reserve",
      status: spatial.includes("road") ? "flagged" : "clear",
      detail: spatial.includes("road")
        ? "Parcel intersects classified road reserve"
        : "Clear — no road reserve encroachment",
    },
    {
      name: "Riparian Zone",
      status: spatial.includes("riparian") ? "flagged" : "clear",
      detail: spatial.includes("riparian")
        ? "Parcel within Water Act 2016 riparian buffer"
        : "Clear — outside riparian buffer zones",
    },
    {
      name: "Protected Area",
      status: spatial.includes("protected") ? "flagged" : "clear",
      detail: spatial.includes("protected")
        ? "Parcel overlaps protected area boundary"
        : "Clear — no protected area overlap",
    },
    {
      name: "Flood Zone",
      status: spatial.includes("flood") ? "flagged" : "clear",
      detail: spatial.includes("flood")
        ? "Parcel within mapped flood zone"
        : "Clear — outside flood risk zones",
    },
    {
      name: "Forest Reserve",
      status: spatial.includes("forest") ? "flagged" : "clear",
      detail: spatial.includes("forest")
        ? "Parcel within gazetted forest reserve"
        : "Clear — no forest reserve overlap",
    },
  ];
}

// ── PDF Generation ─────────────────────────────────────────────────

function generateReportPDF(report: Record<string, unknown>): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = w - margin * 2;

  const trustScore = (report.trust_score as number) ?? 0;
  const verdict = (report.verdict as string) || "unverified";
  const reportNumber = (report.report_number as string) || "HS-000000";
  const parcelRef = (report.parcel_reference as string) || "N/A";
  const owner = (report.extracted_owner as string) || "N/A";
  const county = (report.extracted_county as string) || "N/A";
  const area = (report.extracted_area as string) || "N/A";
  const checkedAt = report.checked_at
    ? new Date(report.checked_at as string).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      });

  const checkpoints = buildCheckpoints(report);
  const spatialChecks = buildSpatialChecks(report);

  const scoreColor: readonly [number, number, number] =
    trustScore >= 75 ? B.ardhi : trustScore >= 50 ? B.amber : B.red;

  // ════════════════════════════════════════════════════════════════
  // PAGE 1 — HEADER + TRUST SCORE + CHECKPOINTS
  // ════════════════════════════════════════════════════════════════

  // ── Header bar ──
  doc.setFillColor(...B.navy);
  doc.rect(0, 0, w, 48, "F");

  let y = 18;
  doc.setTextColor(...B.ardhi);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("ARDHI VERIFIED", margin, y);

  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(...B.gold);
  doc.text("HATISCAN VERIFICATION REPORT", margin, y);

  y += 7;
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(`Report: ${reportNumber}`, margin, y);
  doc.text(`Date: ${checkedAt}`, w - margin, y, { align: "right" });

  y += 6;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7.5);
  doc.text(`Parcel: ${parcelRef}`, margin, y);

  // ── Trust Score — large display ──
  y = 58;

  // Score background panel
  doc.setFillColor(...B.light);
  doc.roundedRect(margin, y, contentW, 40, 3, 3, "F");
  doc.setDrawColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, contentW, 40, 3, 3, "S");
  doc.setLineWidth(0.2);

  // Large score number
  doc.setFontSize(48);
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(`${trustScore}`, margin + 18, y + 28);

  // /100
  doc.setFontSize(16);
  doc.setTextColor(...B.muted);
  doc.text("/100", margin + 42, y + 28);

  // Verdict label
  const verdictDisplay = trustScore >= 75 ? "CLEAN" : trustScore >= 50 ? "CAUTION" : "HIGH RISK";
  doc.setFontSize(20);
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(verdictDisplay, margin + 68, y + 18);

  // Verdict description
  doc.setFontSize(9);
  doc.setTextColor(...B.muted);
  doc.setFont("helvetica", "normal");
  const verdictDesc = trustScore >= 75
    ? "No significant risks detected — safe to proceed."
    : trustScore >= 50
      ? "Some risks identified — proceed with caution and legal advice."
      : "Critical risks detected — independent investigation recommended.";
  doc.text(verdictDesc, margin + 68, y + 26);

  // Score colour key
  doc.setFontSize(7);
  doc.text("75+ Green = Clear  |  50-74 Amber = Caution  |  Below 50 Red = High Risk", margin + 68, y + 34);

  // ── Parcel Details ──
  y = 106;
  doc.setFontSize(11);
  doc.setTextColor(...B.navy);
  doc.setFont("helvetica", "bold");
  doc.text("PARCEL DETAILS", margin, y);

  y += 2;
  doc.setDrawColor(...B.ardhi);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 40, y);
  doc.setLineWidth(0.2);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const details: [string, string][] = [
    ["Title / Plot Reference", parcelRef],
    ["Registered Owner", owner],
    ["County", county],
    ["Plot Area", area],
    ["Report Number", reportNumber],
    ["Verification Date", checkedAt],
  ];

  for (const [label, value] of details) {
    doc.setTextColor(...B.muted);
    doc.text(label, margin, y);
    doc.setTextColor(...B.navy);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), margin + 55, y);
    doc.setFont("helvetica", "normal");
    y += 6;
  }

  // ── 7 Checkpoints ──
  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(...B.navy);
  doc.setFont("helvetica", "bold");
  doc.text("VERIFICATION CHECKPOINTS", margin, y);

  y += 2;
  doc.setDrawColor(...B.ardhi);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 60, y);
  doc.setLineWidth(0.2);

  y += 7;
  doc.setFontSize(9);

  for (let i = 0; i < checkpoints.length; i++) {
    const cp = checkpoints[i];

    // Status indicator
    const statusColor: readonly [number, number, number] =
      cp.status === "clear" ? B.ardhi : cp.status === "flagged" ? B.red : B.amber;

    // Row background (alternating)
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 4, contentW, 11, "F");
    }

    // Status badge
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(margin + 1, y - 2.5, 16, 5.5, 1.5, 1.5, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(...B.white);
    doc.setFont("helvetica", "bold");
    doc.text(cp.status.toUpperCase(), margin + 9, y + 1.2, { align: "center" });

    // Checkpoint name
    doc.setFontSize(9);
    doc.setTextColor(...B.navy);
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}. ${cp.name}`, margin + 20, y);

    // Detail
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...B.muted);
    doc.text(cp.detail, margin + 20, y + 5);

    y += 11;
  }

  // ── Footer ──
  drawFooter(doc, w, h, margin, reportNumber, "Page 1 of 2");

  // ════════════════════════════════════════════════════════════════
  // PAGE 2 — SPATIAL CHECKS + SIGN-OFF
  // ════════════════════════════════════════════════════════════════
  doc.addPage();

  // Mini header
  doc.setFillColor(...B.navy);
  doc.rect(0, 0, w, 22, "F");
  doc.setTextColor(...B.ardhi);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ARDHI VERIFIED", margin, 14);
  doc.setFontSize(8);
  doc.setTextColor(...B.gold);
  doc.text("HATISCAN VERIFICATION REPORT", margin + 60, 14);
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(7.5);
  doc.text(reportNumber, w - margin, 14, { align: "right" });

  // ── Spatial Risk Analysis ──
  y = 32;
  doc.setFontSize(11);
  doc.setTextColor(...B.navy);
  doc.setFont("helvetica", "bold");
  doc.text("SPATIAL RISK ANALYSIS", margin, y);

  y += 2;
  doc.setDrawColor(...B.ardhi);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 55, y);
  doc.setLineWidth(0.2);

  y += 4;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...B.muted);
  doc.text(
    "PostGIS spatial intersection analysis against Kenya national datasets — road reserves, riparian zones, protected areas, flood zones.",
    margin, y
  );

  y += 8;
  doc.setFontSize(9);

  for (let i = 0; i < spatialChecks.length; i++) {
    const sc = spatialChecks[i];
    const statusColor: readonly [number, number, number] =
      sc.status === "clear" ? B.ardhi : B.red;

    // Row background
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 4, contentW, 12, "F");
    }

    // Status icon
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text(sc.status === "clear" ? "✓" : "✗", margin + 2, y);

    // Name
    doc.setTextColor(...B.navy);
    doc.text(sc.name, margin + 10, y);

    // Status label
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(w - margin - 20, y - 3, 18, 5.5, 1.5, 1.5, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(...B.white);
    doc.text(sc.status.toUpperCase(), w - margin - 11, y + 0.8, { align: "center" });

    // Detail line
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...B.muted);
    doc.text(sc.detail, margin + 10, y + 5.5);

    doc.setFontSize(9);
    y += 12;
  }

  // ── Intelligence Summary ──
  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(...B.navy);
  doc.setFont("helvetica", "bold");
  doc.text("INTELLIGENCE SUMMARY", margin, y);

  y += 2;
  doc.setDrawColor(...B.ardhi);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 50, y);
  doc.setLineWidth(0.2);

  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const intel: [string, string, boolean][] = [
    ["Court Cases Found", String((report.elc_cases_found as number) || 0), ((report.elc_cases_found as number) || 0) > 0],
    ["Gazette Notices", String((report.gazette_hits as number) || 0), ((report.gazette_hits as number) || 0) > 0],
    ["Community Flags", String((report.community_flags as number) || 0), ((report.community_flags as number) || 0) > 0],
    ["Scan Tier", ((report.scan_tier as string) || "basic").toUpperCase(), false],
    ["Verdict", verdict.toUpperCase().replace("_", " "), verdict === "high_risk"],
  ];

  for (const [label, value, isRisk] of intel) {
    doc.setTextColor(...B.muted);
    doc.text(label, margin, y);
    doc.setTextColor(isRisk ? B.red[0] : B.navy[0], isRisk ? B.red[1] : B.navy[1], isRisk ? B.red[2] : B.navy[2]);
    doc.setFont("helvetica", "bold");
    doc.text(value, margin + 50, y);
    doc.setFont("helvetica", "normal");
    y += 6;
  }

  // ── Sign-off box ──
  y += 8;
  doc.setFillColor(...B.ardhi);
  doc.rect(margin, y, contentW, 30, "F");
  doc.setDrawColor(...B.gold);
  doc.setLineWidth(0.6);
  doc.rect(margin + 1.5, y + 1.5, contentW - 3, 27);
  doc.setLineWidth(0.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...B.gold);
  doc.text("VERIFICATION CONDUCTED BY", margin + 6, y + 8);

  doc.setFontSize(14);
  doc.setTextColor(...B.white);
  doc.text("Ardhi Verified Trust Guardian", margin + 6, y + 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 240, 220);
  doc.text(`Report ${reportNumber} · Generated ${checkedAt}`, margin + 6, y + 24);

  // ── Disclaimer ──
  y += 40;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...B.muted);
  const disclaimer = [
    "This verification report is generated by Ardhi Verified and is provided for informational purposes only.",
    "It does not constitute legal advice, a guarantee of title validity, or title insurance.",
    "Independent legal advice from a licensed LSK advocate is recommended before any land transaction.",
  ];
  for (const line of disclaimer) {
    doc.text(line, margin, y);
    y += 4;
  }

  drawFooter(doc, w, h, margin, reportNumber, "Page 2 of 2");

  return Buffer.from(doc.output("arraybuffer"));
}

function drawFooter(
  doc: jsPDF, w: number, h: number, margin: number,
  reportNumber: string, pageLabel: string,
) {
  doc.setDrawColor(...B.ardhi);
  doc.setLineWidth(0.8);
  doc.line(margin, h - 16, w - margin, h - 16);
  doc.setDrawColor(...B.gold);
  doc.setLineWidth(0.3);
  doc.line(margin, h - 14.5, w - margin, h - 14.5);
  doc.setLineWidth(0.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...B.muted);
  doc.text(
    "ardhiverified.com  ·  verify@ardhiverified.com  ·  Ardhi Verified Limited",
    margin, h - 10
  );
  doc.setTextColor(...B.goldDark);
  doc.text(pageLabel, w - margin, h - 10, { align: "right" });
  doc.setTextColor(...B.muted);
  doc.setFontSize(6.5);
  doc.text(`Certificate ID: ${reportNumber}`, margin, h - 6);
}

// ── Route Handlers ─────────────────────────────────────────────────

async function generateAndStore(reportNumber: string) {
  // Fetch report
  const { data: report, error } = await supabase
    .from("hatiscan_reports")
    .select("*")
    .eq("report_number", reportNumber)
    .single();

  if (error || !report) {
    throw new Error(`Report not found: ${reportNumber}`);
  }

  // Generate PDF
  const pdfBuffer = generateReportPDF(report);

  // Store in Supabase Storage
  const storagePath = `reports/${reportNumber}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("hatiscan-reports")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error(`[verification-report] storage upload failed: ${uploadError.message}`);
  }

  // Generate signed URL (valid 7 days)
  const { data: signedUrl } = await supabase.storage
    .from("hatiscan-reports")
    .createSignedUrl(storagePath, 7 * 24 * 60 * 60);

  const pdfUrl = signedUrl?.signedUrl || null;

  // Determine email recipient — institution liaison or admin
  let recipientEmail = process.env.ADMIN_EMAIL || "hello@ardhiverified.com";
  let recipientName = "Ardhi Verified Team";
  let institutionName: string | undefined;

  // Check if there's a buyer linked to this parcel with an institution
  if (report.parcel_reference) {
    const { data: buyer } = await supabase
      .from("buyers")
      .select("introduced_to_partner_id, buyer_name")
      .ilike("listing_id", `%`)
      .limit(1)
      .maybeSingle();

    if (buyer?.introduced_to_partner_id) {
      const { data: partner } = await supabase
        .from("saccos")
        .select("name, contact_email")
        .eq("id", buyer.introduced_to_partner_id)
        .maybeSingle();

      if (partner?.contact_email) {
        recipientEmail = partner.contact_email;
        recipientName = partner.name;
        institutionName = partner.name;
      }
    }
  }

  // If submitter email exists, also consider it
  if (report.submitter_email) {
    recipientEmail = report.submitter_email;
    recipientName = report.extracted_owner || "Verification Client";
  }

  // Send email
  const emailResult = await sendVerificationReport({
    recipientEmail,
    recipientName,
    reportNumber: report.report_number,
    parcelReference: report.parcel_reference || "N/A",
    trustScore: report.trust_score ?? 0,
    verdict: report.verdict || "unverified",
    pdfBuffer,
    institutionName,
  });

  // Update report record
  await supabase
    .from("hatiscan_reports")
    .update({
      report_pdf_url: pdfUrl,
      report_pdf_generated_at: new Date().toISOString(),
      report_pdf_emailed_to: emailResult.sent ? recipientEmail : null,
    })
    .eq("report_number", reportNumber);

  return {
    reportNumber,
    pdfUrl,
    emailSent: emailResult.sent,
    emailedTo: emailResult.sent ? recipientEmail : null,
    emailError: emailResult.error || null,
  };
}

// POST — triggered by webhook or internal call
export async function POST(request: NextRequest) {
  // Auth: check for service role key or webhook secret
  const authHeader = request.headers.get("authorization") || "";
  const webhookSecret = request.headers.get("x-webhook-secret") || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const isAuthorized =
    authHeader === `Bearer ${serviceKey}` ||
    webhookSecret === serviceKey ||
    authHeader.includes(serviceKey);

  if (!isAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Support Supabase webhook format (record in body) or direct call
    const reportNumber =
      body.report_number ||
      body.record?.report_number ||
      null;

    if (!reportNumber) {
      return Response.json({ error: "Missing report_number" }, { status: 400 });
    }

    const result = await generateAndStore(reportNumber);

    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[verification-report] POST error: ${msg}`);
    return Response.json({ error: msg }, { status: 500 });
  }
}

// GET — manual download
export async function GET(request: NextRequest) {
  const reportId = request.nextUrl.searchParams.get("report");

  if (!reportId) {
    return Response.json({ error: "Missing ?report= parameter" }, { status: 400 });
  }

  const { data: report, error } = await supabase
    .from("hatiscan_reports")
    .select("*")
    .eq("report_number", reportId)
    .single();

  if (error || !report) {
    return Response.json({ error: "Report not found" }, { status: 404 });
  }

  const pdfBuffer = generateReportPDF(report);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="hatiscan-report-${reportId}.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
