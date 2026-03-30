import Link from "next/link";
import FAQAccordion from "./FAQAccordion";

const steps = [
  {
    number: "1",
    title: "Search",
    description:
      "Find land by county, price, and size. Browse hundreds of verified listings across Kenya with detailed filters.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    number: "2",
    title: "Verify",
    description:
      "Every listing is cross-checked against the National Land Information Management System (NLIMS) to confirm authenticity.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    number: "3",
    title: "Review",
    description:
      "Read the Trust Score and detailed verification report. Understand exactly what checks passed and what risks remain.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    number: "4",
    title: "Connect",
    description:
      "Book a consultation with a verified, LSK-registered agent who specialises in your county and property type.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    number: "5",
    title: "Buy Safely",
    description:
      "Complete your purchase with escrow-protected payment and secure title transfer. Your money is safe until everything is confirmed.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
];

const verificationChecks = [
  {
    title: "Title Deed Confirmed",
    description: "We verify that a legitimate title deed exists for the exact parcel being sold and that the seller is the registered owner.",
  },
  {
    title: "No Encumbrances",
    description: "We check for any charges, mortgages, caveats, or caution notes registered against the title that could affect your ownership.",
  },
  {
    title: "NLIMS Registry Match",
    description: "The listing is cross-referenced against the National Land Information Management System to confirm it matches government records.",
  },
  {
    title: "Seller Identity Verified",
    description: "The seller's identity is verified through KRA PIN, national ID, and matched against the title deed registration.",
  },
  {
    title: "Agent LSK Registered",
    description: "Every agent on the platform is confirmed as a registered member of the Law Society of Kenya with a valid practising certificate.",
  },
  {
    title: "No Active Disputes",
    description: "We search court records and the National Environment Tribunal for any active disputes, claims, or litigation involving the parcel.",
  },
];

const faqs = [
  {
    question: "What is Ardhi Verified?",
    answer:
      "Ardhi Verified is Kenya's trusted land marketplace, built specifically for diaspora buyers and local investors who want peace of mind. We verify every listing against government records, assign transparent Trust Scores, and connect you with LSK-registered advocates to ensure your land purchase is safe.",
  },
  {
    question: "How does the verification process work?",
    answer:
      "Every listing goes through a rigorous six-point check. We cross-reference the title deed against the National Land Information Management System (NLIMS), verify the seller's identity, check for encumbrances and disputes, and confirm the agent's LSK registration. Only listings that pass are marked as verified.",
  },
  {
    question: "What is the Trust Score?",
    answer:
      "The Trust Score is a 0-100 rating that reflects how thoroughly a listing has been verified. A score of 90+ means all six checks passed. Scores between 70-89 may have minor items pending. Below 70 indicates some checks have not yet passed. The score updates in real-time as verification progresses.",
  },
  {
    question: "How is my payment protected?",
    answer:
      "All payments on Ardhi Verified go through a secure escrow system. Your funds are held safely by a licensed escrow provider until all conditions of the sale are met — including title transfer confirmation. If the sale falls through, your money is returned in full.",
  },
  {
    question: "Can I buy land from overseas?",
    answer:
      "Absolutely. Ardhi Verified was built with the Kenyan diaspora in mind. You can search, verify, consult with agents, and complete your purchase entirely online. We support payments in KES, GBP, and USD, as well as M-Pesa for local transactions.",
  },
  {
    question: "How do I know the agent is legitimate?",
    answer:
      "Every agent on our platform is a registered advocate with the Law Society of Kenya (LSK). We verify their practising certificate, cross-check their registration number, and display it prominently on their profile. You can independently verify their status on the LSK website.",
  },
  {
    question: "What currencies can I pay in?",
    answer:
      "We support multiple payment methods to serve buyers worldwide. You can pay in Kenyan Shillings (KES), British Pounds (GBP), or US Dollars (USD). For local transactions, M-Pesa is also available. All prices are displayed in your preferred currency.",
  },
  {
    question: "What happens after I express interest?",
    answer:
      "Once you express interest in a listing, a verified agent will contact you within 24 hours. They will arrange a virtual or in-person consultation, walk you through the verification report, answer your questions, and guide you through the offer and purchase process step by step.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-b from-ardhi-light/40 to-bg px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-text sm:text-5xl">
            How Ardhi Verified works
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            Whether you are in London, New York, or Nairobi, we make buying land in Kenya safe,
            transparent, and stress-free for diaspora buyers and local investors alike.
          </p>
        </div>
      </section>

      {/* ── 5 Steps ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center font-serif text-3xl font-bold text-text sm:text-4xl">
          Five simple steps
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted">
          From search to title transfer, we guide you every step of the way.
        </p>

        {/* Steps — horizontal on desktop, vertical on mobile */}
        <div className="relative mt-14">
          {/* Connecting line (desktop only) */}
          <div className="absolute left-0 right-0 top-16 hidden h-0.5 bg-border lg:block" aria-hidden="true" />

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step) => (
              <div key={step.number} className="relative flex flex-col items-center text-center">
                {/* Number circle */}
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-ardhi text-xl font-bold text-white shadow-md">
                  {step.number}
                </div>
                {/* Icon */}
                <div className="mt-5 text-ardhi">{step.icon}</div>
                {/* Title */}
                <h3 className="mt-3 text-lg font-bold text-text">{step.title}</h3>
                {/* Description */}
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Score Section ── */}
      <section className="bg-navy px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-serif text-3xl font-bold text-white sm:text-4xl">
            Understanding the Trust Score
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-white/70">
            Every listing on Ardhi Verified receives a Trust Score from 0 to 100 based on six
            independent verification checks. The higher the score, the more confident you can be.
          </p>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {verificationChecks.map((check) => (
              <div
                key={check.title}
                className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  {/* Green tick */}
                  <svg
                    className="mt-0.5 h-6 w-6 flex-shrink-0 text-ardhi"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-white">{check.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                      {check.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center font-serif text-3xl font-bold text-text sm:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted">
          Everything you need to know about buying verified land through Ardhi.
        </p>

        <div className="mt-12">
          <FAQAccordion faqs={faqs} />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-ardhi-light/50 px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="font-serif text-3xl font-bold text-text sm:text-4xl">
          Ready to find your land?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted">
          Browse verified listings across Kenya and start your journey to safe land ownership today.
        </p>
        <Link
          href="/search"
          className="mt-8 inline-block rounded-lg bg-ardhi px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-ardhi-dark"
        >
          Search Verified Listings
        </Link>
      </section>
    </>
  );
}
