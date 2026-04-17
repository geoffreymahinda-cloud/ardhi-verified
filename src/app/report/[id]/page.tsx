import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import ParcelMapWrapper from "@/components/ParcelMapWrapper";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Parcel Report ${id} — Ardhi Verified`,
    description: `Full intelligence report for parcel ${id} including ownership, encumbrances, and spatial risk analysis.`,
  };
}

interface ParcelReport {
  parcel_id: number;
  parcel_reference: string | null;
  lr_number: string | null;
  block_number: string | null;
  county: string | null;
  area_sqm: number | null;
  confidence_score: number | null;
  ownership: {
    owner: string | null;
    owner_type: string | null;
    title_type: string | null;
    verified_date: string | null;
    source: string | null;
  } | null;
  encumbrances: Array<{
    type: string;
    holder: string;
    gazette_reference: string | null;
    date_registered: string | null;
  }>;
  intelligence: {
    dev_pressure_index: number | null;
    flood_risk: string | null;
    transaction_count_12m: number | null;
    last_transaction: string | null;
    is_sectional: boolean;
    zoning_class: string | null;
  } | null;
  data_sources: string[];
  last_updated: string | null;
  geometry: { type: string; coordinates: number[][][] } | null;
  sectional_development: {
    id: string;
    development_name: string;
    total_units: number | null;
  } | null;
}

async function fetchParcelReport(id: number): Promise<ParcelReport | null> {
  const db = createServiceClient();

  const { data: parcel, error } = await db
    .from("parcels")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !parcel) return null;

  let countyName = parcel.county_district || null;
  if (parcel.county_id) {
    const { data: county } = await db
      .from("counties")
      .select("name")
      .eq("id", parcel.county_id)
      .single();
    if (county) countyName = county.name;
  }

  const [ownershipRes, encumbrancesRes, intelligenceRes] = await Promise.all([
    db.from("ownership").select("*").eq("parcel_id", id).order("verified_date", { ascending: false }).limit(1),
    db.from("encumbrances").select("*").eq("parcel_id", id).order("date_registered", { ascending: false }),
    db.from("intelligence_layers").select("*").eq("parcel_id", id).single(),
  ]);

  const ownership = ownershipRes.data?.[0] || null;
  const encumbrances = encumbrancesRes.data || [];
  const intelligence = intelligenceRes.data || null;

  // Fetch geometry as GeoJSON
  const { data: geojson } = await db.rpc("get_parcel_geojson", { p_id: id });

  // Check for sectional development on this parcel
  const { data: sectDev } = await db
    .from("sectional_developments")
    .select("id, development_name, total_units")
    .eq("parent_parcel_id", id)
    .limit(1)
    .single();

  const dataSources: string[] = [];
  if (parcel.data_source) {
    dataSources.push(...parcel.data_source.split(",").map((s: string) => s.trim()));
  }

  return {
    parcel_id: parcel.id,
    parcel_reference: parcel.parcel_reference,
    lr_number: parcel.lr_number || null,
    block_number: parcel.block_number || null,
    county: countyName,
    area_sqm: parcel.area_sqm || (parcel.area_ha ? parcel.area_ha * 10000 : null),
    confidence_score: parcel.confidence_score ? parseFloat(parcel.confidence_score) : null,
    ownership: ownership ? {
      owner: ownership.owner_name,
      owner_type: ownership.owner_type,
      title_type: ownership.title_type,
      verified_date: ownership.verified_date,
      source: ownership.source,
    } : null,
    encumbrances: encumbrances.map((e: Record<string, string>) => ({
      type: e.encumbrance_type,
      holder: e.holder,
      gazette_reference: e.gazette_reference,
      date_registered: e.date_registered,
    })),
    intelligence: intelligence ? {
      dev_pressure_index: intelligence.dev_pressure_index ? parseFloat(intelligence.dev_pressure_index) : null,
      flood_risk: intelligence.flood_risk,
      transaction_count_12m: intelligence.transaction_count,
      last_transaction: intelligence.last_transaction,
      is_sectional: intelligence.is_sectional || parcel.is_sectional || false,
      zoning_class: intelligence.zoning_class,
    } : null,
    data_sources: dataSources,
    last_updated: parcel.last_updated || parcel.created_at,
    geometry: geojson || null,
    sectional_development: sectDev ? {
      id: sectDev.id,
      development_name: sectDev.development_name,
      total_units: sectDev.total_units,
    } : null,
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-sm text-muted">Not scored</span>;
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "bg-emerald-500 text-white" : pct >= 50 ? "bg-amber-500 text-white" : "bg-red-500 text-white";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${color}`}>
      {pct}%
    </span>
  );
}

function ConfidenceBar({ score }: { score: number | null }) {
  if (score === null) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted">County Coverage Score</span>
        <span className="text-xs font-bold text-navy">{pct}%</span>
      </div>
      <div className="h-2.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted">
        {pct >= 80 ? "High confidence — multiple official sources confirm this data" :
         pct >= 50 ? "Moderate confidence — some official sources confirm, verification recommended" :
         "Low confidence — limited official sources, physical verification strongly recommended"}
      </p>
    </div>
  );
}

export default async function ParcelReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parcelId = parseInt(id, 10);
  if (isNaN(parcelId)) notFound();

  const report = await fetchParcelReport(parcelId);
  if (!report) notFound();

  const displayRef = report.lr_number || report.block_number || report.parcel_reference || `Parcel #${report.parcel_id}`;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <section className="bg-navy px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <Link href="/hatiscan" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition mb-6">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to HatiScan
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl">{displayRef}</h1>
              {report.county && (
                <p className="mt-1 text-white/50">{report.county} County, Kenya</p>
              )}
              {report.area_sqm && (
                <p className="mt-1 text-sm text-white/30">{report.area_sqm.toLocaleString()} sqm</p>
              )}
            </div>
            <ConfidenceBadge score={report.confidence_score} />
          </div>

          {/* Reference numbers */}
          <div className="mt-6 flex flex-wrap gap-3">
            {report.lr_number && (
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 font-mono">
                LR: {report.lr_number}
              </span>
            )}
            {report.block_number && (
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 font-mono">
                Block: {report.block_number}
              </span>
            )}
            {report.parcel_reference && report.parcel_reference !== report.lr_number && report.parcel_reference !== report.block_number && (
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 font-mono">
                Ref: {report.parcel_reference}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Sectional Development Banner */}
        {report.sectional_development && (
          <div className="rounded-xl border border-[#c8a96e]/30 bg-[#c8a96e]/5 p-5 flex items-start gap-3">
            <svg className="h-5 w-5 text-[#c8a96e] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#c8a96e]">
                This parcel contains a registered sectional development
              </p>
              <p className="text-sm text-navy mt-1">
                <strong>{report.sectional_development.development_name}</strong>
                {report.sectional_development.total_units && (
                  <span className="text-muted"> — {report.sectional_development.total_units} units</span>
                )}
              </p>
              <Link
                href={`/sectional/${report.sectional_development.id}`}
                className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-[#c8a96e] hover:underline"
              >
                View sectional units
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Parcel Boundary Map */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-navy uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            Parcel Boundary
          </h2>
          {report.geometry ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Boundary data available
                </span>
              </div>
              <ParcelMapWrapper geometry={report.geometry} />
            </>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">Boundary data pending</p>
                <p className="text-xs text-amber-600 mt-1">Parcel boundary geometry will be available within 2 weeks as our data pipeline processes this area.</p>
              </div>
            </div>
          )}
        </div>

        {/* Confidence Score Bar */}
        <div className="rounded-xl border border-border bg-card p-5">
          <ConfidenceBar score={report.confidence_score} />
        </div>

        {/* Ownership Card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-navy uppercase tracking-wider mb-4 flex items-center gap-2">
            <svg className="h-4 w-4 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Ownership
          </h2>
          {report.ownership ? (
            <div className="space-y-3">
              <div>
                <p className="text-lg font-semibold text-navy">{report.ownership.owner || "Name not available"}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted">
                  {report.ownership.title_type && (
                    <span className="rounded-full bg-ardhi/10 px-2.5 py-0.5 text-xs font-medium text-ardhi capitalize">{report.ownership.title_type}</span>
                  )}
                  {report.ownership.owner_type && (
                    <span className="capitalize">{report.ownership.owner_type}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-muted border-t border-border pt-3">
                {report.ownership.verified_date && (
                  <div>
                    <span className="text-xs text-muted/60">Verified</span>
                    <p className="font-medium text-navy">{formatDate(report.ownership.verified_date)}</p>
                  </div>
                )}
                {report.ownership.source && (
                  <div>
                    <span className="text-xs text-muted/60">Source</span>
                    <p className="font-medium text-navy">{report.ownership.source}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">No ownership records found in the database. This may indicate the parcel has not yet been indexed from official sources.</p>
          )}
        </div>

        {/* Encumbrances Card */}
        <div className={`rounded-xl border p-5 ${
          report.encumbrances.length > 0
            ? "border-red-200 bg-red-50"
            : "border-emerald-200 bg-emerald-50"
        }`}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <svg className={`h-4 w-4 ${report.encumbrances.length > 0 ? "text-red-500" : "text-emerald-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {report.encumbrances.length > 0 ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <span className={report.encumbrances.length > 0 ? "text-red-700" : "text-emerald-700"}>
              Encumbrances ({report.encumbrances.length})
            </span>
          </h2>
          {report.encumbrances.length > 0 ? (
            <div className="space-y-3">
              {report.encumbrances.map((e, i) => (
                <div key={i} className="rounded-lg border border-red-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 uppercase">{e.type}</span>
                      <p className="mt-2 text-sm font-medium text-navy">{e.holder}</p>
                    </div>
                    {e.date_registered && (
                      <span className="text-xs text-muted whitespace-nowrap">{formatDate(e.date_registered)}</span>
                    )}
                  </div>
                  {e.gazette_reference && (
                    <p className="mt-1 text-xs text-muted font-mono">{e.gazette_reference}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-emerald-700 font-medium">No encumbrances found on this title.</p>
          )}
        </div>

        {/* Intelligence Panel */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-navy uppercase tracking-wider mb-4 flex items-center gap-2">
            <svg className="h-4 w-4 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
            Intelligence
          </h2>
          {report.intelligence ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {report.intelligence.dev_pressure_index !== null && (
                <div className="rounded-lg bg-bg p-3">
                  <span className="text-xs text-muted">Dev Pressure</span>
                  <p className="text-xl font-bold text-navy">{report.intelligence.dev_pressure_index.toFixed(1)}<span className="text-xs text-muted font-normal">/10</span></p>
                </div>
              )}
              {report.intelligence.flood_risk && (
                <div className="rounded-lg bg-bg p-3">
                  <span className="text-xs text-muted">Flood Risk</span>
                  <p className={`text-lg font-bold capitalize ${
                    report.intelligence.flood_risk === "high" ? "text-red-600" :
                    report.intelligence.flood_risk === "medium" ? "text-amber-600" : "text-emerald-600"
                  }`}>{report.intelligence.flood_risk}</p>
                </div>
              )}
              {report.intelligence.zoning_class && (
                <div className="rounded-lg bg-bg p-3">
                  <span className="text-xs text-muted">Zoning</span>
                  <p className="text-sm font-semibold text-navy">{report.intelligence.zoning_class}</p>
                </div>
              )}
              <div className="rounded-lg bg-bg p-3">
                <span className="text-xs text-muted">Transactions (12mo)</span>
                <p className="text-xl font-bold text-navy">{report.intelligence.transaction_count_12m ?? 0}</p>
              </div>
              {report.intelligence.last_transaction && (
                <div className="rounded-lg bg-bg p-3">
                  <span className="text-xs text-muted">Last Transaction</span>
                  <p className="text-sm font-semibold text-navy">{formatDate(report.intelligence.last_transaction)}</p>
                </div>
              )}
              <div className="rounded-lg bg-bg p-3">
                <span className="text-xs text-muted">Type</span>
                <p className="text-sm font-semibold text-navy">{report.intelligence.is_sectional ? `Sectional` : "Standard"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Intelligence data not yet computed for this parcel. Enrichment layers are populated by the data pipeline.</p>
          )}
        </div>

        {/* Data Sources Footer */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-navy uppercase tracking-wider mb-3">Data Sources</h2>
          {report.data_sources.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {report.data_sources.map((src, i) => (
                <span key={i} className="rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-muted">
                  {src}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No data source attribution available.</p>
          )}
          {report.last_updated && (
            <p className="mt-3 text-xs text-muted/60">
              Last updated: {formatDate(report.last_updated)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/hatiscan?parcel=${encodeURIComponent(report.parcel_reference || report.lr_number || '')}`}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-ardhi px-6 py-3 text-sm font-semibold text-white transition hover:bg-ardhi-dark"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Run Full HatiScan
          </Link>
          <Link
            href="/hatiscan"
            className="flex-1 inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-semibold text-navy transition hover:bg-bg"
          >
            Search Another Parcel
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-muted/50 text-center leading-relaxed">
          This report is generated from publicly available data sources and does not constitute legal advice.
          Always verify title status with the National Land Registry (Ardhisasa) and consult a licensed advocate
          before any land transaction. Data accuracy depends on source availability — see confidence score above.
        </p>
      </div>
    </div>
  );
}
