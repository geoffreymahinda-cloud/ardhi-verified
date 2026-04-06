import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const parcel = new URL(request.url).searchParams.get("parcel");

  if (!parcel || parcel.trim().length === 0) {
    return Response.json(
      { error: "Missing required query parameter: parcel" },
      { status: 400 }
    );
  }

  const sanitized = parcel.trim().substring(0, 100);

  const { data, error } = await supabase.rpc("calculate_trust_score", {
    p_parcel_reference: sanitized,
  });

  if (error) {
    console.error("Trust score calculation failed:", error.message);
    return Response.json(
      { error: "Failed to calculate trust score" },
      { status: 500 }
    );
  }

  return Response.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
