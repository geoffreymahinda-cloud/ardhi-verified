import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/lib/data";
import { formatKES, formatGBP, kesToGbp, calculateInstalment } from "@/lib/data";
import ArdhiShield from "./ArdhiShield";

interface PropertyCardProps {
  listing: Listing;
}

const tierStyles: Record<string, string> = {
  sacco: "bg-teal-600 text-white",
  bank: "bg-navy text-white",
  developer: "bg-[#C4A44A] text-navy",
};

const tierLabels: Record<string, string> = {
  sacco: "SACCO Partner",
  bank: "Banking Partner",
  developer: "Verified Developer",
};

export default function PropertyCard({ listing }: PropertyCardProps) {
  const longestTerm = listing.instalmentTermOptions[listing.instalmentTermOptions.length - 1] || 36;
  const monthly = listing.instalmentAvailable
    ? calculateInstalment(listing.priceKES, listing.minDepositPercent, longestTerm).monthly
    : 0;

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group block overflow-hidden rounded-xl bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Institution badge — top-left */}
        {listing.institutionTier && listing.institutionName && (
          <div className="absolute left-3 top-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${tierStyles[listing.institutionTier] || "bg-gray-200 text-gray-700"}`}>
              {listing.institutionName}
            </span>
          </div>
        )}

        {/* Verification tier badge — top-right */}
        <div className="absolute right-3 top-3">
          {listing.verificationTier === "complete_verified" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1A3A2A]/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3.5 6.5V11.5C3.5 16.74 7.16 21.64 12 23C16.84 21.64 20.5 16.74 20.5 11.5V6.5L12 2Z" fill="#C8902A" />
                <path d="M10 15.5L7.5 13L8.91 11.59L10 12.67L15.09 7.59L16.5 9L10 15.5Z" fill="white" />
              </svg>
              Complete
            </span>
          ) : listing.verificationTier === "digital_verified" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#C8902A]/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3.5 6.5V11.5C3.5 16.74 7.16 21.64 12 23C16.84 21.64 20.5 16.74 20.5 11.5V6.5L12 2Z" fill="white" />
                <path d="M12 7V13M12 15.5V16" stroke="#C8902A" strokeWidth={2} strokeLinecap="round" />
              </svg>
              Digital
            </span>
          ) : listing.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-ardhi/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
              <ArdhiShield size="sm" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/70 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
              Unverified
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Title */}
        <h3 className="font-serif text-base font-bold text-navy leading-snug line-clamp-1 group-hover:text-ardhi transition-colors">
          {listing.title}
        </h3>

        {/* Location */}
        <p className="flex items-center gap-1 text-xs text-muted">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          {listing.location}, {listing.county}
        </p>

        {/* Price — instalment or total */}
        {listing.instalmentAvailable && monthly > 0 ? (
          <div>
            <p className="text-lg font-bold text-ardhi">
              From {formatKES(monthly)}<span className="text-sm font-medium text-ardhi/70">/mo</span>
            </p>
            <p className="text-xs text-muted">Total {formatKES(listing.priceKES)}</p>
          </div>
        ) : (
          <p className="text-lg font-bold text-navy">{formatKES(listing.priceKES)}</p>
        )}

        {/* GBP equivalent */}
        <p className="text-xs text-muted">≈ {formatGBP(kesToGbp(listing.priceKES))}</p>

        {/* Meta */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-muted">{listing.size}</span>
          <span className="text-xs text-muted">·</span>
          <span className="text-xs text-muted">{listing.type}</span>
          <span className="text-xs text-muted">·</span>
          <span className="text-xs text-muted">{listing.use}</span>
        </div>
      </div>
    </Link>
  );
}
