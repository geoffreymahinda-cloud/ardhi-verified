"use server";

import { createClient } from "@/lib/supabase/server";
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
