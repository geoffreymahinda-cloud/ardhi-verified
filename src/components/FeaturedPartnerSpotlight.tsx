"use client";

import { useEffect, useState } from "react";

interface Partner {
  id: number;
  name: string;
  description: string | null;
  website_url: string | null;
}

const FALLBACK: Partner[] = [
  { id: 1, name: "Savanna Finance", description: "Competitive mortgage rates for verified land purchases", website_url: null },
  { id: 2, name: "Rift Valley SACCO", description: "Member-owned financing for agricultural and residential land", website_url: null },
  { id: 3, name: "Nairobi Credit Union", description: "Fast land purchase loans for verified title deeds", website_url: null },
];

export default function FeaturedPartnerSpotlight() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    fetch("/api/partners/featured")
      .then((r) => r.json())
      .then((data) => {
        setPartners(data.partners?.length > 0 ? data.partners : FALLBACK);
      })
      .catch(() => setPartners(FALLBACK));
  }, []);

  useEffect(() => {
    if (partners.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % partners.length);
        setFade(true);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, [partners.length]);

  if (partners.length === 0) return null;

  const current = partners[index];

  return (
    <section className="bg-navy px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="text-center text-xs font-semibold text-[#c8a96e]/60 uppercase tracking-widest mb-8">
          Featured Finance Partner
        </p>

        <div className="rounded-2xl border border-[#c8a96e]/30 bg-white/[0.03] p-8 sm:p-10 text-center">
          <div
            className={`transition-opacity duration-400 ${fade ? "opacity-100" : "opacity-0"}`}
          >
            {/* Partner initial as logo placeholder */}
            <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-[#c8a96e]/10 border border-[#c8a96e]/20 flex items-center justify-center">
              <span className="text-2xl font-serif font-bold text-[#c8a96e]">
                {current.name.charAt(0)}
              </span>
            </div>

            <h3 className="font-serif text-2xl font-bold text-white">{current.name}</h3>

            {current.description && (
              <p className="mt-3 text-white/50 max-w-lg mx-auto leading-relaxed">
                {current.description}
              </p>
            )}

            <button
              onClick={() => {
                if (current.website_url) {
                  window.open(current.website_url, "_blank");
                }
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#c8a96e] px-6 py-3 text-sm font-semibold text-[#0a0f1a] transition hover:bg-[#d4b87a]"
            >
              Learn More
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>

          {/* Dots */}
          {partners.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {partners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setFade(false); setTimeout(() => { setIndex(i); setFade(true); }, 300); }}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-[#c8a96e]" : "w-1.5 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
