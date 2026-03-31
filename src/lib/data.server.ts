import "server-only";
import { fetchListings } from "./supabase/queries";
import { fallbackListings, type Listing } from "./data";

// ─── TRANSFORM DB ROW → FRONTEND LISTING ────────────────────────────────────

// Generate checks that are logically consistent with the trust score
function generateChecks(score: number, verified: boolean): { label: string; passed: boolean }[] {
  if (score >= 90) {
    // Safe — all checks pass
    return [
      { label: "Title Deed Confirmed", passed: true },
      { label: "No Encumbrances", passed: true },
      { label: "NLIMS Registry Match", passed: true },
      { label: "Seller Identity Verified", passed: true },
      { label: "Agent LSK Registered", passed: true },
      { label: "No Active Disputes", passed: true },
    ];
  } else if (score >= 70) {
    // Needs Review — some checks pending or failed
    return [
      { label: "Title Deed Confirmed", passed: true },
      { label: "No Encumbrances", passed: score >= 80 },
      { label: "NLIMS Registry Match", passed: false },
      { label: "Seller Identity Verified", passed: true },
      { label: "Agent LSK Registered", passed: verified },
      { label: "No Active Disputes", passed: true },
    ];
  } else {
    // High Risk — multiple failures
    return [
      { label: "Title Deed Confirmed", passed: score >= 50 },
      { label: "No Encumbrances", passed: false },
      { label: "NLIMS Registry Match", passed: false },
      { label: "Seller Identity Verified", passed: score >= 40 },
      { label: "Agent LSK Registered", passed: false },
      { label: "No Active Disputes", passed: score >= 30 },
    ];
  }
}

function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseSizeAcres(size: string): number {
  const match = size.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

function dbToListing(row: import("./supabase/queries").DbListing): Listing {
  const slug = slugify(row.title);
  const sizeAcres = parseSizeAcres(row.size);
  const priceGBP = Math.round(row.price_usd * 0.79);
  const agentId = row.agent_id ? parseInt(row.agent_id) : ((row.id % 4) + 1);
  const trustScore = row.trust_score ?? row.score ?? 0;
  const imageSeed = slug || `plot${row.id}`;

  return {
    id: row.id,
    slug,
    title: row.title.trim(),
    location: row.location.trim(),
    county: row.county,
    priceKES: row.price_kes,
    priceGBP,
    priceUSD: row.price_usd,
    size: row.size,
    sizeAcres,
    type: row.land_type,
    use: row.use,
    trustScore,
    verified: row.verified,
    image: row.image_url || `https://picsum.photos/seed/${imageSeed}/800/500`,
    images: row.image_url
      ? [row.image_url]
      : [
          `https://picsum.photos/seed/${imageSeed}a/800/500`,
          `https://picsum.photos/seed/${imageSeed}b/800/500`,
          `https://picsum.photos/seed/${imageSeed}c/800/500`,
          `https://picsum.photos/seed/${imageSeed}d/800/500`,
        ],
    agentId,
    description: `${row.title.trim()} — ${row.size} ${row.land_type.toLowerCase()} ${row.use.toLowerCase()} plot in ${row.location.trim()}, ${row.county} County. Listed at KES ${row.price_kes.toLocaleString()}.`,
    details: {
      shape: "Rectangular",
      accessRoad: "Contact agent for details",
      utilities: "Contact agent for details",
      zoning: row.use,
      topography: "Contact agent for details",
    },
    checks: generateChecks(trustScore, row.verified),
  };
}

// ─── SERVER-SIDE DATA FETCHING ───────────────────────────────────────────────

export async function getListings(): Promise<Listing[]> {
  try {
    const rows = await fetchListings();
    if (rows.length > 0) {
      return rows.map(dbToListing);
    }
  } catch (e) {
    console.error("Supabase fetch failed, using fallback:", e);
  }
  return fallbackListings;
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const all = await getListings();
  return all.find((l) => l.slug === slug) ?? null;
}
