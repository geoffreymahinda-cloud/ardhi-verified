import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

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

    // ── Step 1.2: Check cache — return recent result if same parcel ───
    const db = getSupabase();
    const sanitizedRef = parcelReference.trim();

    if (sanitizedRef) {
      const cacheThreshold = new Date(Date.now() - CACHE_TTL_MS).toISOString();
      const { data: cached } = await db
        .from("hatiscan_reports")
        .select("*")
        .ilike("parcel_reference", sanitizedRef)
        .eq("scan_tier", "standard")
        .gte("created_at", cacheThreshold)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        console.log(`HatiScan cache hit for ${sanitizedRef}`);
        return Response.json({
          report_number: cached.report_number,
          trust_score: cached.trust_score,
          verdict: cached.verdict,
          document_type: cached.document_type,
          extracted_fields: {
            title_number: cached.extracted_title,
            title_match: cached.title_match,
            registered_owner: cached.extracted_owner,
            county: cached.extracted_county,
            plot_area: cached.extracted_area,
            registration_date: null,
          },
          forgery_flags: cached.forgery_flags || [],
          metadata: cached.metadata || {},
          elc_cases_found: cached.elc_cases_found,
          gazette_hits: cached.gazette_hits,
          community_flags: cached.community_flags,
          checked_at: cached.created_at,
          cached: true,
        });
      }
    }

    // ── Step 1.3: Convert PDF to image for Claude Vision ──────────────
    let imageBase64: string;
    let imageMediaType: "image/jpeg" | "image/png";

    if (file.type === "application/pdf") {
      // PDF: extract first page as image using pdf-parse for text + sharp for rendering
      // Since we can't render PDF pages directly, we convert to a high-contrast image
      // For scanned PDFs, we pass the raw bytes as PNG (Claude handles this)
      try {
        // Try to create a meaningful image from the PDF
        // Sharp can't read PDFs directly, so we use the raw buffer
        // and let Claude attempt to read it as-is, but we also extract text
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; info: Record<string, string> }>;
        const pdfData = await pdfParse(buffer);

        if (pdfData.text && pdfData.text.trim().length > 100) {
          // PDF has extractable text — create a clean text image for Claude
          const textContent = pdfData.text.substring(0, 3000);
          const lines = textContent.split("\n").filter(l => l.trim()).slice(0, 60);
          const lineHeight = 18;
          const imgHeight = Math.max(400, lines.length * lineHeight + 60);

          // Create SVG with the text content for Claude to read
          const svg = `<svg width="800" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg">
            <rect width="800" height="${imgHeight}" fill="white"/>
            <text x="20" y="30" font-family="monospace" font-size="11" fill="black">
              ${lines.map((line, i) =>
                `<tspan x="20" dy="${i === 0 ? 0 : lineHeight}">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").substring(0, 100)}</tspan>`
              ).join("")}
            </text>
          </svg>`;

          const imgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
          imageBase64 = imgBuffer.toString("base64");
          imageMediaType = "image/png";
        } else {
          // Scanned PDF with no text — send raw bytes, Claude Vision handles binary
          imageBase64 = buffer.toString("base64");
          imageMediaType = "image/png";
        }
      } catch {
        // Fallback: send raw PDF bytes as PNG
        imageBase64 = buffer.toString("base64");
        imageMediaType = "image/png";
      }
    } else {
      // JPG/PNG — optimize with sharp for consistent quality
      const optimized = await sharp(buffer)
        .resize(1600, 2200, { fit: "inside", withoutEnlargement: true })
        .png({ quality: 90 })
        .toBuffer();
      imageBase64 = optimized.toString("base64");
      imageMediaType = "image/png";
    }

    // ── Step 1.5: Pre-fetch database intelligence for context ─────────
    const searchRef = sanitizedRef;
    let dbContext = "";

    if (searchRef) {
      // Court cases on this parcel
      const { data: priorCases } = await db
        .from("elc_cases")
        .select("case_number, parties, outcome, court_station, date_decided")
        .ilike("parcel_reference", `%${searchRef}%`)
        .limit(5);

      // Prior HatiScan reports on this parcel
      const { data: priorScans } = await db
        .from("hatiscan_reports")
        .select("trust_score, verdict, extracted_owner, forgery_flags, created_at")
        .ilike("parcel_reference", `%${searchRef}%`)
        .order("created_at", { ascending: false })
        .limit(3);

      // Gazette notices
      const { data: gazetteHits } = await db
        .from("gazette_notices")
        .select("notice_type, alert_level, summary")
        .ilike("parcel_reference", `%${searchRef}%`)
        .limit(3);

      // Community flags
      const { data: flagHits } = await db
        .from("community_flags")
        .select("category, county, description, status")
        .or(`description.ilike.%${searchRef}%,location.ilike.%${searchRef}%`)
        .limit(3);

      const parts = [];

      if (priorCases && priorCases.length > 0) {
        parts.push(`COURT CASES ON THIS PARCEL (${priorCases.length} found):\n` +
          priorCases.map(c => `- ${c.case_number}: ${c.parties} (${c.outcome}, ${c.court_station}, ${c.date_decided})`).join("\n"));
      }

      if (priorScans && priorScans.length > 0) {
        parts.push(`PRIOR HATISCAN REPORTS ON THIS PARCEL:\n` +
          priorScans.map(s => `- Score: ${s.trust_score} (${s.verdict}), Owner on file: ${s.extracted_owner || "unknown"}, Flags: ${JSON.stringify(s.forgery_flags)}, Date: ${s.created_at}`).join("\n"));
      }

      if (gazetteHits && gazetteHits.length > 0) {
        parts.push(`GAZETTE NOTICES:\n` +
          gazetteHits.map(g => `- ${g.notice_type} (${g.alert_level}): ${g.summary || "no summary"}`).join("\n"));
      }

      if (flagHits && flagHits.length > 0) {
        parts.push(`COMMUNITY FLAGS:\n` +
          flagHits.map(f => `- ${f.category} in ${f.county}: ${f.description?.substring(0, 100)} (${f.status})`).join("\n"));
      }

      if (parts.length > 0) {
        dbContext = `\n\nINTELLIGENCE CONTEXT — what our databases already know about parcel ${searchRef}:\n${parts.join("\n\n")}\n\nUse this context to inform your analysis. If the owner name on the document differs from prior records, flag it. If there are active court disputes, note the risk.`;
      }
    }

    // ── Step 2: Claude Vision analysis (with database context) ─────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
                media_type: imageMediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `You are a Kenya land document expert working for Ardhi Verified, a land fraud detection platform. Analyse this document and extract the following fields. Return ONLY a JSON object with no preamble or markdown.${dbContext}

{
  "document_type": "title_deed | land_search | survey_map | rates_clearance | unknown",
  "title_number": "extracted title/LR number or null",
  "registered_owner": "full name as written or null",
  "county": "county name or null",
  "plot_area": "area with units or null",
  "registration_date": "date as written or null",
  "issuing_authority": "issuing office or null",
  "forgery_flags": [
    "list any anomalies found such as: inconsistent fonts, misaligned text, suspicious stamps, unusual formatting, signs of digital editing, missing standard elements, owner name mismatch with prior records, any discrepancy with intelligence context above"
  ],
  "confidence": "high | medium | low",
  "notes": "any other observations including comparison with intelligence context if provided"
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

    // ── Step 4.5: Fraud pattern detection (Level 2) ──────────────────
    // Check accumulated scan history for suspicious patterns
    const fraudPatterns: string[] = [];

    const searchRefForPatterns = extractedFields.title_number || parcelReference;

    if (searchRefForPatterns) {
      // Pattern 1: Same title scanned before with DIFFERENT owner name
      const { data: priorOwners } = await db
        .from("hatiscan_reports")
        .select("extracted_owner, trust_score, verdict, created_at")
        .ilike("parcel_reference", `%${searchRefForPatterns}%`)
        .not("extracted_owner", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (priorOwners && priorOwners.length > 0 && extractedFields.registered_owner) {
        const currentOwner = extractedFields.registered_owner.toUpperCase().trim();
        const differentOwners = priorOwners.filter(
          (p) => p.extracted_owner && p.extracted_owner.toUpperCase().trim() !== currentOwner
        );
        if (differentOwners.length > 0) {
          fraudPatterns.push(
            `OWNER NAME CHANGE DETECTED — previously registered to "${differentOwners[0].extracted_owner}", now showing "${extractedFields.registered_owner}". ${differentOwners.length} prior scan(s) with different owner.`
          );
        }
      }

      // Pattern 2: Title previously flagged as high_risk or had forgery flags
      if (priorOwners && priorOwners.length > 0) {
        const priorHighRisk = priorOwners.filter((p) => p.verdict === "high_risk");
        if (priorHighRisk.length > 0) {
          fraudPatterns.push(
            `PREVIOUSLY FLAGGED — this parcel was rated HIGH RISK in ${priorHighRisk.length} prior scan(s). Scrutinise with extra care.`
          );
        }
      }
    }

    // Pattern 3: Suspicious creator app seen in prior confirmed fraudulent docs
    if (pdfMetadata.creator) {
      const creatorLower = pdfMetadata.creator.toLowerCase();
      const { data: priorCreatorFrauds } = await db
        .from("hatiscan_reports")
        .select("id")
        .eq("verdict", "high_risk")
        .ilike("metadata->creator", `%${creatorLower}%`)
        .limit(5);

      if (priorCreatorFrauds && priorCreatorFrauds.length >= 2) {
        fraudPatterns.push(
          `CREATOR APP LINKED TO FRAUD — "${pdfMetadata.creator}" has been used in ${priorCreatorFrauds.length} previously flagged documents.`
        );
      }
    }

    // Pattern 4: Burst scanning — many different parcels from same session (basic IP-free heuristic)
    // Check if this submitter type + parcel combo suggests bulk probing
    const { data: recentScans } = await db
      .from("hatiscan_reports")
      .select("parcel_reference")
      .eq("submitter_type", submitterType)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()) // last hour
      .limit(20);

    if (recentScans && recentScans.length >= 10) {
      const uniqueParcels = new Set(recentScans.map((s) => s.parcel_reference));
      if (uniqueParcels.size >= 8) {
        fraudPatterns.push(
          `BULK SCANNING DETECTED — ${uniqueParcels.size} different parcels scanned in the last hour by same submitter type. Possible reconnaissance activity.`
        );
      }
    }

    // Add fraud patterns to forgery flags
    extractedFields.forgery_flags.push(...fraudPatterns);

    // ── Step 5: Database cross-reference ───────────────────────────────
    const dbSearchRef = extractedFields.title_number || parcelReference;

    let elcCount = 0;
    let gazetteCount = 0;
    let communityCount = 0;

    if (dbSearchRef) {
      const { data: elcCases } = await db
        .from("elc_cases")
        .select("case_number")
        .ilike("parcel_reference", `%${dbSearchRef}%`);
      elcCount = elcCases?.length || 0;

      const { data: gazetteHits2 } = await db
        .from("gazette_notices")
        .select("id")
        .ilike("parcel_reference", `%${dbSearchRef}%`);
      gazetteCount = gazetteHits2?.length || 0;

      const { data: communityHits2 } = await db
        .from("community_flags")
        .select("id")
        .or(`description.ilike.%${dbSearchRef}%,location.ilike.%${dbSearchRef}%`);
      communityCount = communityHits2?.length || 0;
    }

    // ── Step 6: Calculate enhanced trust score ─────────────────────────
    let score = 100;

    // Forgery flags from Claude Vision analysis (not including pattern flags)
    const visionFlags = extractedFields.forgery_flags.length - fraudPatterns.length;
    score -= Math.max(0, visionFlags) * 20;

    // Fraud pattern deductions
    score -= fraudPatterns.length * 15;

    // Title mismatch is the #1 fraud indicator
    if (!titleMatch) score -= 40;

    // PDF metadata risk
    if (pdfMetadata.risk_level === "high") score -= 30;
    if (pdfMetadata.risk_level === "medium") score -= 10;

    // Database cross-reference
    score -= elcCount * 15;
    score -= gazetteCount * 25;
    score -= communityCount * 10;

    score = Math.max(0, score);

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
          fraud_patterns: fraudPatterns,
          intelligence_context_used: dbContext.length > 0,
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
