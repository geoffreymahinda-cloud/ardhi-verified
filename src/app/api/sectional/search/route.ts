import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/sectional/search?q=...&unit=...&development=...
 * Search sectional developments and units.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const unit = url.searchParams.get("unit")?.trim();
  const development = url.searchParams.get("development")?.trim();

  if (!q && !unit && !development) {
    return Response.json(
      { error: "Provide at least one: q, unit, or development" },
      { status: 400 }
    );
  }

  const db = createServiceClient();

  // Search by unit LR reference or title number
  if (unit) {
    const { data: units } = await db
      .from("sectional_units")
      .select("*, sectional_developments!inner(id, development_name, developer, county_id, total_units, total_floors, confidence_score)")
      .or(`lr_reference.ilike.%${unit}%,title_number.ilike.%${unit}%,unit_number.ilike.%${unit}%`)
      .limit(20);

    return Response.json({
      query: { unit },
      type: "unit",
      results: (units || []).map(formatUnit),
      count: units?.length || 0,
    });
  }

  // Search by development name
  if (development) {
    const { data: devs } = await db
      .from("sectional_developments")
      .select("*")
      .or(`development_name.ilike.%${development}%,developer.ilike.%${development}%,sectional_plan_no.ilike.%${development}%`)
      .order("confidence_score", { ascending: false })
      .limit(20);

    return Response.json({
      query: { development },
      type: "development",
      results: (devs || []).map(formatDevelopment),
      count: devs?.length || 0,
    });
  }

  // Free text — search both developments and units
  if (q) {
    const [devRes, unitRes] = await Promise.all([
      db
        .from("sectional_developments")
        .select("*")
        .or(`development_name.ilike.%${q}%,developer.ilike.%${q}%,sectional_plan_no.ilike.%${q}%,location_description.ilike.%${q}%`)
        .order("confidence_score", { ascending: false })
        .limit(10),
      db
        .from("sectional_units")
        .select("*, sectional_developments!inner(id, development_name, developer, county_id, total_units, total_floors, confidence_score)")
        .or(`lr_reference.ilike.%${q}%,title_number.ilike.%${q}%,unit_number.ilike.%${q}%`)
        .limit(10),
    ]);

    return Response.json({
      query: { q },
      type: "combined",
      developments: (devRes.data || []).map(formatDevelopment),
      units: (unitRes.data || []).map(formatUnit),
      total_count: (devRes.data?.length || 0) + (unitRes.data?.length || 0),
    });
  }

  return Response.json({ results: [], count: 0 });
}

function formatDevelopment(d: Record<string, unknown>) {
  return {
    id: d.id,
    type: "development",
    development_name: d.development_name,
    developer: d.developer,
    sectional_plan_no: d.sectional_plan_no,
    total_units: d.total_units,
    total_floors: d.total_floors,
    confidence_score: d.confidence_score ? parseFloat(d.confidence_score as string) : null,
    data_source: d.data_source,
  };
}

function formatUnit(u: Record<string, unknown>) {
  const dev = u.sectional_developments as Record<string, unknown> | undefined;
  return {
    id: u.id,
    type: "unit",
    unit_number: u.unit_number,
    floor_level: u.floor_level,
    unit_type: u.unit_type,
    area_sqm: u.area_sqm ? parseFloat(u.area_sqm as string) : null,
    lr_reference: u.lr_reference,
    title_number: u.title_number,
    development: dev
      ? {
          id: dev.id,
          name: dev.development_name,
          developer: dev.developer,
          total_units: dev.total_units,
          total_floors: dev.total_floors,
        }
      : null,
  };
}
