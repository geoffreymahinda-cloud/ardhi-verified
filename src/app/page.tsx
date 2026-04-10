import type { Metadata } from "next";
import Link from "next/link";
import { getFeaturedListings, getInstitutions } from "@/lib/data.server";
import PropertyCard from "@/components/ui/PropertyCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ardhi Verified — Own Verified Land in Kenya. Pay Monthly.",
  description:
    "Ardhi Verified partners with Kenya's leading SACCOs and institutions to bring trusted, affordable land ownership to the diaspora. Monthly instalments from 20% deposit.",
  openGraph: {
    title: "Ardhi Verified — Own Verified Land in Kenya",
    description: "SACCO-backed, fully verified land with monthly instalment plans for the Kenyan diaspora.",
    type: "website",
    url: "https://www.ardhiverified.com",
    images: [{ url: "https://www.ardhiverified.com/api/og", width: 1200, height: 630 }],
    siteName: "Ardhi Verified",
  },
};

const tierStyles: Record<string, { bg: string; text: string; label: string }> = {
  sacco: { bg: "bg-teal-600", text: "text-white", label: "SACCO Partner" },
  bank: { bg: "bg-navy", text: "text-white", label: "Banking Partner" },
  developer: { bg: "bg-[#C4A44A]", text: "text-navy", label: "Verified Developer" },
};

export default async function HomePage() {
  const listings = await getFeaturedListings();
  const institutions = await getInstitutions();

  const saccos = institutions.filter((i) => i.tier === "sacco");
  const banks = institutions.filter((i) => i.tier === "bank");
  const developers = institutions.filter((i) => i.tier === "developer");

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
            description: "Kenya's verified land marketplace. SACCO-backed, fully verified, monthly instalments.",
            areaServed: { "@type": "Country", name: "Kenya" },
          }),
        }}
      />

      {/* ═══ SECTION 1 — HERO ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-navy px-4 pb-16 pt-20 sm:pb-20 sm:pt-28">
        {/* Forensic wireframe background */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full opacity-[0.1]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00A550" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
          <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.15]" width="600" height="700" viewBox="0 0 600 700" fill="none">
            <path d="M300 50 L340 60 L380 55 L410 70 L430 100 L450 90 L480 110 L500 140 L510 180 L520 220 L530 250 L540 290 L535 330 L520 360 L500 390 L510 420 L530 450 L550 480 L540 510 L520 530 L490 550 L460 570 L430 590 L400 610 L370 630 L340 640 L310 650 L280 645 L250 630 L220 610 L200 590 L180 560 L160 530 L140 500 L130 470 L120 440 L110 410 L100 380 L95 350 L100 320 L110 290 L120 260 L130 230 L140 200 L155 170 L170 145 L190 120 L210 100 L230 85 L250 70 L270 60 Z" stroke="#00A550" strokeWidth="1.5" strokeDasharray="4 6" fill="none" />
            <circle cx="320" cy="370" r="5" fill="#00A550" opacity="1"><animate attributeName="r" values="5;9;5" dur="3s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;0.4;1" dur="3s" repeatCount="indefinite" /></circle>
            <circle cx="270" cy="310" r="4" fill="#00A550" opacity="0.9"><animate attributeName="r" values="4;7;4" dur="3.5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.9;0.3;0.9" dur="3.5s" repeatCount="indefinite" /></circle>
            <circle cx="390" cy="530" r="4" fill="#00A550" opacity="0.9"><animate attributeName="r" values="4;7;4" dur="3.8s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.9;0.3;0.9" dur="3.8s" repeatCount="indefinite" /></circle>
            <line x1="80" y1="0" x2="550" y2="0" stroke="#00A550" strokeWidth="2" opacity="0.5"><animate attributeName="y1" values="0;700;0" dur="8s" repeatCount="indefinite" /><animate attributeName="y2" values="0;700;0" dur="8s" repeatCount="indefinite" /></line>
          </svg>
          <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30" style={{ background: "radial-gradient(circle, rgba(0,165,80,0.25) 0%, transparent 70%)" }} />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Own verified land in Kenya.
            <br />
            <span className="text-[#C4A44A]">Pay monthly from anywhere.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60 sm:text-xl">
            Ardhi Verified partners with Kenya&apos;s leading SACCOs and institutions to bring trusted, affordable land ownership to the diaspora.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/browse"
              className="inline-flex items-center justify-center rounded-lg bg-ardhi px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-ardhi-dark"
            >
              Browse Land
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center rounded-lg border border-white/30 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2 — THREE VALUE PILLARS ════════════════════════════ */}
      <section className="bg-bg px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl grid gap-8 sm:grid-cols-3">
          {[
            {
              title: "SACCO-Backed",
              description: "Every partner institution is vetted. SACCO land comes with cooperative governance and member protections built in.",
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />,
            },
            {
              title: "Pay Monthly",
              description: "Purchase land in manageable monthly instalments from your UK, US, or UAE bank account. Deposits from 20%.",
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />,
            },
            {
              title: "Fully Verified",
              description: "Every listing verified against official Kenya land records before it appears on the platform. Full verification report included.",
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />,
            },
          ].map((pillar) => (
            <div key={pillar.title} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ardhi/10 text-ardhi">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>{pillar.icon}</svg>
              </div>
              <h3 className="text-lg font-bold text-navy">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{pillar.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SECTION 3 — INSTITUTIONAL PARTNERS ═════════════════════════ */}
      <section className="bg-white px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl font-bold text-navy sm:text-3xl">Our Institutional Partners</h2>
            <p className="mt-3 text-muted max-w-xl mx-auto">
              Ardhi Verified works exclusively with vetted institutions — never individual sellers.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...saccos, ...banks, ...developers].map((inst) => {
              const style = tierStyles[inst.tier] || tierStyles.sacco;
              return (
                <Link
                  key={inst.id}
                  href={`/saccos/${inst.slug}`}
                  className="group rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-navy/5 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-navy">{inst.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-navy group-hover:text-ardhi transition-colors truncate">{inst.name}</h3>
                      <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted line-clamp-2 mb-4">{inst.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted">
                      {inst.institutionType}{inst.foundedYear ? ` · Est. ${inst.foundedYear}` : ""}
                    </div>
                    <span className="text-xs font-medium text-ardhi group-hover:underline">View Plots →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 4 — FEATURED LISTINGS ══════════════════════════════ */}
      <section className="bg-bg px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-navy sm:text-3xl">Available Now</h2>
              <p className="mt-1 text-sm text-muted">Featured listings from our institutional partners</p>
            </div>
            <Link href="/browse" className="text-sm font-semibold text-ardhi transition hover:text-ardhi-dark">
              View all →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.slice(0, 6).map((listing) => (
              <PropertyCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5 — HOW IT WORKS ═══════════════════════════════════ */}
      <section className="bg-navy px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center font-serif text-2xl font-bold text-white sm:text-3xl">
            Four steps to your title deed
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { num: "1", title: "Browse verified listings", desc: "Every property on Ardhi Verified has passed our seven-checkpoint HatiScan verification. Only plots scoring 75 or above are published." },
              { num: "2", title: "Express interest & get verified", desc: "Complete your identity verification and KYC. We screen every buyer before connecting them with our SACCO and institutional partners." },
              { num: "3", title: "Connect with your partner institution", desc: "We introduce you to the verified SACCO or institutional partner. They own the land, set the payment terms, and manage the full transaction. You deal directly with a regulated Kenyan institution." },
              { num: "4", title: "Protected by Land Guardian", desc: "After purchase, your title is monitored permanently by Land Guardian — scanning for court cases, gazette changes, and registry updates on your behalf." },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ardhi/20 text-ardhi font-serif text-xl font-bold">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6 — TRUST SIGNALS ══════════════════════════════════ */}
      <section className="bg-bg px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center font-serif text-2xl font-bold text-navy sm:text-3xl">
            Why diaspora buyers trust Ardhi Verified
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { title: "NLIMS-Verified", desc: "Every title manually verified against Kenya's National Land Information System before listing." },
              { title: "Regulated Partners", desc: "You deal directly with SACCOs, banks, and developers regulated by Kenyan authorities — never anonymous sellers." },
              { title: "LSK Advocates", desc: "LSK-credentialed advocates manage every transfer. Full legal representation included in the process." },
              { title: "Full Transparency", desc: "Comprehensive verification report available before you commit. Know exactly what you're buying." },
            ].map((signal) => (
              <div key={signal.title} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                <svg className="h-6 w-6 text-ardhi flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-navy">{signal.title}</h3>
                  <p className="mt-1 text-sm text-muted leading-relaxed">{signal.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
