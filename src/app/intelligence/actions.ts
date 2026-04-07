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
  // Run count queries in parallel — no full table scans
  const [totalRes, parcelsRes, gazetteRes, stationRes, recentRes] = await Promise.all([
    supabase.from("elc_cases").select("*", { count: "exact", head: true }),
    supabase.from("elc_cases").select("*", { count: "exact", head: true }).not("parcel_reference", "eq", "[]"),
    supabase.from("gazette_notices").select("*", { count: "exact", head: true }),
    // Fetch only court_station, but paginate to avoid PostgREST 1000-row default
    supabase.from("elc_cases").select("court_station").limit(50000),
    supabase.from("elc_cases")
      .select("id, case_number, court_station, parties, outcome, judge, date_decided, source_url, parcel_reference")
      .not("parcel_reference", "eq", "[]")
      .order("date_decided", { ascending: false })
      .limit(20),
  ]);

  // Build station counts and court type counts
  const stationCounts: Record<string, number> = {};
  const courtTypeCounts: Record<string, number> = {};
  (stationRes.data || []).forEach((c: { court_station: string }) => {
    const station = c.court_station || "Unknown";
    stationCounts[station] = (stationCounts[station] || 0) + 1;
    const courtType = classifyCourtType(station);
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
