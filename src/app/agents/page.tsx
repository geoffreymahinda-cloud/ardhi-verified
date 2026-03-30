"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { agents, counties, type Agent } from "@/lib/data";

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="text-sm">
          {i < full ? "★" : i === full && hasHalf ? "★" : "☆"}
        </span>
      ))}
      <span className="ml-1 text-sm font-medium text-text">{rating}</span>
    </span>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Photo + Name */}
      <div className="flex items-center gap-4">
        <Image
          src={agent.photo}
          alt={agent.name}
          width={72}
          height={72}
          className="rounded-full object-cover"
        />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-text">{agent.name}</h3>
          <p className="truncate text-sm text-muted">{agent.firm}</p>
          <span className="mt-1 inline-block rounded-full bg-ardhi-light px-2.5 py-0.5 text-xs font-semibold text-ardhi-dark">
            {agent.lskNumber}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="mt-5 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <span>{agent.county} County</span>
        </div>
        <StarRating rating={agent.rating} />
        <div className="flex items-center justify-between text-muted">
          <span>{agent.verifiedListings} verified listings</span>
          <span>{agent.yearsExperience} yrs experience</span>
        </div>
      </div>

      {/* Specialty Tags */}
      <div className="mt-4 flex flex-wrap gap-2">
        {agent.specialties.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-ardhi/30 bg-ardhi-light/50 px-3 py-0.5 text-xs font-medium text-ardhi-dark"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-auto pt-5">
        <Link
          href={`/agents/${agent.id}`}
          className="block w-full rounded-lg border-2 border-ardhi py-2.5 text-center text-sm font-semibold text-ardhi transition-colors hover:bg-ardhi hover:text-white"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [county, setCounty] = useState("");
  const [minRating, setMinRating] = useState("");
  const [search, setSearch] = useState("");

  const filtered = agents.filter((agent) => {
    if (county && agent.county !== county) return false;
    if (minRating && agent.rating < parseFloat(minRating)) return false;
    if (search && !agent.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold tracking-tight text-text sm:text-5xl">
          Find a verified agent
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          All agents are LSK-registered advocates verified by Ardhi
        </p>
      </div>

      {/* Filter Bar */}
      <div className="mt-10 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        {/* County Dropdown */}
        <select
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text focus:border-ardhi focus:outline-none focus:ring-2 focus:ring-ardhi/20"
        >
          <option value="">All Counties</option>
          {counties.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Min Rating Dropdown */}
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text focus:border-ardhi focus:outline-none focus:ring-2 focus:ring-ardhi/20"
        >
          <option value="">Minimum Rating</option>
          <option value="4.5">4.5+</option>
          <option value="4.7">4.7+</option>
          <option value="4.8">4.8+</option>
          <option value="4.9">4.9+</option>
        </select>

        {/* Search Input */}
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-muted focus:border-ardhi focus:outline-none focus:ring-2 focus:ring-ardhi/20"
          />
        </div>
      </div>

      {/* Agent Grid */}
      {filtered.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="mt-16 text-center">
          <p className="text-lg text-muted">No agents match your filters.</p>
          <button
            onClick={() => {
              setCounty("");
              setMinRating("");
              setSearch("");
            }}
            className="mt-4 text-sm font-semibold text-ardhi hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </section>
  );
}
