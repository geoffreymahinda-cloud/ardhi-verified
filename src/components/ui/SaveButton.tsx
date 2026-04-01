"use client";

import { useState } from "react";
import { toggleSavedListing } from "@/app/actions-saved";

export default function SaveButton({ listingId, initialSaved }: { listingId: number; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    const result = await toggleSavedListing(listingId);
    setSaved(result.saved);
    setLoading(false);
  }

  return (
    <button
      type="button"
      aria-label={saved ? "Unsave listing" : "Save listing"}
      className={`rounded-full bg-white/80 p-2 backdrop-blur-sm transition-colors hover:bg-white ${loading ? "opacity-50" : ""}`}
      onClick={handleToggle}
      disabled={loading}
    >
      <svg
        className={`h-5 w-5 ${saved ? "fill-red-500 text-red-500" : "fill-none text-navy"}`}
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </svg>
    </button>
  );
}
