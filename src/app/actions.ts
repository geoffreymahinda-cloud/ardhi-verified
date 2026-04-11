"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { headers } from "next/headers";

// ─── EMAIL NOTIFICATION ──────────────────────────────────────────────────────

async function notifyAdmin(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
  listingTitle?: string;
}) {
  try {
    const supabase = await createClient();
    await supabase.functions.invoke("send-enquiry-email", {
      body: {
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        message: data.message,
        listing_title: data.listingTitle || "N/A",
      },
    });
  } catch (e) {
    // Don't fail the form submission if email fails
    console.error("Email notification failed:", e);
  }
}

// ─── VALIDATION HELPERS ──────────────────────────────────────────────────────

function sanitize(input: string): string {
  return input.trim().slice(0, 2000);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// ─── RATE LIMITING (in-memory, per IP, resets on deploy) ─────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max submissions per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

async function checkRateLimit(): Promise<boolean> {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

// ─── HONEYPOT CHECK ──────────────────────────────────────────────────────────
// If the hidden "website" field is filled, it's a bot

function isBot(honeypot: string | undefined): boolean {
  return !!honeypot && honeypot.trim().length > 0;
}

// ─── SERVER ACTIONS ──────────────────────────────────────────────────────────

export async function submitEnquiry(formData: {
  listingId: number;
  name: string;
  email: string;
  phone: string;
  basedIn: string;
  message: string;
  website?: string; // honeypot
}) {
  if (isBot(formData.website)) return { success: true }; // silent reject

  if (!await checkRateLimit()) {
    return { success: false, error: "Too many submissions. Please try again later." };
  }

  const name = sanitize(formData.name);
  const email = sanitize(formData.email);
  const phone = sanitize(formData.phone);
  const message = sanitize(formData.message);

  if (!name || !email) {
    return { success: false, error: "Name and email are required." };
  }
  if (!isValidEmail(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("buyer_enquiries").insert({
    listing_id: formData.listingId,
    buyer_name: name,
    buyer_email: email,
    buyer_phone: phone,
    buyer_location: sanitize(formData.basedIn),
    message,
    journey_stage: "enquiry",
  });

  if (error) {
    console.error("Failed to submit enquiry:", error.message);
    return { success: false, error: "Failed to submit enquiry. Please try again." };
  }

  await notifyAdmin({ name, email, phone, message, listingTitle: `Listing #${formData.listingId}` });

  return { success: true };
}

// ─── EXPRESSION OF INTEREST — creates a buyer row + triggers buyer_ref ──────

/**
 * Submits a buyer's expression of interest in a listing.
 *
 * Creates a row in `public.buyers` which fires the trigger that
 * auto-generates the AV-YYYY-CC-NNNNN reference ID. The generated
 * ref is read back and returned to the client for immediate display
 * on the confirmation step.
 *
 * Also writes a parallel row to `buyer_enquiries` so the existing
 * admin dashboard and partner enquiry pipeline keep working.
 */
export async function submitExpressionOfInterest(formData: {
  listingId: number;
  name: string;
  email: string;
  phone: string;
  basedIn: string; // country code e.g. "GB", "US"
  message?: string;
  website?: string; // honeypot
}): Promise<
  | { success: true; buyerRef: string; buyerId: string }
  | { success: false; error: string }
> {
  if (isBot(formData.website)) {
    // Silent reject — return a fake success so the bot moves on,
    // but with a throwaway ref that never hits the DB.
    return { success: true, buyerRef: "AV-0000-XX-00000", buyerId: "bot" };
  }

  if (!(await checkRateLimit())) {
    return { success: false, error: "Too many submissions. Please try again later." };
  }

  const name = sanitize(formData.name);
  const email = sanitize(formData.email).toLowerCase();
  const phone = sanitize(formData.phone);
  const basedIn = sanitize(formData.basedIn);
  const message = sanitize(formData.message || "");

  if (!name || !email) {
    return { success: false, error: "Name and email are required." };
  }
  if (!isValidEmail(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  // Map ISO country codes to the 2-letter buyer_ref prefix.
  // GB → UK per spec example (AV-2026-UK-00001).
  const countryCodeMap: Record<string, string> = {
    GB: "UK",
    US: "US",
    AE: "AE",
    CA: "CA",
    AU: "AU",
    KE: "KE",
    DE: "DE",
  };
  const countryCode = countryCodeMap[basedIn.toUpperCase()] || "XX";

  // Use the service client so RLS doesn't block the insert before
  // the buyer has a Supabase auth session.
  const supabase = createServiceClient();

  // Lookup the partner for this listing so we can pre-attribute the buyer.
  // Failure here is non-fatal — introducedToPartnerId stays NULL and
  // gets filled in later when the actual introduction is made.
  let introducedToPartnerId: string | null = null;
  const { data: listingRow } = await supabase
    .from("listings")
    .select("institution_id")
    .eq("id", formData.listingId)
    .maybeSingle();
  if (listingRow?.institution_id) {
    introducedToPartnerId = listingRow.institution_id as string;
  }

  // Insert the buyer row — the BEFORE INSERT trigger will populate
  // buyer_ref and buyer_ref_generated_at.
  const { data: buyerRow, error: buyerError } = await supabase
    .from("buyers")
    .insert({
      buyer_name: name,
      buyer_email: email,
      buyer_phone: phone || null,
      country_code: countryCode,
      listing_id: formData.listingId,
      introduced_to_partner_id: introducedToPartnerId,
      verification_level: "kyc_submitted",
      introduction_status: "pending",
    })
    .select("id, buyer_ref")
    .single();

  if (buyerError || !buyerRow?.buyer_ref) {
    console.error("Failed to create buyer:", buyerError?.message);
    return {
      success: false,
      error: "Failed to submit expression of interest. Please try again.",
    };
  }

  // Mirror to buyer_enquiries so the existing admin dashboard keeps working.
  await supabase.from("buyer_enquiries").insert({
    listing_id: formData.listingId,
    buyer_name: name,
    buyer_email: email,
    buyer_phone: phone,
    buyer_location: basedIn,
    message: message || `Expression of interest · ${buyerRow.buyer_ref}`,
    journey_stage: "enquiry",
  });

  await notifyAdmin({
    name,
    email,
    phone,
    message: `[EOI] ${buyerRow.buyer_ref} — ${message || "Expression of interest confirmed."}`,
    listingTitle: `Listing #${formData.listingId}`,
  });

  return { success: true, buyerRef: buyerRow.buyer_ref, buyerId: buyerRow.id };
}

/**
 * Lookup a buyer record by email. Used by the dashboard to surface
 * the buyer's reference ID + journey status if they have one. Uses
 * the service client so it works before a full auth session is
 * linked to the buyer row.
 */
export async function getBuyerByEmail(email: string): Promise<{
  buyer_ref: string;
  introduction_status: string;
  listing_id: number | null;
  introduced_to_partner_id: string | null;
  introduced_at: string | null;
  attribution_window_expires_at: string | null;
} | null> {
  if (!email) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("buyers")
    .select("buyer_ref, introduction_status, listing_id, introduced_to_partner_id, introduced_at, attribution_window_expires_at")
    .eq("buyer_email", email.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function submitConciergeEnquiry(formData: {
  name: string;
  email: string;
  phone: string;
  country: string;
  county: string;
  budget: string;
  use: string;
  timeline: string;
  message: string;
  website?: string; // honeypot
}) {
  if (isBot(formData.website)) return { success: true };

  if (!await checkRateLimit()) {
    return { success: false, error: "Too many submissions. Please try again later." };
  }

  const name = sanitize(formData.name);
  const email = sanitize(formData.email);

  if (!name || !email) {
    return { success: false, error: "Name and email are required." };
  }
  if (!isValidEmail(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("buyer_enquiries").insert({
    buyer_name: name,
    buyer_email: email,
    buyer_phone: sanitize(formData.phone),
    buyer_location: sanitize(formData.country),
    message: sanitize(`[Concierge] County: ${formData.county}, Budget: ${formData.budget}, Use: ${formData.use}, Timeline: ${formData.timeline}. ${formData.message}`),
    journey_stage: "concierge",
  });

  if (error) {
    console.error("Failed to submit concierge enquiry:", error.message);
    return { success: false, error: "Failed to submit enquiry. Please try again." };
  }

  const conciergeMsg = `[Concierge] County: ${formData.county}, Budget: ${formData.budget}, Use: ${formData.use}, Timeline: ${formData.timeline}. ${formData.message}`;
  await notifyAdmin({ name, email, phone: sanitize(formData.phone), message: conciergeMsg, listingTitle: "Concierge Enquiry" });

  return { success: true };
}

export async function submitContact(formData: {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string; // honeypot
}) {
  if (isBot(formData.website)) return { success: true };

  if (!await checkRateLimit()) {
    return { success: false, error: "Too many submissions. Please try again later." };
  }

  const name = sanitize(formData.name);
  const email = sanitize(formData.email);
  const message = sanitize(formData.message);

  if (!name || !email || !message) {
    return { success: false, error: "All fields are required." };
  }
  if (!isValidEmail(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("buyer_enquiries").insert({
    buyer_name: name,
    buyer_email: email,
    message: `[Contact — ${sanitize(formData.subject)}] ${message}`,
    journey_stage: "contact",
  });

  if (error) {
    console.error("Failed to submit contact form:", error.message);
    return { success: false, error: "Failed to send message. Please try again." };
  }

  await notifyAdmin({ name, email, message: `[${sanitize(formData.subject)}] ${message}`, listingTitle: "Contact Form" });

  return { success: true };
}

export async function submitCommunityFlag(formData: {
  category: string;
  county: string;
  location: string;
  description: string;
  reporter_name: string;
  reporter_email: string;
  reporter_phone: string;
  website?: string; // honeypot
}) {
  if (isBot(formData.website)) return { success: true }; // silent reject

  if (!await checkRateLimit()) {
    return { success: false, error: "Too many submissions. Please try again later." };
  }

  const category = sanitize(formData.category);
  const county = sanitize(formData.county);
  const description = sanitize(formData.description);

  if (!category || !county || !description) {
    return { success: false, error: "Category, county and description are required." };
  }

  if (formData.reporter_email && !isValidEmail(formData.reporter_email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("community_flags").insert({
    category,
    county,
    location: sanitize(formData.location),
    description,
    reporter_name: sanitize(formData.reporter_name) || null,
    reporter_email: sanitize(formData.reporter_email) || null,
    reporter_phone: sanitize(formData.reporter_phone) || null,
    status: "pending",
  });

  if (error) {
    console.error("Failed to submit community flag:", error.message);
    return { success: false, error: "Failed to submit report. Please try again." };
  }

  if (formData.reporter_email) {
    await notifyAdmin({
      name: sanitize(formData.reporter_name) || "Anonymous",
      email: sanitize(formData.reporter_email),
      message: `[Community Flag — ${category}] ${county}: ${description}`,
      listingTitle: "Community Intelligence Report",
    });
  }

  return { success: true };
}

export async function submitWaitlist(email: string, website?: string) {
  if (isBot(website)) return { success: true };

  if (!await checkRateLimit()) {
    return { success: false, error: "Too many submissions. Please try again later." };
  }

  const cleanEmail = sanitize(email);
  if (!isValidEmail(cleanEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("buyer_enquiries").insert({
    buyer_name: "Waitlist signup",
    buyer_email: cleanEmail,
    message: "[Land Guardian Waitlist]",
    journey_stage: "waitlist",
  });

  if (error) {
    console.error("Failed to submit waitlist:", error.message);
    return { success: false, error: "Failed to join waitlist. Please try again." };
  }

  await notifyAdmin({ name: "Waitlist signup", email: cleanEmail, message: "Joined Land Guardian waitlist", listingTitle: "Land Guardian Waitlist" });

  return { success: true };
}
