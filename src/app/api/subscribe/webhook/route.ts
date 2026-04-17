import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
    timeout: 30000,
    maxNetworkRetries: 3,
  });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const PLAN_DETAILS: Record<string, { price_kes: number; searches_limit: number }> = {
  starter: { price_kes: 5000, searches_limit: 10 },
  professional: { price_kes: 12000, searches_limit: -1 },
  firm: { price_kes: 25000, searches_limit: -1 },
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getSupabase();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode !== "subscription") {
      return Response.json({ received: true });
    }

    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;

    if (!userId || !plan) {
      console.error("Missing metadata on subscription checkout session:", session.id);
      return Response.json({ received: true });
    }

    const details = PLAN_DETAILS[plan];
    if (!details) {
      console.error("Unknown plan in metadata:", plan);
      return Response.json({ received: true });
    }

    // Retrieve the subscription to get period dates
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    // Period dates are on the subscription item in newer Stripe SDK versions
    const item = subscription.items?.data?.[0];
    const periodStart = item?.current_period_start ?? (subscription as unknown as Record<string, number>).current_period_start;
    const periodEnd = item?.current_period_end ?? (subscription as unknown as Record<string, number>).current_period_end;

    await db.from("subscriptions").upsert(
      {
        user_id: userId,
        plan,
        price_kes: details.price_kes,
        stripe_customer_id: session.customer as string,
        stripe_sub_id: session.subscription as string,
        status: "active",
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : new Date().toISOString(),
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        searches_used: 0,
        searches_limit: details.searches_limit,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const plan = subscription.metadata?.plan;
    const details = plan ? PLAN_DETAILS[plan] : null;

    const subItem = subscription.items?.data?.[0];
    const subPeriodStart = subItem?.current_period_start ?? (subscription as unknown as Record<string, number>).current_period_start;
    const subPeriodEnd = subItem?.current_period_end ?? (subscription as unknown as Record<string, number>).current_period_end;

    const updateData: Record<string, unknown> = {
      status: subscription.status === "active" ? "active" : subscription.status,
      current_period_start: subPeriodStart ? new Date(subPeriodStart * 1000).toISOString() : undefined,
      current_period_end: subPeriodEnd ? new Date(subPeriodEnd * 1000).toISOString() : undefined,
      updated_at: new Date().toISOString(),
    };

    if (details) {
      updateData.plan = plan;
      updateData.price_kes = details.price_kes;
      updateData.searches_limit = details.searches_limit;
    }

    await db
      .from("subscriptions")
      .update(updateData)
      .eq("stripe_sub_id", subscription.id);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    await db
      .from("subscriptions")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_sub_id", subscription.id);
  }

  return Response.json({ received: true });
}
