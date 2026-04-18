import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import CountyRiskClient from "./CountyRiskClient";

export const metadata: Metadata = {
  title: "Kenya Land Risk Index — Ardhi Verified",
  description:
    "Interactive county-by-county land risk map for all 47 Kenyan counties. Composite scores based on court cases, gazette notices, NLC acquisitions, spatial overlaps, and community intelligence.",
};

export const dynamic = "force-dynamic";

interface CountyRiskRow {
  county_name: string;
  county_code: string;
  area_sqkm: number;
  population: number;
  center_lat: number;
  center_lon: number;
  score_legal_disputes: number;
  score_gazette_alerts: number;
  score_acquisition_pressure: number;
  score_spatial_risk: number;
  score_community_concern: number;
  composite_score: number;
  risk_band: string;
  elc_case_count: number;
  gazette_notice_count: number;
  nlc_acquisition_count: number;
  spatial_feature_count: number;
  community_flag_count: number;
  risk_rank: number;
  computed_at: string;
}

export default async function CountyRiskPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("mv_county_risk_index")
    .select("*")
    .order("composite_score", { ascending: false });

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-navy mb-3">
            Risk index unavailable
          </h1>
          <p className="text-muted mb-6">
            The county risk data is being computed. Please check back shortly.
          </p>
        </div>
      </div>
    );
  }

  const counties = (data ?? []) as CountyRiskRow[];
  const computedAt = counties[0]?.computed_at ?? null;

  return <CountyRiskClient counties={counties} computedAt={computedAt} />;
}
