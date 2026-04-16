"use client";

import { useEffect, useState } from "react";

interface Partner {
  id: number;
  name: string;
  logo_url: string | null;
}

const FALLBACK_PARTNERS = [
  "Savanna Finance",
  "Rift Valley SACCO",
  "Nairobi Credit Union",
  "Highlands Bank",
  "Lakeside SACCO",
  "Acacia Mortgage Fund",
];

export default function PartnerStrip() {
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    fetch("/api/partners")
      .then((r) => r.json())
      .then((data) => {
        if (data.partners?.length > 0) {
          setPartners(data.partners);
        } else {
          setPartners(FALLBACK_PARTNERS.map((name, i) => ({ id: i, name, logo_url: null })));
        }
      })
      .catch(() => {
        setPartners(FALLBACK_PARTNERS.map((name, i) => ({ id: i, name, logo_url: null })));
      });
  }, []);

  if (partners.length === 0) return null;

  // Duplicate for seamless infinite scroll
  const items = [...partners, ...partners, ...partners];

  return (
    <section className="bg-[#f8f9fa] border-y border-gray-100 py-8 overflow-hidden">
      <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
        Trusted by Kenya&apos;s leading finance institutions
      </p>
      <div className="relative">
        <div
          className="flex gap-4 animate-scroll"
          style={{
            width: "max-content",
          }}
        >
          {items.map((partner, i) => (
            <div
              key={`${partner.id}-${i}`}
              className="flex-shrink-0 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-[#c8a96e] hover:text-[#c8a96e] hover:shadow-sm cursor-default"
            >
              {partner.name}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: running;
        }
      `}</style>
    </section>
  );
}
