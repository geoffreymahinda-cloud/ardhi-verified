import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/partners — returns all active partners (public)
 */
export async function GET() {
  const db = createServiceClient();

  const { data, error } = await db
    .from("featured_partners")
    .select("id, name, logo_url, description, website_url, is_featured, display_order")
    .eq("is_active", true)
    .order("display_order");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ partners: data || [] });
}
