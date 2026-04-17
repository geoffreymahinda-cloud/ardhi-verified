import { NextRequest } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
    timeout: 30000,
    maxNetworkRetries: 3,
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const body = await request.json();
    const { parcel_reference, submitter_type, currency } = body;

    if (!parcel_reference || parcel_reference.trim().length === 0) {
      return Response.json(
        { error: "Missing parcel_reference" },
        { status: 400 }
      );
    }

    const sanitized = parcel_reference.trim().substring(0, 100);

    // All prices in KES
    const priceData = { unit_amount: 250000, currency: "kes" }; // KES 2,500

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            ...priceData,
            product_data: {
              name: "HatiScan\u2122 Full Report",
              description: `Complete land verification report for ${sanitized} — 12-layer intelligence scan with Trust Score, spatial analysis, and downloadable PDF.`,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://ardhiverified.com"}/hatiscan?session_id={CHECKOUT_SESSION_ID}&parcel=${encodeURIComponent(sanitized)}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://ardhiverified.com"}/hatiscan?cancelled=true&parcel=${encodeURIComponent(sanitized)}`,
      metadata: {
        parcel_reference: sanitized,
        submitter_type: submitter_type || "anonymous",
        product: "hatiscan_full_report",
      },
    });

    return Response.json({ url: session.url, session_id: session.id });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Stripe checkout error:", detail);
    return Response.json(
      { error: "Failed to create checkout session", detail },
      { status: 500 }
    );
  }
}
