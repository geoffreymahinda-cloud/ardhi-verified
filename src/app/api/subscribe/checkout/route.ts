import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });
}

const PLANS = {
  starter: {
    name: "Starter",
    price_kes: 500000, // KES 5,000 in cents
    searches_limit: 10,
    description: "10 HatiScan searches per month",
  },
  professional: {
    name: "Professional",
    price_kes: 1200000, // KES 12,000 in cents
    searches_limit: -1, // unlimited
    description: "Unlimited HatiScan searches per month",
  },
  firm: {
    name: "Firm",
    price_kes: 2500000, // KES 25,000 in cents
    searches_limit: -1, // unlimited
    description: "Unlimited HatiScan searches, multi-user access",
  },
} as const;

type PlanKey = keyof typeof PLANS;

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

    const body = await request.json();
    const { plan, trial, promo_code } = body as { plan: string; trial?: boolean; promo_code?: string };

    if (!plan || !(plan in PLANS)) {
      return Response.json(
        { error: "Invalid plan. Must be one of: starter, professional, firm" },
        { status: 400 }
      );
    }

    const selected = PLANS[plan as PlanKey];
    const stripe = getStripe();

    // Build checkout session options
    const sessionOptions: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            unit_amount: selected.price_kes,
            currency: "kes",
            product_data: {
              name: `HatiScan™ ${selected.name} Plan`,
              description: selected.description,
            },
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://ardhiverified.com"}/account?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://ardhiverified.com"}/pricing?cancelled=true`,
      metadata: {
        user_id: user.id,
        user_email: user.email || "",
        plan,
        product: "hatiscan_subscription",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
        },
      },
      customer_email: user.email,
    };

    // 30-day free trial — no charge for the first billing period
    if (trial) {
      sessionOptions.subscription_data!.trial_period_days = 30;
    }

    // Allow promo codes (including TRIAL30)
    if (promo_code) {
      sessionOptions.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);

    return Response.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error("Subscription checkout error:", err);
    return Response.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
