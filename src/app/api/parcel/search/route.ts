import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/parcel/search?lr=...&block=...&q=...
 * Search parcels by LR number, Block number, or free text.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const lr = url.searchParams.get("lr")?.trim();
  const block = url.searchParams.get("block")?.trim();
  const q = url.searchParams.get("q")?.trim();

  if (!lr && !block && !q) {
    return Response.json(
      { error: "Provide at least one search parameter: lr, block, or q" },
      { status: 400 }
    );
  }

  const db = createServiceClient();

  // LR number lookup — exact or partial match
  if (lr) {
    // Also check lr_block_lookup for cross-reference
    const [parcelRes, lookupRes] = await Promise.all([
      db
        .from("parcels")
        .select("*")
        .or(`lr_number.ilike.%${lr}%,parcel_reference.ilike.%${lr}%`)
        .order("confidence_score", { ascending: false })
        .limit(20),
      db
        .from("lr_block_lookup")
        .select("lr_number, block_number, confidence, source")
        .ilike("lr_number", `%${lr}%`)
        .limit(5),
    ]);

    return Response.json({
      query: { lr },
      results: (parcelRes.data || []).map(formatParcel),
      lr_block_matches: lookupRes.data || [],
      count: parcelRes.data?.length || 0,
    });
  }

  // Block number lookup
  if (block) {
    const [parcelRes, lookupRes] = await Promise.all([
      db
        .from("parcels")
        .select("*")
        .ilike("block_number", `%${block}%`)
        .order("confidence_score", { ascending: false })
        .limit(20),
      db
        .from("lr_block_lookup")
        .select("lr_number, block_number, confidence, source")
        .ilike("block_number", `%${block}%`)
        .limit(5),
    ]);

    return Response.json({
      query: { block },
      results: (parcelRes.data || []).map(formatParcel),
      lr_block_matches: lookupRes.data || [],
      count: parcelRes.data?.length || 0,
    });
  }

  // Free text search — matches parcel_reference, lr_number, block_number, or county
  if (q) {
    const { data, error } = await db
      .from("parcels")
      .select("*")
      .or(
        `parcel_reference.ilike.%${q}%,lr_number.ilike.%${q}%,block_number.ilike.%${q}%,county_district.ilike.%${q}%`
      )
      .order("confidence_score", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Parcel search error:", error.message);
      return Response.json({ error: "Search failed" }, { status: 500 });
    }

    return Response.json({
      query: { q },
      results: (data || []).map(formatParcel),
      count: data?.length || 0,
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
