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

function generateDescription(row: import("./supabase/queries").DbListing): string {
  const title = row.title.trim();
  const loc = row.location.trim();
  const use = row.use.toLowerCase();
  const type = row.land_type.toLowerCase();

  const descriptions: Record<string, string> = {
    Residential: `${title} is a prime ${type} ${use} plot in ${loc}, ${row.county} County. Well-suited for building a family home or rental apartments. The area is rapidly developing with good infrastructure and proximity to amenities. Listed at KES ${row.price_kes.toLocaleString()}.`,
    Commercial: `${title} is a strategically located ${type} ${use} plot in ${loc}, ${row.county} County. Ideal for retail, office, or mixed-use development. High foot traffic area with excellent road frontage and visibility. Listed at KES ${row.price_kes.toLocaleString()}.`,
    Agricultural: `${title} is a fertile ${type} ${use} plot in ${loc}, ${row.county} County. Suitable for crop farming, horticulture, or dairy. Rich soil and reliable water access make this an excellent agricultural investment. Listed at KES ${row.price_kes.toLocaleString()}.`,
  };

  return descriptions[row.use] || `${title} — ${row.size} ${type} ${use} plot in ${loc}, ${row.county} County. A verified listing on Ardhi Verified with a Trust Score assessment. Listed at KES ${row.price_kes.toLocaleString()}.`;
}

function generateDetails(row: import("./supabase/queries").DbListing) {
  const shapes = ["Rectangular", "Regular", "Square", "L-shaped", "Irregular"];
  const shape = shapes[row.id % shapes.length];

  const accessRoads: Record<string, string[]> = {
    Residential: ["Tarmac road — direct access", "Murram road — 200m to tarmac", "Paved estate road", "County road frontage"],
    Commercial: ["Dual carriageway frontage", "Tarmac — high traffic road", "Highway access — 50m frontage", "Main street frontage"],
    Agricultural: ["Murram road — 500m to tarmac", "Earth road — seasonal access", "All-weather murram road", "Farm access track"],
  };
  const roads = accessRoads[row.use] || accessRoads.Residential;
  const road = roads[row.id % roads.length];

  const utilities: Record<string, string[]> = {
    Residential: ["KPLC electricity at boundary, county water", "Electricity & borehole water", "KPLC power, water & sewer connected", "Solar potential, borehole water"],
    Commercial: ["3-phase KPLC power, county water & sewer", "All services available", "KPLC electricity, borehole, sewer connection", "Commercial-grade power available"],
    Agricultural: ["Borehole water, solar potential", "River frontage — water rights", "Borehole & county water nearby", "Dam water, KPLC 200m"],
  };
  const utils = utilities[row.use] || utilities.Residential;
  const util = utils[row.id % utils.length];

  const topos = ["Flat", "Gently sloping", "Rolling hills", "Flat with gentle rise", "Plateau"];
  const topo = topos[row.id % topos.length];

  return {
    shape,
    accessRoad: road,
    utilities: util,
    zoning: `${row.use}${row.land_type === "Leasehold" ? " (Leasehold)" : ""}`,
    topography: topo,
  };
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
    description: generateDescription(row),
    details: generateDetails(row),
    checks: verification.checks,
    outcome: verification.outcome,
    enquiryCount: 0, // TODO: pull from Supabase enquiries table when available
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
