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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return Response.json({ error: "Missing session_id" }, { status: 400 });
  }

  // Verify payment with Stripe
  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return Response.json({ error: "Invalid session" }, { status: 400 });
  }

  if (session.payment_status !== "paid") {
    return Response.json({ error: "Payment not completed" }, { status: 402 });
  }

  const parcelRef = session.metadata?.parcel_reference;
  if (!parcelRef) {
    return Response.json({ error: "Missing parcel reference" }, { status: 400 });
  }

  const db = getSupabase();

  // Check if full report already exists for this session
  const { data: existing } = await db
    .from("hatiscan_reports")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .eq("scan_tier", "full")
    .single();

  if (existing) {
    return Response.json({
      ...existing.breakdown,
      report_number: existing.report_number,
      trust_score: existing.trust_score,
      verdict: existing.verdict,
      tier: "full",
      parcel_reference: existing.parcel_reference,
      checked_at: existing.checked_at,
      paid: true,
    });
  }

  // No report yet — run the full scan now (webhook may not have fired yet)
  const fullScanUrl = new URL("/api/hatiscan", request.url);
  fullScanUrl.searchParams.set("parcel", parcelRef);
  fullScanUrl.searchParams.set("tier", "full");
  fullScanUrl.searchParams.set("submitter_type", session.metadata?.submitter_type || "anonymous");
  fullScanUrl.searchParams.set("stripe_session_id", sessionId);

  const scanRes = await fetch(fullScanUrl.toString());
  const scanData = await scanRes.json();

  if (!scanRes.ok) {
    return Response.json({ error: "Scan failed", detail: scanData }, { status: 500 });
  }

  return Response.json({ ...scanData, tier: "full", paid: true });
}
