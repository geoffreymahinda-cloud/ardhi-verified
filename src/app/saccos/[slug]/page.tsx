import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getInstitutionBySlug, getListingsByInstitution } from "@/lib/data.server";
import PropertyCard from "@/components/ui/PropertyCard";

export const dynamic = "force-dynamic";

const tierStyles: Record<string, { bg: string; text: string; label: string }> = {
  sacco: { bg: "bg-teal-600", text: "text-white", label: "SACCO Partner" },
  bank: { bg: "bg-navy", text: "text-white", label: "Banking Partner" },
  developer: { bg: "bg-[#C4A44A]", text: "text-navy", label: "Verified Developer" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const institution = await getInstitutionBySlug(slug);

  if (!institution) return { title: "Partner Not Found" };

  return {
    title: `${institution.name} — Ardhi Verified Partner`,
    description: institution.description || `${institution.name} is a verified ${institution.tier} partner of Ardhi Verified. Browse their available land listings.`,
  };
}

export default async function InstitutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const institution = await getInstitutionBySlug(slug);
  if (!institution) return notFound();

  const listings = await getListingsByInstitution(institution.id);
  const style = tierStyles[institution.tier] || tierStyles.sacco;

  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-4 pb-12 pt-20 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Logo placeholder */}
            <div className="h-20 w-20 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-white">{institution.name.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">{institution.name}</h1>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
              <p className="text-white/60">
                {institution.institutionType}
                {institution.foundedYear ? ` · Established ${institution.foundedYear}` : ""}
                {institution.memberCount ? ` · ${institution.memberCount.toLocaleString()} members` : ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-ardhi px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-8 sm:gap-16 text-center text-white">
          <div>
            <span className="text-2xl font-bold">{listings.length}</span>
            <span className="ml-1.5 text-sm text-white/80">plots available</span>
          </div>
          <div className="hidden h-5 w-px bg-white/30 sm:block" />
          <div>
            <span className="text-sm text-white/80">Partner since {institution.foundedYear ? "2026" : "2026"}</span>
          </div>
          {institution.verifiedPartner && (
            <>
              <div className="hidden h-5 w-px bg-white/30 sm:block" />
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-white/80">Verified Partner</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="bg-bg px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          {/* About */}
          {institution.description && (
            <div className="mb-12 max-w-3xl">
              <h2 className="font-serif text-xl font-bold text-navy mb-3">About {institution.name}</h2>
              <p className="text-muted leading-relaxed">{institution.description}</p>
              {institution.contactEmail && (
                <p className="mt-4 text-sm text-muted">
                  Contact: <a href={`mailto:${institution.contactEmail}`} className="text-ardhi hover:text-ardhi-dark">{institution.contactEmail}</a>
                </p>
              )}
            </div>
          )}

          {/* Available plots */}
          <div>
            <h2 className="font-serif text-xl font-bold text-navy mb-6">
              Available Plots ({listings.length})
            </h2>

            {listings.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <p className="text-muted mb-4">No plots currently available from {institution.name}.</p>
                <Link href="/browse" className="text-sm font-medium text-ardhi hover:text-ardhi-dark">Browse all listings →</Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing) => (
                  <PropertyCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-xl font-bold text-white mb-3">
            Interested in {institution.name} plots?
          </h2>
          <p className="text-white/60 text-sm mb-6">
            Browse the available listings above, or speak to an Ardhi Verified advisor for guidance.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/browse" className="rounded-lg bg-ardhi px-6 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">
              Browse All Land
            </Link>
            <a href="mailto:hello@ardhiverified.com" className="rounded-lg border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10 transition-colors">
              Speak to an Advisor
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
