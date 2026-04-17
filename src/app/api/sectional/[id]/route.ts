import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/sectional/[id]
 * Full report for a sectional development — building info + all units.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServiceClient();

  // Fetch development
  const { data: dev, error } = await db
    .from("sectional_developments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !dev) {
    return Response.json({ error: "Sectional development not found" }, { status: 404 });
  }

  // Fetch county name
  let countyName = dev.location_description || null;
  if (dev.county_id) {
    const { data: county } = await db
      .from("counties")
      .select("name")
      .eq("id", dev.county_id)
      .single();
    if (county) countyName = county.name;
  }

  // Fetch all units with their ownership and encumbrances
  const { data: units } = await db
    .from("sectional_units")
    .select("*")
    .eq("development_id", id)
    .order("floor_level")
    .order("unit_number");

  const unitIds = (units || []).map((u) => u.id);

  // Batch fetch ownership and encumbrances for all units
  const [ownershipRes, encumbrancesRes] = await Promise.all([
    unitIds.length > 0
      ? db.from("sectional_ownership").select("*").in("unit_id", unitIds)
      : Promise.resolve({ data: [] }),
    unitIds.length > 0
      ? db.from("sectional_encumbrances").select("*").in("unit_id", unitIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Group by unit_id
  const ownershipByUnit = new Map<string, Record<string, unknown>[]>();
  for (const o of ownershipRes.data || []) {
    const list = ownershipByUnit.get(o.unit_id) || [];
    list.push(o);
    ownershipByUnit.set(o.unit_id, list);
  }

  const encumbrancesByUnit = new Map<string, Record<string, unknown>[]>();
  for (const e of encumbrancesRes.data || []) {
    const list = encumbrancesByUnit.get(e.unit_id) || [];
    list.push(e);
    encumbrancesByUnit.set(e.unit_id, list);
  }

  // Build unit details
  const unitDetails = (units || []).map((u) => {
    const ownership = ownershipByUnit.get(u.id)?.[0] || null;
    const encumbrances = encumbrancesByUnit.get(u.id) || [];

    return {
      id: u.id,
      unit_number: u.unit_number,
      floor_level: u.floor_level,
      unit_type: u.unit_type,
      area_sqm: u.area_sqm ? parseFloat(u.area_sqm) : null,
      lr_reference: u.lr_reference,
      title_number: u.title_number,
      ownership: ownership
        ? {
            owner: ownership.owner_name,
            owner_type: ownership.owner_type,
            title_type: ownership.title_type,
            verified_date: ownership.verified_date,
            source: ownership.source,
          }
        : null,
      encumbrances: encumbrances.map((e) => ({
        type: e.encumbrance_type,
        holder: e.holder,
        gazette_reference: e.gazette_reference,
        date_registered: e.date_registered,
      })),
    };
  });

  // Group units by floor
  const floors = new Map<number, typeof unitDetails>();
  for (const u of unitDetails) {
    const floor = u.floor_level ?? 0;
    const list = floors.get(floor) || [];
    list.push(u);
    floors.set(floor, list);
  }

  return Response.json({
    id: dev.id,
    development_name: dev.development_name,
    developer: dev.developer,
    sectional_plan_no: dev.sectional_plan_no,
    county: countyName,
    location_description: dev.location_description,
    total_units: dev.total_units,
    total_floors: dev.total_floors,
    registration_date: dev.registration_date,
    confidence_score: dev.confidence_score ? parseFloat(dev.confidence_score) : null,
    data_source: dev.data_source,
    units: unitDetails,
    floors: Object.fromEntries(floors),
    unit_summary: {
      total: unitDetails.length,
      with_ownership: unitDetails.filter((u) => u.ownership).length,
      with_encumbrances: unitDetails.filter((u) => u.encumbrances.length > 0).length,
      by_type: unitDetails.reduce(
        (acc, u) => {
          const t = u.unit_type || "unknown";
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
  });
}
