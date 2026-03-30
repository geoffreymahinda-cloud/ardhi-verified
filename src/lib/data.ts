// ─── DUMMY DATA ──────────────────────────────────────────────────────────────
// 8 realistic Kenyan land listings + 4 agents

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

export const agents: Agent[] = [
  { id: 1, name: "James Kariuki", firm: "Kariuki & Associates", lskNumber: "KE/2010/5521", county: "Nairobi", rating: 4.9, reviews: 127, verifiedListings: 34, yearsExperience: 14, photo: "https://picsum.photos/seed/agent1/200/200", specialties: ["Residential", "Commercial", "Kiambu"] },
  { id: 2, name: "Grace Wanjiku", firm: "Wanjiku Legal Conveyancers", lskNumber: "KE/2012/3347", county: "Kiambu", rating: 4.8, reviews: 89, verifiedListings: 28, yearsExperience: 12, photo: "https://picsum.photos/seed/agent2/200/200", specialties: ["Agricultural", "Freehold", "Kiambu"] },
  { id: 3, name: "David Omondi", firm: "Omondi Property Law", lskNumber: "KE/2015/7812", county: "Kisumu", rating: 4.7, reviews: 64, verifiedListings: 19, yearsExperience: 9, photo: "https://picsum.photos/seed/agent3/200/200", specialties: ["Lakefront", "Agricultural", "Kisumu"] },
  { id: 4, name: "Sarah Mutua", firm: "Mutua & Partners Advocates", lskNumber: "KE/2008/2290", county: "Nakuru", rating: 4.9, reviews: 156, verifiedListings: 41, yearsExperience: 18, photo: "https://picsum.photos/seed/agent4/200/200", specialties: ["Residential", "Mixed Use", "Nakuru"] },
];

const checks = [
  { label: "Title Deed Confirmed", passed: true },
  { label: "No Encumbrances", passed: true },
  { label: "NLIMS Registry Match", passed: true },
  { label: "Seller Identity Verified", passed: true },
  { label: "Agent LSK Registered", passed: true },
  { label: "No Active Disputes", passed: true },
];

export const listings: Listing[] = [
  {
    id: 1, slug: "ruiru-ridge-estate-plot-4b", title: "Ruiru Ridge Estate, Plot 4B", location: "Ruiru, Kiambu County", county: "Kiambu",
    priceKES: 4200000, priceGBP: 25455, priceUSD: 32308, size: "0.5 acres", sizeAcres: 0.5, type: "Freehold", use: "Residential",
    trustScore: 92, verified: true, image: "https://picsum.photos/seed/plot1/800/500",
    images: ["https://picsum.photos/seed/plot1a/800/500", "https://picsum.photos/seed/plot1b/800/500", "https://picsum.photos/seed/plot1c/800/500", "https://picsum.photos/seed/plot1d/800/500"],
    agentId: 2, description: "A prime residential plot in the heart of Ruiru Ridge Estate, just 800m from the Thika Superhighway. The plot is on a gentle slope with panoramic views of the Aberdare Ranges. Ready for development with tarmac road frontage, county water supply, and KPLC electricity at the boundary.",
    details: { shape: "Rectangular", accessRoad: "Tarmac — 50m frontage", utilities: "Water & Electricity at boundary", zoning: "Residential (¼ acre plots)", topography: "Gently sloping, east-facing" },
    checks,
  },
  {
    id: 2, slug: "thika-road-bypass-lot-22", title: "Thika Road Commercial Frontage, Lot 22", location: "Thika Road, Kiambu County", county: "Kiambu",
    priceKES: 7800000, priceGBP: 47273, priceUSD: 60000, size: "0.75 acres", sizeAcres: 0.75, type: "Freehold", use: "Commercial",
    trustScore: 96, verified: true, image: "https://picsum.photos/seed/plot2/800/500",
    images: ["https://picsum.photos/seed/plot2a/800/500", "https://picsum.photos/seed/plot2b/800/500", "https://picsum.photos/seed/plot2c/800/500", "https://picsum.photos/seed/plot2d/800/500"],
    agentId: 1, description: "Premium commercial plot directly on Thika Road bypass with excellent visibility. Ideal for a petrol station, showroom, or retail development. High traffic count and direct highway access. Surrounded by ongoing commercial developments.",
    details: { shape: "Irregular (L-shaped)", accessRoad: "Direct highway access — 30m frontage", utilities: "3-phase power available", zoning: "Commercial", topography: "Flat" },
    checks,
  },
  {
    id: 3, slug: "gatundu-north-farmland", title: "Gatundu North Farmland — 2 Acres", location: "Gatundu, Kiambu County", county: "Kiambu",
    priceKES: 3200000, priceGBP: 19394, priceUSD: 24615, size: "2 acres", sizeAcres: 2, type: "Freehold", use: "Agricultural",
    trustScore: 88, verified: true, image: "https://picsum.photos/seed/plot3/800/500",
    images: ["https://picsum.photos/seed/plot3a/800/500", "https://picsum.photos/seed/plot3b/800/500", "https://picsum.photos/seed/plot3c/800/500", "https://picsum.photos/seed/plot3d/800/500"],
    agentId: 2, description: "Fertile red soil farmland in the highland tea belt of Gatundu North. Currently under tea cultivation with an existing yield. Borehole water available. 4km from Gatundu town centre. Suitable for agriculture, dairy farming, or subdivision.",
    details: { shape: "Rectangular", accessRoad: "Murram road — 200m to tarmac", utilities: "Borehole water, solar potential", zoning: "Agricultural", topography: "Rolling hills" },
    checks: [...checks.slice(0, 5), { label: "No Active Disputes", passed: true }],
  },
  {
    id: 4, slug: "nakuru-milimani-plot", title: "Nakuru Milimani Residential Plot", location: "Milimani, Nakuru County", county: "Nakuru",
    priceKES: 5500000, priceGBP: 33333, priceUSD: 42308, size: "0.25 acres", sizeAcres: 0.25, type: "Freehold", use: "Residential",
    trustScore: 94, verified: true, image: "https://picsum.photos/seed/plot4/800/500",
    images: ["https://picsum.photos/seed/plot4a/800/500", "https://picsum.photos/seed/plot4b/800/500", "https://picsum.photos/seed/plot4c/800/500", "https://picsum.photos/seed/plot4d/800/500"],
    agentId: 4, description: "Prestigious Milimani address in Nakuru's prime residential neighbourhood. Walking distance to Nakuru CBD, Nakuru Golf Club, and top schools. The area is fully developed with mature trees, security patrols, and excellent infrastructure.",
    details: { shape: "Square", accessRoad: "Tarmac — cul-de-sac", utilities: "County water, sewer, KPLC", zoning: "Residential (High density)", topography: "Flat" },
    checks,
  },
  {
    id: 5, slug: "kajiado-kitengela-plots", title: "Kitengela Extension Plots — Phase 3", location: "Kitengela, Kajiado County", county: "Kajiado",
    priceKES: 850000, priceGBP: 5152, priceUSD: 6538, size: "0.05 acres", sizeAcres: 0.05, type: "Leasehold", use: "Residential",
    trustScore: 72, verified: false, image: "https://picsum.photos/seed/plot5/800/500",
    images: ["https://picsum.photos/seed/plot5a/800/500", "https://picsum.photos/seed/plot5b/800/500", "https://picsum.photos/seed/plot5c/800/500", "https://picsum.photos/seed/plot5d/800/500"],
    agentId: 1, description: "Affordable residential plots in the fast-growing Kitengela extension area. Close to the Nairobi-Namanga highway. Ideal for first-time buyers or investment. Controlled development with estate management. Title processing in progress.",
    details: { shape: "Rectangular", accessRoad: "Graded earth road", utilities: "Borehole planned", zoning: "Residential (controlled)", topography: "Flat savanna" },
    checks: [checks[0], { label: "No Encumbrances", passed: true }, { label: "NLIMS Registry Match", passed: false }, checks[3], checks[4], checks[5]],
  },
  {
    id: 6, slug: "kisumu-mamboleo-commercial", title: "Mamboleo Junction Commercial Land", location: "Mamboleo, Kisumu County", county: "Kisumu",
    priceKES: 15000000, priceGBP: 90909, priceUSD: 115385, size: "1 acre", sizeAcres: 1, type: "Freehold", use: "Commercial",
    trustScore: 97, verified: true, image: "https://picsum.photos/seed/plot6/800/500",
    images: ["https://picsum.photos/seed/plot6a/800/500", "https://picsum.photos/seed/plot6b/800/500", "https://picsum.photos/seed/plot6c/800/500", "https://picsum.photos/seed/plot6d/800/500"],
    agentId: 3, description: "Prime commercial land at the busy Mamboleo Junction — the gateway to Kisumu from Nairobi. Surrounded by ongoing developments including the new Kisumu bypass. Exceptional investment opportunity with guaranteed appreciation.",
    details: { shape: "Triangular", accessRoad: "Dual carriageway frontage", utilities: "All services available", zoning: "Commercial (mixed use)", topography: "Flat" },
    checks,
  },
  {
    id: 7, slug: "naivasha-flower-farm-parcel", title: "Naivasha Flower Belt — 1.5 Acres", location: "South Lake, Nakuru County", county: "Nakuru",
    priceKES: 4800000, priceGBP: 29091, priceUSD: 36923, size: "1.5 acres", sizeAcres: 1.5, type: "Freehold", use: "Agricultural",
    trustScore: 85, verified: true, image: "https://picsum.photos/seed/plot7/800/500",
    images: ["https://picsum.photos/seed/plot7a/800/500", "https://picsum.photos/seed/plot7b/800/500", "https://picsum.photos/seed/plot7c/800/500", "https://picsum.photos/seed/plot7d/800/500"],
    agentId: 4, description: "Agricultural land in Naivasha's famous flower belt. The area benefits from ideal growing conditions and proximity to major flower export farms. Suitable for horticulture, greenhouse farming, or as a country retreat near Lake Naivasha.",
    details: { shape: "Rectangular", accessRoad: "Murram — 500m to Moi South Lake Road", utilities: "Lake water rights, KPLC nearby", zoning: "Agricultural", topography: "Flat lakeside" },
    checks: [...checks.slice(0, 4), { label: "Agent LSK Registered", passed: true }, { label: "No Active Disputes", passed: true }],
  },
  {
    id: 8, slug: "ongata-rongai-half-acre", title: "Ongata Rongai — Half Acre Residential", location: "Ongata Rongai, Kajiado County", county: "Kajiado",
    priceKES: 2800000, priceGBP: 16970, priceUSD: 21538, size: "0.5 acres", sizeAcres: 0.5, type: "Freehold", use: "Residential",
    trustScore: 65, verified: false, image: "https://picsum.photos/seed/plot8/800/500",
    images: ["https://picsum.photos/seed/plot8a/800/500", "https://picsum.photos/seed/plot8b/800/500", "https://picsum.photos/seed/plot8c/800/500", "https://picsum.photos/seed/plot8d/800/500"],
    agentId: 1, description: "Half-acre plot in the rapidly developing Ongata Rongai corridor, 25km south of Nairobi CBD. Close to Magadi Road and new infrastructure developments. Verification in progress — title documents under review by Ardhi Verified.",
    details: { shape: "Rectangular", accessRoad: "Earth road — 1km to Magadi Road", utilities: "KPLC 500m, borehole water", zoning: "Residential (peri-urban)", topography: "Gently sloping" },
    checks: [{ label: "Title Deed Confirmed", passed: true }, { label: "No Encumbrances", passed: false }, { label: "NLIMS Registry Match", passed: true }, { label: "Seller Identity Verified", passed: true }, { label: "Agent LSK Registered", passed: true }, { label: "No Active Disputes", passed: false }],
  },
];

export const getAgent = (id: number) => agents.find(a => a.id === id);
export const getListing = (slug: string) => listings.find(l => l.slug === slug);

export const formatKES = (n: number) => `KES ${n.toLocaleString()}`;
export const formatGBP = (n: number) => `£${n.toLocaleString()}`;
export const formatUSD = (n: number) => `$${n.toLocaleString()}`;

export const counties = ["Kiambu", "Nakuru", "Kajiado", "Kisumu", "Mombasa"];
