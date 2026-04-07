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
  topStations: { station: string; count: number }[];
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

export async function getIntelligenceStats(): Promise<IntelStats> {
  // Total cases — use count only, don't fetch all rows
  const { count: totalCases } = await supabase
    .from("elc_cases")
    .select("*", { count: "exact", head: true });

  // Station breakdown — fetch only court_station column
  const { data: stationData } = await supabase
    .from("elc_cases")
    .select("court_station");

  const stationCounts: Record<string, number> = {};
  (stationData || []).forEach((c: { court_station: string }) => {
    stationCounts[c.court_station] = (stationCounts[c.court_station] || 0) + 1;
  });

  const topStations = Object.entries(stationCounts)
    .map(([station, count]) => ({ station, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const totalStations = Object.keys(stationCounts).length;

  // Recent cases with parcel references
  const { data: recentCases } = await supabase
    .from("elc_cases")
    .select("id, case_number, court_station, parties, outcome, judge, date_decided, source_url, parcel_reference")
    .not("parcel_reference", "eq", "[]")
    .order("created_at", { ascending: false })
    .limit(20);

  // Count cases with parcels
  const { count: casesWithParcels } = await supabase
    .from("elc_cases")
    .select("*", { count: "exact", head: true })
    .not("parcel_reference", "eq", "[]");

  return {
    totalCases: totalCases || 0,
    totalStations,
    casesWithParcels: casesWithParcels || 0,
    topStations,
    recentCases: (recentCases || []).map((c) => ({
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
