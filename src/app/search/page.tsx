"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { listings, counties, agents, getAgent, formatKES, type Listing } from "@/lib/data";
import PropertyCard from "@/components/ui/PropertyCard";
import TrustScoreBadge from "@/components/ui/TrustScoreBadge";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

const ITEMS_PER_PAGE = 6;

const landTypes = ["Freehold", "Leasehold"];
const useTypes = ["Residential", "Commercial", "Agricultural", "Mixed Use"];
const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "trust", label: "Trust Score" },
];

export default function SearchPage() {
  // --- Filter state ---
  const [searchText, setSearchText] = useState("");
  const [selectedCounties, setSelectedCounties] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedLandTypes, setSelectedLandTypes] = useState<string[]>([]);
  const [selectedUseTypes, setSelectedUseTypes] = useState<string[]>([]);
  const [minRating, setMinRating] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // --- Checkbox toggle helpers ---
  function toggleItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
  }

  // --- Clear all ---
  function clearAllFilters() {
    setSearchText("");
    setSelectedCounties([]);
    setPriceMin("");
    setPriceMax("");
    setSizeMin("");
    setSizeMax("");
    setVerifiedOnly(false);
    setSelectedLandTypes([]);
    setSelectedUseTypes([]);
    setMinRating("");
    setCurrentPage(1);
  }

  // --- Filtered + sorted listings ---
  const filtered = useMemo(() => {
    let result = [...listings];

    // Search text
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q) ||
          l.county.toLowerCase().includes(q)
      );
    }

    // County
    if (selectedCounties.length > 0) {
      result = result.filter((l) => selectedCounties.includes(l.county));
    }

    // Price
    const pMin = parseFloat(priceMin);
    const pMax = parseFloat(priceMax);
    if (!isNaN(pMin)) result = result.filter((l) => l.priceKES >= pMin);
    if (!isNaN(pMax)) result = result.filter((l) => l.priceKES <= pMax);

    // Size
    const sMin = parseFloat(sizeMin);
    const sMax = parseFloat(sizeMax);
    if (!isNaN(sMin)) result = result.filter((l) => l.sizeAcres >= sMin);
    if (!isNaN(sMax)) result = result.filter((l) => l.sizeAcres <= sMax);

    // Verified
    if (verifiedOnly) result = result.filter((l) => l.verified);

    // Land type
    if (selectedLandTypes.length > 0) {
      result = result.filter((l) => selectedLandTypes.includes(l.type));
    }

    // Use type
    if (selectedUseTypes.length > 0) {
      result = result.filter((l) => selectedUseTypes.includes(l.use));
    }

    // Agent rating (min stars) — skip for now as listings don't carry rating directly
    // We'd need to join with agents; let's do it
    if (minRating) {
      const mr = parseFloat(minRating);
      if (!isNaN(mr)) {
        result = result.filter((l) => {
          const agent = agents.find((a) => a.id === l.agentId);
          return agent ? agent.rating >= mr : false;
        });
      }
    }

    // Sort
    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => a.priceKES - b.priceKES);
        break;
      case "price-desc":
        result.sort((a, b) => b.priceKES - a.priceKES);
        break;
      case "trust":
        result.sort((a, b) => b.trustScore - a.trustScore);
        break;
      case "newest":
      default:
        result.sort((a, b) => b.id - a.id);
        break;
    }

    return result;
  }, [
    searchText,
    selectedCounties,
    priceMin,
    priceMax,
    sizeMin,
    sizeMax,
    verifiedOnly,
    selectedLandTypes,
    selectedUseTypes,
    minRating,
    sortBy,
  ]);

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedListings = filtered.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleFilterChange = <T,>(setter: (v: T) => void) => (val: T) => {
    setter(val);
    setCurrentPage(1);
  };

  // --- Page number generation ---
  function getPageNumbers(): (number | "...")[] {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      for (
        let i = Math.max(2, safeCurrentPage - 1);
        i <= Math.min(totalPages - 1, safeCurrentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }

  // --- Sidebar content (shared between desktop and mobile) ---
  const sidebarContent = (
    <div className="space-y-6">
      {/* County filter */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          County
        </h3>
        <div className="space-y-2">
          {counties.map((county) => (
            <label
              key={county}
              className="flex cursor-pointer items-center gap-2 text-sm text-text"
            >
              <input
                type="checkbox"
                checked={selectedCounties.includes(county)}
                onChange={() =>
                  handleFilterChange(setSelectedCounties)(
                    toggleItem(selectedCounties, county)
                  )
                }
                className="h-4 w-4 rounded border-border text-ardhi accent-ardhi"
              />
              {county}
            </label>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Price Range (KES)
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={(e) =>
              handleFilterChange(setPriceMin)(e.target.value)
            }
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:border-ardhi focus:outline-none focus:ring-1 focus:ring-ardhi"
          />
          <span className="text-muted">-</span>
          <input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={(e) =>
              handleFilterChange(setPriceMax)(e.target.value)
            }
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:border-ardhi focus:outline-none focus:ring-1 focus:ring-ardhi"
          />
        </div>
      </div>

      {/* Plot size */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Plot Size (Acres)
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            placeholder="Min"
            value={sizeMin}
            onChange={(e) =>
              handleFilterChange(setSizeMin)(e.target.value)
            }
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:border-ardhi focus:outline-none focus:ring-1 focus:ring-ardhi"
          />
          <span className="text-muted">-</span>
          <input
            type="number"
            step="0.01"
            placeholder="Max"
            value={sizeMax}
            onChange={(e) =>
              handleFilterChange(setSizeMax)(e.target.value)
            }
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:border-ardhi focus:outline-none focus:ring-1 focus:ring-ardhi"
          />
        </div>
      </div>

      {/* Verification toggle */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Verification
        </h3>
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-sm text-text">Verified only</span>
          <button
            type="button"
            role="switch"
            aria-checked={verifiedOnly}
            onClick={() =>
              handleFilterChange(setVerifiedOnly)(!verifiedOnly)
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              verifiedOnly ? "bg-ardhi" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                verifiedOnly ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </label>
      </div>

      {/* Land type */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Land Type
        </h3>
        <div className="space-y-2">
          {landTypes.map((lt) => (
            <label
              key={lt}
              className="flex cursor-pointer items-center gap-2 text-sm text-text"
            >
              <input
                type="checkbox"
                checked={selectedLandTypes.includes(lt)}
                onChange={() =>
                  handleFilterChange(setSelectedLandTypes)(
                    toggleItem(selectedLandTypes, lt)
                  )
                }
                className="h-4 w-4 rounded border-border text-ardhi accent-ardhi"
              />
              {lt}
            </label>
          ))}
        </div>
      </div>

      {/* Use type */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Use Type
        </h3>
        <div className="space-y-2">
          {useTypes.map((ut) => (
            <label
              key={ut}
              className="flex cursor-pointer items-center gap-2 text-sm text-text"
            >
              <input
                type="checkbox"
                checked={selectedUseTypes.includes(ut)}
                onChange={() =>
                  handleFilterChange(setSelectedUseTypes)(
                    toggleItem(selectedUseTypes, ut)
                  )
                }
                className="h-4 w-4 rounded border-border text-ardhi accent-ardhi"
              />
              {ut}
            </label>
          ))}
        </div>
      </div>

      {/* Agent rating */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Agent Rating
        </h3>
        <select
          value={minRating}
          onChange={(e) =>
            handleFilterChange(setMinRating)(e.target.value)
          }
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:border-ardhi focus:outline-none focus:ring-1 focus:ring-ardhi"
        >
          <option value="">Any rating</option>
          <option value="3">3+ stars</option>
          <option value="3.5">3.5+ stars</option>
          <option value="4">4+ stars</option>
          <option value="4.5">4.5+ stars</option>
          <option value="4.8">4.8+ stars</option>
        </select>
      </div>

      {/* Clear all */}
      <button
        type="button"
        onClick={clearAllFilters}
        className="w-full text-center text-sm font-medium text-ardhi transition-colors hover:text-ardhi-dark"
      >
        Clear all filters
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Search bar ── */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by title, location, or county..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-border bg-bg py-3 pl-10 pr-4 text-sm text-text placeholder:text-muted/60 focus:border-ardhi focus:outline-none focus:ring-1 focus:ring-ardhi"
            />
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-ardhi px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-ardhi-dark"
          >
            Search
          </button>
          {/* Mobile filter toggle */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="shrink-0 rounded-lg border border-border bg-white p-3 text-muted transition-colors hover:text-text lg:hidden"
            aria-label="Open filters"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
              />
            </svg>
          </button>
        </div>
        {/* Result count */}
        <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
          <p className="text-sm text-muted">
            <span className="font-semibold text-text">{filtered.length}</span>{" "}
            verified plots found
          </p>
        </div>
      </div>

      {/* ── Mobile filter drawer ── */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          {/* Drawer */}
          <div className="relative ml-auto flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-lg p-2 text-muted hover:text-text"
                aria-label="Close filters"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6">
        {/* Left sidebar — desktop only */}
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <div className="sticky top-6 rounded-xl border border-border bg-white p-5">
            {sidebarContent}
          </div>
        </aside>

        {/* Right content */}
        <div className="min-w-0 flex-1">
          {/* Top bar — sort + view toggle */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label
                htmlFor="sort-select"
                className="text-sm font-medium text-muted"
              >
                Sort by
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:border-ardhi focus:outline-none focus:ring-1 focus:ring-ardhi"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center overflow-hidden rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2 transition-colors ${
                  viewMode === "grid"
                    ? "bg-ardhi text-white"
                    : "bg-white text-muted hover:text-text"
                }`}
                aria-label="Grid view"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <rect x="1" y="1" width="6" height="6" rx="1" />
                  <rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="1" y="9" width="6" height="6" rx="1" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 transition-colors ${
                  viewMode === "list"
                    ? "bg-ardhi text-white"
                    : "bg-white text-muted hover:text-text"
                }`}
                aria-label="List view"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <rect x="1" y="1" width="14" height="3" rx="1" />
                  <rect x="1" y="6.5" width="14" height="3" rx="1" />
                  <rect x="1" y="12" width="14" height="3" rx="1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Results */}
          {paginatedListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white py-20">
              <svg
                className="mb-4 h-12 w-12 text-muted/40"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <p className="text-lg font-semibold text-navy">No plots found</p>
              <p className="mt-1 text-sm text-muted">
                Try adjusting your filters or search terms
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 text-sm font-medium text-ardhi hover:text-ardhi-dark"
              >
                Clear all filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedListings.map((listing) => (
                <PropertyCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedListings.map((listing) => (
                <ListCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-1">
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {getPageNumbers().map((page, i) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="px-2 text-sm text-muted"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      safeCurrentPage === page
                        ? "bg-ardhi text-white"
                        : "border border-border bg-white text-text hover:bg-bg"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── List mode horizontal card ─── */
function ListCard({ listing }: { listing: Listing }) {
  const agent = getAgent(listing.agentId);

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group flex overflow-hidden rounded-xl border border-border bg-white transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Image */}
      <div className="relative hidden w-64 shrink-0 sm:block">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="256px"
        />
        <div className="absolute left-3 top-3">
          <VerifiedBadge verified={listing.verified} />
        </div>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-base font-bold text-navy group-hover:text-ardhi">
              {listing.title}
            </h3>
            <TrustScoreBadge score={listing.trustScore} />
          </div>

          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
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

          <p className="mt-2 line-clamp-2 text-sm text-muted">
            {listing.description}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="text-lg font-bold text-navy">
            {formatKES(listing.priceKES)}
          </p>
          <span className="text-sm text-muted">
            {listing.size} &middot; {listing.type} &middot; {listing.use}
          </span>
          {agent && (
            <span className="text-xs text-muted">Agent: {agent.name}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
