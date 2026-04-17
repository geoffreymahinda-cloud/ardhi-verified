import Stripe from "stripe";

export async function GET() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-03-25.dahlia",
      timeout: 30000,
      maxNetworkRetries: 2,
    });

    // Simplest possible Stripe call
    const balance = await stripe.balance.retrieve();

    return Response.json({
      status: "ok",
      currency: balance.available?.[0]?.currency,
      stripe_reachable: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({
      status: "error",
      detail: msg,
      stripe_reachable: false,
    });
  }
}
