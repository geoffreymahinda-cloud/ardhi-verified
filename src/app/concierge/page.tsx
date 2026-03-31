"use client";

import { useState } from "react";
import Link from "next/link";
import { counties } from "@/lib/data";
import { submitConciergeEnquiry } from "@/app/actions";

const packages = [
  {
    name: "Discovery",
    price: "£150",
    priceKES: "KES 24,750",
    description: "Perfect for buyers who want expert guidance finding the right plot.",
    features: [
      "30-minute video consultation with a Concierge Advisor",
      "Personalised Buyer Profile creation",
      "Curated shortlist of 3–5 verified plots",
      "County market briefing with price analysis",
      "WhatsApp support for 2 weeks",
    ],
    cta: "Start with Discovery",
    popular: false,
  },
  {
    name: "Premium",
    price: "£500",
    priceKES: "KES 82,500",
    description: "Our most popular package. See the land before you buy — from anywhere.",
    features: [
      "Everything in Discovery, plus:",
      "Live virtual site visit (video tour with local agent)",
      "Recorded footage of top plots sent to you",
      "Full NLIMS verification & Trust Score report",
      "Encumbrance search & rates clearance check",
      "Dedicated Concierge Advisor for 30 days",
      "Priority WhatsApp & email support",
    ],
    cta: "Choose Premium",
    popular: true,
  },
  {
    name: "Complete",
    price: "£1,500",
    priceKES: "KES 247,500",
    description: "End-to-end. We handle everything until the title deed is in your hands.",
    features: [
      "Everything in Premium, plus:",
      "Offer letter drafting & negotiation",
      "Sale agreement legal review (LSK advocate)",
      "Escrow-protected payment setup",
      "M-Pesa, bank transfer, or Stripe coordination",
      "Title transfer at the Land Registry",
      "Title deed couriered to your address worldwide",
      "Dedicated Concierge Advisor for 90 days",
      "Post-purchase support: rates, surveys, fencing",
    ],
    cta: "Choose Complete",
    popular: false,
  },
];

const steps = [
  {
    number: "01",
    title: "Tell us what you're looking for",
    description:
      "Book a free 15-minute intro call or fill in the enquiry form. Share your budget, preferred county, land use, and timeline. We'll match you with a Concierge Advisor who specialises in that region.",
  },
  {
    number: "02",
    title: "Receive your curated shortlist",
    description:
      "Your advisor hand-picks 3–5 plots that match your brief. Each comes with a mini verification report, price-per-acre analysis vs county median, and satellite imagery. Delivered via email and WhatsApp.",
  },
  {
    number: "03",
    title: "Tour the land — virtually",
    description:
      "Your advisor arranges a live video site visit with the local agent. Walk the boundary, see the access road, check the neighbours — all from your phone. We record everything so you can review later.",
  },
  {
    number: "04",
    title: "We verify everything",
    description:
      "Ardhi's Verification Agent runs a full 6-check pipeline: NLIMS registry match, title deed confirmation, encumbrance search, rates clearance, seller KYC, and dispute check. You get a Trust Score and a signed Verification Certificate.",
  },
  {
    number: "05",
    title: "Buy safely — we handle the rest",
    description:
      "Your payment goes into Ardhi escrow. Our LSK advocate drafts the sale agreement, coordinates with the seller's lawyer, and accompanies the title transfer at the Land Registry. The deed is couriered to your door.",
  },
];

const testimonials = [
  {
    name: "James M.",
    location: "London, UK",
    text: "I bought 2 acres in Nakuru without ever visiting Kenya. My Concierge Advisor handled everything — the site visit, verification, and title transfer. The recorded video tour gave me complete confidence.",
    rating: 5,
  },
  {
    name: "Dr. Wanjiru K.",
    location: "Houston, USA",
    text: "As a busy physician, I needed someone to do the legwork. The Complete package was worth every penny. I now have a verified half-acre in Kiambu for my retirement home.",
    rating: 5,
  },
  {
    name: "Ahmed O.",
    location: "Dubai, UAE",
    text: "The virtual site visit sold me. Watching the agent walk the boundary on a live video call — it was like being there. Title deed arrived at my Dubai address in 3 weeks.",
    rating: 5,
  },
];

const faqs = [
  {
    q: "What exactly does a Concierge Advisor do?",
    a: "Your Concierge Advisor is a dedicated land acquisition specialist assigned to your purchase. They find plots matching your brief, coordinate site visits, manage the verification process, liaise with agents and lawyers, and oversee the entire transaction until you hold the title deed.",
  },
  {
    q: "Can I upgrade my package later?",
    a: "Yes. You can start with Discovery and upgrade to Premium or Complete at any point. The amount you've already paid is deducted from the upgrade price.",
  },
  {
    q: "How long does the full process take?",
    a: "Discovery to shortlist: 3–5 days. Verification: 5–7 business days. Title transfer: 2–4 weeks after payment. Total for the Complete package: typically 4–8 weeks.",
  },
  {
    q: "Is the intro call really free?",
    a: "Yes. The 15-minute intro call is free with no obligation. It helps us understand your needs and recommend the right package. You only pay when you choose a package.",
  },
  {
    q: "What if I don't like any plots on the shortlist?",
    a: "Your advisor will prepare a second shortlist at no extra cost. We keep searching until we find the right match, or you can request a refund within 14 days of the Discovery package.",
  },
  {
    q: "How do I pay?",
    a: "We accept M-Pesa, bank transfer (KES, GBP, USD), and Stripe (card payments). For the Complete package, land payment goes through Ardhi's escrow account for your protection.",
  },
];

const countries = [
  // Popular diaspora countries (shown first)
  { value: "KE", label: "Kenya", code: "+254", placeholder: "+254 7XX XXX XXX" },
  { value: "GB", label: "United Kingdom", code: "+44", placeholder: "+44 7XXX XXX XXX" },
  { value: "US", label: "United States", code: "+1", placeholder: "+1 (XXX) XXX-XXXX" },
  { value: "CA", label: "Canada", code: "+1", placeholder: "+1 (XXX) XXX-XXXX" },
  { value: "AE", label: "United Arab Emirates", code: "+971", placeholder: "+971 5X XXX XXXX" },
  { value: "AU", label: "Australia", code: "+61", placeholder: "+61 4XX XXX XXX" },
  { value: "DE", label: "Germany", code: "+49", placeholder: "+49 1XX XXXXXXX" },
  { value: "ZA", label: "South Africa", code: "+27", placeholder: "+27 XX XXX XXXX" },
  { value: "NG", label: "Nigeria", code: "+234", placeholder: "+234 XXX XXX XXXX" },
  { value: "__DIVIDER__", label: "──────────────", code: "", placeholder: "" },
  // All other countries A-Z
  { value: "AF", label: "Afghanistan", code: "+93", placeholder: "+93 XX XXX XXXX" },
  { value: "AL", label: "Albania", code: "+355", placeholder: "+355 XX XXX XXXX" },
  { value: "DZ", label: "Algeria", code: "+213", placeholder: "+213 XX XXX XXXX" },
  { value: "AO", label: "Angola", code: "+244", placeholder: "+244 XXX XXX XXX" },
  { value: "AR", label: "Argentina", code: "+54", placeholder: "+54 XX XXXX XXXX" },
  { value: "AT", label: "Austria", code: "+43", placeholder: "+43 XXX XXX XXXX" },
  { value: "BH", label: "Bahrain", code: "+973", placeholder: "+973 XXXX XXXX" },
  { value: "BD", label: "Bangladesh", code: "+880", placeholder: "+880 XXXX XXXXXX" },
  { value: "BE", label: "Belgium", code: "+32", placeholder: "+32 XXX XX XX XX" },
  { value: "BJ", label: "Benin", code: "+229", placeholder: "+229 XX XXX XXX" },
  { value: "BW", label: "Botswana", code: "+267", placeholder: "+267 XX XXX XXX" },
  { value: "BR", label: "Brazil", code: "+55", placeholder: "+55 XX XXXXX XXXX" },
  { value: "BF", label: "Burkina Faso", code: "+226", placeholder: "+226 XX XX XX XX" },
  { value: "BI", label: "Burundi", code: "+257", placeholder: "+257 XX XX XXXX" },
  { value: "KH", label: "Cambodia", code: "+855", placeholder: "+855 XX XXX XXX" },
  { value: "CM", label: "Cameroon", code: "+237", placeholder: "+237 X XXXX XXXX" },
  { value: "CF", label: "Central African Republic", code: "+236", placeholder: "+236 XX XX XX XX" },
  { value: "TD", label: "Chad", code: "+235", placeholder: "+235 XX XX XX XX" },
  { value: "CL", label: "Chile", code: "+56", placeholder: "+56 X XXXX XXXX" },
  { value: "CN", label: "China", code: "+86", placeholder: "+86 XXX XXXX XXXX" },
  { value: "CO", label: "Colombia", code: "+57", placeholder: "+57 XXX XXX XXXX" },
  { value: "KM", label: "Comoros", code: "+269", placeholder: "+269 XXX XXXX" },
  { value: "CG", label: "Congo", code: "+242", placeholder: "+242 XX XXX XXXX" },
  { value: "CD", label: "Congo (DRC)", code: "+243", placeholder: "+243 XX XXX XXXX" },
  { value: "CR", label: "Costa Rica", code: "+506", placeholder: "+506 XXXX XXXX" },
  { value: "CI", label: "Cote d'Ivoire", code: "+225", placeholder: "+225 XX XX XX XX" },
  { value: "HR", label: "Croatia", code: "+385", placeholder: "+385 XX XXX XXXX" },
  { value: "CY", label: "Cyprus", code: "+357", placeholder: "+357 XX XXXXXX" },
  { value: "CZ", label: "Czech Republic", code: "+420", placeholder: "+420 XXX XXX XXX" },
  { value: "DK", label: "Denmark", code: "+45", placeholder: "+45 XX XX XX XX" },
  { value: "DJ", label: "Djibouti", code: "+253", placeholder: "+253 XX XX XX XX" },
  { value: "EG", label: "Egypt", code: "+20", placeholder: "+20 XX XXXX XXXX" },
  { value: "GQ", label: "Equatorial Guinea", code: "+240", placeholder: "+240 XXX XXX XXX" },
  { value: "ER", label: "Eritrea", code: "+291", placeholder: "+291 X XXX XXX" },
  { value: "EE", label: "Estonia", code: "+372", placeholder: "+372 XXXX XXXX" },
  { value: "SZ", label: "Eswatini", code: "+268", placeholder: "+268 XXXX XXXX" },
  { value: "ET", label: "Ethiopia", code: "+251", placeholder: "+251 XX XXX XXXX" },
  { value: "FI", label: "Finland", code: "+358", placeholder: "+358 XX XXX XXXX" },
  { value: "FR", label: "France", code: "+33", placeholder: "+33 X XX XX XX XX" },
  { value: "GA", label: "Gabon", code: "+241", placeholder: "+241 X XX XX XX" },
  { value: "GM", label: "Gambia", code: "+220", placeholder: "+220 XXX XXXX" },
  { value: "GH", label: "Ghana", code: "+233", placeholder: "+233 XX XXX XXXX" },
  { value: "GR", label: "Greece", code: "+30", placeholder: "+30 XXX XXX XXXX" },
  { value: "GN", label: "Guinea", code: "+224", placeholder: "+224 XXX XX XX XX" },
  { value: "GW", label: "Guinea-Bissau", code: "+245", placeholder: "+245 XXX XXXX" },
  { value: "HK", label: "Hong Kong", code: "+852", placeholder: "+852 XXXX XXXX" },
  { value: "HU", label: "Hungary", code: "+36", placeholder: "+36 XX XXX XXXX" },
  { value: "IN", label: "India", code: "+91", placeholder: "+91 XXXXX XXXXX" },
  { value: "ID", label: "Indonesia", code: "+62", placeholder: "+62 XXX XXXX XXXX" },
  { value: "IQ", label: "Iraq", code: "+964", placeholder: "+964 XXX XXX XXXX" },
  { value: "IE", label: "Ireland", code: "+353", placeholder: "+353 XX XXX XXXX" },
  { value: "IL", label: "Israel", code: "+972", placeholder: "+972 XX XXX XXXX" },
  { value: "IT", label: "Italy", code: "+39", placeholder: "+39 XXX XXX XXXX" },
  { value: "JM", label: "Jamaica", code: "+1876", placeholder: "+1 876 XXX XXXX" },
  { value: "JP", label: "Japan", code: "+81", placeholder: "+81 XX XXXX XXXX" },
  { value: "JO", label: "Jordan", code: "+962", placeholder: "+962 X XXXX XXXX" },
  { value: "KW", label: "Kuwait", code: "+965", placeholder: "+965 XXXX XXXX" },
  { value: "LB", label: "Lebanon", code: "+961", placeholder: "+961 XX XXX XXX" },
  { value: "LS", label: "Lesotho", code: "+266", placeholder: "+266 XXXX XXXX" },
  { value: "LR", label: "Liberia", code: "+231", placeholder: "+231 XX XXX XXXX" },
  { value: "LY", label: "Libya", code: "+218", placeholder: "+218 XX XXX XXXX" },
  { value: "MG", label: "Madagascar", code: "+261", placeholder: "+261 XX XX XXX XX" },
  { value: "MW", label: "Malawi", code: "+265", placeholder: "+265 X XXXX XXXX" },
  { value: "MY", label: "Malaysia", code: "+60", placeholder: "+60 XX XXXX XXXX" },
  { value: "ML", label: "Mali", code: "+223", placeholder: "+223 XX XX XX XX" },
  { value: "MR", label: "Mauritania", code: "+222", placeholder: "+222 XX XX XX XX" },
  { value: "MU", label: "Mauritius", code: "+230", placeholder: "+230 XXXX XXXX" },
  { value: "MX", label: "Mexico", code: "+52", placeholder: "+52 XX XXXX XXXX" },
  { value: "MA", label: "Morocco", code: "+212", placeholder: "+212 XX XXX XXXX" },
  { value: "MZ", label: "Mozambique", code: "+258", placeholder: "+258 XX XXX XXXX" },
  { value: "NA", label: "Namibia", code: "+264", placeholder: "+264 XX XXX XXXX" },
  { value: "NL", label: "Netherlands", code: "+31", placeholder: "+31 X XXXX XXXX" },
  { value: "NZ", label: "New Zealand", code: "+64", placeholder: "+64 XX XXX XXXX" },
  { value: "NE", label: "Niger", code: "+227", placeholder: "+227 XX XX XX XX" },
  { value: "NO", label: "Norway", code: "+47", placeholder: "+47 XXX XX XXX" },
  { value: "OM", label: "Oman", code: "+968", placeholder: "+968 XXXX XXXX" },
  { value: "PK", label: "Pakistan", code: "+92", placeholder: "+92 XXX XXX XXXX" },
  { value: "PH", label: "Philippines", code: "+63", placeholder: "+63 XXX XXX XXXX" },
  { value: "PL", label: "Poland", code: "+48", placeholder: "+48 XXX XXX XXX" },
  { value: "PT", label: "Portugal", code: "+351", placeholder: "+351 XXX XXX XXX" },
  { value: "QA", label: "Qatar", code: "+974", placeholder: "+974 XXXX XXXX" },
  { value: "RO", label: "Romania", code: "+40", placeholder: "+40 XXX XXX XXX" },
  { value: "RU", label: "Russia", code: "+7", placeholder: "+7 XXX XXX XX XX" },
  { value: "RW", label: "Rwanda", code: "+250", placeholder: "+250 XXX XXX XXX" },
  { value: "SA", label: "Saudi Arabia", code: "+966", placeholder: "+966 XX XXX XXXX" },
  { value: "SN", label: "Senegal", code: "+221", placeholder: "+221 XX XXX XX XX" },
  { value: "RS", label: "Serbia", code: "+381", placeholder: "+381 XX XXX XXXX" },
  { value: "SC", label: "Seychelles", code: "+248", placeholder: "+248 X XX XX XX" },
  { value: "SL", label: "Sierra Leone", code: "+232", placeholder: "+232 XX XXX XXX" },
  { value: "SG", label: "Singapore", code: "+65", placeholder: "+65 XXXX XXXX" },
  { value: "SO", label: "Somalia", code: "+252", placeholder: "+252 XX XXX XXX" },
  { value: "SS", label: "South Sudan", code: "+211", placeholder: "+211 XX XXX XXXX" },
  { value: "ES", label: "Spain", code: "+34", placeholder: "+34 XXX XXX XXX" },
  { value: "LK", label: "Sri Lanka", code: "+94", placeholder: "+94 XX XXX XXXX" },
  { value: "SD", label: "Sudan", code: "+249", placeholder: "+249 XX XXX XXXX" },
  { value: "SE", label: "Sweden", code: "+46", placeholder: "+46 XX XXX XX XX" },
  { value: "CH", label: "Switzerland", code: "+41", placeholder: "+41 XX XXX XX XX" },
  { value: "TZ", label: "Tanzania", code: "+255", placeholder: "+255 XXX XXX XXX" },
  { value: "TH", label: "Thailand", code: "+66", placeholder: "+66 XX XXX XXXX" },
  { value: "TG", label: "Togo", code: "+228", placeholder: "+228 XX XXX XXX" },
  { value: "TT", label: "Trinidad and Tobago", code: "+1868", placeholder: "+1 868 XXX XXXX" },
  { value: "TN", label: "Tunisia", code: "+216", placeholder: "+216 XX XXX XXX" },
  { value: "TR", label: "Turkey", code: "+90", placeholder: "+90 XXX XXX XXXX" },
  { value: "UG", label: "Uganda", code: "+256", placeholder: "+256 XXX XXX XXX" },
  { value: "UA", label: "Ukraine", code: "+380", placeholder: "+380 XX XXX XXXX" },
  { value: "ZM", label: "Zambia", code: "+260", placeholder: "+260 XX XXX XXXX" },
  { value: "ZW", label: "Zimbabwe", code: "+263", placeholder: "+263 XX XXX XXXX" },
];

const getCountry = (value: string) => countries.find((c) => c.value === value);

export default function ConciergePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    county: "",
    budget: "",
    use: "",
    timeline: "",
    message: "",
    website: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleCountryChange(value: string) {
    const selected = getCountry(value);
    const code = selected?.code || "";
    const prevCountry = getCountry(formData.country);
    const prevCode = prevCountry?.code || "";
    const currentPhone = formData.phone;

    let newPhone = currentPhone;
    if (!currentPhone || currentPhone === prevCode || currentPhone === prevCode + " ") {
      newPhone = code ? code + " " : "";
    } else if (prevCode && currentPhone.startsWith(prevCode)) {
      newPhone = code + currentPhone.slice(prevCode.length);
    }
    setFormData({ ...formData, country: value, phone: newPhone });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await submitConciergeEnquiry({ ...formData });
    setSubmitting(false);
    if (result.success) setSubmitted(true);
  };

  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="bg-navy text-white py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-ardhi font-mono text-sm tracking-widest uppercase mb-4">
            Ardhi Concierge
          </p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            We find the land.
            <br />
            <span className="text-ardhi">You sign the deed.</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            A bespoke, end-to-end land acquisition service for Kenyans abroad.
            Your dedicated advisor handles everything — from shortlisting to
            title transfer — so you don't have to fly home.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#packages"
              className="bg-ardhi text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-ardhi-dark transition-colors"
            >
              View packages
            </a>
            <a
              href="#enquiry"
              className="border border-white/30 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors"
            >
              Book a free intro call
            </a>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-ardhi text-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-center gap-8 md:gap-16 text-center">
          {[
            ["340+", "Concierge purchases completed"],
            ["98%", "Client satisfaction rate"],
            ["47", "Counties covered across Kenya"],
            ["21 days", "Average time to title deed"],
          ].map(([num, label]) => (
            <div key={label}>
              <div className="text-2xl font-bold">{num}</div>
              <div className="text-white/80 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-bg">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-ardhi font-mono text-sm tracking-widest uppercase mb-3">
            The process
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-navy mb-12">
            Five steps to your title deed
          </h2>

          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={step.number} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-ardhi/10 flex items-center justify-center">
                  <span className="font-serif text-xl font-bold text-ardhi">
                    {step.number}
                  </span>
                </div>
                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-navy mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted leading-relaxed">
                    {step.description}
                  </p>
                  {i < steps.length - 1 && (
                    <div className="w-px h-8 bg-border ml-7 mt-4" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-ardhi font-mono text-sm tracking-widest uppercase mb-3">
              Packages
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-navy mb-4">
              Choose your level of support
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              Every package includes access to NLIMS-verified listings and our
              Trust Score system. Upgrade anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className={`relative rounded-2xl border p-8 flex flex-col ${
                  pkg.popular
                    ? "border-ardhi shadow-lg shadow-ardhi/10 ring-1 ring-ardhi"
                    : "border-border"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ardhi text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <h3 className="font-serif text-2xl font-bold text-navy">
                  {pkg.name}
                </h3>
                <div className="mt-3 mb-1">
                  <span className="text-3xl font-bold text-navy">
                    {pkg.price}
                  </span>
                  <span className="text-muted text-sm ml-2">
                    ({pkg.priceKES})
                  </span>
                </div>
                <p className="text-muted text-sm mb-6">{pkg.description}</p>

                <ul className="space-y-3 mb-8 flex-grow">
                  {pkg.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm text-gray-700"
                    >
                      <svg
                        className="w-5 h-5 text-ardhi flex-shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href="#enquiry"
                  className={`block text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                    pkg.popular
                      ? "bg-ardhi text-white hover:bg-ardhi-dark"
                      : "bg-navy/5 text-navy hover:bg-navy/10"
                  }`}
                >
                  {pkg.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 bg-navy text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-ardhi font-mono text-sm tracking-widest uppercase mb-3">
              Client stories
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Trusted by diaspora buyers worldwide
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-trust-amber"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-gray-400 text-xs">{t.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ENQUIRY FORM */}
      <section id="enquiry" className="py-20 bg-bg">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-ardhi font-mono text-sm tracking-widest uppercase mb-3">
              Get started
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-navy mb-4">
              Book your free intro call
            </h2>
            <p className="text-muted">
              Tell us what you&apos;re looking for and we&apos;ll match you with a
              Concierge Advisor. No obligation, no pressure.
            </p>
          </div>

          {submitted ? (
            <div className="bg-ardhi/5 border border-ardhi/20 rounded-2xl p-10 text-center">
              <svg
                className="w-16 h-16 text-ardhi mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="font-serif text-2xl font-bold text-navy mb-2">
                Enquiry received
              </h3>
              <p className="text-muted mb-6">
                A Concierge Advisor will contact you within 24 hours to schedule
                your free intro call. Check your email and WhatsApp.
              </p>
              <Link
                href="/search"
                className="text-ardhi font-semibold hover:underline"
              >
                Browse listings while you wait →
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white border border-border rounded-2xl p-8 shadow-sm"
            >
              <div className="grid md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi"
                    placeholder="James Kariuki"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi"
                    placeholder="james@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">
                    WhatsApp / Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi"
                    placeholder={getCountry(formData.country)?.placeholder || "+XX XXX XXX XXXX"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">
                    I&apos;m based in
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi bg-white"
                  >
                    <option value="">Select country</option>
                    {countries.map((c) =>
                      c.value === "__DIVIDER__" ? (
                        <option key="divider" disabled>
                          {c.label}
                        </option>
                      ) : (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">
                    Preferred county
                  </label>
                  <select
                    value={formData.county}
                    onChange={(e) =>
                      setFormData({ ...formData, county: e.target.value })
                    }
                    className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi bg-white"
                  >
                    <option value="">Any county</option>
                    {counties.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">
                    Budget range
                  </label>
                  <select
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData({ ...formData, budget: e.target.value })
                    }
                    className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi bg-white"
                  >
                    <option value="">Select budget</option>
                    <option value="under-1m">Under KES 1M (£6,000)</option>
                    <option value="1m-3m">KES 1M – 3M (£6K – £18K)</option>
                    <option value="3m-5m">KES 3M – 5M (£18K – £30K)</option>
                    <option value="5m-10m">KES 5M – 10M (£30K – £60K)</option>
                    <option value="10m-plus">KES 10M+ (£60K+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">
                    Land use
                  </label>
                  <select
                    value={formData.use}
                    onChange={(e) =>
                      setFormData({ ...formData, use: e.target.value })
                    }
                    className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi bg-white"
                  >
                    <option value="">Select purpose</option>
                    <option value="residential">Residential (build a home)</option>
                    <option value="investment">Investment (hold & resell)</option>
                    <option value="agricultural">Agricultural (farming)</option>
                    <option value="commercial">Commercial (business)</option>
                    <option value="retirement">Retirement home</option>
                    <option value="unsure">Not sure yet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">
                    Timeline
                  </label>
                  <select
                    value={formData.timeline}
                    onChange={(e) =>
                      setFormData({ ...formData, timeline: e.target.value })
                    }
                    className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi bg-white"
                  >
                    <option value="">When do you want to buy?</option>
                    <option value="asap">As soon as possible</option>
                    <option value="1-3months">Within 1–3 months</option>
                    <option value="3-6months">Within 3–6 months</option>
                    <option value="6-12months">Within 6–12 months</option>
                    <option value="exploring">Just exploring</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-navy mb-1.5">
                  Tell us more (optional)
                </label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi resize-none"
                  placeholder="Anything else we should know? Specific locations, family situation, investment goals..."
                />
              </div>

              {/* Honeypot */}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-ardhi text-white py-4 rounded-lg font-semibold text-lg hover:bg-ardhi-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit enquiry — we'll call within 24 hours"}
              </button>

              <p className="text-center text-muted text-xs mt-4">
                Free intro call. No obligation. Your data is protected under
                Ardhi&apos;s{" "}
                <Link href="/privacy" className="underline">
                  privacy policy
                </Link>
                .
              </p>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-serif text-3xl font-bold text-navy mb-8 text-center">
            Common questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex justify-between items-center p-5 text-left hover:bg-bg/50 transition-colors"
                >
                  <span className="font-medium text-navy pr-4">{faq.q}</span>
                  <span
                    className={`text-ardhi text-xl transition-transform duration-200 ${
                      openFaq === i ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === i ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="px-5 pb-5 text-muted text-sm leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-navy text-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-3xl font-bold mb-4">
            Ready to find your land?
          </h2>
          <p className="text-gray-300 mb-8">
            Book a free 15-minute intro call. No obligation, no pressure — just
            honest advice from someone who knows the Kenyan land market.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#enquiry"
              className="bg-ardhi text-white px-8 py-4 rounded-lg font-semibold hover:bg-ardhi-dark transition-colors"
            >
              Book free intro call
            </a>
            <a
              href="https://wa.me/254700000000?text=Hi%2C%20I%27m%20interested%20in%20Ardhi%20Concierge"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/30 text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              WhatsApp us directly
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
