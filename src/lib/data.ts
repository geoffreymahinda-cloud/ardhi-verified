// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface Listing {
  id: number;
  slug: string;
  title: string;
  location: string;
  county: string;
  priceKES: number;
  priceGBP: number;
  priceUSD: number;
  size: string;
  sizeAcres: number;
  type: string;
  use: string;
  trustScore: number;
  verified: boolean;
  image: string;
  images: string[];
  agentId: number;
  description: string;
  details: {
    shape: string;
    accessRoad: string;
    utilities: string;
    zoning: string;
    topography: string;
  };
  checks: { label: string; passed: boolean }[];
}

export interface Agent {
  id: number;
  name: string;
  firm: string;
  lskNumber: string;
  county: string;
  rating: number;
  reviews: number;
  verifiedListings: number;
  yearsExperience: number;
  photo: string;
  specialties: string[];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export const formatKES = (n: number) => `KES ${n.toLocaleString()}`;
export const formatGBP = (n: number) => `£${n.toLocaleString()}`;
export const formatUSD = (n: number) => `$${n.toLocaleString()}`;

// ─── AGENTS (dummy until DB is populated) ────────────────────────────────────

export const agents: Agent[] = [
  { id: 1, name: "James Kariuki", firm: "Kariuki & Associates", lskNumber: "KE/2010/5521", county: "Nairobi", rating: 4.9, reviews: 127, verifiedListings: 34, yearsExperience: 14, photo: "https://picsum.photos/seed/agent1/200/200", specialties: ["Residential", "Commercial", "Kiambu"] },
  { id: 2, name: "Grace Wanjiku", firm: "Wanjiku Legal Conveyancers", lskNumber: "KE/2012/3347", county: "Kiambu", rating: 4.8, reviews: 89, verifiedListings: 28, yearsExperience: 12, photo: "https://picsum.photos/seed/agent2/200/200", specialties: ["Agricultural", "Freehold", "Kiambu"] },
  { id: 3, name: "David Omondi", firm: "Omondi Property Law", lskNumber: "KE/2015/7812", county: "Kisumu", rating: 4.7, reviews: 64, verifiedListings: 19, yearsExperience: 9, photo: "https://picsum.photos/seed/agent3/200/200", specialties: ["Lakefront", "Agricultural", "Kisumu"] },
  { id: 4, name: "Sarah Mutua", firm: "Mutua & Partners Advocates", lskNumber: "KE/2008/2290", county: "Nakuru", rating: 4.9, reviews: 156, verifiedListings: 41, yearsExperience: 18, photo: "https://picsum.photos/seed/agent4/200/200", specialties: ["Residential", "Mixed Use", "Nakuru"] },
];

export const getAgent = (id: number) => agents.find((a) => a.id === id);

// ─── COUNTIES ────────────────────────────────────────────────────────────────

export const counties = ["Kiambu", "Nakuru", "Kajiado", "Kisumu", "Mombasa", "Kilifi", "Nyeri"];

// ─── FALLBACK LISTINGS ───────────────────────────────────────────────────────

const checks = [
  { label: "Title Deed Confirmed", passed: true },
  { label: "No Encumbrances", passed: true },
  { label: "NLIMS Registry Match", passed: true },
  { label: "Seller Identity Verified", passed: true },
  { label: "Agent LSK Registered", passed: true },
  { label: "No Active Disputes", passed: true },
];

export const fallbackListings: Listing[] = [
  {
    id: 1, slug: "ruiru-ridge-estate-plot-4b", title: "Ruiru Ridge Estate, Plot 4B", location: "Ruiru, Kiambu County", county: "Kiambu",
    priceKES: 4200000, priceGBP: 25455, priceUSD: 32308, size: "0.5 acres", sizeAcres: 0.5, type: "Freehold", use: "Residential",
    trustScore: 92, verified: true, image: "https://picsum.photos/seed/plot1/800/500",
    images: ["https://picsum.photos/seed/plot1a/800/500", "https://picsum.photos/seed/plot1b/800/500", "https://picsum.photos/seed/plot1c/800/500", "https://picsum.photos/seed/plot1d/800/500"],
    agentId: 2, description: "A prime residential plot in the heart of Ruiru Ridge Estate, just 800m from the Thika Superhighway.",
    details: { shape: "Rectangular", accessRoad: "Tarmac — 50m frontage", utilities: "Water & Electricity at boundary", zoning: "Residential (¼ acre plots)", topography: "Gently sloping, east-facing" },
    checks,
  },
  {
    id: 2, slug: "thika-road-bypass-lot-22", title: "Thika Road Commercial Frontage, Lot 22", location: "Thika Road, Kiambu County", county: "Kiambu",
    priceKES: 7800000, priceGBP: 47273, priceUSD: 60000, size: "0.75 acres", sizeAcres: 0.75, type: "Freehold", use: "Commercial",
    trustScore: 96, verified: true, image: "https://picsum.photos/seed/plot2/800/500",
    images: ["https://picsum.photos/seed/plot2a/800/500", "https://picsum.photos/seed/plot2b/800/500", "https://picsum.photos/seed/plot2c/800/500", "https://picsum.photos/seed/plot2d/800/500"],
    agentId: 1, description: "Premium commercial plot directly on Thika Road bypass with excellent visibility.",
    details: { shape: "Irregular (L-shaped)", accessRoad: "Direct highway access — 30m frontage", utilities: "3-phase power available", zoning: "Commercial", topography: "Flat" },
    checks,
  },
];

// Sync exports for client components that import directly
export const listings = fallbackListings;
export const getListing = (slug: string) => fallbackListings.find((l) => l.slug === slug);
