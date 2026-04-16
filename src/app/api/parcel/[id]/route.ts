import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/parcel/[id]
 * Full intelligence report for one parcel by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parcelId = parseInt(id, 10);
  if (isNaN(parcelId)) {
    return Response.json({ error: "Invalid parcel ID" }, { status: 400 });
  }

  const db = createServiceClient();

  // Fetch parcel with county join
  const { data: parcel, error } = await db
    .from("parcels")
    .select("*")
    .eq("id", parcelId)
    .single();

  if (error || !parcel) {
    return Response.json({ error: "Parcel not found" }, { status: 404 });
  }

  // Fetch county name
  let countyName = parcel.county_district || null;
  if (parcel.county_id) {
    const { data: county } = await db
      .from("counties")
      .select("name")
      .eq("id", parcel.county_id)
      .single();
    if (county) countyName = county.name;
  }

  // Fetch ownership, encumbrances, intelligence in parallel
  const [ownershipRes, encumbrancesRes, intelligenceRes] = await Promise.all([
    db
      .from("ownership")
      .select("*")
      .eq("parcel_id", parcelId)
      .order("verified_date", { ascending: false })
      .limit(1),
    db
      .from("encumbrances")
      .select("*")
      .eq("parcel_id", parcelId)
      .order("date_registered", { ascending: false }),
    db
      .from("intelligence_layers")
      .select("*")
      .eq("parcel_id", parcelId)
      .single(),
  ]);

  const ownership = ownershipRes.data?.[0] || null;
  const encumbrances = encumbrancesRes.data || [];
  const intelligence = intelligenceRes.data || null;

  // Build data_sources array
  const dataSources: string[] = [];
  if (parcel.data_source) {
    dataSources.push(...parcel.data_source.split(",").map((s: string) => s.trim()));
  }

  // Standard response shape (Section 5 of brief)
  return Response.json({
    parcel_id: parcel.id,
    parcel_reference: parcel.parcel_reference,
    lr_number: parcel.lr_number || null,
    block_number: parcel.block_number || null,
    county: countyName,
    area_sqm: parcel.area_sqm || (parcel.area_ha ? parcel.area_ha * 10000 : null),
    confidence_score: parcel.confidence_score ? parseFloat(parcel.confidence_score) : null,
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
    intelligence: intelligence
      ? {
          dev_pressure_index: intelligence.dev_pressure_index
            ? parseFloat(intelligence.dev_pressure_index)
            : null,
          flood_risk: intelligence.flood_risk,
          transaction_count_12m: intelligence.transaction_count,
          last_transaction: intelligence.last_transaction,
          is_sectional: intelligence.is_sectional || parcel.is_sectional || false,
          zoning_class: intelligence.zoning_class,
        }
      : null,
    data_sources: dataSources,
    last_updated: parcel.last_updated || parcel.created_at,
  });
}
