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

    console.log(`[HatiScan] File received: type=${file.type}, size=${(file.size / 1024).toFixed(1)}KB, name=${file.name}, parcel=${parcelReference}`);

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

    // ── Step 1.3: Process file for Claude analysis ─────────────────────
    let imageBase64: string | null = null;
    let imageMediaType: "image/jpeg" | "image/png" = "image/png";
    let pdfTextContent: string | null = null;

    if (file.type === "application/pdf") {
      // PDF: send directly to Claude as a document (native PDF support)
      // Claude API supports type: "document" for PDF files
      pdfTextContent = "__PDF_DOCUMENT__"; // Marker to use document block instead
      console.log(`[HatiScan] PDF will be sent as native document to Claude. Size: ${(buffer.length / 1024).toFixed(1)}KB`);

      // Also try to extract metadata via pdf-parse
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; info: Record<string, string> }>;
        const pdfData = await pdfParse(buffer);
        if (pdfData.text && pdfData.text.trim().length > 50) {
          console.log(`[HatiScan] PDF also has extractable text: ${pdfData.text.trim().length} chars`);
        }
      } catch {
        console.log(`[HatiScan] PDF metadata extraction skipped`);
      }
    } else {
      // JPG/PNG — optimize with sharp for consistent quality
      try {
        const optimized = await sharp(buffer)
          .resize(1600, 2200, { fit: "inside", withoutEnlargement: true })
          .png()
          .toBuffer();
        imageBase64 = optimized.toString("base64");
        imageMediaType = "image/png";
        console.log(`[HatiScan] Image optimized: ${(optimized.length / 1024).toFixed(1)}KB`);
      } catch {
        // If sharp fails, use original
        imageBase64 = buffer.toString("base64");
        imageMediaType = file.type as "image/jpeg" | "image/png";
        console.log(`[HatiScan] Sharp optimization failed, using original image`);
      }
    }

    // ── Step 1.5: Pre-fetch database intelligence for context ─────────
    const searchRef = sanitizedRef;
    let dbContext = "";

    if (searchRef) {
      // Court cases on this parcel
      const { data: priorCases } = await db
        .from("elc_cases")
        .select("case_number, parties, outcome, court_station, date_decided")
        .contains("parcel_reference", [searchRef])
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
        .contains("parcel_reference", [searchRef])
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
    const analysisMode = imageBase64 ? "vision" : "text";
    console.log(`[HatiScan] Analysis mode: ${analysisMode}, ${imageBase64 ? `imageSize=${(imageBase64.length / 1024).toFixed(1)}KB` : `textLength=${pdfTextContent?.length || 0}`}, hasContext=${dbContext.length > 0}`);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build message content based on file type
    const messageContent: Anthropic.Messages.ContentBlockParam[] = [];

    if (imageBase64) {
      // Image mode — JPG/PNG uploads
      messageContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: imageMediaType,
          data: imageBase64,
        },
      });
    } else if (pdfTextContent === "__PDF_DOCUMENT__") {
      // Native PDF document mode — send PDF directly to Claude
      messageContent.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: buffer.toString("base64"),
        },
      } as Anthropic.Messages.ContentBlockParam);
    } else if (pdfTextContent) {
      // Text fallback mode
      messageContent.push({
        type: "text",
        text: `DOCUMENT TEXT CONTENT (extracted from PDF):\n\n${pdfTextContent}\n\n---\n\n`,
      });
    }

    let visionResponse;
    try {
      visionResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            ...messageContent,
            {
              type: "text",
              text: `You are a Kenya land document expert working for Ardhi Verified, a land fraud detection platform. Analyse this document and extract the following fields. Return ONLY a JSON object with no preamble or markdown.

IMPORTANT CONTEXT FOR KENYA TITLE DEEDS:
- Photocopied/scanned documents are extremely common and normal in Kenya. Poor photocopy quality, faded stamps, and slightly illegible signatures are NOT forgery indicators by themselves.
- Multiple ID numbers on a title deed are common for joint ownership (e.g. husband and wife). This is normal.
- Official seals may appear dark or obscured in photocopies. This is a copy quality issue, not fraud.
- Only flag as forgery if you see: digitally altered text, inconsistent fonts within the SAME field, obviously fake stamps/watermarks, impossible dates, or clear signs of Photoshop/digital editing.
- Distinguish between CRITICAL issues (real fraud risk) and ADVISORY issues (quality/clarity).

KENYA DEED FORMATS:
Kenya has TWO main title deed formats:

1. **Chapter 300 REPEALED format (pre-2012)** — Registered Land Act (Cap. 300):
   - Usually has "REPEALED" watermark or reference to "Chapter 300" / "Cap. 300"
   - Contains an IR NUMBER (Inland Revenue registration, unique to old format)
   - Uses VOLUME and FOLIO indexing (e.g. "Vol. 123 Folio 456")
   - Title number often includes location in brackets, e.g. "NANYUKI MARURA BLOCK 5/1489 (ERERI)"
   - Uses BLOCK and PLOT numbering system
   - Typefont is older, often typewriter-style

2. **Land Registration Act 2012 format (current)**:
   - Clean modern typeface
   - Certificate of Title issued under LRA 2012
   - No IR number; uses parcel reference only
   - References "Land Registration Act, 2012"

DOCUMENT COMPLETENESS ASSESSMENT:
You MUST assess whether the uploaded document shows the COMPLETE title deed or only a partial view. A complete deed includes: header with title number, registered owner's name, full legal description / plot area, issuing authority's signature/stamp, and registration date. Set document_completeness to:
  - "full" — all critical fields visible
  - "partial" — only header or upper portion visible, missing key fields (owner, stamp, area, date)
  - "header_only" — only title number/heading visible, nothing else
  - "illegible" — document is too degraded to extract reliably${dbContext}

{
  "document_type": "title_deed | land_search | survey_map | rates_clearance | unknown",
  "document_completeness": "full | partial | header_only | illegible",
  "deed_format": "chapter_300_repealed | lra_2012 | unknown",
  "title_number": "extracted title/LR number or null — include location in brackets if present",
  "ir_number": "IR number for Chapter 300 format deeds only, or null",
  "volume": "Volume reference for Chapter 300 format, or null",
  "folio": "Folio reference for Chapter 300 format, or null",
  "block_plot": "Block and plot number if present (e.g. 'Block 5/1489'), or null",
  "location_in_brackets": "any location name in brackets after the title number (e.g. 'ERERI' from 'BLOCK 5/1489 (ERERI)'), or null",
  "registered_owner": "full name as written or null",
  "county": "county name or null",
  "plot_area": "area with units or null",
  "registration_date": "date as written or null",
  "issuing_authority": "issuing office or null",
  "forgery_flags": [
    "ONLY list genuine fraud indicators here — NOT photocopy quality issues. Examples of real flags: digitally edited text, font inconsistencies within same field, impossible dates, clear digital manipulation"
  ],
  "quality_notes": [
    "List quality/clarity observations here — things like: poor photocopy, faded seal, illegible signature, multiple IDs (joint ownership). These are informational, not fraud indicators"
  ],
  "confidence": "high | medium | low",
  "notes": "any other observations including comparison with intelligence context if provided. Be fair — most Kenya title deeds are photocopied and this is completely normal"
}`,
            },
          ],
        },
      ],
    });
      console.log(`[HatiScan] Claude Vision response: status=${visionResponse.stop_reason}, usage=${JSON.stringify(visionResponse.usage)}`);
    } catch (claudeError) {
      const errMsg = claudeError instanceof Error ? claudeError.message : String(claudeError);
      const errDetail = JSON.stringify(claudeError, null, 2);
      console.error(`[HatiScan] Claude Vision API FAILED: ${errMsg}`);
      console.error(`[HatiScan] Full error: ${errDetail}`);
      return Response.json(
        { error: `Claude Vision analysis failed: ${errMsg}` },
        { status: 500 }
      );
    }

    let extractedFields = {
      document_type: "unknown",
      document_completeness: "full" as "full" | "partial" | "header_only" | "illegible",
      deed_format: "unknown" as "chapter_300_repealed" | "lra_2012" | "unknown",
      title_number: null as string | null,
      ir_number: null as string | null,
      volume: null as string | null,
      folio: null as string | null,
      block_plot: null as string | null,
      location_in_brackets: null as string | null,
      registered_owner: null as string | null,
      county: null as string | null,
      plot_area: null as string | null,
      registration_date: null as string | null,
      issuing_authority: null as string | null,
      forgery_flags: [] as string[],
      quality_notes: [] as string[],
      confidence: "low",
      notes: "",
    };

    try {
      const textContent = visionResponse.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        console.log(`[HatiScan] Claude raw response: ${textContent.text.substring(0, 200)}`);
        const jsonStr = textContent.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        extractedFields = JSON.parse(jsonStr);
        console.log(`[HatiScan] Parsed fields: type=${extractedFields.document_type}, title=${extractedFields.title_number}, owner=${extractedFields.registered_owner}`);
      } else {
        console.log(`[HatiScan] No text content in Claude response. Content types: ${visionResponse.content.map(c => c.type).join(", ")}`);
      }
    } catch (parseErr) {
      console.error(`[HatiScan] Failed to parse Claude response: ${parseErr instanceof Error ? parseErr.message : parseErr}`);
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

    // ── Step 4.6: Detect Chapter 300 REPEALED deed ─────────────────────
    // Chapter 300 deeds have been repealed by LRA 2012 and require migration
    // under NLIMS. This is valuable intelligence for diaspora buyers.
    const isChapter300 =
      extractedFields.deed_format === "chapter_300_repealed" ||
      !!extractedFields.ir_number ||
      !!extractedFields.volume;

    if (isChapter300) {
      extractedFields.forgery_flags.push(
        "REPEALED LEGISLATION — Title issued under the Registered Land Act (Chapter 300) which has been repealed by the Land Registration Act 2012. Under NLIMS, all titles are being migrated to the new format. Confirm this title has been migrated or is scheduled for migration to avoid future registration complications."
      );
    }

    // ── Step 4.7: Detect partial / incomplete documents ────────────────
    const isIncomplete =
      extractedFields.document_completeness === "partial" ||
      extractedFields.document_completeness === "header_only" ||
      extractedFields.document_completeness === "illegible";

    if (isIncomplete) {
      const completenessMsg = extractedFields.document_completeness === "illegible"
        ? "Document is too degraded to extract reliably. Please upload a clearer copy."
        : extractedFields.document_completeness === "header_only"
          ? "Only the title deed header is visible. Please upload the complete document for a full scan."
          : "Incomplete document detected — please upload the full title deed for a complete scan.";
      extractedFields.forgery_flags.push(`INCOMPLETE SCAN — ${completenessMsg}`);
    }

    // ── Step 5: Database cross-reference ───────────────────────────────
    // Split into two buckets:
    //   1. PARCEL-SPECIFIC — drives the trust score. Matches by title number,
    //      owner name, or location tokens from the title (NOT the county name).
    //   2. COUNTY CONTEXT — informational only. Totals across the whole county.
    const dbSearchRef = extractedFields.title_number || parcelReference;
    const extractedCounty = (extractedFields.county || "").trim();
    const extractedOwner = (extractedFields.registered_owner || "").trim();

    // Parse ALL capitalised words and location tokens from the title number
    // itself — this works even when the body of the deed isn't visible.
    // e.g. "NANYUKI MARURA BLOCK 5/1489 (ERERI)" -> ["NANYUKI", "MARURA", "ERERI"]
    // "TETU/MUTHUAINI/3351" with county Nyeri -> ["TETU", "MUTHUAINI"]
    const KEYWORD_STOPWORDS = new Set([
      "BLOCK", "PLOT", "LR", "NO", "TITLE", "DEED", "FOLIO", "VOL",
      "VOLUME", "IR", "REF", "CAP", "THE", "AND", "OR", "OF", "IN",
    ]);

    const rawTokens: string[] = [];
    const sources = [
      dbSearchRef || "",
      extractedFields.location_in_brackets || "",
      extractedFields.block_plot || "",
    ];
    for (const src of sources) {
      const tokens = src
        .replace(/[()\[\]]/g, " ")
        .replace(/[\/\-_.,]/g, " ")
        .split(/\s+/)
        .filter((w: string) => w.length > 2 && !/^\d+$/.test(w))
        .map((w: string) => w.toUpperCase());
      rawTokens.push(...tokens);
    }

    const parcelKeywords = Array.from(
      new Set(
        rawTokens.filter(
          (kw) =>
            !KEYWORD_STOPWORDS.has(kw) &&
            (!extractedCounty || kw.toLowerCase() !== extractedCounty.toLowerCase())
        )
      )
    ).slice(0, 6);

    // ── PARCEL-SPECIFIC COUNTS (drive trust score) ──
    // Only exact title number matches or owner name matches drive the score.
    let elcParcelCount = 0;
    let gazetteParcelCount = 0;
    let communityParcelCount = 0;

    // ── LOCATION-RELATED ACTIVITY (informational, NOT scored) ──
    // Matches by parcel keywords from title — finer than county level
    let elcLocationCount = 0;
    let gazetteLocationCount = 0;
    let riparianLocationCount = 0;

    // ── COUNTY CONTEXT COUNTS (informational only) ──
    let elcCountyContext = 0;
    let gazetteCountyContext = 0;
    let riparianCountyContext = 0;
    let roadReserveCountyContext = 0;
    let forestReserveCountyContext = 0;

    let elcSamples: Array<Record<string, unknown>> = [];
    let gazetteSamples: Array<Record<string, unknown>> = [];
    let communitySamples: Array<Record<string, unknown>> = [];
    let elcLocationSamples: Array<Record<string, unknown>> = [];
    let gazetteLocationSamples: Array<Record<string, unknown>> = [];
    let riparianLocationSamples: Array<Record<string, unknown>> = [];
    let riparianSamples: Array<Record<string, unknown>> = [];
    let roadReserveSamples: Array<Record<string, unknown>> = [];

    const queries: PromiseLike<unknown>[] = [];

    // ═══════════════════════════════════════════════════════════
    // PARCEL-SPECIFIC QUERIES — drive the trust score
    // Only exact title number or owner name match qualifies.
    // Location-token matches are NOT scored (they're village-wide,
    // not parcel-specific) but may be surfaced for context.
    // ═══════════════════════════════════════════════════════════

    // ── ELC (parcel-specific) ─────────────────────────────────
    const elcExactOr: string[] = [];
    if (dbSearchRef) {
      elcExactOr.push(`parties.ilike.%${dbSearchRef}%`);
      elcExactOr.push(`case_number.ilike.%${dbSearchRef}%`);
      elcExactOr.push(`raw_excerpt.ilike.%${dbSearchRef}%`);
    }
    if (extractedOwner && extractedOwner.length > 3) {
      elcExactOr.push(`parties.ilike.%${extractedOwner}%`);
    }
    if (elcExactOr.length > 0) {
      queries.push(
        db
          .from("elc_cases")
          .select("case_number, parties, outcome, court_station, date_decided", { count: "exact" })
          .or(elcExactOr.join(","))
          .limit(5)
          .then((res) => {
            elcParcelCount = res.count || 0;
            elcSamples = (res.data || []) as Array<Record<string, unknown>>;
          })
      );
    }
    // Exact JSONB containment as supplementary match
    if (dbSearchRef) {
      queries.push(
        db
          .from("elc_cases")
          .select("case_number", { count: "exact", head: true })
          .contains("parcel_reference", [dbSearchRef])
          .then((res) => {
            if (res.count) elcParcelCount += res.count;
          })
      );
    }

    // ── Gazette Notices (parcel-specific) ────────────────────
    const gazetteExactOr: string[] = [];
    if (dbSearchRef) {
      gazetteExactOr.push(`description.ilike.%${dbSearchRef}%`);
      gazetteExactOr.push(`summary.ilike.%${dbSearchRef}%`);
    }
    if (extractedOwner && extractedOwner.length > 3) {
      gazetteExactOr.push(`affected_party.ilike.%${extractedOwner}%`);
      gazetteExactOr.push(`description.ilike.%${extractedOwner}%`);
    }
    if (gazetteExactOr.length > 0) {
      queries.push(
        db
          .from("gazette_notices")
          .select("id, notice_type, county, description, gazette_year", { count: "exact" })
          .or(gazetteExactOr.join(","))
          .limit(5)
          .then((res) => {
            gazetteParcelCount = res.count || 0;
            gazetteSamples = (res.data || []) as Array<Record<string, unknown>>;
          })
      );
    }
    if (dbSearchRef) {
      queries.push(
        db
          .from("gazette_notices")
          .select("id", { count: "exact", head: true })
          .contains("parcel_reference", [dbSearchRef])
          .then((res) => {
            if (res.count) gazetteParcelCount += res.count;
          })
      );
    }

    // ── Community Flags (parcel-specific) ────────────────────
    const communityExactOr: string[] = [];
    if (dbSearchRef) {
      communityExactOr.push(`description.ilike.%${dbSearchRef}%`);
      communityExactOr.push(`location.ilike.%${dbSearchRef}%`);
    }
    if (extractedOwner && extractedOwner.length > 3) {
      communityExactOr.push(`description.ilike.%${extractedOwner}%`);
    }
    if (communityExactOr.length > 0) {
      queries.push(
        db
          .from("community_flags")
          .select("id, category, county, description, status", { count: "exact" })
          .or(communityExactOr.join(","))
          .limit(5)
          .then((res) => {
            communityParcelCount = res.count || 0;
            communitySamples = (res.data || []) as Array<Record<string, unknown>>;
          })
      );
    }

    // ═══════════════════════════════════════════════════════════
    // LOCATION-KEYWORD QUERIES — informational only, NOT scored.
    // Searches each capitalised word from the title number against
    // ELC cases, gazette notices and riparian zones. Finer than county
    // level (e.g. ERERI village) but not parcel-specific.
    // ═══════════════════════════════════════════════════════════

    if (parcelKeywords.length > 0) {
      // ELC location activity
      const elcLocOr = parcelKeywords.flatMap((kw) => [
        `parties.ilike.%${kw}%`,
        `raw_excerpt.ilike.%${kw}%`,
      ]);
      queries.push(
        db
          .from("elc_cases")
          .select("case_number, parties, court_station, date_decided", { count: "exact" })
          .or(elcLocOr.join(","))
          .limit(5)
          .then((res) => {
            elcLocationCount = res.count || 0;
            elcLocationSamples = (res.data || []) as Array<Record<string, unknown>>;
          })
      );

      // Gazette location activity
      const gazetteLocOr = parcelKeywords.flatMap((kw) => [
        `description.ilike.%${kw}%`,
        `summary.ilike.%${kw}%`,
      ]);
      queries.push(
        db
          .from("gazette_notices")
          .select("id, notice_type, county, description, gazette_year", { count: "exact" })
          .or(gazetteLocOr.join(","))
          .limit(5)
          .then((res) => {
            gazetteLocationCount = res.count || 0;
            gazetteLocationSamples = (res.data || []) as Array<Record<string, unknown>>;
          })
      );

      // Riparian location activity — match by name against keywords
      const riparianLocOr = parcelKeywords.map((kw) => `name.ilike.%${kw}%`);
      queries.push(
        db
          .from("riparian_zones")
          .select("id, name, water_type, buffer_metres, county", { count: "exact" })
          .or(riparianLocOr.join(","))
          .limit(5)
          .then((res) => {
            riparianLocationCount = res.count || 0;
            riparianLocationSamples = (res.data || []) as Array<Record<string, unknown>>;
          })
      );
    }

    // ═══════════════════════════════════════════════════════════
    // COUNTY CONTEXT QUERIES — informational only, NOT scored
    // ═══════════════════════════════════════════════════════════

    if (extractedCounty) {
      // ELC context count
      queries.push(
        db
          .from("elc_cases")
          .select("*", { count: "exact", head: true })
          .or(`court_station.ilike.%${extractedCounty}%,parties.ilike.%${extractedCounty}%`)
          .then((res) => {
            elcCountyContext = res.count || 0;
          })
      );

      // Gazette context count — use exact eq (much faster than ILIKE on 45K rows)
      queries.push(
        db
          .from("gazette_notices")
          .select("id", { count: "exact", head: true })
          .eq("county", extractedCounty)
          .then((res) => {
            gazetteCountyContext = res.count || 0;
          })
      );

      // Riparian zones in county (context + samples)
      queries.push(
        db
          .from("riparian_zones")
          .select("id, name, water_type, buffer_metres, county", { count: "exact" })
          .ilike("county", `%${extractedCounty}%`)
          .limit(5)
          .then((res) => {
            riparianCountyContext = res.count || 0;
            riparianSamples = (res.data || []) as Array<Record<string, unknown>>;
          })
      );

      // Road reserves in county (context + samples)
      queries.push(
        db
          .from("road_reserves")
          .select("id, road_name, road_class, reserve_width_metres, counties", { count: "exact" })
          .or(`counties.cs.{${extractedCounty}},route_description.ilike.%${extractedCounty}%,region.ilike.%${extractedCounty}%`)
          .limit(5)
          .then((res) => {
            roadReserveCountyContext = res.count || 0;
            roadReserveSamples = (res.data || []) as Array<Record<string, unknown>>;
          })
      );

      // Forest reserves (name fallback — county field often null)
      queries.push(
        db
          .from("riparian_zones")
          .select("*", { count: "exact", head: true })
          .eq("water_type", "forest_reserve")
          .or(`name.ilike.%${extractedCounty}%,county.ilike.%${extractedCounty}%`)
          .then((res) => {
            forestReserveCountyContext = res.count || 0;
          })
      );
    }

    // Execute all queries in parallel
    await Promise.allSettled(queries);

    console.log(
      `[HatiScan] DB cross-ref — county="${extractedCounty}", owner="${extractedOwner}", ref="${dbSearchRef}", keywords=[${parcelKeywords.join(",")}]\n` +
      `  PARCEL-SPECIFIC:  elc=${elcParcelCount}, gazette=${gazetteParcelCount}, community=${communityParcelCount}\n` +
      `  COUNTY CONTEXT:   elc=${elcCountyContext}, gazette=${gazetteCountyContext}, riparian=${riparianCountyContext}, roads=${roadReserveCountyContext}, forests=${forestReserveCountyContext}`
    );

    // ── Step 6: Calculate enhanced trust score ─────────────────────────
    // ONLY parcel-specific matches drive the score. County-level context
    // and location-keyword matches are informational and do NOT affect
    // the score — a parcel in Nyeri must not be penalised for cases
    // involving unrelated parcels.
    //
    // For incomplete documents, score is set to null ("INCOMPLETE") so the
    // user sees a clear status rather than a misleading number.
    let score: number | null = 100;

    if (isIncomplete) {
      score = null;
    } else {
      // Forgery flags from Claude Vision analysis (not including pattern flags
      // and not the REPEALED flag which is counted separately below)
      const excludedFlags = fraudPatterns.length + (isChapter300 ? 1 : 0);
      const visionFlags = extractedFields.forgery_flags.length - excludedFlags;
      score -= Math.max(0, visionFlags) * 20;

      // Fraud pattern deductions
      score -= fraudPatterns.length * 15;

      // Title mismatch is the #1 fraud indicator
      if (!titleMatch) score -= 40;

      // PDF metadata risk
      if (pdfMetadata.risk_level === "high") score -= 30;
      if (pdfMetadata.risk_level === "medium") score -= 10;

      // REPEALED Chapter 300 deed — medium risk (needs NLIMS migration check)
      if (isChapter300) score -= 15;

      // Parcel-specific database hits only
      score -= elcParcelCount * 15;
      score -= gazetteParcelCount * 25;
      score -= communityParcelCount * 10;

      score = Math.max(0, score);
    }

    let verdict: string;
    if (score === null) {
      verdict = "incomplete";
    } else if (score >= 80) {
      verdict = "clean";
    } else if (score >= 50) {
      verdict = "caution";
    } else {
      verdict = "high_risk";
    }

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
          document_completeness: extractedFields.document_completeness,
          deed_format: extractedFields.deed_format,
          is_chapter_300_repealed: isChapter300,
          is_incomplete: isIncomplete,
          parcel_specific_hits: {
            elc: elcParcelCount,
            gazette: gazetteParcelCount,
            community: communityParcelCount,
          },
          location_activity: {
            elc: elcLocationCount,
            gazette: gazetteLocationCount,
            riparian: riparianLocationCount,
          },
          county_context: {
            county: extractedCounty || null,
            elc_cases_in_county: elcCountyContext,
            gazette_notices_in_county: gazetteCountyContext,
            riparian_zones_in_county: riparianCountyContext,
            road_reserves_in_county: roadReserveCountyContext,
            forest_reserves_in_county: forestReserveCountyContext,
          },
          samples: {
            elc_parcel_matches: elcSamples,
            gazette_parcel_matches: gazetteSamples,
            community_parcel_matches: communitySamples,
            elc_location_matches: elcLocationSamples,
            gazette_location_matches: gazetteLocationSamples,
            riparian_location_matches: riparianLocationSamples,
            riparian_county_context: riparianSamples,
            road_reserves_county_context: roadReserveSamples,
          },
          fraud_patterns: fraudPatterns,
          intelligence_context_used: dbContext.length > 0,
          search_strategy: {
            title_ref: dbSearchRef || null,
            owner: extractedOwner || null,
            county: extractedCounty || null,
            parcel_keywords: parcelKeywords,
          },
        },
        elc_cases_found: elcParcelCount,
        gazette_hits: gazetteParcelCount,
        community_flags: communityParcelCount,
      })
      .select("report_number")
      .single();

    // ── Step 8: Return response ────────────────────────────────────────
    return Response.json({
      report_number: inserted?.report_number || "HS-PENDING",
      trust_score: score,
      verdict,
      document_type: extractedFields.document_type,
      document_completeness: extractedFields.document_completeness,
      deed_format: extractedFields.deed_format,
      is_incomplete: isIncomplete,
      is_chapter_300_repealed: isChapter300,
      incomplete_message: isIncomplete
        ? "Incomplete document detected — please upload the full title deed for a complete scan. The fields visible have been extracted and searched, but the trust score cannot be finalised until the complete document is available."
        : null,
      repealed_warning: isChapter300
        ? "This title was issued under the Registered Land Act (Chapter 300) which has been repealed. Under NLIMS, all titles are being migrated to the Land Registration Act 2012 format. Verify that this title has been migrated or is scheduled for migration to avoid future registration complications."
        : null,
      extracted_fields: {
        title_number: extractedFields.title_number,
        title_match: titleMatch,
        registered_owner: extractedFields.registered_owner,
        county: extractedFields.county,
        plot_area: extractedFields.plot_area,
        registration_date: extractedFields.registration_date,
        ir_number: extractedFields.ir_number,
        volume: extractedFields.volume,
        folio: extractedFields.folio,
        block_plot: extractedFields.block_plot,
        location_in_brackets: extractedFields.location_in_brackets,
      },
      forgery_flags: extractedFields.forgery_flags,
      quality_notes: extractedFields.quality_notes || [],
      metadata: pdfMetadata,
      // Parcel-specific counts drive the counter boxes
      elc_cases_found: elcParcelCount,
      gazette_hits: gazetteParcelCount,
      community_flags: communityParcelCount,
      // Parcel-specific matching records
      parcel_matches: {
        elc: elcSamples,
        gazette: gazetteSamples,
        community: communitySamples,
      },
      // Location-keyword activity (finer than county, NOT in score)
      location_activity: {
        keywords: parcelKeywords,
        elc_matches: elcLocationCount,
        gazette_matches: gazetteLocationCount,
        riparian_matches: riparianLocationCount,
        elc_samples: elcLocationSamples,
        gazette_samples: gazetteLocationSamples,
        riparian_samples: riparianLocationSamples,
        message: parcelKeywords.length > 0
          ? `Searched for ${parcelKeywords.join(", ")} — found ${elcLocationCount} court cases, ${gazetteLocationCount} gazette notices, and ${riparianLocationCount} riparian features referencing these location terms. Informational only — does not affect your trust score.`
          : null,
      },
      // County-level context — informational, NOT in score
      county_context: {
        county: extractedCounty || null,
        elc_cases_in_county: elcCountyContext,
        gazette_notices_in_county: gazetteCountyContext,
        riparian_zones_in_county: riparianCountyContext,
        road_reserves_in_county: roadReserveCountyContext,
        forest_reserves_in_county: forestReserveCountyContext,
        message: extractedCounty
          ? `${elcCountyContext.toLocaleString()} court cases and ${gazetteCountyContext.toLocaleString()} gazette notices recorded in ${extractedCounty} — your parcel has been individually searched`
          : null,
        sample_riparian: riparianSamples,
        sample_road_reserves: roadReserveSamples,
      },
      search_strategy: {
        title_ref: dbSearchRef || null,
        owner: extractedOwner || null,
        county: extractedCounty || null,
        parcel_keywords: parcelKeywords,
      },
      checked_at: checkedAt,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const errStack = e instanceof Error ? e.stack : undefined;
    console.error(`[HatiScan] FATAL ERROR: ${errMsg}`);
    console.error(`[HatiScan] Stack: ${errStack}`);
    console.error(`[HatiScan] Full error object:`, JSON.stringify(e, null, 2));
    return Response.json(
      { error: `Document analysis failed: ${errMsg}` },
      { status: 500 }
    );
  }
}
