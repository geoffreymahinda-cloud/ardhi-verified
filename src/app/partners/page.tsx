import type { Metadata } from "next";
import Link from "next/link";
import { getInstitutions } from "@/lib/data.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Partners — Ardhi Verified",
  description: "Ardhi Verified works exclusively with vetted banks, SACCOs, and developers. Browse our institutional partners and their available land portfolios.",
};

const tierStyles: Record<string, { bg: string; text: string; label: string }> = {
  sacco: { bg: "bg-teal-600", text: "text-white", label: "SACCO Partner" },
  bank: { bg: "bg-navy", text: "text-white", label: "Banking Partner" },
  developer: { bg: "bg-[#C4A44A]", text: "text-navy", label: "Verified Developer" },
};

export default async function SaccosPage() {
  const institutions = await getInstitutions();

  const saccos = institutions.filter((i) => i.tier === "sacco");
  const banks = institutions.filter((i) => i.tier === "bank");
  const developers = institutions.filter((i) => i.tier === "developer");

  const sections = [
    { title: "Banking Partners", subtitle: "Licensed Kenya commercial banks listing foreclosed and verified properties. Full regulatory oversight. Outright purchase or bank-set instalment terms.", items: banks },
    { title: "SACCO Partners", subtitle: "Kenya's cooperative societies listing their land portfolios on Ardhi Verified. Member-governed institutions with decades of cooperative accountability.", items: saccos },
    { title: "Verified Developers", subtitle: "Established property developers with verifiable track records. Vetted before listing.", items: developers },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-4 pb-12 pt-20 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Our Institutional Partners
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
            Ardhi Verified works exclusively with vetted institutions — never individual sellers. Every partner is verified before joining the platform.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-ardhi px-4 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-8 sm:gap-16 text-center text-white">
          <div>
            <span className="text-2xl font-bold">{institutions.length}</span>
            <span className="ml-1.5 text-sm text-white/80">partners</span>
          </div>
          <div className="hidden h-6 w-px bg-white/30 sm:block" />
          <div>
            <span className="text-2xl font-bold">{banks.length}</span>
            <span className="ml-1.5 text-sm text-white/80">banks</span>
          </div>
          <div className="hidden h-6 w-px bg-white/30 sm:block" />
          <div>
            <span className="text-2xl font-bold">{saccos.length}</span>
            <span className="ml-1.5 text-sm text-white/80">SACCOs</span>
          </div>
          <div className="hidden h-6 w-px bg-white/30 sm:block" />
          <div>
            <span className="text-2xl font-bold">{developers.length}</span>
            <span className="ml-1.5 text-sm text-white/80">developers</span>
          </div>
        </div>
      </section>

      {/* Partner sections */}
      <section className="bg-bg px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl space-y-16">
          {sections.map((section) => (
            section.items.length > 0 && (
              <div key={section.title}>
                <h2 className="font-serif text-2xl font-bold text-navy mb-2">{section.title}</h2>
                <p className="text-sm text-muted mb-8 max-w-2xl">{section.subtitle}</p>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((inst) => {
                    const style = tierStyles[inst.tier] || tierStyles.sacco;
                    const isBank = inst.tier === "bank";
                    return (
                      <Link
                        key={inst.id}
                        href={`/partners/${inst.slug}`}
                        className={`group rounded-xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${
                          isBank
                            ? "border-[#C4A44A]/40 border-l-4 border-l-[#C4A44A]"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="h-14 w-14 rounded-xl bg-navy/5 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl font-bold text-navy">{inst.name.charAt(0)}</span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-navy text-lg group-hover:text-ardhi transition-colors">{inst.name}</h3>
                            <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                          </div>
                        </div>

                        {inst.description && (
                          <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-3">{inst.description}</p>
                        )}

                        <div className="space-y-2 text-xs text-muted">
                          <div className="flex items-center justify-between">
                            <span>{inst.institutionType}</span>
                            {inst.foundedYear && <span>Est. {inst.foundedYear}</span>}
                          </div>
                          {inst.memberCount && (
                            <div className="flex items-center gap-1.5">
                              <svg className="h-3.5 w-3.5 text-ardhi" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                              </svg>
                              <span>{inst.memberCount.toLocaleString()} members</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-border">
                          <span className="text-sm font-medium text-ardhi group-hover:underline">View available plots →</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )
          ))}
        </div>
      </section>

      {/* Become a partner CTA */}
      <section className="bg-navy px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-2xl font-bold text-white sm:text-3xl mb-4">
            Are you an institution with land to list?
          </h2>
          <p className="text-white/60 mb-8">
            Banks, SACCOs, and established developers can partner with Ardhi Verified to reach diaspora buyers. We verify every listing, qualify every buyer, and make warm introductions — you own the buyer relationship and set your own payment terms.
          </p>
          <a href="mailto:hello@ardhiverified.com" className="inline-flex items-center justify-center rounded-lg bg-ardhi px-8 py-4 font-semibold text-white transition-colors hover:bg-ardhi-dark">
            Partner with us
          </a>
        </div>
      </section>
    </>
  );
}
