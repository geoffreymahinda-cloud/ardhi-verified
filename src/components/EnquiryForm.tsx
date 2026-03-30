"use client";

import { useState, type FormEvent } from "react";

export default function EnquiryForm({ listingTitle }: { listingTitle: string }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    basedIn: "",
    message: `I'm interested in "${listingTitle}". Please send me more details.`,
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
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
          placeholder="+254 7XX XXX XXX"
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
          onChange={handleChange}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/40 focus:border-ardhi transition bg-white"
        >
          <option value="" disabled>
            Select country
          </option>
          <option value="UK">UK</option>
          <option value="USA">USA</option>
          <option value="UAE">UAE</option>
          <option value="Canada">Canada</option>
          <option value="Kenya">Kenya</option>
          <option value="Other">Other</option>
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

      <button
        type="submit"
        className="w-full bg-ardhi hover:bg-ardhi-dark text-white font-semibold py-3 rounded-lg transition-colors"
      >
        Send Enquiry
      </button>
    </form>
  );
}
