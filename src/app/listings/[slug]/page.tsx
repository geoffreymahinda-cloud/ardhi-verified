import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getListingBySlug, getListings } from "@/lib/data.server";
import { getAgent, formatKES, formatGBP, formatUSD } from "@/lib/data";
import ImageGallery from "@/components/ImageGallery";
import EnquiryForm from "@/components/EnquiryForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);

  if (!listing) {
    return { title: "Listing Not Found" };
  }

  return {
    title: `${listing.title} — ${listing.location}`,
    description: listing.description,
    openGraph: {
      title: `${listing.title} — Ardhi Verified`,
      description: listing.description,
      images: [listing.image],
    },
  };
}

/* ── Trust Score Gauge (SVG) ────────────────────────────────────── */
function TrustScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 90
      ? "text-trust-green"
      : score >= 70
        ? "text-trust-amber"
        : "text-trust-red";
  const label =
    score >= 90 ? "Safe" : score >= 70 ? "Needs Review" : "High Risk";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-border"
          />
          {/* Score arc */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            className={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ animation: "score-fill 1.2s ease-out forwards" }}
          />
        </svg>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${color}`}>{score}</span>
          <span className="text-xs text-muted">/100</span>
        </div>
      </div>
      <span className={`mt-2 text-sm font-semibold ${color}`}>{label}</span>
      <span className="text-xs text-muted">Ardhi Trust Score</span>
    </div>
  );
}

/* ── Star Rating ────────────────────────────────────────────────── */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i <= Math.round(rating) ? "text-yellow-400" : "text-border"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </span>
  );
}

/* ── Property Card (compact) ────────────────────────────────────── */
function PropertyCard({
  listing,
}: {
  listing: import("@/lib/data").Listing;
}) {
  const scoreColor =
    listing.trustScore >= 90
      ? "bg-trust-green"
      : listing.trustScore >= 70
        ? "bg-trust-amber"
        : "bg-trust-red";

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group block bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative h-48">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 400px"
        />
        <span
          className={`absolute top-3 right-3 text-white text-xs font-bold px-2.5 py-1 rounded-full ${scoreColor}`}
        >
          {listing.trustScore}%
        </span>
      </div>
      <div className="p-4 space-y-1.5">
        <h3 className="font-serif font-semibold text-navy leading-snug line-clamp-1">
          {listing.title}
        </h3>
        <p className="text-xs text-muted flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {listing.location}
        </p>
        <p className="text-ardhi font-bold text-sm">{formatKES(listing.priceKES)}</p>
        <div className="flex gap-3 text-xs text-muted">
          <span>{listing.size}</span>
          <span>{listing.type}</span>
          <span>{listing.use}</span>
        </div>
      </div>
    </Link>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const listing = await getListingBySlug(slug);
  if (!listing) return notFound();

  const agent = getAgent(listing.agentId);

  const allListings = await getListings();
  const similar = allListings
    .filter((l) => l.county === listing.county && l.slug !== listing.slug)
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* ── Breadcrumb ─────────────────────────────────────────── */}
      <nav className="text-sm text-muted flex items-center gap-2">
        <Link href="/" className="hover:text-ardhi transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/" className="hover:text-ardhi transition-colors">
          Listings
        </Link>
        <span>/</span>
        <span className="text-navy font-medium truncate">{listing.title}</span>
      </nav>

      {/* ── Image Gallery ──────────────────────────────────────── */}
      <ImageGallery
        mainImage={listing.image}
        images={listing.images}
        title={listing.title}
      />

      {/* ── Main Content (2-column) ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* LEFT COLUMN — 2/3 */}
        <div className="lg:col-span-2 space-y-10">
          {/* Title + Location + Badges */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider bg-ardhi-light text-ardhi px-3 py-1 rounded-full">
                {listing.type}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider bg-navy/5 text-navy px-3 py-1 rounded-full">
                {listing.use}
              </span>
              {listing.verified && (
                <span className="text-xs font-semibold uppercase tracking-wider bg-trust-green/10 text-trust-green px-3 py-1 rounded-full flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy leading-tight">
              {listing.title}
            </h1>

            <p className="flex items-center gap-1.5 text-muted">
              <svg
                className="w-5 h-5 text-ardhi"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {listing.location}
            </p>

            {/* Price row */}
            <div className="flex flex-wrap items-baseline gap-4">
              <span className="text-2xl font-bold text-ardhi">
                {formatKES(listing.priceKES)}
              </span>
              <span className="text-lg text-muted">
                {formatGBP(listing.priceGBP)}
              </span>
              <span className="text-lg text-muted">
                {formatUSD(listing.priceUSD)}
              </span>
            </div>

            {/* Social proof — only shown when there's real interest */}
            {listing.enquiryCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-ardhi/5 border border-ardhi/10 px-3 py-2 w-fit">
                <svg className="h-4 w-4 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span className="text-sm font-medium text-ardhi">
                  {listing.enquiryCount} {listing.enquiryCount === 1 ? "person has" : "people have"} expressed interest
                </span>
              </div>
            )}
          </div>

          {/* ── Trust Score + Verification Checklist ────────────── */}
          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-navy">
                  Ardhi Verification Report
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verified on {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              {listing.outcome !== "blocked" && (
                <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  listing.outcome === "proceed"
                    ? "bg-trust-green/10 text-trust-green border border-trust-green/20"
                    : "bg-trust-amber/10 text-trust-amber border border-trust-amber/20"
                }`}>
                  {listing.outcome === "proceed" ? "Safe to proceed" : "Needs review"}
                </span>
              )}
              {listing.outcome === "blocked" && (
                <span className="flex-shrink-0 rounded-full bg-trust-red/10 text-trust-red border border-trust-red/20 px-3 py-1 text-xs font-semibold">
                  Blocked
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* Gauge */}
              <TrustScoreGauge score={listing.trustScore} />

              {/* Checklist */}
              <div className="flex-1 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {listing.checks.map((check) => (
                    <div
                      key={check.label}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                        check.passed
                          ? "bg-trust-green/8 text-trust-green"
                          : "bg-trust-red/8 text-trust-red"
                      }`}
                    >
                      {check.passed ? (
                        <svg
                          className="w-5 h-5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <span className="flex-1">{check.label}</span>
                      {check.blocker && !check.passed && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-trust-red/20 text-trust-red px-1.5 py-0.5 rounded">
                          Blocker
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Outcome verdict */}
            {listing.outcome === "blocked" && (
              <div className="rounded-xl border border-trust-red/30 bg-trust-red/5 p-4 flex items-start gap-3">
                <svg className="w-6 h-6 text-trust-red flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="font-semibold text-trust-red">Cannot proceed to sale</p>
                  <p className="text-sm text-muted mt-1">
                    One or more critical checks have failed. This listing cannot proceed to a transaction until all blocker issues are resolved. We recommend contacting the agent for clarification.
                  </p>
                </div>
              </div>
            )}
            {listing.outcome === "review" && (
              <div className="rounded-xl border border-trust-amber/30 bg-trust-amber/5 p-4 flex items-start gap-3">
                <svg className="w-6 h-6 text-trust-amber flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="font-semibold text-trust-amber">Needs review — proceed with caution</p>
                  <p className="text-sm text-muted mt-1">
                    This listing has passed all critical checks but some soft checks are pending. We strongly recommend engaging an independent advocate before proceeding.
                  </p>
                </div>
              </div>
            )}
            {listing.outcome === "proceed" && (
              <div className="rounded-xl border border-trust-green/30 bg-trust-green/5 p-4 flex items-start gap-3">
                <svg className="w-6 h-6 text-trust-green flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-trust-green">Safe — all checks passed</p>
                  <p className="text-sm text-muted mt-1">
                    This listing has passed all verification checks. You may proceed with confidence, but we still recommend independent legal advice for any land transaction.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ── Plot Details ────────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-navy">Plot Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border border-border">
              {[
                ["Size", listing.size],
                ["Shape", listing.details.shape],
                ["Access Road", listing.details.accessRoad],
                ["Utilities", listing.details.utilities],
                ["Zoning", listing.details.zoning],
                ["County", listing.county],
                ["Topography", listing.details.topography],
                ["Tenure", listing.type],
              ].map(([label, value]) => (
                <div key={label} className="bg-card px-5 py-4">
                  <dt className="text-xs font-medium text-muted uppercase tracking-wider">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-navy">{value}</dd>
                </div>
              ))}
            </div>
          </section>

          {/* ── Description ─────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-navy">Description</h2>
            <p className="text-muted leading-relaxed">{listing.description}</p>
          </section>

          {/* ── Verification Vault ──────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-xl font-bold text-navy">Verification Vault</h2>
              <span className="rounded-full bg-navy/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy/60">
                Document Room
              </span>
            </div>
            <p className="text-sm text-muted">
              Every document from our verification process, organised by access level. Ardhi never asks you to &quot;just trust us&quot; — we show the receipts.
            </p>

            {/* TIER 1 — Open */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-trust-green/5 border-b border-border px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-trust-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span className="text-sm font-semibold text-navy">Open Access</span>
                </div>
                <span className="text-xs font-medium text-trust-green">Free</span>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { name: "Trust Score Breakdown", desc: "Weighted score with check-by-check results", available: true },
                  { name: "Risk Classification", desc: "Safe / Needs Review / High Risk with explanation", available: true },
                  { name: "Verification Timeline", desc: "When each check was run and what it found", available: true },
                  { name: "Agent Credentials Summary", desc: "LSK number, EARB status, verification level", available: true },
                ].map((doc) => (
                  <div key={doc.name} className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-trust-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy">{doc.name}</p>
                      <p className="text-xs text-muted">{doc.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TIER 2 — Unlock */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-trust-amber/5 border-b border-border px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-trust-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span className="text-sm font-semibold text-navy">Unlock</span>
                </div>
                <span className="text-xs font-medium text-trust-amber">Free — submit EOI to access</span>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { name: "Title Deed Preview", desc: "First page, watermarked — parcel number, owner name, acreage" },
                  { name: "Encumbrance Search Summary", desc: "Clean or flagged, date of search, summary of findings" },
                  { name: "Rates Clearance Status", desc: "County rates status and any outstanding arrears" },
                  { name: "AI Legal Brief", desc: "3-paragraph plain-English summary of what the buyer should know" },
                ].map((doc) => (
                  <div key={doc.name} className="flex items-center gap-3 opacity-60">
                    <svg className="h-5 w-5 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy">{doc.name}</p>
                      <p className="text-xs text-muted">{doc.desc}</p>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-center text-muted pt-2">Submit an Expression of Interest to unlock these documents</p>
              </div>
            </div>

            {/* TIER 3 — Verify (paid) */}
            <div className="rounded-xl border border-ardhi/30 overflow-hidden">
              <div className="bg-ardhi/5 border-b border-ardhi/20 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <span className="text-sm font-semibold text-navy">Full Verification Report</span>
                </div>
                <span className="text-xs font-bold text-ardhi">£25 / KES 4,125</span>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { name: "Signed Verification Certificate", desc: "Timestamped PDF with Ardhi's digital signature" },
                  { name: "Complete Encumbrance Report", desc: "Full search results from the Land Registry" },
                  { name: "NLIMS Registry Snapshot", desc: "Point-in-time capture of the registry entry" },
                  { name: "Fraud Risk Assessment", desc: "10-point AI fraud analysis with severity scoring" },
                ].map((doc) => (
                  <div key={doc.name} className="flex items-center gap-3 opacity-60">
                    <svg className="h-5 w-5 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy">{doc.name}</p>
                      <p className="text-xs text-muted">{doc.desc}</p>
                    </div>
                  </div>
                ))}
                <Link
                  href="/concierge"
                  className="mt-2 block w-full rounded-lg bg-ardhi py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-ardhi-dark"
                >
                  Purchase Full Report — £25
                </Link>
              </div>
            </div>

            {/* TIER 4 — Transact (Concierge) */}
            <div className="rounded-xl border border-navy/20 overflow-hidden">
              <div className="bg-navy/5 border-b border-navy/10 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                  <span className="text-sm font-semibold text-navy">Full Transaction Package</span>
                </div>
                <span className="text-xs font-bold text-navy">Concierge from £500</span>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { name: "Full Title Deed PDF", desc: "Complete document watermarked with buyer's name" },
                  { name: "Surveyor's Report", desc: "Professional survey with boundary coordinates" },
                  { name: "Site Visit Footage", desc: "Recorded video tour of the property" },
                  { name: "Legal Transfer Support", desc: "LSK advocate handles sale agreement and registry transfer" },
                  { name: "Escrow Protection", desc: "Funds held in CBK-licensed account until title transfers" },
                ].map((doc) => (
                  <div key={doc.name} className="flex items-center gap-3 opacity-60">
                    <svg className="h-5 w-5 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy">{doc.name}</p>
                      <p className="text-xs text-muted">{doc.desc}</p>
                    </div>
                  </div>
                ))}
                <Link
                  href="/concierge"
                  className="mt-2 block w-full rounded-lg bg-navy py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-navy/90"
                >
                  View Concierge Packages
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN — 1/3 (sticky sidebar) */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* ── Agent Card ──────────────────────────────────────── */}
          {agent && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={agent.photo}
                    alt={agent.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-navy">{agent.name}</h3>
                  <p className="text-sm text-muted">{agent.firm}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">LSK Number</span>
                  <span className="font-mono text-navy text-xs">{agent.lskNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Rating</span>
                  <span className="flex items-center gap-1.5">
                    <Stars rating={agent.rating} />
                    <span className="text-xs text-muted">
                      {agent.rating} ({agent.reviews})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Experience</span>
                  <span className="font-semibold text-navy">{agent.yearsExperience} years</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Verified Listings</span>
                  <span className="font-semibold text-navy">{agent.verifiedListings}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button className="w-full bg-ardhi hover:bg-ardhi-dark text-white font-semibold py-3 rounded-lg transition-colors">
                  Book Consultation
                </button>
                <button className="w-full border-2 border-ardhi text-ardhi hover:bg-ardhi-light font-semibold py-3 rounded-lg transition-colors">
                  Call Agent
                </button>
              </div>
            </div>
          )}

          {/* ── Expression of Interest Form ─────────────────────── */}
          {listing.outcome === "blocked" ? (
            <div className="bg-card border border-trust-red/30 rounded-2xl p-6 space-y-4">
              <h3 className="font-serif font-bold text-trust-red text-lg">Sale Blocked</h3>
              <p className="text-sm text-muted">
                This listing has failed one or more critical verification checks and cannot proceed to a sale. Contact the agent directly for more information about the status of this property.
              </p>
              {agent && (
                <button className="w-full border-2 border-trust-red/30 text-trust-red hover:bg-trust-red/5 font-semibold py-3 rounded-lg transition-colors">
                  Contact Agent About This Listing
                </button>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-serif font-bold text-navy text-lg">Expression of Interest</h3>
              <p className="text-xs text-muted">
                Fill in your details and the agent will contact you within 24 hours.
              </p>
              <EnquiryForm listingTitle={listing.title} />
            </div>
          )}
        </div>
      </div>

      {/* ── Land Guardian Upsell ─────────────────────────────────── */}
      <section className="rounded-2xl border border-trust-amber/20 bg-navy p-8 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-lg">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-trust-amber/30 bg-trust-amber/10 px-3 py-1">
              <svg className="h-4 w-4 text-trust-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span className="text-xs font-medium text-trust-amber">Land Guardian</span>
            </div>
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ardhi/20 border border-ardhi/30 px-3 py-1 text-xs font-semibold text-ardhi">Coming Soon</span>
            </div>
            <h3 className="mb-2 font-serif text-xl font-bold text-white sm:text-2xl">
              Buying this plot? Protect your title 24/7.
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              Land Guardian will monitor your title deed against the NLIMS registry every night. Get instant WhatsApp alerts if anyone tries to transfer, charge, or dispute your land.
            </p>
          </div>
          <Link
            href="/land-guardian"
            className="flex-shrink-0 rounded-lg bg-trust-amber px-6 py-3 text-center font-semibold text-navy transition-colors hover:bg-trust-amber/90"
          >
            Join waitlist →
          </Link>
        </div>
      </section>

      {/* ── Similar Listings ─────────────────────────────────────── */}
      {similar.length > 0 && (
        <section className="space-y-6">
          <h2 className="font-serif text-2xl font-bold text-navy">Similar Listings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {similar.map((l) => (
              <PropertyCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
