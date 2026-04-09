"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface IntelStats {
  totalCases: number;
  totalStations: number;
  casesWithParcels: number;
  totalGazetteNotices: number;
  topStations: { station: string; count: number }[];
  courtTypes: { type: string; count: number }[];
  recentCases: {
    id: string;
    case_number: string;
    court_station: string;
    parties: string;
    outcome: string;
    judge: string;
    date_decided: string;
    source_url: string;
    parcel_reference: string[];
  }[];
}

function classifyCourtType(station: string): string {
  const s = station.toLowerCase();
  if (s.startsWith("coa ") || s.includes("court of appeal") || s.includes("appeal")) return "Court of Appeal";
  if (s === "supreme court") return "Supreme Court";
  if (s === "environment tribunal") return "Environment Tribunal";
  if (s.startsWith("hc ") || s.includes("high court")) return "High Court";
  return "Environment & Land Court";
}

export async function getIntelligenceStats(): Promise<IntelStats> {
  // Run count queries in parallel — use exact counts, not row fetches
  const [totalRes, parcelsRes, gazetteRes, recentRes] = await Promise.all([
    supabase.from("elc_cases").select("*", { count: "exact", head: true }),
    supabase.from("elc_cases").select("*", { count: "exact", head: true }).not("parcel_reference", "eq", "[]"),
    supabase.from("gazette_notices").select("*", { count: "exact", head: true }),
    supabase.from("elc_cases")
      .select("id, case_number, court_station, parties, outcome, judge, date_decided, source_url, parcel_reference")
      .not("parcel_reference", "eq", "[]")
      .order("date_decided", { ascending: false })
      .limit(20),
  ]);

  // Fetch station data in pages to avoid PostgREST 1000-row cap
  const allStations: string[] = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data } = await supabase
      .from("elc_cases")
      .select("court_station")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allStations.push(...data.map((c: { court_station: string }) => c.court_station));
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // Build station counts and court type counts
  const stationCounts: Record<string, number> = {};
  const courtTypeCounts: Record<string, number> = {};
  allStations.forEach((station) => {
    const s = station || "Unknown";
    stationCounts[s] = (stationCounts[s] || 0) + 1;
    const courtType = classifyCourtType(s);
    courtTypeCounts[courtType] = (courtTypeCounts[courtType] || 0) + 1;
  });

  const topStations = Object.entries(stationCounts)
    .map(([station, count]) => ({ station, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const courtTypes = Object.entries(courtTypeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalCases: totalRes.count || 0,
    totalStations: Object.keys(stationCounts).length,
    casesWithParcels: parcelsRes.count || 0,
    totalGazetteNotices: gazetteRes.count || 0,
    topStations,
    courtTypes,
    recentCases: (recentRes.data || []).map((c) => ({
      ...c,
      parcel_reference: typeof c.parcel_reference === "string"
        ? JSON.parse(c.parcel_reference || "[]")
        : c.parcel_reference || [],
    })),
  };
}

export async function searchCases(query: string) {
  const { data } = await supabase
    .from("elc_cases")
    .select("id, case_number, court_station, parties, outcome, judge, date_decided, source_url, parcel_reference")
    .or(`parties.ilike.%${query}%,case_number.ilike.%${query}%,parcel_reference.cs.{${query}},judge.ilike.%${query}%,court_station.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data || []).map((c) => ({
    ...c,
    parcel_reference: typeof c.parcel_reference === "string"
      ? JSON.parse(c.parcel_reference || "[]")
      : c.parcel_reference || [],
  }));
}
