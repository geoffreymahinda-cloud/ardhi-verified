import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/parcel/bulk
 * Batch lookup — accepts array of parcel IDs or references.
 * For bank/insurer portfolio verification.
 * Body: { "parcel_ids": [1, 2, 3] } or { "references": ["LR 1234", "LR 5678"] }
 */
export async function POST(request: NextRequest) {
  let body: { parcel_ids?: number[]; references?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { parcel_ids, references } = body;

  if (!parcel_ids?.length && !references?.length) {
    return Response.json(
      { error: "Provide parcel_ids (array of integers) or references (array of strings)" },
      { status: 400 }
    );
  }

  // Cap at 100 per request
  const MAX_BATCH = 100;

  const db = createServiceClient();

  if (parcel_ids?.length) {
    const ids = parcel_ids.slice(0, MAX_BATCH);
    const { data, error } = await db
      .from("parcels")
      .select("*")
      .in("id", ids);

    if (error) {
      console.error("Bulk parcel lookup error:", error.message);
      return Response.json({ error: "Lookup failed" }, { status: 500 });
    }

    return Response.json({
      query: { parcel_ids: ids },
      results: (data || []).map(formatParcel),
      count: data?.length || 0,
      truncated: parcel_ids.length > MAX_BATCH,
    });
  }

  if (references?.length) {
    const refs = references.slice(0, MAX_BATCH);
    // Search across parcel_reference, lr_number, and block_number
    const { data, error } = await db
      .from("parcels")
      .select("*")
      .or(
        refs
          .map(
            (r) =>
              `parcel_reference.eq.${r},lr_number.eq.${r},block_number.eq.${r}`
          )
          .join(",")
      );

    if (error) {
      console.error("Bulk reference lookup error:", error.message);
      return Response.json({ error: "Lookup failed" }, { status: 500 });
    }

    return Response.json({
      query: { references: refs },
      results: (data || []).map(formatParcel),
      count: data?.length || 0,
      truncated: references.length > MAX_BATCH,
    });
  }

  return Response.json({ results: [], count: 0 });
}

function formatParcel(p: Record<string, unknown>) {
  return {
    parcel_id: p.id,
    parcel_reference: p.parcel_reference,
    lr_number: p.lr_number || null,
    block_number: p.block_number || null,
    county: p.county_district || null,
    area_sqm: p.area_sqm || (p.area_ha ? (p.area_ha as number) * 10000 : null),
    confidence_score: p.confidence_score
      ? parseFloat(p.confidence_score as string)
      : null,
    data_source: p.data_source || null,
    is_sectional: p.is_sectional || false,
    last_updated: p.last_updated || p.created_at,
  };
}
