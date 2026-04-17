import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
    timeout: 30000,
    maxNetworkRetries: 3,
  });
}

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Look up the Stripe customer ID from the subscriptions table
    const db = getSupabaseAdmin();
    const { data: subscription } = await db
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .in("status", ["active", "past_due", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!subscription?.stripe_customer_id) {
      return Response.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://ardhiverified.com"}/enterprise`,
    });

    return Response.json({ url: portalSession.url });
  } catch (err) {
    console.error("Stripe portal error:", err);
    return Response.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
