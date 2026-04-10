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
- Distinguish between CRITICAL issues (real fraud risk) and ADVISORY issues (quality/clarity).${dbContext}

{
  "document_type": "title_deed | land_search | survey_map | rates_clearance | unknown",
  "title_number": "extracted title/LR number or null",
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
      title_number: null as string | null,
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

    // ── Step 5: Database cross-reference ───────────────────────────────
    // Uses every piece of location data extracted from the document:
    //   - title number / parcel reference (exact JSONB match)
    //   - county name (equality match on county field)
    //   - place names from title number (ILIKE on text fields)
    const dbSearchRef = extractedFields.title_number || parcelReference;
    const extractedCounty = (extractedFields.county || "").trim();

    // Parse location keywords from the title number
    // e.g. "NYERI/MUNICIPALITY/1234" -> ["NYERI", "MUNICIPALITY"]
    const locationKeywords = (dbSearchRef || "")
      .replace(/[\/\-_.,]/g, " ")
      .split(/\s+/)
      .filter((w: string) => w.length > 2 && !/^\d+$/.test(w))
      .slice(0, 5);

    let elcCount = 0;
    let gazetteCount = 0;
    let communityCount = 0;
    let riparianCount = 0;
    let roadReserveCount = 0;
    let forestReserveCount = 0;

    let elcSamples: Array<Record<string, unknown>> = [];
    let gazetteSamples: Array<Record<string, unknown>> = [];
    let communitySamples: Array<Record<string, unknown>> = [];
    let riparianSamples: Array<Record<string, unknown>> = [];
    let roadReserveSamples: Array<Record<string, unknown>> = [];

    // Query every intelligence table in parallel
    const queries: PromiseLike<unknown>[] = [];

    // ── ELC Cases ─────────────────────────────────────────────
    // Match by: parcel_reference exact, court_station ILIKE county,
    // parties ILIKE county/location, case_number ILIKE location
    const elcOrClauses: string[] = [];
    if (extractedCounty) {
      elcOrClauses.push(`court_station.ilike.%${extractedCounty}%`);
      elcOrClauses.push(`parties.ilike.%${extractedCounty}%`);
    }
    for (const kw of locationKeywords) {
      elcOrClauses.push(`parties.ilike.%${kw}%`);
      elcOrClauses.push(`case_number.ilike.%${kw}%`);
    }
    if (elcOrClauses.length > 0) {
      queries.push(
        db
          .from("elc_cases")
          .select("case_number, parties, outcome, court_station, date_decided", { count: "exact" })
          .or(elcOrClauses.join(","))
          .limit(5)
          .then((res) => {
            elcCount = res.count || 0;
            elcSamples = (res.data || []) as Array<Record<string, unknown>>;
          })
      );
    }

    // Also query by exact parcel reference containment (catches direct matches)
    if (dbSearchRef) {
      queries.push(
        db
          .from("elc_cases")
          .select("case_number", { count: "exact", head: true })
          .contains("parcel_reference", [dbSearchRef])
          .then((res) => {
            if (res.count) elcCount += res.count;
          })
      );
    }

    // ── Gazette Notices ───────────────────────────────────────
    // Match by: county equality, description ILIKE keywords
    if (extractedCounty) {
      queries.push(
        db
          .from("gazette_notices")
          .select("id, notice_type, county, description, gazette_year", { count: "exact" })
          .ilike("county", `%${extractedCounty}%`)
          .limit(5)
          .then((res) => {
            gazetteCount = res.count || 0;
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
            if (res.count) gazetteCount += res.count;
          })
      );
    }

    // ── Community Flags ───────────────────────────────────────
    const communityOrClauses: string[] = [];
    if (extractedCounty) {
      communityOrClauses.push(`county.ilike.%${extractedCounty}%`);
      communityOrClauses.push(`description.ilike.%${extractedCounty}%`);
      communityOrClauses.push(`location.ilike.%${extractedCounty}%`);
    }
    for (const kw of locationKeywords) {
      communityOrClauses.push(`description.ilike.%${kw}%`);
      communityOrClauses.push(`location.ilike.%${kw}%`);
    }
    if (communityOrClauses.length > 0) {
      queries.push(
        db
          .from("community_flags")
          .select("id, category, county, description, status", { count: "exact" })
          .or(communityOrClauses.join(","))
          .limit(5)
          .then((res) => {
            communityCount = res.count || 0;
            communitySamples = (res.data || []) as Array<Record<string, unknown>>;
          })
      );
    }

    // ── Riparian Zones ────────────────────────────────────────
    // Match by county (the main way — titles don't carry river names)
    if (extractedCounty) {
      queries.push(
        db
          .from("riparian_zones")
          .select("id, name, water_type, buffer_metres, county", { count: "exact" })
          .ilike("county", `%${extractedCounty}%`)
          .limit(5)
          .then((res) => {
            riparianCount = res.count || 0;
            riparianSamples = (res.data || []) as Array<Record<string, unknown>>;
          })
      );
    }

    // ── Road Reserves ─────────────────────────────────────────
    // Match by counties array OR route_description ILIKE county
    if (extractedCounty) {
      queries.push(
        db
          .from("road_reserves")
          .select("id, road_name, road_class, reserve_width_metres, counties", { count: "exact" })
          .or(`counties.cs.{${extractedCounty}},route_description.ilike.%${extractedCounty}%,region.ilike.%${extractedCounty}%`)
          .limit(5)
          .then((res) => {
            roadReserveCount = res.count || 0;
            roadReserveSamples = (res.data || []) as Array<Record<string, unknown>>;
          })
      );
    }

    // ── Forest Reserves ───────────────────────────────────────
    // Forest reserves stored in riparian_zones with water_type='forest_reserve'.
    // County field is null on most forest rows (RCMRD data limitation), so we
    // match on name against county + location keywords as a fallback.
    const forestOrClauses: string[] = [];
    if (extractedCounty) {
      forestOrClauses.push(`name.ilike.%${extractedCounty}%`);
      forestOrClauses.push(`county.ilike.%${extractedCounty}%`);
    }
    for (const kw of locationKeywords) {
      forestOrClauses.push(`name.ilike.%${kw}%`);
    }
    if (forestOrClauses.length > 0) {
      queries.push(
        db
          .from("riparian_zones")
          .select("id", { count: "exact", head: true })
          .eq("water_type", "forest_reserve")
          .or(forestOrClauses.join(","))
          .then((res) => {
            forestReserveCount = res.count || 0;
          })
      );
    }

    // Execute all queries in parallel
    await Promise.allSettled(queries);

    console.log(
      `[HatiScan] DB cross-ref complete — county="${extractedCounty}", ` +
      `elc=${elcCount}, gazette=${gazetteCount}, community=${communityCount}, ` +
      `riparian=${riparianCount}, roads=${roadReserveCount}, forests=${forestReserveCount}`
    );

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

    // Database cross-reference — county-level matches are softer signals,
    // so we cap deductions (a county with many records shouldn't zero the score)
    score -= Math.min(elcCount, 5) * 5;
    score -= Math.min(gazetteCount, 5) * 5;
    score -= Math.min(communityCount, 5) * 10;
    score -= Math.min(roadReserveCount, 3) * 8;
    score -= Math.min(riparianCount, 3) * 5;

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
          database_hits: {
            elc: elcCount,
            gazette: gazetteCount,
            community: communityCount,
            riparian: riparianCount,
            road_reserves: roadReserveCount,
            forest_reserves: forestReserveCount,
          },
          samples: {
            elc: elcSamples,
            gazette: gazetteSamples,
            community: communitySamples,
            riparian: riparianSamples,
            road_reserves: roadReserveSamples,
          },
          fraud_patterns: fraudPatterns,
          intelligence_context_used: dbContext.length > 0,
          search_strategy: {
            county: extractedCounty || null,
            keywords: locationKeywords,
          },
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
      quality_notes: extractedFields.quality_notes || [],
      metadata: pdfMetadata,
      elc_cases_found: elcCount,
      gazette_hits: gazetteCount,
      community_flags: communityCount,
      riparian_zones_found: riparianCount,
      road_reserves_found: roadReserveCount,
      forest_reserves_found: forestReserveCount,
      matching_records: {
        elc: elcSamples,
        gazette: gazetteSamples,
        community: communitySamples,
        riparian: riparianSamples,
        road_reserves: roadReserveSamples,
      },
      search_strategy: {
        county: extractedCounty || null,
        keywords: locationKeywords,
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
