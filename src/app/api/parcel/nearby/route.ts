import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/parcel/nearby?lat=...&lng=...&radius=200
 * Find parcels within a radius (metres) of a point using PostGIS.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lng = parseFloat(url.searchParams.get("lng") || "");
  const radius = parseInt(url.searchParams.get("radius") || "200", 10);

  if (isNaN(lat) || isNaN(lng)) {
    return Response.json(
      { error: "lat and lng are required numeric parameters" },
      { status: 400 }
    );
  }

  if (lat < -5 || lat > 5.5 || lng < 33 || lng > 42) {
    return Response.json(
      { error: "Coordinates must be within Kenya (lat -5 to 5.5, lng 33 to 42)" },
      { status: 400 }
    );
  }

  const clampedRadius = Math.min(Math.max(radius, 50), 5000);

  const db = createServiceClient();

  // Use PostGIS RPC for spatial proximity search
  const { data, error } = await db.rpc("find_parcels_nearby", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: clampedRadius,
  });

  if (error) {
    // If RPC doesn't exist yet, fall back to a basic query
    if (error.message.includes("function") || error.code === "42883") {
      return Response.json({
        query: { lat, lng, radius: clampedRadius },
        results: [],
        count: 0,
        note: "Spatial search RPC not yet deployed. Run the create_nearby_rpc migration.",
      });
    }
    console.error("Nearby search error:", error.message);
    return Response.json({ error: "Spatial search failed" }, { status: 500 });
  }

  return Response.json({
    query: { lat, lng, radius: clampedRadius },
    results: data || [],
    count: data?.length || 0,
  });
}
