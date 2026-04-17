import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sectional Property Search — Ardhi Verified",
  description: "Search apartments, flats, and multi-unit developments by building name, developer, or unit number.",
};

export default async function SectionalSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  if (!q || !q.trim()) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#c8a96e]/10 border border-[#c8a96e]/30 px-4 py-1.5">
            <span className="text-sm font-medium text-[#c8a96e]">Sectional Titles</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-navy mb-4">Search Apartments &amp; Flats</h1>
          <form action="/sectional/search" method="GET" className="space-y-4">
            <input
              name="q"
              type="text"
              placeholder="Building name, developer, or unit number"
              className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm focus:border-ardhi focus:outline-none focus:ring-1 focus:ring-ardhi/30"
              autoFocus
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-[#c8a96e] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#b89a5e]"
            >
              Search
            </button>
          </form>
          <p className="mt-4 text-xs text-muted">
            Covers apartments, flats, and multi-unit developments not in Ardhisasa
          </p>
        </div>
      </div>
    );
  }

  const search = q.trim();
  const db = createServiceClient();

  // Search developments and units
  const [devRes, unitRes] = await Promise.all([
    db
      .from("sectional_developments")
      .select("id, development_name, developer, sectional_plan_no, total_units, total_floors, confidence_score, location_description")
      .or(`development_name.ilike.%${search}%,developer.ilike.%${search}%,sectional_plan_no.ilike.%${search}%,location_description.ilike.%${search}%`)
      .limit(20),
    db
      .from("sectional_units")
      .select("id, unit_number, floor_level, unit_type, area_sqm, lr_reference, development_id")
      .or(`lr_reference.ilike.%${search}%,title_number.ilike.%${search}%,unit_number.ilike.%${search}%`)
      .limit(20),
  ]);

  const developments = devRes.data || [];
  const units = unitRes.data || [];
  const totalResults = developments.length + units.length;

  // If exactly one development, redirect to its report
  if (developments.length === 1 && units.length === 0) {
    redirect(`/sectional/${developments[0].id}`);
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/sectional/search" className="text-sm text-ardhi hover:underline mb-4 inline-block">&larr; New search</Link>

        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-serif text-2xl font-bold text-navy">Sectional Search</h1>
          <span className="rounded-full bg-[#c8a96e]/10 border border-[#c8a96e]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#c8a96e] uppercase">
            Apartments &amp; Flats
          </span>
        </div>
        <p className="text-sm text-muted mb-6">
          {totalResults} result{totalResults !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
        </p>

        {/* Developments */}
        {developments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Developments</h2>
            <div className="space-y-3">
              {developments.map((d) => (
                <Link
                  key={d.id}
                  href={`/sectional/${d.id}`}
                  className="block rounded-xl border border-border bg-card p-5 transition hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-navy">{d.development_name}</span>
                        <span className="rounded-full bg-[#c8a96e]/10 px-2 py-0.5 text-[10px] font-bold text-[#c8a96e]">
                          Sectional
                        </span>
                      </div>
                      {d.developer && <p className="text-sm text-muted mt-0.5">by {d.developer}</p>}
                      {d.location_description && <p className="text-xs text-muted mt-1">{d.location_description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {d.total_units && (
                        <p className="text-sm font-bold text-navy">{d.total_units} units</p>
                      )}
                      {d.total_floors && (
                        <p className="text-xs text-muted">{d.total_floors} floors</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Units */}
        {units.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Individual Units</h2>
            <div className="space-y-3">
              {units.map((u) => (
                <Link
                  key={u.id}
                  href={`/sectional/${u.development_id}`}
                  className="block rounded-xl border border-border bg-card p-4 transition hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-navy">Unit {u.unit_number}</span>
                      {u.unit_type && (
                        <span className="ml-2 text-xs text-muted capitalize">{u.unit_type}</span>
                      )}
                      {u.lr_reference && (
                        <p className="text-xs text-muted font-mono mt-0.5">LR: {u.lr_reference}</p>
                      )}
                    </div>
                    {u.area_sqm && (
                      <span className="text-sm text-muted">{parseFloat(u.area_sqm)} sqm</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {totalResults === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted">No sectional properties found matching &ldquo;{search}&rdquo;</p>
            <p className="text-sm text-muted/60 mt-2">
              Try a different building name or use{" "}
              <Link href="/hatiscan" className="text-ardhi hover:underline">HatiScan</Link>{" "}
              to search by LR number instead.
            </p>
          </div>
        )}

        {/* Search again */}
        <form action="/sectional/search" method="GET" className="mt-8 flex gap-2">
          <input
            name="q"
            type="text"
            placeholder="Search another building..."
            className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-ardhi focus:outline-none focus:ring-1 focus:ring-ardhi/30"
          />
          <button type="submit" className="rounded-xl bg-[#c8a96e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#b89a5e]">
            Search
          </button>
        </form>
      </div>
    </div>
  );
}
