import type { MetadataRoute } from "next";
import { fetchListings } from "@/lib/supabase/queries";

function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.ardhiverified.com";

  // Static pages
  const staticPages = [
    "",
    "/search",
    "/agents",
    "/concierge",
    "/how-it-works",
    "/land-guardian",
    "/contact",
    "/terms",
    "/privacy",
    "/escrow-policy",
    "/auth/login",
    "/auth/signup",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" as const : "weekly" as const,
    priority: path === "" ? 1 : path === "/search" ? 0.9 : 0.7,
  }));

  // Dynamic listing pages
  let listingPages: MetadataRoute.Sitemap = [];
  try {
    const listings = await fetchListings();
    listingPages = listings.map((listing) => ({
      url: `${baseUrl}/listings/${slugify(listing.title)}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // If Supabase fails, just return static pages
  }

  return [...staticPages, ...listingPages];
}
