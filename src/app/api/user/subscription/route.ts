import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/user/subscription
 * Returns the current user's subscription plan and status.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = createServiceClient();

  const { data: sub } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub) {
    return Response.json({
      plan: "free",
      status: "active",
      searches_used: 0,
      searches_limit: 3,
      price_kes: 0,
      current_period_start: null,
      current_period_end: null,
    });
  }

  return Response.json({
    plan: sub.plan,
    status: sub.status,
    searches_used: sub.searches_used,
    searches_limit: sub.searches_limit,
    price_kes: sub.price_kes,
    current_period_start: sub.current_period_start,
    current_period_end: sub.current_period_end,
  });
}
