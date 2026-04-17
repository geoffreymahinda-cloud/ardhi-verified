import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Sectional Report — Ardhi Verified`,
    description: `Sectional development report for ${id}`,
  };
}

interface UnitDetail {
  id: string;
  unit_number: string;
  floor_level: number | null;
  unit_type: string | null;
  area_sqm: number | null;
  lr_reference: string | null;
  title_number: string | null;
  ownership: {
    owner: string | null;
    owner_type: string | null;
    verified_date: string | null;
  } | null;
  encumbrances: Array<{
    type: string;
    holder: string;
    gazette_reference: string | null;
  }>;
}

async function fetchSectionalReport(id: string) {
  const db = createServiceClient();

  const { data: dev, error } = await db
    .from("sectional_developments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !dev) return null;

  let countyName: string | null = null;
  if (dev.county_id) {
    const { data: county } = await db
      .from("counties")
      .select("name")
      .eq("id", dev.county_id)
      .single();
    if (county) countyName = county.name;
  }

  const { data: units } = await db
    .from("sectional_units")
    .select("*")
    .eq("development_id", id)
    .order("floor_level")
    .order("unit_number");

  const unitIds = (units || []).map((u) => u.id);

  const [ownerRes, encumRes] = await Promise.all([
    unitIds.length > 0
      ? db.from("sectional_ownership").select("*").in("unit_id", unitIds)
      : Promise.resolve({ data: [] }),
    unitIds.length > 0
      ? db.from("sectional_encumbrances").select("*").in("unit_id", unitIds)
      : Promise.resolve({ data: [] }),
  ]);

  const ownerByUnit = new Map<string, Record<string, unknown>>();
  for (const o of ownerRes.data || []) {
    ownerByUnit.set(o.unit_id, o);
  }
  const encumByUnit = new Map<string, Record<string, unknown>[]>();
  for (const e of encumRes.data || []) {
    const list = encumByUnit.get(e.unit_id) || [];
    list.push(e);
    encumByUnit.set(e.unit_id, list);
  }

  const unitDetails: UnitDetail[] = (units || []).map((u) => {
    const owner = ownerByUnit.get(u.id);
    const encums = encumByUnit.get(u.id) || [];
    return {
      id: u.id,
      unit_number: u.unit_number,
      floor_level: u.floor_level,
      unit_type: u.unit_type,
      area_sqm: u.area_sqm ? parseFloat(u.area_sqm) : null,
      lr_reference: u.lr_reference,
      title_number: u.title_number,
      ownership: owner
        ? { owner: owner.owner_name as string, owner_type: owner.owner_type as string, verified_date: owner.verified_date as string }
        : null,
      encumbrances: encums.map((e) => ({
        type: e.encumbrance_type as string,
        holder: e.holder as string,
        gazette_reference: e.gazette_reference as string | null,
      })),
    };
  });

  // Group by floor
  const floorMap = new Map<number, UnitDetail[]>();
  for (const u of unitDetails) {
    const f = u.floor_level ?? 0;
    const list = floorMap.get(f) || [];
    list.push(u);
    floorMap.set(f, list);
  }

  return {
    ...dev,
    county: countyName || dev.location_description,
    units: unitDetails,
    floors: Array.from(floorMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([level, floorUnits]) => ({ level, units: floorUnits })),
    summary: {
      total: unitDetails.length,
      with_ownership: unitDetails.filter((u) => u.ownership).length,
      with_encumbrances: unitDetails.filter((u) => u.encumbrances.length > 0).length,
      residential: unitDetails.filter((u) => u.unit_type === "residential").length,
      commercial: unitDetails.filter((u) => u.unit_type === "commercial").length,
      parking: unitDetails.filter((u) => u.unit_type === "parking").length,
    },
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function SectionalReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await fetchSectionalReport(id);
  if (!report) notFound();

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <section className="bg-navy px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <Link href="/hatiscan" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition mb-6">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to HatiScan
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <span className="rounded-full bg-[#c8a96e]/20 border border-[#c8a96e]/30 px-3 py-0.5 text-xs font-bold text-[#c8a96e] uppercase tracking-wider">
              Sectional Title
            </span>
            {report.confidence_score && (
              <span className={`rounded-full px-3 py-0.5 text-xs font-bold text-white ${
                parseFloat(report.confidence_score) >= 0.8 ? "bg-emerald-500" :
                parseFloat(report.confidence_score) >= 0.5 ? "bg-amber-500" : "bg-red-500"
              }`}>
                {Math.round(parseFloat(report.confidence_score) * 100)}%
              </span>
            )}
          </div>

          <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl">
            {report.development_name}
          </h1>
          {report.developer && (
            <p className="mt-1 text-white/50">by {report.developer}</p>
          )}
          {report.county && (
            <p className="mt-1 text-sm text-white/30">{report.county}</p>
          )}

          {/* Quick stats */}
          <div className="mt-6 flex flex-wrap gap-4">
            {report.total_floors && (
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2">
                <span className="text-xl font-bold text-white">{report.total_floors}</span>
                <span className="ml-1.5 text-xs text-white/40">floors</span>
              </div>
            )}
            {report.total_units && (
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2">
                <span className="text-xl font-bold text-white">{report.total_units}</span>
                <span className="ml-1.5 text-xs text-white/40">units</span>
              </div>
            )}
            {report.sectional_plan_no && (
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2">
                <span className="text-sm font-mono text-white/70">{report.sectional_plan_no}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Unit Summary */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-navy uppercase tracking-wider mb-4">Unit Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-bg p-3 text-center">
              <div className="text-2xl font-bold text-navy">{report.summary.total}</div>
              <div className="text-xs text-muted">Total Units</div>
            </div>
            <div className="rounded-lg bg-bg p-3 text-center">
              <div className="text-2xl font-bold text-navy">{report.summary.with_ownership}</div>
              <div className="text-xs text-muted">With Ownership</div>
            </div>
            <div className="rounded-lg bg-bg p-3 text-center">
              <div className="text-2xl font-bold text-navy">{report.summary.with_encumbrances}</div>
              <div className="text-xs text-muted">Encumbered</div>
            </div>
            <div className="rounded-lg bg-bg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {report.summary.total - report.summary.with_encumbrances}
              </div>
              <div className="text-xs text-muted">Clear</div>
            </div>
          </div>
        </div>

        {/* Floor-by-floor unit listing */}
        {report.floors.map((floor: { level: number; units: UnitDetail[] }) => (
          <div key={floor.level} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="bg-navy/5 px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-navy">
                {floor.level === 0 ? "Ground Floor" : `Floor ${floor.level}`}
                <span className="ml-2 text-xs font-normal text-muted">
                  ({floor.units.length} unit{floor.units.length !== 1 ? "s" : ""})
                </span>
              </h3>
            </div>
            <div className="divide-y divide-border">
              {floor.units.map((unit) => (
                <div key={unit.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-navy">Unit {unit.unit_number}</span>
                        {unit.unit_type && (
                          <span className="rounded-full bg-ardhi/10 px-2 py-0.5 text-[10px] font-medium text-ardhi capitalize">
                            {unit.unit_type}
                          </span>
                        )}
                        {unit.encumbrances.length > 0 && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                            {unit.encumbrances.length} encumbrance{unit.encumbrances.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {unit.lr_reference && (
                        <p className="text-xs text-muted font-mono mt-1">LR: {unit.lr_reference}</p>
                      )}
                      {unit.ownership && (
                        <p className="text-sm text-muted mt-1">
                          Owner: <span className="text-navy font-medium">{unit.ownership.owner || "—"}</span>
                          {unit.ownership.verified_date && (
                            <span className="text-xs text-muted ml-2">Verified {formatDate(unit.ownership.verified_date)}</span>
                          )}
                        </p>
                      )}
                      {unit.encumbrances.map((e, i) => (
                        <p key={i} className="text-xs text-red-600 mt-1">
                          {e.type}: {e.holder}
                          {e.gazette_reference && <span className="text-muted ml-1">({e.gazette_reference})</span>}
                        </p>
                      ))}
                    </div>
                    {unit.area_sqm && (
                      <span className="text-sm text-muted whitespace-nowrap">{unit.area_sqm} sqm</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {report.units.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted">No individual unit records have been loaded for this development yet.</p>
            <p className="text-sm text-muted/60 mt-2">
              Unit data is populated from gazette notices and survey plans as they become available.
            </p>
          </div>
        )}

        {/* Data source */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-navy">Data Source</h2>
              <p className="text-xs text-muted mt-1">{report.data_source || "Multiple sources"}</p>
            </div>
            {report.registration_date && (
              <div className="text-right">
                <p className="text-xs text-muted">Registered</p>
                <p className="text-sm font-medium text-navy">{formatDate(report.registration_date)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/hatiscan?parcel=${encodeURIComponent(report.sectional_plan_no || report.development_name)}`}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-ardhi px-6 py-3 text-sm font-semibold text-white transition hover:bg-ardhi-dark"
          >
            Run HatiScan on this development
          </Link>
          <Link
            href="/hatiscan"
            className="flex-1 inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-semibold text-navy transition hover:bg-bg"
          >
            Search Another Property
          </Link>
        </div>

        <p className="text-[11px] text-muted/50 text-center leading-relaxed">
          Sectional title data is compiled from gazette notices, county records, and developer submissions.
          Individual unit ownership should be verified at the National Land Registry before any transaction.
        </p>
      </div>
    </div>
  );
}
