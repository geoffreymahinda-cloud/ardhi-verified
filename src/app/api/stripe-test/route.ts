import Stripe from "stripe";

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  const keyInfo = {
    present: !!key,
    length: key.length,
    prefix: key.substring(0, 12),
    hasWhitespace: key !== key.trim(),
    hasNewline: key.includes("\n"),
  };

  try {
    const stripe = new Stripe(key, {
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
      key: keyInfo,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({
      status: "error",
      detail: msg,
      stripe_reachable: false,
      key: keyInfo,
    });
  }
}
