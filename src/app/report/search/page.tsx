import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Parcel Search — Ardhi Verified",
  description: "Search for a parcel by LR number, Block number, or reference to view its full intelligence report.",
};

export default async function ReportSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  if (!q || !q.trim()) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="font-serif text-2xl font-bold text-navy mb-4">Search Parcel Registry</h1>
          <form action="/report/search" method="GET" className="space-y-4">
            <input
              name="q"
              type="text"
              placeholder="Enter LR number, Block number, or title reference"
              className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm focus:border-ardhi focus:outline-none focus:ring-1 focus:ring-ardhi/30"
              autoFocus
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-ardhi px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-ardhi-dark"
            >
              Search
            </button>
          </form>
          <p className="mt-4 text-xs text-muted">
            Examples: LR 209/21922, Nairobi Block 45/78, I.R. 12345
          </p>
        </div>
      </div>
    );
  }

  const search = q.trim();
  const db = createServiceClient();

  // Try exact match first, then partial
  const { data: results } = await db
    .from("parcels")
    .select("id, parcel_reference, lr_number, block_number, county_district, confidence_score")
    .or(`parcel_reference.eq.${search},lr_number.ilike.%${search}%,block_number.ilike.%${search}%`)
    .order("confidence_score", { ascending: false })
    .limit(20);

  // If exactly one result, redirect straight to the report
  if (results && results.length === 1) {
    redirect(`/report/${results[0].id}`);
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/report/search" className="text-sm text-ardhi hover:underline mb-4 inline-block">&larr; New search</Link>

        <h1 className="font-serif text-2xl font-bold text-navy mb-2">
          Search Results
        </h1>
        <p className="text-sm text-muted mb-6">
          {results?.length || 0} parcel{results?.length !== 1 ? "s" : ""} found for &ldquo;{search}&rdquo;
        </p>

        {results && results.length > 0 ? (
          <div className="space-y-3">
            {results.map((p) => {
              const pct = p.confidence_score ? Math.round(parseFloat(p.confidence_score) * 100) : null;
              const color = pct !== null ? (pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500") : "bg-gray-300";
              return (
                <Link
                  key={p.id}
                  href={`/report/${p.id}`}
                  className="block rounded-xl border border-border bg-card p-4 transition hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-navy truncate">
                        {p.lr_number || p.block_number || p.parcel_reference}
                      </p>
                      <p className="text-sm text-muted mt-0.5">
                        {p.county_district && `${p.county_district} County`}
                        {p.lr_number && p.block_number && ` · Block ${p.block_number}`}
                      </p>
                    </div>
                    {pct !== null && (
                      <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white ${color}`}>
                        {pct}%
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted">No parcels found matching &ldquo;{search}&rdquo;</p>
            <p className="text-sm text-muted/60 mt-2">
              Try a different LR number or use{" "}
              <Link href="/hatiscan" className="text-ardhi hover:underline">HatiScan</Link>{" "}
              to scan any title against our intelligence database.
            </p>
          </div>
        )}

        {/* Search another */}
        <form action="/report/search" method="GET" className="mt-8 flex gap-2">
          <input
            name="q"
            type="text"
            placeholder="Search another parcel..."
            defaultValue=""
            className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-ardhi focus:outline-none focus:ring-1 focus:ring-ardhi/30"
          />
          <button
            type="submit"
            className="rounded-xl bg-ardhi px-6 py-3 text-sm font-semibold text-white transition hover:bg-ardhi-dark"
          >
            Search
          </button>
        </form>
      </div>
    </div>
  );
}
