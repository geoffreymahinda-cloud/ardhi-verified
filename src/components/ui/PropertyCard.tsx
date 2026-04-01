import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/lib/data";
import { getAgent, formatKES } from "@/lib/data";
import TrustScoreBadge from "./TrustScoreBadge";
import VerifiedBadge from "./VerifiedBadge";
import SaveButton from "./SaveButton";

interface PropertyCardProps {
  listing: Listing;
  saved?: boolean;
}

export default function PropertyCard({ listing, saved = false }: PropertyCardProps) {
  const agent = getAgent(listing.agentId);

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group block overflow-hidden rounded-xl bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Image area */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Verified badge — top-left */}
        <div className="absolute left-3 top-3">
          <VerifiedBadge verified={listing.verified} />
        </div>

        {/* Trust Score badge — top-right */}
        <div className="absolute right-3 top-3">
          <TrustScoreBadge score={listing.trustScore} />
        </div>

        {/* Heart save button */}
        <div className="absolute bottom-3 right-3">
          <SaveButton listingId={listing.id} initialSaved={saved} />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 p-4">
        {/* Price */}
        <p className="text-lg font-bold text-navy">
          {formatKES(listing.priceKES)}
        </p>

        {/* Location */}
        <p className="flex items-center gap-1 text-sm text-muted">
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          {listing.location}
        </p>

        {/* Size + Type */}
        <p className="text-sm text-muted">
          {listing.size} &middot; {listing.type}
        </p>

        {/* Agent */}
        {agent && (
          <p className="text-xs text-muted">
            Agent: {agent.name}
          </p>
        )}
      </div>
    </Link>
  );
}
