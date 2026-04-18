import type { Metadata } from "next";
import Link from "next/link";
import HomeHeroTabs from "@/components/HomeHeroTabs";
import PartnerStrip from "@/components/PartnerStrip";
import FeaturedPartnerSpotlight from "@/components/FeaturedPartnerSpotlight";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ardhi Verified — Kenya's Land Intelligence Platform",
  description:
    "Verify any Kenya land title in 60 seconds. HatiScan screens against 190,000+ court cases, gazette notices, road reserves, and spatial risk layers. Trusted by advocates and institutions.",
  openGraph: {
    title: "Ardhi Verified — Kenya's Land Intelligence Platform",
    description: "Verify any Kenya land title in 60 seconds. Trusted by advocates and institutions.",
    type: "website",
    url: "https://www.ardhiverified.com",
    images: [{ url: "https://www.ardhiverified.com/api/og", width: 1200, height: 630 }],
    siteName: "Ardhi Verified",
  },
};

export default function HomePage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Ardhi Verified",
            url: "https://www.ardhiverified.com",
            description: "Kenya's land intelligence platform. Verify any title in 60 seconds.",
            areaServed: { "@type": "Country", name: "Kenya" },
          }),
        }}
      />

      {/* ═══ HERO — Background image + Tab search card ═════════════════ */}
      <section className="relative min-h-[600px] flex flex-col items-center justify-center px-4 py-16 sm:py-20">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1611348524140-53c9a25263d6?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/70 to-navy/90" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-4xl text-center mb-10">
          <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            Verify any Kenya land title
            <br />
            <span className="text-[#c8a96e]">in 60 seconds.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/50 sm:text-lg">
            Screen against 190,000+ court cases, gazette notices, road reserves, and spatial risk layers across all 47 counties.
          </p>
        </div>

        {/* Tab card */}
        <div className="relative z-10 w-full">
          <HomeHeroTabs />
        </div>
      </section>

      {/* ═══ 1. ROLLING PARTNER STRIP ══════════════════════════════════ */}
      <PartnerStrip />

      {/* ═══ 2. TRUST SIGNALS ROW ══════════════════════════════════════ */}
      <section className="bg-white px-4 py-12">
        <div className="mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-navy">45,000+</div>
            <p className="mt-1 text-sm text-muted">gazette notices screened</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-navy">All 47</div>
            <p className="mt-1 text-sm text-muted">Kenyan counties covered</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-navy">Used by</div>
            <p className="mt-1 text-sm text-muted">Kenya conveyancing advocates</p>
          </div>
        </div>
      </section>

      {/* ═══ 3. THREE-STEP VISUAL ══════════════════════════════════════ */}
      <section className="bg-bg px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-serif text-2xl font-bold text-navy sm:text-3xl mb-12">
            How HatiScan works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                num: "1",
                title: "Upload title deed",
                desc: "Take a photo or upload a PDF of any Kenya title deed. AI reads the LR number automatically.",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                ),
              },
              {
                num: "2",
                title: "We scan 12 layers",
                desc: "Court cases, gazette notices, road reserves, riparian zones, forest reserves, protected areas, flood zones, NLC claims, and more.",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                ),
              },
              {
                num: "3",
                title: "Get your full report",
                desc: "Trust Score, risk breakdown, ownership verification, and downloadable PDF — all in under 60 seconds.",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                ),
              },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ardhi/10 text-ardhi">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {step.icon}
                  </svg>
                </div>
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-navy text-white text-xs font-bold mb-2">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COUNTY RISK INDEX TEASER ═════════════════════════════════ */}
      <section className="bg-navy px-4 py-10">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C4A44A] mb-1">New</p>
            <h3 className="font-serif text-xl font-bold text-white sm:text-2xl">Kenya Land Risk Index</h3>
            <p className="mt-1 text-sm text-white/50">County-by-county risk scores across all 47 counties</p>
          </div>
          <Link
            href="/intelligence/county-risk"
            className="inline-flex items-center gap-2 rounded-lg bg-[#C4A44A] px-6 py-3 text-sm font-semibold text-navy hover:bg-[#b3933f] transition-colors whitespace-nowrap"
          >
            Explore the Risk Index
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ═══ 4. FEATURED PARTNER SPOTLIGHT ═════════════════════════════ */}
      <FeaturedPartnerSpotlight />

      {/* ═══ 5. PRICING CARDS ═════════════════════════════════════════= */}
      <section className="bg-bg px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl font-bold text-navy sm:text-3xl">Simple, transparent pricing</h2>
            <p className="mt-3 text-muted">No hidden fees. Cancel anytime.</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {[
              { name: "Starter", price: "5,000", searches: "10 searches/month", features: ["10 HatiScan searches", "Full risk reports", "Email support"], popular: false },
              { name: "Professional", price: "12,000", searches: "Unlimited", features: ["Unlimited searches", "Full risk reports", "API access", "Priority support"], popular: true },
              { name: "Firm", price: "25,000", searches: "Unlimited + multi-user", features: ["Everything in Professional", "Multi-user (10 seats)", "Dedicated manager", "Bulk CSV upload"], popular: false },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-8 flex flex-col ${
                  tier.popular
                    ? "border-ardhi shadow-lg shadow-ardhi/10 bg-card"
                    : "border-border bg-card"
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-ardhi px-4 py-1 text-xs font-bold text-white uppercase tracking-wider">
                    Most Popular
                  </span>
                )}
                <h3 className="font-serif text-xl font-bold text-navy">{tier.name}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-navy">KES {tier.price}</span>
                  <span className="text-muted">/month</span>
                </div>
                <p className="mt-1 text-sm font-medium text-ardhi">{tier.searches}</p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted">
                      <svg className="h-4 w-4 text-ardhi flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className={`mt-6 block rounded-xl py-3 text-center text-sm font-semibold transition ${
                    tier.popular
                      ? "bg-ardhi text-white hover:bg-ardhi-dark"
                      : "border border-border text-navy hover:bg-ardhi hover:text-white hover:border-ardhi"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted mt-6">
            Just need a single report? <Link href="/hatiscan" className="text-ardhi font-medium hover:underline">Run a one-off scan for KES 2,500</Link>
          </p>
        </div>
      </section>

      {/* ═══ 6. FOOTER (handled by layout) ════════════════════════════ */}
    </>
  );
}
