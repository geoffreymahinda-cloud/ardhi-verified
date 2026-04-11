import type { Metadata } from "next";
import Link from "next/link";
import { getPartnerPortalData } from "./actions";
import PortalClient from "./PortalClient";

export const metadata: Metadata = {
  title: "Partner Portal — Ardhi Verified",
  description:
    "Ardhi Verified partner portal — view your introduced buyer pipeline, update transaction status, and track technology services fees.",
  robots: { index: false, follow: false }, // not a public marketing page
};

export const dynamic = "force-dynamic";

export default async function PartnerPortalPage() {
  const data = await getPartnerPortalData();

  // ── Not signed in ──────────────────────────────────────────────
  if (!data.authorized && data.reason === "not_signed_in") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="font-serif text-2xl font-bold text-navy mb-3">
            Sign in to access the Partner Portal
          </h1>
          <p className="text-muted mb-6">
            The Ardhi Verified Partner Portal is available to authorised partner institutions only. Please sign in with the email set up for your partner account.
          </p>
          <Link
            href="/auth/login?next=/partners/portal"
            className="inline-block rounded-lg bg-ardhi px-8 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Signed in but not a partner ────────────────────────────────
  if (!data.authorized && data.reason === "not_a_partner") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg text-center">
          <h1 className="font-serif text-2xl font-bold text-navy mb-3">
            Partner portal access required
          </h1>
          <p className="text-muted mb-2">
            Your account (<strong className="text-navy">{data.userEmail}</strong>) is not provisioned for partner portal access.
          </p>
          <p className="text-muted mb-6">
            The Partner Portal is available only to authorised SACCO, banking, and developer partner accounts set up by Ardhi Verified. If you believe this is an error, please contact us.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:hello@ardhiverified.com?subject=Partner%20Portal%20Access"
              className="inline-block rounded-lg bg-ardhi px-6 py-3 font-semibold text-white hover:bg-ardhi-dark transition-colors"
            >
              Request access
            </a>
            <Link
              href="/"
              className="inline-block rounded-lg border border-border px-6 py-3 font-semibold text-navy hover:bg-bg transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Authorized — render the portal UI ──────────────────────────
  return (
    <PortalClient
      partner={data.partner!}
      role={data.role!}
      userEmail={data.userEmail ?? ""}
      pipeline={data.pipeline}
      analytics={data.analytics}
    />
  );
}
