import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const reportId = new URL(request.url).searchParams.get("report");

  if (!reportId) {
    return Response.json({ error: "Missing report parameter" }, { status: 400 });
  }

  // Fetch the HatiScan report
  const { data: report, error } = await supabase
    .from("hatiscan_reports")
    .select("*")
    .eq("report_number", reportId)
    .single();

  if (error || !report) {
    return Response.json({ error: "Report not found" }, { status: 404 });
  }

  // Generate PDF
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // ── Header ──
  doc.setFillColor(26, 26, 46); // navy
  doc.rect(0, 0, w, 45, "F");

  doc.setTextColor(0, 165, 80); // ardhi green
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("ARDHI VERIFIED", margin, y);

  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(200, 169, 110); // gold
  doc.text("VERIFICATION CERTIFICATE", margin, y);

  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(`Report: ${report.report_number}`, margin, y);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    w - margin,
    y,
    { align: "right" }
  );

  // ── Trust Score Section ──
  y = 55;
  const scoreColor = report.trust_score >= 80 ? [0, 165, 80] : report.trust_score >= 50 ? [245, 166, 35] : [220, 50, 50];

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, w - margin * 2, 35, 3, 3, "F");

  doc.setFontSize(36);
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(`${report.trust_score}`, margin + 15, y + 22);

  doc.setFontSize(12);
  doc.text("/100", margin + 35, y + 22);

  doc.setFontSize(14);
  doc.setTextColor(26, 26, 46);
  doc.text(report.verdict?.toUpperCase() || "UNKNOWN", margin + 60, y + 15);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Parcel: ${report.parcel_reference || "N/A"}`, margin + 60, y + 23);
  doc.text(`Scan tier: ${report.scan_tier || "basic"}`, margin + 60, y + 29);

  // ── Parcel Details ──
  y = 100;
  doc.setFontSize(11);
  doc.setTextColor(26, 26, 46);
  doc.setFont("helvetica", "bold");
  doc.text("PARCEL DETAILS", margin, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  const details = [
    ["Parcel Reference", report.parcel_reference || "N/A"],
    ["Extracted Title", report.extracted_title || "N/A"],
    ["Registered Owner", report.extracted_owner || "N/A"],
    ["County", report.extracted_county || "N/A"],
    ["Plot Area", report.extracted_area || "N/A"],
    ["Document Type", report.document_type || "N/A"],
  ];

  for (const [label, value] of details) {
    doc.setTextColor(120, 120, 120);
    doc.text(label, margin, y);
    doc.setTextColor(26, 26, 46);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), margin + 55, y);
    doc.setFont("helvetica", "normal");
    y += 6;
  }

  // ── Intelligence Summary ──
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(26, 26, 46);
  doc.setFont("helvetica", "bold");
  doc.text("INTELLIGENCE SUMMARY", margin, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const intel = [
    ["Court Cases Found", String(report.elc_cases_found || 0)],
    ["Gazette Notices", String(report.gazette_hits || 0)],
    ["Community Flags", String(report.community_flags || 0)],
    ["Title Match", report.title_match ? "YES — matches submitted reference" : "NO — MISMATCH DETECTED"],
  ];

  for (const [label, value] of intel) {
    doc.setTextColor(120, 120, 120);
    doc.text(label, margin, y);
    const isRisk = value.includes("MISMATCH") || (parseInt(value) > 0 && label !== "Title Match");
    doc.setTextColor(isRisk ? 220 : 26, isRisk ? 50 : 26, isRisk ? 50 : 46);
    doc.setFont("helvetica", "bold");
    doc.text(value, margin + 55, y);
    doc.setFont("helvetica", "normal");
    y += 6;
  }

  // ── Forgery Flags ──
  const flags = report.forgery_flags || [];
  if (flags.length > 0) {
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(220, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text("FORGERY FLAGS", margin, y);

    y += 7;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    for (const flag of flags) {
      const flagStr = typeof flag === "string" ? flag : JSON.stringify(flag);
      doc.setTextColor(220, 50, 50);
      doc.text("▸ " + flagStr.substring(0, 90), margin, y);
      y += 5;
      if (y > 260) break;
    }
  }

  // ── Disclaimer ──
  y = 260;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, w - margin, y);

  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "italic");
  doc.text(
    "This certificate is generated by Ardhi Verified and is provided for informational purposes only.",
    margin,
    y
  );
  y += 4;
  doc.text(
    "It does not constitute legal advice, a guarantee of title validity, or title insurance. Independent legal advice is recommended.",
    margin,
    y
  );
  y += 4;
  doc.text(
    `Ardhi Verified Limited — ardhiverified.com — Certificate ID: ${report.report_number}`,
    margin,
    y
  );

  // Output PDF
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ardhi-certificate-${report.report_number}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
