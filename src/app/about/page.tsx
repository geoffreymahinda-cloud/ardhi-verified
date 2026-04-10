import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Ardhi Verified",
  description: "Ardhi Verified is building trust infrastructure for African land markets. Learn about our mission, values, and the cooperative model.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-4 pb-12 pt-20 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Making land ownership
            <br />
            <span className="text-[#C4A44A]">accessible to everyone.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/60">
            Ardhi Verified is building the trust infrastructure for African land markets — starting with Kenya.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-bg px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-12">
          <div>
            <h2 className="font-serif text-2xl font-bold text-navy mb-4">Our mission</h2>
            <p className="text-muted leading-relaxed">
              Millions of Kenyans in the diaspora want to own land at home, but the process is opaque, risky, and excludes those who can&apos;t physically be present. Fraud costs Kenya&apos;s land market billions of shillings every year. Families lose life savings to forged title deeds.
            </p>
            <p className="text-muted leading-relaxed mt-4">
              Ardhi Verified exists to change this. We partner with Kenya&apos;s cooperative SACCOs, licensed banks, and vetted developers to create a marketplace where every listing is institutionally backed and every title is verified. We are a technology platform and verified buyer acquisition channel — we never hold buyer funds or act as an intermediary in the transaction itself. Your SACCO or institutional partner manages all payments and title transfer directly.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-bold text-navy mb-4">Our values</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                { title: "Inclusive wealth creation", desc: "We believe land ownership should be accessible to everyone — not just those with connections or capital. Monthly instalments and SACCO partnerships make this possible." },
                { title: "Radical transparency", desc: "We never ask buyers to 'just trust us'. Every verification check, every document, every fee is visible and auditable." },
                { title: "Institutional trust", desc: "We work exclusively with vetted institutions — never individual sellers. Cooperative governance and regulatory oversight protect every buyer." },
                { title: "Diaspora-first design", desc: "Every feature is built for someone 5,000 miles from the plot they're buying. If it works for a buyer in London, it works for everyone." },
              ].map((v) => (
                <div key={v.title} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-semibold text-navy mb-2">{v.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-bold text-navy mb-4">The cooperative model</h2>
            <p className="text-muted leading-relaxed">
              Kenya&apos;s SACCO movement is one of the strongest cooperative ecosystems in Africa. SACCOs collectively manage trillions of shillings in assets and serve millions of members. By partnering with SACCOs, Ardhi Verified taps into a trusted infrastructure that already has deep roots in Kenyan society.
            </p>
            <p className="text-muted leading-relaxed mt-4">
              SACCO land comes with built-in protections: cooperative governance, member oversight, and institutional accountability. When a SACCO lists land on Ardhi Verified, buyers aren&apos;t dealing with an anonymous seller — they&apos;re dealing with an institution that has a reputation, a regulatory framework, and thousands of members who hold it accountable.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-bold text-navy mb-4">How we make money</h2>
            <p className="text-muted leading-relaxed">
              Ardhi Verified earns a technology services fee from our institutional partners on each completed introduction. We never hold buyer funds or participate in title transfer. Our role is verification, buyer qualification, and intelligent matching — the transaction itself is handled entirely by our regulated SACCO and institutional partners.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-bold text-navy mb-4">Important notice</h2>
            <div className="rounded-xl border border-trust-amber/20 bg-trust-amber/5 p-5">
              <p className="text-sm text-muted leading-relaxed">
                <strong className="text-navy">Ardhi Verified is an information service, not a legal title guarantor.</strong> We provide verification information, data aggregation, and technology-assisted due diligence tools. Our verification reports and Trust Scores are informational tools — not substitutes for independent legal advice. You should always engage a qualified advocate before completing any land transaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-2xl font-bold text-white mb-4">Ready to find your land?</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/browse" className="rounded-lg bg-ardhi px-8 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors">Browse Land</Link>
            <Link href="/saccos" className="rounded-lg border border-white/30 px-8 py-3 font-semibold text-white hover:bg-white/10 transition-colors">View Partners</Link>
          </div>
        </div>
      </section>
    </>
  );
}
