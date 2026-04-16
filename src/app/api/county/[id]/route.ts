import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/county/[id]/summary
 * County-level aggregate stats — parcel count, avg confidence, risk breakdown.
 * Also accepts county name: GET /api/county/Nairobi
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServiceClient();

  // Try numeric ID first, then name lookup
  const numericId = parseInt(id, 10);
  let county;

  if (!isNaN(numericId)) {
    const { data } = await db
      .from("counties")
      .select("*")
      .eq("id", numericId)
      .single();
    county = data;
  } else {
    const { data } = await db
      .from("counties")
      .select("*")
      .ilike("name", id)
      .single();
    county = data;
  }

  if (!county) {
    return Response.json({ error: "County not found" }, { status: 404 });
  }

  // Aggregate stats from parcels in this county
  const { data: parcels } = await db
    .from("parcels")
    .select("id, confidence_score, data_source, is_sectional")
    .eq("county_district", county.name);

  const parcelList = parcels || [];
  const total = parcelList.length;

  const avgConfidence =
    total > 0
      ? parcelList.reduce(
          (sum, p) => sum + (parseFloat(p.confidence_score) || 0),
          0
        ) / total
      : 0;

  const sectionalCount = parcelList.filter((p) => p.is_sectional).length;

  // Count by data source
  const sourceCounts: Record<string, number> = {};
  for (const p of parcelList) {
    const src = p.data_source || "unknown";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }

  // Spatial risk summary for this county
  const [protectedRes, floodRes, roadRes] = await Promise.all([
    db
      .from("protected_zones")
      .select("id", { count: "exact", head: true })
      .ilike("county", `%${county.name}%`),
    db
      .from("flood_zones")
      .select("id", { count: "exact", head: true })
      .ilike("county", `%${county.name}%`),
    db
      .from("road_reserves")
      .select("id", { count: "exact", head: true })
      .or(
        `counties.cs.{${county.name}},route_description.ilike.%${county.name}%`
      ),
  ]);

  return Response.json({
    county: {
      id: county.id,
      name: county.name,
      code: county.code,
      area_sqkm: county.area_sqkm,
      population: county.population,
    },
    parcels: {
      total,
      avg_confidence_score: Math.round(avgConfidence * 100) / 100,
      sectional_count: sectionalCount,
      by_data_source: sourceCounts,
    },
    spatial_risks: {
      protected_zones: protectedRes.count || 0,
      flood_zones: floodRes.count || 0,
      road_reserves: roadRes.count || 0,
    },
  });
}
