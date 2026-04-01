import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Documentation — Ardhi Verified",
  description: "Integrate Ardhi's land verification engine into your systems. RESTful API for title verification, portfolio monitoring, and fraud detection.",
};

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/verify-title",
    desc: "Submit a title for verification. Returns a Trust Score, risk classification, and detailed check results within 48 hours via webhook.",
    params: [
      { name: "title_number", type: "string", required: true, desc: "Land registry title number (e.g. LR.NO.12807/214)" },
      { name: "county", type: "string", required: true, desc: "County where the title is registered" },
      { name: "owner_name", type: "string", required: false, desc: "Expected registered owner name (for mismatch detection)" },
      { name: "callback_url", type: "string", required: true, desc: "Webhook URL for async result delivery" },
      { name: "priority", type: "string", required: false, desc: "'standard' (48hrs) or 'urgent' (24hrs, 2x price)" },
    ],
    response: `{
  "verification_id": "ver_8f3k2j1m",
  "status": "processing",
  "estimated_completion": "2026-04-03T14:00:00Z",
  "callback_url": "https://your-bank.co.ke/webhook"
}`,
  },
  {
    method: "GET",
    path: "/api/v1/verifications/{id}",
    desc: "Retrieve the result of a completed verification. Includes Trust Score, all check results, and a downloadable certificate URL.",
    params: [
      { name: "id", type: "string", required: true, desc: "Verification ID returned from the verify-title endpoint" },
    ],
    response: `{
  "verification_id": "ver_8f3k2j1m",
  "status": "completed",
  "trust_score": 92,
  "outcome": "proceed",
  "risk_level": "safe",
  "checks": {
    "title_deed_confirmed": true,
    "nlims_registry_match": true,
    "no_encumbrances": true,
    "no_active_disputes": true,
    "seller_identity_verified": true,
    "agent_lsk_registered": true
  },
  "fraud_risk_score": 0.03,
  "certificate_url": "https://api.ardhiverified.com/certificates/ver_8f3k2j1m.pdf",
  "completed_at": "2026-04-03T11:22:00Z"
}`,
  },
  {
    method: "POST",
    path: "/api/v1/bulk-verify",
    desc: "Submit multiple titles for batch verification. Accepts up to 10,000 titles per request. Results delivered via webhook as each completes.",
    params: [
      { name: "titles", type: "array", required: true, desc: "Array of { title_number, county, owner_name? } objects" },
      { name: "callback_url", type: "string", required: true, desc: "Webhook URL — called once per completed verification" },
      { name: "batch_label", type: "string", required: false, desc: "Label for this batch (e.g. 'Q1 2026 Audit')" },
    ],
    response: `{
  "batch_id": "bat_9x7m2k4p",
  "total_titles": 2500,
  "status": "queued",
  "estimated_completion": "2026-04-10T18:00:00Z"
}`,
  },
  {
    method: "POST",
    path: "/api/v1/monitor",
    desc: "Enrol a title in continuous monitoring (Land Guardian Enterprise). Nightly NLIMS checks with instant webhook alerts on any changes.",
    params: [
      { name: "title_number", type: "string", required: true, desc: "Title to monitor" },
      { name: "county", type: "string", required: true, desc: "County of registration" },
      { name: "alert_url", type: "string", required: true, desc: "Webhook URL for change alerts" },
      { name: "alert_email", type: "string", required: false, desc: "Email for critical alerts" },
    ],
    response: `{
  "monitor_id": "mon_3p8q1r5t",
  "title_number": "LR.NO.12807/214",
  "status": "active",
  "next_check": "2026-04-02T02:00:00+03:00"
}`,
  },
  {
    method: "GET",
    path: "/api/v1/portfolio/{id}/status",
    desc: "Get the current status of all monitored titles in a portfolio. Includes health summary, at-risk titles, and last check timestamps.",
    params: [
      { name: "id", type: "string", required: true, desc: "Portfolio ID" },
    ],
    response: `{
  "portfolio_id": "prt_5k2m8n1q",
  "total_titles": 1250,
  "healthy": 1189,
  "at_risk": 42,
  "critical": 3,
  "pending_check": 16,
  "last_full_scan": "2026-04-01T02:14:00+03:00",
  "next_scan": "2026-04-02T02:00:00+03:00"
}`,
  },
];

export default function ApiDocsPage() {
  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="bg-navy text-white py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-ardhi/20 border border-ardhi/30 rounded-full px-4 py-1.5 mb-6">
            <span className="text-ardhi text-sm font-semibold">API v1</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-6">API Documentation</h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-8">
            Integrate Ardhi&apos;s land verification engine into your loan management system, CRM, or underwriting platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/enterprise#contact" className="bg-ardhi text-white px-8 py-4 rounded-lg font-semibold hover:bg-ardhi-dark transition-colors">
              Request API Key
            </Link>
            <a href="#endpoints" className="border border-white/30 text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-colors">
              View Endpoints
            </a>
          </div>
        </div>
      </section>

      {/* Auth */}
      <section className="py-12 border-b border-border">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-serif text-2xl font-bold text-navy mb-4">Authentication</h2>
          <p className="text-muted mb-4">All API requests require a Bearer token in the Authorization header:</p>
          <div className="rounded-xl bg-navy/5 border border-border p-5 font-mono text-sm overflow-x-auto">
            <p className="text-muted">Authorization: Bearer <span className="text-ardhi">sk_live_your_api_key_here</span></p>
          </div>
          <p className="text-xs text-muted mt-3">API keys are issued per institution. Contact us at <Link href="/enterprise#contact" className="text-ardhi hover:underline">enterprise@ardhiverified.com</Link> to get started.</p>
        </div>
      </section>

      {/* Base URL */}
      <section className="py-8 border-b border-border">
        <div className="max-w-5xl mx-auto px-6">
          <h3 className="text-sm font-semibold text-navy mb-2">Base URL</h3>
          <code className="rounded-lg bg-navy/5 border border-border px-4 py-2 text-sm font-mono text-navy">
            https://api.ardhiverified.com
          </code>
        </div>
      </section>

      {/* Endpoints */}
      <section id="endpoints" className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-serif text-2xl font-bold text-navy mb-8">Endpoints</h2>

          <div className="space-y-12">
            {endpoints.map((ep) => (
              <div key={ep.path} className="rounded-2xl border border-border overflow-hidden">
                {/* Header */}
                <div className="bg-bg px-6 py-4 border-b border-border flex items-center gap-3">
                  <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                    ep.method === "POST" ? "bg-ardhi/10 text-ardhi" : "bg-blue-100 text-blue-700"
                  }`}>
                    {ep.method}
                  </span>
                  <code className="font-mono text-sm text-navy font-medium">{ep.path}</code>
                </div>

                <div className="p-6 space-y-6">
                  <p className="text-sm text-muted">{ep.desc}</p>

                  {/* Parameters */}
                  <div>
                    <h4 className="text-sm font-semibold text-navy mb-3">Parameters</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-2 font-medium text-navy">Name</th>
                            <th className="pb-2 font-medium text-navy">Type</th>
                            <th className="pb-2 font-medium text-navy">Required</th>
                            <th className="pb-2 font-medium text-navy">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {ep.params.map((p) => (
                            <tr key={p.name}>
                              <td className="py-2 font-mono text-xs text-ardhi">{p.name}</td>
                              <td className="py-2 text-xs text-muted">{p.type}</td>
                              <td className="py-2">
                                {p.required ? (
                                  <span className="text-xs font-medium text-trust-red">required</span>
                                ) : (
                                  <span className="text-xs text-muted">optional</span>
                                )}
                              </td>
                              <td className="py-2 text-xs text-muted">{p.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Response */}
                  <div>
                    <h4 className="text-sm font-semibold text-navy mb-3">Response</h4>
                    <pre className="rounded-xl bg-navy text-gray-300 p-5 text-xs font-mono overflow-x-auto leading-relaxed">
                      {ep.response}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Webhooks */}
      <section className="py-16 bg-bg">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-serif text-2xl font-bold text-navy mb-4">Webhooks</h2>
          <p className="text-muted mb-6">Ardhi sends POST requests to your callback URLs when verifications complete or monitored titles change. All webhooks include an HMAC-SHA256 signature in the <code className="text-xs bg-navy/5 border border-border px-1.5 py-0.5 rounded font-mono">X-Ardhi-Signature</code> header for verification.</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-navy mb-2">verification.completed</h3>
              <p className="text-xs text-muted">Sent when a title verification finishes. Includes the full verification result.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-navy mb-2">monitor.alert</h3>
              <p className="text-xs text-muted">Sent when a monitored title has a registry change. Includes severity and plain-English explanation.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-navy mb-2">batch.completed</h3>
              <p className="text-xs text-muted">Sent when all titles in a bulk verification batch have been processed.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-navy mb-2">monitor.status</h3>
              <p className="text-xs text-muted">Daily summary of portfolio health — total titles, at-risk count, critical alerts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy text-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-3xl font-bold mb-4">Ready to integrate?</h2>
          <p className="text-gray-300 mb-8">Contact our enterprise team to get your API key and start verifying titles programmatically.</p>
          <Link href="/enterprise#contact" className="bg-ardhi text-white px-8 py-4 rounded-lg font-semibold hover:bg-ardhi-dark transition-colors">
            Request API Key
          </Link>
        </div>
      </section>
    </main>
  );
}
