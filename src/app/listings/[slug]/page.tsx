import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getListingBySlug, getListings, getInstitutionBySlug, getInstitutions } from "@/lib/data.server";
import { formatKES, formatGBP, kesToGbp, calculateInstalment } from "@/lib/data";
import ImageGallery from "@/components/ImageGallery";
import EnquiryForm from "@/components/EnquiryForm";
import PaymentPanel from "@/components/PaymentPanel";
import ArdhiShield from "@/components/ui/ArdhiShield";
import TrustScorePanel from "@/components/TrustScorePanel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);

  if (!listing) return { title: "Listing Not Found" };

  const priceStr = `KES ${listing.priceKES.toLocaleString()}`;
  const monthlyStr = listing.instalmentAvailable
    ? ` · From KES ${calculateInstalment(listing.priceKES, listing.minDepositPercent, listing.instalmentTermOptions[listing.instalmentTermOptions.length - 1] || 36).monthly.toLocaleString()}/mo`
    : "";

  return {
    title: `${listing.title} — ${listing.county}`,
    description: `${priceStr}${monthlyStr}. ${listing.description}`,
    openGraph: {
      title: `${listing.title} — ${priceStr}`,
      description: listing.description,
      images: [{ url: listing.image, width: 800, height: 500 }],
      url: `https://www.ardhiverified.com/listings/${listing.slug}`,
      siteName: "Ardhi Verified",
    },
  };
}

/* ── Trust Score Gauge ─────────────────────────────────────────── */
function TrustScoreGauge({ score }: { score: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "text-trust-green" : score >= 70 ? "text-trust-amber" : "text-trust-red";
  const label = score >= 90 ? "Safe" : score >= 70 ? "Needs Review" : "High Risk";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className={color} strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${color}`}>{score}</span>
          <span className="text-[10px] text-muted">/100</span>
        </div>
      </div>
      <span className={`mt-1 text-xs font-semibold ${color}`}>{label}</span>
    </div>
  );
}

/* ── Institution Badge ─────────────────────────────────────────── */
function InstitutionBadge({ tier, name }: { tier: string | null; name: string | null }) {
  if (!tier || !name) return null;
  const styles: Record<string, string> = {
    sacco: "bg-teal-600 text-white",
    bank: "bg-navy text-white",
    developer: "bg-[#C4A44A] text-navy",
  };
  const labels: Record<string, string> = {
    sacco: "SACCO Partner",
    bank: "Banking Partner",
    developer: "Verified Developer",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${styles[tier] || "bg-gray-200 text-gray-700"}`}>
      {name} · {labels[tier] || tier}
    </span>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return notFound();

  const allListings = await getListings();
  const similar = allListings
    .filter((l) => l.county === listing.county && l.slug !== listing.slug)
    .slice(0, 3);

  // Get institution details if available
  const institutions = await getInstitutions();
  const institution = listing.institutionId
    ? institutions.find((i) => i.id === listing.institutionId)
    : null;

  const verificationDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: listing.title,
            description: listing.description,
            image: listing.image,
            url: `https://www.ardhiverified.com/listings/${listing.slug}`,
            offers: {
              "@type": "Offer",
              price: listing.priceKES,
              priceCurrency: "KES",
            },
          }),
        }}
      />

      {/* Breadcrumb */}
      <nav className="text-sm text-muted flex items-center gap-2">
        <Link href="/" className="hover:text-ardhi transition-colors">Home</Link>
        <span>/</span>
        <Link href="/browse" className="hover:text-ardhi transition-colors">Browse</Link>
        <span>/</span>
        <span className="text-navy font-medium truncate">{listing.title}</span>
      </nav>

      {/* Image Gallery */}
      <ImageGallery mainImage={listing.image} images={listing.images} title={listing.title} />

      {/* Main Content — 2 column */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* LEFT COLUMN — 3/5 */}
        <div className="lg:col-span-3 space-y-10">

          {/* Title + badges + price */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <InstitutionBadge tier={listing.institutionTier} name={listing.institutionName} />
              {listing.verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ardhi/10 text-ardhi px-3 py-1 text-xs font-semibold">
                  <ArdhiShield size="sm" />
                  Ardhi Verified
                </span>
              )}
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy leading-tight">
              {listing.title}
            </h1>

            <p className="flex items-center gap-1.5 text-muted">
              <svg className="w-5 h-5 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {listing.location}, {listing.county} County
            </p>

            {/* Price display */}
            <div className="flex flex-wrap items-baseline gap-4">
              {listing.instalmentAvailable && listing.instalmentTermOptions.length > 0 ? (
                <>
                  <span className="text-2xl font-bold text-ardhi">
                    From {formatKES(calculateInstalment(listing.priceKES, listing.minDepositPercent, listing.instalmentTermOptions[listing.instalmentTermOptions.length - 1]).monthly)}/mo
                  </span>
                  <span className="text-lg text-muted">
                    Total {formatKES(listing.priceKES)}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-ardhi">{formatKES(listing.priceKES)}</span>
              )}
              <span className="text-sm text-muted">≈ {formatGBP(kesToGbp(listing.priceKES))}</span>
            </div>
          </div>

          {/* Plot Details */}
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-navy">Plot Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
              {[
                ["Size", listing.size],
                ["County", listing.county],
                ["Land Use", listing.use],
                ["Tenure", listing.type],
                ["Shape", listing.details.shape],
                ["Access Road", listing.details.accessRoad],
                ["Utilities", listing.details.utilities],
                ["Topography", listing.details.topography],
              ].map(([label, value]) => (
                <div key={label} className="bg-card px-4 py-3">
                  <dt className="text-[10px] font-medium text-muted uppercase tracking-wider">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-navy">{value}</dd>
                </div>
              ))}
            </div>
          </section>

          {/* Description */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-navy">Description</h2>
            <p className="text-muted leading-relaxed">{listing.description}</p>
          </section>

          {/* About the Institution */}
          {institution && (
            <section className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-navy">About {institution.name}</h2>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-14 w-14 rounded-xl bg-navy/5 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-navy">{institution.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy">{institution.name}</h3>
                    <p className="text-sm text-muted">{institution.institutionType}{institution.foundedYear ? ` · Est. ${institution.foundedYear}` : ""}</p>
                    {institution.memberCount && (
                      <p className="text-xs text-muted mt-1">{institution.memberCount.toLocaleString()} members</p>
                    )}
                  </div>
                </div>
                {institution.description && (
                  <p className="text-sm text-muted leading-relaxed mb-4">{institution.description}</p>
                )}
                <p className="text-xs text-muted">
                  This plot is listed by <strong className="text-navy">{institution.name}</strong>, a verified {institution.tier} partner of Ardhi Verified.
                </p>
                <Link href={`/saccos/${institution.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ardhi hover:text-ardhi-dark transition-colors">
                  View all plots by {institution.name}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </section>
          )}

          {/* Verification Summary */}
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-navy">Verification Summary</h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verified on {verificationDate} by Ardhi Verified Trust Guardian
                </p>
              </div>
              <TrustScoreGauge score={listing.trustScore} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {listing.checks.map((check) => (
                <div
                  key={check.label}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${
                    check.passed
                      ? "bg-trust-green/5 text-trust-green"
                      : "bg-trust-red/5 text-trust-red"
                  }`}
                >
                  {check.passed ? "✓" : "✗"}
                  <span className="flex-1">{check.label}</span>
                  {check.blocker && !check.passed && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-trust-red/20 text-trust-red px-1.5 py-0.5 rounded">Blocker</span>
                  )}
                </div>
              ))}
            </div>

            {/* Outcome verdict */}
            {listing.outcome === "blocked" && (
              <div className="rounded-xl border border-trust-red/30 bg-trust-red/5 p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-trust-red flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="font-semibold text-trust-red text-sm">Cannot proceed to sale</p>
                  <p className="text-xs text-muted mt-1">One or more critical checks have failed. Contact us for more information.</p>
                </div>
              </div>
            )}
            {listing.outcome === "proceed" && (
              <div className="rounded-xl border border-trust-green/30 bg-trust-green/5 p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-trust-green flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-trust-green text-sm">Safe to proceed</p>
                  <p className="text-xs text-muted mt-1">All checks passed. Independent legal advice is still recommended.</p>
                </div>
              </div>
            )}
            {listing.outcome === "review" && (
              <div className="rounded-xl border border-trust-amber/30 bg-trust-amber/5 p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-trust-amber flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="font-semibold text-trust-amber text-sm">Needs review — proceed with caution</p>
                  <p className="text-xs text-muted mt-1">Some soft checks pending. Engage an advocate before proceeding.</p>
                </div>
              </div>
            )}

            <p className="text-xs text-muted text-center pt-2">
              <Link href="/auth/login" className="text-ardhi hover:underline">Sign in</Link> to download the full verification report
            </p>
          </section>

          {/* Intelligence Trust Score */}
          <TrustScorePanel parcelRef={listing.slug} />
        </div>

        {/* RIGHT COLUMN — 2/5 (sticky) */}
        <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Payment Panel */}
          {listing.outcome !== "blocked" && (
            <PaymentPanel
              listingId={listing.id}
              slug={listing.slug}
              priceKES={listing.priceKES}
              instalmentAvailable={listing.instalmentAvailable}
              minDepositPercent={listing.minDepositPercent}
              termOptions={listing.instalmentTermOptions}
            />
          )}

          {listing.outcome === "blocked" && (
            <div className="rounded-2xl border border-trust-red/30 bg-card p-6 text-center">
              <h3 className="font-serif font-bold text-trust-red text-lg mb-2">Sale Blocked</h3>
              <p className="text-sm text-muted mb-4">This listing has failed critical verification checks.</p>
              <a href="mailto:hello@ardhiverified.com" className="text-sm font-medium text-ardhi hover:text-ardhi-dark">Contact us for details</a>
            </div>
          )}

          {/* Enquiry form */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-serif font-bold text-navy text-lg">Ask a question</h3>
            <p className="text-xs text-muted">Our team will respond within 24 hours.</p>
            <EnquiryForm listingTitle={listing.title} listingId={listing.id} />
          </div>
        </div>
      </div>

      {/* Similar Listings */}
      {similar.length > 0 && (
        <section className="space-y-6 pt-4">
          <h2 className="font-serif text-2xl font-bold text-navy">Similar in {listing.county}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {similar.map((l) => (
              <Link
                key={l.id}
                href={`/listings/${l.slug}`}
                className="group block rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-[16/10]">
                  <Image src={l.image} alt={l.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="400px" />
                  {l.institutionTier && (
                    <div className="absolute left-3 top-3">
                      <InstitutionBadge tier={l.institutionTier} name={l.institutionName} />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-sm font-bold text-navy">{l.title}</p>
                  <p className="text-xs text-muted">{l.location}</p>
                  <p className="text-sm font-bold text-ardhi">{formatKES(l.priceKES)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
