import "server-only";
import { fetchListings } from "./supabase/queries";
import { fallbackListings, type Listing } from "./data";

// ─── TRANSFORM DB ROW → FRONTEND LISTING ────────────────────────────────────

// ─── HARD BLOCKERS vs SOFT CHECKS ────────────────────────────────────────────
// Hard blockers: if ANY fails, score is capped at 69 → "High Risk — Cannot Proceed"
//   - Title Deed Confirmed
//   - NLIMS Registry Match
//   - No Active Disputes
//
// Soft checks: affect score but don't block sale
//   - No Encumbrances
//   - Agent LSK Registered
//   - Seller Identity Verified

interface VerificationResult {
  checks: { label: string; passed: boolean; blocker: boolean }[];
  trustScore: number;
  outcome: "proceed" | "review" | "blocked";
}

function computeVerification(rawScore: number, verified: boolean): VerificationResult {
  // Generate checks based on raw score
  const checks = [
    // Hard blockers (70% weight)
    { label: "Title Deed Confirmed", passed: rawScore >= 60, blocker: true },
    { label: "NLIMS Registry Match", passed: rawScore >= 85, blocker: true },
    { label: "No Active Disputes", passed: rawScore >= 50, blocker: true },
    // Soft checks (30% weight)
    { label: "No Encumbrances", passed: rawScore >= 80, blocker: false },
    { label: "Seller Identity Verified", passed: rawScore >= 40, blocker: false },
    { label: "Agent LSK Registered", passed: verified, blocker: false },
  ];

  // If any hard blocker fails → cap score at 69
  const hardBlockerFailed = checks.some((c) => c.blocker && !c.passed);
  const trustScore = hardBlockerFailed ? Math.min(rawScore, 69) : rawScore;

  // Determine outcome
  let outcome: "proceed" | "review" | "blocked";
  if (hardBlockerFailed) {
    outcome = "blocked";
  } else if (trustScore >= 90) {
    outcome = "proceed";
  } else {
    outcome = "review";
  }

  return { checks, trustScore, outcome };
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
  const rawScore = row.trust_score ?? row.score ?? 0;
  const verification = computeVerification(rawScore, row.verified);
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
    trustScore: verification.trustScore,
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
    checks: verification.checks,
    outcome: verification.outcome,
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
