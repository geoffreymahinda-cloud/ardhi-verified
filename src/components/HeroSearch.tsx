"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { counties } from "@/lib/data";

export default function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [county, setCounty] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [plotSize, setPlotSize] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (county) params.set("county", county);
    if (priceRange) params.set("price", priceRange);
    if (plotSize) params.set("size", plotSize);
    if (verifiedOnly) params.set("verified", "true");
    router.push(`/search?${params.toString()}`);
  }

  const selectClasses =
    "h-11 rounded-lg border border-border bg-white px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-ardhi/40 transition";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      {/* Main search bar */}
      <div className="flex overflow-hidden rounded-xl bg-white shadow-lg">
        <div className="relative flex-1">
          <svg
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by location, county, or keyword..."
            className="h-14 w-full pl-12 pr-4 text-base text-text placeholder:text-muted/60 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 bg-ardhi px-8 text-base font-semibold text-white transition hover:bg-ardhi-dark"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          Search
        </button>
      </div>

      {/* Filters row */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <select
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          className={selectClasses}
        >
          <option value="">All Counties</option>
          {counties.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={priceRange}
          onChange={(e) => setPriceRange(e.target.value)}
          className={selectClasses}
        >
          <option value="">Price Range</option>
          <option value="0-1000000">Under KES 1M</option>
          <option value="1000000-5000000">KES 1M - 5M</option>
          <option value="5000000-10000000">KES 5M - 10M</option>
          <option value="10000000-">KES 10M+</option>
        </select>

        <select
          value={plotSize}
          onChange={(e) => setPlotSize(e.target.value)}
          className={selectClasses}
        >
          <option value="">Plot Size</option>
          <option value="0-0.125">Up to 1/8 acre</option>
          <option value="0.125-0.5">1/8 - 1/2 acre</option>
          <option value="0.5-1">1/2 - 1 acre</option>
          <option value="1-5">1 - 5 acres</option>
          <option value="5-">5+ acres</option>
        </select>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm transition hover:border-ardhi">
          <div className="relative">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-5 w-9 rounded-full bg-gray-300 transition peer-checked:bg-ardhi" />
            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
          </div>
          <span className="text-text font-medium">Verified only</span>
        </label>
      </div>
    </form>
  );
}
