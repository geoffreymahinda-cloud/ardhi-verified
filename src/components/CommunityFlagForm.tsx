"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { submitCommunityFlag } from "@/app/actions";

const flagCategories = [
  { value: "land_dispute", label: "Land Dispute" },
  { value: "agent_warning", label: "Agent Warning" },
  { value: "title_problem", label: "Title Problem" },
  { value: "fraud_alert", label: "Fraud Alert" },
  { value: "boundary_issue", label: "Boundary Issue" },
  { value: "other", label: "Other" },
];

const counties = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos",
  "Kajiado", "Uasin Gishu", "Kilifi", "Nyeri", "Meru", "Murang'a",
  "Nyandarua", "Laikipia", "Narok", "Trans Nzoia", "Kericho", "Bomet",
  "Bungoma", "Kakamega", "Nandi", "Baringo", "Elgeyo-Marakwet",
  "Kwale", "Taita-Taveta", "Lamu", "Tana River", "Garissa", "Wajir",
  "Mandera", "Marsabit", "Isiolo", "Samburu", "Turkana", "West Pokot",
  "Kitui", "Makueni", "Embu", "Tharaka-Nithi", "Kirinyaga",
  "Nyamira", "Kisii", "Homa Bay", "Migori", "Siaya", "Vihiga", "Busia",
];

export default function CommunityFlagForm() {
  const [form, setForm] = useState({
    category: "",
    county: "",
    location: "",
    description: "",
    reporterName: "",
    reporterEmail: "",
    reporterPhone: "",
    website: "", // honeypot
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const result = await submitCommunityFlag({
      category: form.category,
      county: form.county,
      location: form.location,
      description: form.description,
      reporter_name: form.reporterName,
      reporter_email: form.reporterEmail,
      reporter_phone: form.reporterPhone,
      website: form.website,
    });

    setSubmitting(false);
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || "Something went wrong. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-ardhi-light border border-ardhi/30 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">&#10003;</div>
            <h4 className="font-serif font-semibold text-xl text-navy mb-2">Report Submitted</h4>
            <p className="text-muted text-sm mb-6">
              Thank you for helping protect the diaspora buyer community.
              Our team will review your report within 48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { setSubmitted(false); setForm({ category: "", county: "", location: "", description: "", reporterName: "", reporterEmail: "", reporterPhone: "", website: "" }); }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-ardhi hover:text-ardhi-dark transition-colors"
              >
                Submit another report
              </button>
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-ardhi hover:text-ardhi-dark transition-colors">
                Go to dashboard
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-navy mb-2">
            Community Intelligence
          </h1>
          <p className="text-muted">
            Report land disputes, agent warnings and title problems to help protect
            diaspora buyers in Kenya. All reports are reviewed by our team before
            being published.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-6 space-y-5">
          <div>
            <label htmlFor="cf-category" className="block text-sm font-medium text-navy mb-1">
              Flag Category *
            </label>
            <select
              id="cf-category"
              name="category"
              required
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition bg-white"
            >
              <option value="" disabled>Select a category</option>
              {flagCategories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cf-county" className="block text-sm font-medium text-navy mb-1">
                County *
              </label>
              <select
                id="cf-county"
                name="county"
                required
                value={form.county}
                onChange={handleChange}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition bg-white"
              >
                <option value="" disabled>Select county</option>
                {counties.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cf-location" className="block text-sm font-medium text-navy mb-1">
                Specific Location
              </label>
              <input
                id="cf-location"
                name="location"
                type="text"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Runda, Syokimau, Diani"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cf-description" className="block text-sm font-medium text-navy mb-1">
              Description *
            </label>
            <textarea
              id="cf-description"
              name="description"
              rows={5}
              required
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the issue in detail — what happened, who was involved, any title/parcel numbers you know..."
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition resize-none"
            />
          </div>

          <hr className="border-border" />

          <p className="text-xs text-muted">
            Your contact details are optional but help us follow up on your report.
            They will never be shared publicly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cf-name" className="block text-sm font-medium text-navy mb-1">
                Your Name
              </label>
              <input
                id="cf-name"
                name="reporterName"
                type="text"
                value={form.reporterName}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition"
              />
            </div>

            <div>
              <label htmlFor="cf-email" className="block text-sm font-medium text-navy mb-1">
                Email
              </label>
              <input
                id="cf-email"
                name="reporterEmail"
                type="email"
                value={form.reporterEmail}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cf-phone" className="block text-sm font-medium text-navy mb-1">
              Phone
            </label>
            <input
              id="cf-phone"
              name="reporterPhone"
              type="tel"
              value={form.reporterPhone}
              onChange={handleChange}
              placeholder="Optional"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition"
            />
          </div>

          {/* Honeypot — hidden from humans, bots fill it */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
          </div>

          {error && (
            <p className="text-sm text-trust-red bg-trust-red/5 border border-trust-red/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-ardhi hover:bg-ardhi-dark text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
