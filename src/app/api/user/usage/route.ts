import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/user/usage
 * Returns the current user's query count for this billing period.
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

  // Get active subscription to determine billing period
  const { data: sub } = await db
    .from("subscriptions")
    .select("plan, searches_used, searches_limit, current_period_start, current_period_end")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Count queries this billing period from usage_log
  const periodStart = sub?.current_period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { count } = await db
    .from("usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", periodStart);

  const plan = sub?.plan || "free";
  const limit = sub?.searches_limit ?? (plan === "starter" ? 10 : plan === "free" ? 3 : null);

  return Response.json({
    plan,
    queries_this_period: count || 0,
    queries_limit: limit,
    period_start: periodStart,
    period_end: sub?.current_period_end || null,
    remaining: limit ? Math.max(0, limit - (count || 0)) : null,
  });
}
