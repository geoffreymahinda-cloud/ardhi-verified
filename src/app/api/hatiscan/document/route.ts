import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const SUSPICIOUS_CREATORS = ["photoshop", "gimp", "canva", "paint", "pixlr", "affinity photo"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const parcelReference = (formData.get("parcel_reference") as string) || "";
    const submitterType = (formData.get("submitter_type") as string) || "anonymous";

    // ── Step 1: Validate file ──────────────────────────────────────────
    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return Response.json({ error: "Only PDF, JPG, and PNG files are accepted" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return Response.json({ error: "File must be under 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // ── Step 2: Claude Vision analysis ─────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const mediaType = file.type === "application/pdf" ? "image/png" as const : file.type as "image/jpeg" | "image/png";

    const visionResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: `You are a Kenya land document expert. Analyse this document and extract the following fields. Return ONLY a JSON object with no preamble or markdown.

{
  "document_type": "title_deed | land_search | survey_map | rates_clearance | unknown",
  "title_number": "extracted title/LR number or null",
  "registered_owner": "full name as written or null",
  "county": "county name or null",
  "plot_area": "area with units or null",
  "registration_date": "date as written or null",
  "issuing_authority": "issuing office or null",
  "forgery_flags": [
    "list any anomalies found such as: inconsistent fonts, misaligned text, suspicious stamps, unusual formatting, signs of digital editing, missing standard elements"
  ],
  "confidence": "high | medium | low",
  "notes": "any other observations"
}`,
            },
          ],
        },
      ],
    });

    let extractedFields = {
      document_type: "unknown",
      title_number: null as string | null,
      registered_owner: null as string | null,
      county: null as string | null,
      plot_area: null as string | null,
      registration_date: null as string | null,
      issuing_authority: null as string | null,
      forgery_flags: [] as string[],
      confidence: "low",
      notes: "",
    };

    try {
      const textContent = visionResponse.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        const jsonStr = textContent.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        extractedFields = JSON.parse(jsonStr);
      }
    } catch {
      extractedFields.notes = "Could not parse document — may be a PDF without visible text";
    }

    // ── Step 3: PDF metadata extraction ────────────────────────────────
    let pdfMetadata = {
      created: null as string | null,
      modified: null as string | null,
      creator: null as string | null,
      producer: null as string | null,
      risk_level: "low" as string,
    };

    if (file.type === "application/pdf") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ info: Record<string, string>; text: string }>;
        const pdfData = await pdfParse(buffer);
        const info = pdfData.info || {};

        pdfMetadata.created = info.CreationDate || null;
        pdfMetadata.modified = info.ModDate || null;
        pdfMetadata.creator = info.Creator || null;
        pdfMetadata.producer = info.Producer || null;

        // Check for suspicious creator apps
        const creatorLower = (info.Creator || "").toLowerCase();
        const producerLower = (info.Producer || "").toLowerCase();
        const combined = creatorLower + " " + producerLower;

        if (SUSPICIOUS_CREATORS.some((s) => combined.includes(s))) {
          pdfMetadata.risk_level = "high";
          extractedFields.forgery_flags.push(
            `Suspicious creator application detected: ${info.Creator || info.Producer}`
          );
        }

        // Check modification date
        if (info.CreationDate && info.ModDate) {
          try {
            const created = new Date(info.CreationDate);
            const modified = new Date(info.ModDate);
            const diffDays = (modified.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays > 1) {
              pdfMetadata.risk_level = pdfMetadata.risk_level === "high" ? "high" : "medium";
              extractedFields.forgery_flags.push(
                `Document modified ${Math.round(diffDays)} days after creation`
              );
            }
          } catch {
            // Date parsing failed — skip
          }
        }
      } catch {
        pdfMetadata.creator = "Could not extract PDF metadata";
      }
    }

    // ── Step 4: Title number consistency check ─────────────────────────
    let titleMatch = true;
    if (parcelReference && extractedFields.title_number) {
      const submitted = parcelReference.replace(/\s+/g, "").toUpperCase();
      const extracted = extractedFields.title_number.replace(/\s+/g, "").toUpperCase();
      titleMatch = submitted === extracted || extracted.includes(submitted) || submitted.includes(extracted);

      if (!titleMatch) {
        extractedFields.forgery_flags.push(
          `TITLE NUMBER MISMATCH — submitted: ${parcelReference}, document shows: ${extractedFields.title_number}`
        );
      }
    }

    // ── Step 5: Database cross-reference ───────────────────────────────
    const db = getSupabase();
    const searchRef = extractedFields.title_number || parcelReference;

    let elcCount = 0;
    let gazetteCount = 0;
    let communityCount = 0;

    if (searchRef) {
      const { data: elcCases } = await db
        .from("elc_cases")
        .select("case_number")
        .ilike("parcel_reference", `%${searchRef}%`);
      elcCount = elcCases?.length || 0;

      const { data: gazetteHits } = await db
        .from("gazette_notices")
        .select("id")
        .ilike("parcel_reference", `%${searchRef}%`);
      gazetteCount = gazetteHits?.length || 0;

      const { data: communityHits } = await db
        .from("community_flags")
        .select("id")
        .or(`description.ilike.%${searchRef}%,location.ilike.%${searchRef}%`);
      communityCount = communityHits?.length || 0;
    }

    // ── Step 6: Calculate enhanced trust score ─────────────────────────
    let score = 100;
    score -= extractedFields.forgery_flags.length * 20;
    if (!titleMatch) score -= 40; // Already in forgery_flags but extra penalty
    if (pdfMetadata.risk_level === "high") score -= 30;
    if (pdfMetadata.risk_level === "medium") score -= 10;
    score -= elcCount * 15;
    score -= gazetteCount * 25;
    score -= communityCount * 10;
    score = Math.max(0, score);

    // Avoid double-counting title mismatch (it's already -20 from forgery_flags)
    // The -40 above is intentional as the most important fraud indicator

    let verdict: string;
    if (score >= 80) verdict = "clean";
    else if (score >= 50) verdict = "caution";
    else verdict = "high_risk";

    // ── Step 7: Store in hatiscan_reports ───────────────────────────────
    const checkedAt = new Date().toISOString();

    const { data: inserted } = await db
      .from("hatiscan_reports")
      .insert({
        parcel_reference: parcelReference || extractedFields.title_number || "unknown",
        trust_score: score,
        verdict,
        document_type: extractedFields.document_type,
        scan_tier: "standard",
        submitter_type: submitterType,
        extracted_owner: extractedFields.registered_owner,
        extracted_title: extractedFields.title_number,
        extracted_county: extractedFields.county,
        extracted_area: extractedFields.plot_area,
        title_match: titleMatch,
        forgery_flags: extractedFields.forgery_flags,
        metadata: pdfMetadata,
        breakdown: {
          extracted_fields: extractedFields,
          pdf_metadata: pdfMetadata,
          database_hits: { elc: elcCount, gazette: gazetteCount, community: communityCount },
        },
        elc_cases_found: elcCount,
        gazette_hits: gazetteCount,
        community_flags: communityCount,
      })
      .select("report_number")
      .single();

    // ── Step 8: Return response ────────────────────────────────────────
    return Response.json({
      report_number: inserted?.report_number || "HS-PENDING",
      trust_score: score,
      verdict,
      document_type: extractedFields.document_type,
      extracted_fields: {
        title_number: extractedFields.title_number,
        title_match: titleMatch,
        registered_owner: extractedFields.registered_owner,
        county: extractedFields.county,
        plot_area: extractedFields.plot_area,
        registration_date: extractedFields.registration_date,
      },
      forgery_flags: extractedFields.forgery_flags,
      metadata: pdfMetadata,
      elc_cases_found: elcCount,
      gazette_hits: gazetteCount,
      community_flags: communityCount,
      checked_at: checkedAt,
    });
  } catch (e) {
    console.error("HatiScan document error:", e);
    return Response.json(
      { error: "Document analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
