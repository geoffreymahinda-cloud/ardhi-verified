"use client";

import { useState, useMemo } from "react";
import { counties, type Listing } from "@/lib/data";
import PropertyCard from "@/components/ui/PropertyCard";

const tierFilters = [
  { value: "all", label: "All" },
  { value: "sacco", label: "SACCO" },
  { value: "bank", label: "Bank" },
  { value: "developer", label: "Developer" },
];

const verificationFilters = [
  { value: "all", label: "All Listings" },
  { value: "digital_verified", label: "Digital Verified" },
  { value: "complete_verified", label: "Fully Verified" },
];

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low \u2192 High" },
  { value: "price-desc", label: "Price: High \u2192 Low" },
  { value: "score", label: "Trust Score" },
];

export default function BrowseClient({ listings }: { listings: Listing[] }) {
  const [searchText, setSearchText] = useState("");
  const [selectedTier, setSelectedTier] = useState("all");
  const [selectedCounty, setSelectedCounty] = useState("");
  const [instalmentOnly, setInstalmentOnly] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const filtered = useMemo(() => {
    let result = [...listings];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter((l) =>
        l.title.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q) ||
        l.county.toLowerCase().includes(q) ||
        (l.institutionName || "").toLowerCase().includes(q)
      );
    }

    if (selectedTier !== "all") {
      result = result.filter((l) => l.institutionTier === selectedTier);
    }

    if (selectedCounty) {
      result = result.filter((l) => l.county === selectedCounty);
    }

    if (instalmentOnly) {
      result = result.filter((l) => l.instalmentAvailable);
    }

    if (verificationFilter === "digital_verified") {
      result = result.filter((l) => l.verificationTier === "digital_verified" || l.verificationTier === "complete_verified");
    } else if (verificationFilter === "complete_verified") {
      result = result.filter((l) => l.verificationTier === "complete_verified");
    }

    switch (sortBy) {
      case "price-asc": result.sort((a, b) => a.priceKES - b.priceKES); break;
      case "price-desc": result.sort((a, b) => b.priceKES - a.priceKES); break;
      case "score": result.sort((a, b) => b.trustScore - a.trustScore); break;
      default: result.sort((a, b) => b.id - a.id);
    }

    return result;
  }, [listings, searchText, selectedTier, selectedCounty, instalmentOnly, verificationFilter, sortBy]);

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-navy px-4 pb-6 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">Browse Land</h1>
          <p className="mt-2 text-white/50">Verified listings from institutional partners</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="border-b border-border bg-white sticky top-[57px] z-40">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Search by title, location, or institution..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg py-2.5 pl-10 pr-4 text-sm placeholder:text-muted/60 focus:border-ardhi focus:outline-none focus:ring-1 focus:ring-ardhi"
              />
            </div>

            {/* Tier filter */}
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              {tierFilters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setSelectedTier(f.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedTier === f.value ? "bg-navy text-white" : "text-muted hover:text-navy"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* County */}
            <select
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2.5 text-xs font-medium text-navy focus:border-ardhi focus:outline-none"
            >
              <option value="">All Counties</option>
              {counties.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Instalment toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={instalmentOnly}
                onClick={() => setInstalmentOnly(!instalmentOnly)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${instalmentOnly ? "bg-ardhi" : "bg-gray-200"}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${instalmentOnly ? "translate-x-4" : "translate-x-0"}`} />
              </button>
              <span className="text-xs font-medium text-navy">Instalments</span>
            </label>

            {/* Verification filter */}
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2.5 text-xs font-medium text-navy focus:border-ardhi focus:outline-none"
            >
              {verificationFilters.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2.5 text-xs font-medium text-navy focus:border-ardhi focus:outline-none"
            >
              {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <p className="mt-2 text-xs text-muted">
            <span className="font-medium text-navy">{filtered.length}</span> plots found
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center">
            <p className="text-lg font-semibold text-navy">No plots found</p>
            <p className="mt-1 text-sm text-muted">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((listing) => (
              <PropertyCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
