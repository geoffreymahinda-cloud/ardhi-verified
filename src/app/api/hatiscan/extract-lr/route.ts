import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const EXTRACTION_PROMPT = `You are a Kenya land title deed expert. Extract the following fields from this document image:

1. **LR Number** — The Land Reference number. Formats include:
   - "LR No. 1234/56", "LR 209/21922", "L.R. NO. 12807/214"
   - "I.R. 12345" (Islamic Registry), "F.R. 1234" (Freehold Registry)
   - "C.R. 1234" (Coastal Registry)
   - New Nairobi format: "Nairobi Block 45/78", "NAIROBI/BLOCK/45/78"
   - Title numbers like "T.N. 12345"

2. **Block Number** — If this is a Nairobi property with a block number format like "Block 45/78" or "Nairobi/Block/45/78"

3. **County** — The county where the property is located (one of Kenya's 47 counties)

4. **Registered Owner** — The name of the registered owner/proprietor

5. **Property Description** — Brief description of the property (area, location, use)

6. **Registration Date** — When the title was registered

7. **Title Type** — "freehold", "leasehold", or "sectional"

8. **Is Sectional** — true if this is a sectional title deed (apartment/flat/unit in a building). Sectional deeds reference: "Sectional Plan No.", "Unit No.", "S.P. No.", development name, and a parent LR number. Set to false for standard freehold/leasehold.

9. **Sectional Plan Number** — If sectional, the plan number (e.g., "S.P. No. 1234")

10. **Unit Number** — If sectional, the unit number (e.g., "Unit 5A")

11. **Development Name** — If sectional, the name of the building/development

12. **Parent LR Number** — If sectional, the underlying land parcel LR number

Return a JSON object with these fields. Use null for any field you cannot find or are unsure about. Include a "confidence" field (0.0-1.0) indicating your overall confidence in the extraction.

Example freehold response:
{
  "lr_number": "LR 209/21922",
  "block_number": null,
  "county": "Nairobi",
  "registered_owner": "John Kamau Mwangi",
  "property_description": "All that parcel of land situate in Nairobi, 0.045 hectares",
  "registration_date": "2019-03-15",
  "title_type": "freehold",
  "is_sectional": false,
  "sectional_plan_no": null,
  "unit_number": null,
  "development_name": null,
  "parent_lr_number": null,
  "confidence": 0.85
}

Example sectional response:
{
  "lr_number": null,
  "block_number": null,
  "county": "Nairobi",
  "registered_owner": "Jane Wanjiku",
  "property_description": "Unit 5A, 3rd Floor, Sunrise Apartments, Kilimani",
  "registration_date": "2022-06-10",
  "title_type": "sectional",
  "is_sectional": true,
  "sectional_plan_no": "S.P. No. 4567",
  "unit_number": "5A",
  "development_name": "Sunrise Apartments",
  "parent_lr_number": "LR 209/21922",
  "confidence": 0.80
}

Return ONLY the JSON object. No preamble or explanation.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return Response.json(
        { error: "Unsupported file type. Upload a JPG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return Response.json(
        { error: "File too large. Maximum 10MB." },
        { status: 400 }
      );
    }

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    // Call Claude Vision
    const message = await anthropic.messages.create({
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
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    // Parse Claude's response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let extracted;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      console.error("Failed to parse Claude response:", responseText);
      return Response.json(
        {
          error: "Could not extract fields from this image",
          raw_response: responseText,
          confidence: 0,
        },
        { status: 422 }
      );
    }

    return Response.json({
      lr_number: extracted.lr_number || null,
      block_number: extracted.block_number || null,
      county: extracted.county || null,
      registered_owner: extracted.registered_owner || null,
      property_description: extracted.property_description || null,
      registration_date: extracted.registration_date || null,
      title_type: extracted.title_type || null,
      is_sectional: extracted.is_sectional || false,
      sectional_plan_no: extracted.sectional_plan_no || null,
      unit_number: extracted.unit_number || null,
      development_name: extracted.development_name || null,
      parent_lr_number: extracted.parent_lr_number || null,
      confidence: extracted.confidence ?? 0.5,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("LR extraction error:", message);
    return Response.json(
      { error: "Failed to analyze document", detail: message },
      { status: 500 }
    );
  }
}
