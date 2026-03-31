"use client";

import { useState, type FormEvent } from "react";
import { submitEnquiry } from "@/app/actions";

const countries = [
  { value: "KE", label: "Kenya", code: "+254", ph: "+254 7XX XXX XXX" },
  { value: "GB", label: "United Kingdom", code: "+44", ph: "+44 7XXX XXX XXX" },
  { value: "US", label: "United States", code: "+1", ph: "+1 (XXX) XXX-XXXX" },
  { value: "CA", label: "Canada", code: "+1", ph: "+1 (XXX) XXX-XXXX" },
  { value: "AE", label: "UAE", code: "+971", ph: "+971 5X XXX XXXX" },
  { value: "AU", label: "Australia", code: "+61", ph: "+61 4XX XXX XXX" },
  { value: "DE", label: "Germany", code: "+49", ph: "+49 1XX XXXXXXX" },
  { value: "ZA", label: "South Africa", code: "+27", ph: "+27 XX XXX XXXX" },
  { value: "NG", label: "Nigeria", code: "+234", ph: "+234 XXX XXX XXXX" },
  { value: "__DIV__", label: "──────────────", code: "", ph: "" },
  { value: "BD", label: "Bangladesh", code: "+880", ph: "+880 XXXX XXXXXX" },
  { value: "BR", label: "Brazil", code: "+55", ph: "+55 XX XXXXX XXXX" },
  { value: "CN", label: "China", code: "+86", ph: "+86 XXX XXXX XXXX" },
  { value: "EG", label: "Egypt", code: "+20", ph: "+20 XX XXXX XXXX" },
  { value: "ET", label: "Ethiopia", code: "+251", ph: "+251 XX XXX XXXX" },
  { value: "FR", label: "France", code: "+33", ph: "+33 X XX XX XX XX" },
  { value: "GH", label: "Ghana", code: "+233", ph: "+233 XX XXX XXXX" },
  { value: "IN", label: "India", code: "+91", ph: "+91 XXXXX XXXXX" },
  { value: "IE", label: "Ireland", code: "+353", ph: "+353 XX XXX XXXX" },
  { value: "IT", label: "Italy", code: "+39", ph: "+39 XXX XXX XXXX" },
  { value: "JP", label: "Japan", code: "+81", ph: "+81 XX XXXX XXXX" },
  { value: "MY", label: "Malaysia", code: "+60", ph: "+60 XX XXXX XXXX" },
  { value: "NL", label: "Netherlands", code: "+31", ph: "+31 X XXXX XXXX" },
  { value: "NZ", label: "New Zealand", code: "+64", ph: "+64 XX XXX XXXX" },
  { value: "NO", label: "Norway", code: "+47", ph: "+47 XXX XX XXX" },
  { value: "PK", label: "Pakistan", code: "+92", ph: "+92 XXX XXX XXXX" },
  { value: "QA", label: "Qatar", code: "+974", ph: "+974 XXXX XXXX" },
  { value: "RW", label: "Rwanda", code: "+250", ph: "+250 XXX XXX XXX" },
  { value: "SA", label: "Saudi Arabia", code: "+966", ph: "+966 XX XXX XXXX" },
  { value: "SG", label: "Singapore", code: "+65", ph: "+65 XXXX XXXX" },
  { value: "SO", label: "Somalia", code: "+252", ph: "+252 XX XXX XXX" },
  { value: "ES", label: "Spain", code: "+34", ph: "+34 XXX XXX XXX" },
  { value: "SE", label: "Sweden", code: "+46", ph: "+46 XX XXX XX XX" },
  { value: "CH", label: "Switzerland", code: "+41", ph: "+41 XX XXX XX XX" },
  { value: "TZ", label: "Tanzania", code: "+255", ph: "+255 XXX XXX XXX" },
  { value: "UG", label: "Uganda", code: "+256", ph: "+256 XXX XXX XXX" },
  { value: "ZM", label: "Zambia", code: "+260", ph: "+260 XX XXX XXXX" },
  { value: "ZW", label: "Zimbabwe", code: "+263", ph: "+263 XX XXX XXXX" },
];

const getCountry = (v: string) => countries.find((c) => c.value === v);

export default function EnquiryForm({ listingTitle, listingId }: { listingTitle: string; listingId: number }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    basedIn: "",
    message: `I'm interested in "${listingTitle}". Please send me more details.`,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleCountryChange(value: string) {
    const selected = getCountry(value);
    const code = selected?.code || "";
    const prev = getCountry(form.basedIn);
    const prevCode = prev?.code || "";
    const currentPhone = form.phone;

    let newPhone = currentPhone;
    if (!currentPhone || currentPhone === prevCode || currentPhone === prevCode + " ") {
      newPhone = code ? code + " " : "";
    } else if (prevCode && currentPhone.startsWith(prevCode)) {
      newPhone = code + currentPhone.slice(prevCode.length);
    }
    setForm((prev) => ({ ...prev, basedIn: value, phone: newPhone }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await submitEnquiry({
      listingId,
      name: form.name,
      email: form.email,
      phone: form.phone,
      basedIn: form.basedIn,
      message: form.message,
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
      <div className="bg-ardhi-light border border-ardhi/30 rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">&#10003;</div>
        <h4 className="font-serif font-semibold text-lg text-navy mb-1">Enquiry Sent</h4>
        <p className="text-muted text-sm">
          We will be in touch within 24 hours. Check your email for a confirmation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="eq-name" className="block text-sm font-medium text-navy mb-1">
          Full Name
        </label>
        <input
          id="eq-name"
          name="name"
          type="text"
          required
          value={form.name}
          onChange={handleChange}
          placeholder="John Kamau"
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition"
        />
      </div>

      <div>
        <label htmlFor="eq-email" className="block text-sm font-medium text-navy mb-1">
          Email
        </label>
        <input
          id="eq-email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          placeholder="john@example.com"
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition"
        />
      </div>

      <div>
        <label htmlFor="eq-phone" className="block text-sm font-medium text-navy mb-1">
          Phone
        </label>
        <input
          id="eq-phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder={getCountry(form.basedIn)?.ph || "+XX XXX XXX XXXX"}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition"
        />
      </div>

      <div>
        <label htmlFor="eq-based" className="block text-sm font-medium text-navy mb-1">
          I&apos;m based in
        </label>
        <select
          id="eq-based"
          name="basedIn"
          required
          value={form.basedIn}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition bg-white"
        >
          <option value="" disabled>
            Select country
          </option>
          {countries.map((c) =>
            c.value === "__DIV__" ? (
              <option key="div" disabled>{c.label}</option>
            ) : (
              <option key={c.value} value={c.value}>{c.label}</option>
            )
          )}
        </select>
      </div>

      <div>
        <label htmlFor="eq-message" className="block text-sm font-medium text-navy mb-1">
          Message
        </label>
        <textarea
          id="eq-message"
          name="message"
          rows={4}
          value={form.message}
          onChange={handleChange}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-trust-red bg-trust-red/5 border border-trust-red/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-ardhi hover:bg-ardhi-dark text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending..." : "Send Enquiry"}
      </button>
    </form>
  );
}
