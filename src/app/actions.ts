"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitEnquiry(formData: {
  listingId: number;
  name: string;
  email: string;
  phone: string;
  basedIn: string;
  message: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from("buyer_enquiries").insert({
    listing_id: formData.listingId,
    buyer_name: formData.name,
    buyer_email: formData.email,
    buyer_phone: formData.phone,
    buyer_location: formData.basedIn,
    message: formData.message,
    journey_stage: "enquiry",
  });

  if (error) {
    console.error("Failed to submit enquiry:", error.message);
    return { success: false, error: "Failed to submit enquiry. Please try again." };
  }

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
}) {
  const supabase = await createClient();

  const { error } = await supabase.from("buyer_enquiries").insert({
    buyer_name: formData.name,
    buyer_email: formData.email,
    buyer_phone: formData.phone,
    buyer_location: formData.country,
    message: `[Concierge] County: ${formData.county}, Budget: ${formData.budget}, Use: ${formData.use}, Timeline: ${formData.timeline}. ${formData.message}`,
    journey_stage: "concierge",
  });

  if (error) {
    console.error("Failed to submit concierge enquiry:", error.message);
    return { success: false, error: "Failed to submit enquiry. Please try again." };
  }

  return { success: true };
}

export async function submitWaitlist(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("buyer_enquiries").insert({
    buyer_name: "Waitlist signup",
    buyer_email: email,
    message: "[Land Guardian Waitlist]",
    journey_stage: "waitlist",
  });

  if (error) {
    console.error("Failed to submit waitlist:", error.message);
    return { success: false, error: "Failed to join waitlist. Please try again." };
  }

  return { success: true };
}
