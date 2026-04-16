import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // Check admin by email — add more emails as needed
  const adminEmails = (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim().toLowerCase());
  if (!adminEmails.includes(user.email?.toLowerCase() || "")) return null;
  return user;
}

/** GET /api/admin/partners — list all partners (admin) */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const { data } = await db
    .from("featured_partners")
    .select("*")
    .order("display_order");

  return Response.json({ partners: data || [] });
}

/** POST /api/admin/partners — create a partner */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const db = createServiceClient();

  const { data, error } = await db
    .from("featured_partners")
    .insert({
      name: body.name,
      description: body.description || null,
      logo_url: body.logo_url || null,
      website_url: body.website_url || null,
      is_active: body.is_active ?? true,
      is_featured: body.is_featured ?? false,
      display_order: body.display_order ?? 0,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ partner: data });
}

/** PUT /api/admin/partners — update a partner */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.id) return Response.json({ error: "Missing id" }, { status: 400 });

  const db = createServiceClient();
  const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updateFields.name = body.name;
  if (body.description !== undefined) updateFields.description = body.description;
  if (body.logo_url !== undefined) updateFields.logo_url = body.logo_url;
  if (body.website_url !== undefined) updateFields.website_url = body.website_url;
  if (body.is_active !== undefined) updateFields.is_active = body.is_active;
  if (body.is_featured !== undefined) updateFields.is_featured = body.is_featured;
  if (body.display_order !== undefined) updateFields.display_order = body.display_order;

  const { data, error } = await db
    .from("featured_partners")
    .update(updateFields)
    .eq("id", body.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ partner: data });
}

/** DELETE /api/admin/partners — delete a partner */
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const db = createServiceClient();
  const { error } = await db.from("featured_partners").delete().eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ deleted: true });
}
