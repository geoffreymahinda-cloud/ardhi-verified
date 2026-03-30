import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Ardhi Verified",
  description:
    "Privacy Policy for Ardhi Verified. Learn how we collect, use, and protect your personal data in compliance with the Kenya Data Protection Act 2019 and UK GDPR.",
};

export default function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-4 pb-12 pt-20 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-white/60">
            Last updated: March 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-bg px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-10 text-text leading-relaxed">
            {/* 1 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                1. Introduction
              </h2>
              <p className="text-muted">
                Ardhi Verified Limited (&quot;Ardhi Verified&quot;,
                &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed
                to protecting and respecting your privacy. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your
                personal data when you use our website, mobile applications, and
                services (collectively, the &quot;Services&quot;).
              </p>
              <p className="mt-3 text-muted">
                We process personal data in accordance with the Kenya Data
                Protection Act, 2019 (Act No. 24 of 2019) (&quot;KDPA&quot;)
                and, for users located in the United Kingdom, the UK General
                Data Protection Regulation (&quot;UK GDPR&quot;) and the Data
                Protection Act 2018. This dual-compliance approach reflects our
                commitment to serving both Kenyan residents and the Kenyan
                diaspora in the UK and beyond.
              </p>
              <p className="mt-3 text-muted">
                Ardhi Verified Limited is registered as a data controller with
                the Office of the Data Protection Commissioner (ODPC), Kenya.
              </p>
            </div>

            {/* 2 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                2. Data We Collect
              </h2>
              <p className="mb-3 text-muted">
                We collect the following categories of personal data:
              </p>

              <h3 className="mb-2 text-lg font-semibold text-navy">
                Account Data
              </h3>
              <p className="mb-4 text-muted">
                When you create an account, we collect your full name, email
                address, phone number, nationality, country of residence, and,
                for Agent accounts, professional credentials, KRA PIN, national
                ID or passport number, and regulatory registration details.
              </p>

              <h3 className="mb-2 text-lg font-semibold text-navy">
                Enquiry Data
              </h3>
              <p className="mb-4 text-muted">
                When you enquire about a Listing or contact an Agent, we collect
                the content of your messages, enquiry timestamps, the Listings
                you are interested in, and any documents you share (such as
                proof of funds or identification).
              </p>

              <h3 className="mb-2 text-lg font-semibold text-navy">
                Payment Data
              </h3>
              <p className="mb-4 text-muted">
                When you make payments through our escrow service or subscribe
                to Land Guardian, we collect transaction amounts, payment method
                details (M-Pesa number, bank account, or card details processed
                by our PCI-DSS compliant payment provider), billing address, and
                transaction history.
              </p>

              <h3 className="mb-2 text-lg font-semibold text-navy">
                Browsing Data
              </h3>
              <p className="text-muted">
                We automatically collect information about how you interact with
                our Services, including IP address, device type, browser type,
                operating system, pages visited, search queries, Listing views,
                time spent on pages, referral URLs, and approximate location
                derived from your IP address.
              </p>
            </div>

            {/* 3 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                3. How We Use Your Data
              </h2>
              <p className="mb-3 text-muted">
                We use your personal data for the following purposes and legal
                bases:
              </p>
              <ul className="ml-4 list-disc space-y-2 text-muted">
                <li>
                  <strong className="text-navy">Service delivery</strong> —
                  Creating and managing your account, facilitating Listing
                  enquiries, processing escrow payments, and providing Land
                  Guardian monitoring alerts. (Legal basis: performance of
                  contract)
                </li>
                <li>
                  <strong className="text-navy">
                    Verification &amp; trust
                  </strong>{" "}
                  — Verifying Agent credentials, computing Trust Scores,
                  conducting identity checks, and preventing fraud. (Legal
                  basis: legitimate interest and legal obligation)
                </li>
                <li>
                  <strong className="text-navy">Communications</strong> —
                  Sending transaction confirmations, Land Guardian alerts,
                  service updates, and, with your consent, marketing
                  communications. (Legal basis: consent and legitimate interest)
                </li>
                <li>
                  <strong className="text-navy">
                    Improvement &amp; analytics
                  </strong>{" "}
                  — Analysing usage patterns, improving search relevance,
                  developing new features, and generating anonymised market
                  insights. (Legal basis: legitimate interest)
                </li>
                <li>
                  <strong className="text-navy">Legal compliance</strong> —
                  Complying with tax obligations, anti-money laundering (AML)
                  requirements, regulatory reporting, and responding to lawful
                  requests from authorities. (Legal basis: legal obligation)
                </li>
              </ul>
            </div>

            {/* 4 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                4. NLIMS Data Processing
              </h2>
              <p className="text-muted">
                A core feature of Ardhi Verified is cross-referencing Listing
                information with data from the National Land Information
                Management System (NLIMS). When we perform NLIMS verification,
                we process the title reference number, registered owner name(s),
                parcel dimensions, encumbrance records, and any caveats or
                restrictions registered against the title.
              </p>
              <p className="mt-3 text-muted">
                NLIMS data is sourced from publicly available government records
                and is processed for the legitimate purpose of verifying land
                ownership and protecting buyers from fraud. We do not store
                NLIMS data beyond what is necessary for verification and
                monitoring purposes, and we refresh verification data
                periodically to ensure accuracy.
              </p>
              <p className="mt-3 text-muted">
                Land Guardian subscribers&apos; title reference numbers are
                retained for the duration of their subscription to enable
                ongoing monitoring. Upon cancellation, this data is deleted
                within 90 days unless retention is required by law.
              </p>
            </div>

            {/* 5 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                5. Data Sharing
              </h2>
              <p className="mb-3 text-muted">
                We share your personal data with the following categories of
                recipients:
              </p>
              <ul className="ml-4 list-disc space-y-2 text-muted">
                <li>
                  <strong className="text-navy">Agents &amp; sellers</strong> —
                  When you enquire about a Listing, your name, email, and phone
                  number are shared with the relevant Agent to facilitate
                  communication.
                </li>
                <li>
                  <strong className="text-navy">Payment providers</strong> — We
                  share payment data with our PCI-DSS compliant payment
                  processors (including M-Pesa/Safaricom, our banking partner,
                  and international transfer providers) to process transactions.
                </li>
                <li>
                  <strong className="text-navy">Legal &amp; regulatory</strong>{" "}
                  — We may disclose data to the ODPC, Kenya Revenue Authority,
                  law enforcement, or courts when required by law or to protect
                  our legitimate interests.
                </li>
                <li>
                  <strong className="text-navy">Service providers</strong> — We
                  engage trusted third-party providers for hosting, analytics,
                  customer support, and communication services. These providers
                  process data only on our instructions and are bound by data
                  processing agreements.
                </li>
              </ul>
              <div className="mt-4 rounded-xl border border-ardhi/20 bg-ardhi-light p-4">
                <p className="text-sm font-semibold text-navy">
                  We will never sell your personal data to third parties.
                </p>
                <p className="mt-1 text-sm text-muted">
                  Your data is not used for third-party advertising or sold to
                  data brokers. Period.
                </p>
              </div>
            </div>

            {/* 6 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                6. International Transfers
              </h2>
              <p className="text-muted">
                As a platform serving the Kenyan diaspora, particularly in the
                United Kingdom, personal data may be transferred between Kenya
                and the UK. We ensure that all international transfers comply
                with the requirements of the KDPA and the UK GDPR by
                implementing appropriate safeguards:
              </p>
              <ul className="ml-4 mt-3 list-disc space-y-2 text-muted">
                <li>
                  Standard Contractual Clauses (SCCs) approved by the UK
                  Information Commissioner&apos;s Office (ICO) for transfers
                  from the UK to Kenya
                </li>
                <li>
                  Data processing agreements that comply with Section 48 of the
                  KDPA for transfers from Kenya
                </li>
                <li>
                  Encryption in transit (TLS 1.3) and at rest (AES-256) for all
                  personal data
                </li>
                <li>
                  Data minimisation principles ensuring only necessary data is
                  transferred
                </li>
              </ul>
              <p className="mt-3 text-muted">
                Our primary data processing infrastructure is hosted within
                secure, SOC 2-certified data centres. Data residency preferences
                may be available for enterprise and institutional clients upon
                request.
              </p>
            </div>

            {/* 7 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                7. Data Retention
              </h2>
              <p className="text-muted">
                We retain personal data only for as long as necessary to fulfil
                the purposes for which it was collected:
              </p>
              <ul className="ml-4 mt-3 list-disc space-y-2 text-muted">
                <li>
                  <strong className="text-navy">Account data</strong> — Retained
                  for the duration of your account and for 7 years after account
                  closure (in accordance with KRA record-keeping requirements).
                </li>
                <li>
                  <strong className="text-navy">Transaction data</strong> —
                  Retained for 7 years after the transaction date for tax and
                  AML compliance purposes.
                </li>
                <li>
                  <strong className="text-navy">Browsing data</strong> —
                  Retained for 24 months, after which it is anonymised or
                  deleted.
                </li>
                <li>
                  <strong className="text-navy">
                    Land Guardian monitoring data
                  </strong>{" "}
                  — Retained for the duration of the subscription and deleted
                  within 90 days of cancellation.
                </li>
                <li>
                  <strong className="text-navy">Communication records</strong> —
                  Retained for 3 years after the last interaction.
                </li>
              </ul>
            </div>

            {/* 8 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                8. Your Rights
              </h2>
              <p className="mb-3 text-muted">
                Under the KDPA and, where applicable, the UK GDPR, you have the
                following rights:
              </p>
              <ul className="ml-4 list-disc space-y-2 text-muted">
                <li>
                  <strong className="text-navy">Right of access</strong> — You
                  may request a copy of the personal data we hold about you.
                </li>
                <li>
                  <strong className="text-navy">Right to rectification</strong>{" "}
                  — You may request correction of inaccurate or incomplete
                  personal data.
                </li>
                <li>
                  <strong className="text-navy">Right to erasure</strong> — You
                  may request deletion of your personal data where it is no
                  longer necessary for the purpose for which it was collected,
                  subject to legal retention requirements.
                </li>
                <li>
                  <strong className="text-navy">Right to data portability</strong>{" "}
                  — You may request your personal data in a structured, commonly
                  used, machine-readable format.
                </li>
                <li>
                  <strong className="text-navy">
                    Right to object &amp; restrict processing
                  </strong>{" "}
                  — You may object to processing based on legitimate interest and
                  request restriction of processing in certain circumstances.
                </li>
                <li>
                  <strong className="text-navy">
                    Right to withdraw consent
                  </strong>{" "}
                  — Where processing is based on consent, you may withdraw
                  consent at any time without affecting the lawfulness of prior
                  processing.
                </li>
              </ul>
              <p className="mt-3 text-muted">
                To exercise any of these rights, please contact our Data
                Protection Officer at{" "}
                <a
                  href="mailto:dpo@ardhiverified.com"
                  className="text-ardhi hover:text-ardhi-dark"
                >
                  dpo@ardhiverified.com
                </a>
                . We will respond to your request within 30 days in accordance
                with the KDPA, or within one month as required by the UK GDPR.
              </p>
            </div>

            {/* 9 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                9. Cookies
              </h2>
              <p className="text-muted">
                Our Services use cookies and similar tracking technologies to
                improve your experience, analyse usage, and support our
                marketing efforts. We use the following types of cookies:
              </p>
              <ul className="ml-4 mt-3 list-disc space-y-2 text-muted">
                <li>
                  <strong className="text-navy">Strictly necessary</strong> —
                  Required for the Platform to function (e.g., session
                  management, security tokens). These cannot be disabled.
                </li>
                <li>
                  <strong className="text-navy">Functional</strong> — Remember
                  your preferences such as language, currency, and saved
                  searches.
                </li>
                <li>
                  <strong className="text-navy">Analytics</strong> — Help us
                  understand how users interact with the Platform (e.g., page
                  views, feature usage). We use privacy-respecting analytics
                  tools.
                </li>
                <li>
                  <strong className="text-navy">Marketing</strong> — Used only
                  with your consent to deliver relevant advertisements and
                  measure campaign effectiveness.
                </li>
              </ul>
              <p className="mt-3 text-muted">
                You can manage your cookie preferences at any time through your
                browser settings or our cookie consent banner.
              </p>
            </div>

            {/* 10 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                10. Children&apos;s Privacy
              </h2>
              <p className="text-muted">
                Our Services are not directed at individuals under the age of 18
                (or the age of majority in the relevant jurisdiction). We do not
                knowingly collect personal data from children. If you are a
                parent or guardian and believe that your child has provided us
                with personal data, please contact our Data Protection Officer
                immediately. If we become aware that we have collected personal
                data from a child without verified parental consent, we will
                take steps to delete that information promptly.
              </p>
            </div>

            {/* 11 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                11. Changes to This Policy
              </h2>
              <p className="text-muted">
                We may update this Privacy Policy from time to time to reflect
                changes in our practices, legal requirements, or regulatory
                guidance. When we make material changes, we will notify you by
                email (to the address associated with your account) and by
                posting a prominent notice on our Platform at least 30 days
                before the changes take effect.
              </p>
              <p className="mt-3 text-muted">
                Your continued use of the Services after the effective date of
                any updated Policy constitutes your acceptance of the changes.
                We encourage you to review this Policy periodically.
              </p>
            </div>

            {/* 12 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                12. Contact Our Data Protection Officer
              </h2>
              <p className="text-muted">
                For any questions, concerns, or requests relating to this
                Privacy Policy or our data processing practices, please contact:
              </p>
              <div className="mt-4 rounded-xl border border-border bg-card p-6">
                <p className="font-semibold text-navy">
                  Data Protection Officer
                </p>
                <p className="text-sm text-muted">Ardhi Verified Limited</p>
                <p className="mt-2 text-sm text-muted">
                  Email:{" "}
                  <a
                    href="mailto:dpo@ardhiverified.com"
                    className="text-ardhi hover:text-ardhi-dark"
                  >
                    dpo@ardhiverified.com
                  </a>
                </p>
                <p className="text-sm text-muted">
                  Postal Address: P.O. Box 00000-00100, Nairobi, Kenya
                </p>
              </div>
              <p className="mt-4 text-sm text-muted">
                You also have the right to lodge a complaint with the Office of
                the Data Protection Commissioner (ODPC), Kenya, or the
                Information Commissioner&apos;s Office (ICO), UK, if you
                believe your data protection rights have been violated.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-navy">
                    ODPC Kenya
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    www.odpc.go.ke
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-navy">UK ICO</p>
                  <p className="mt-1 text-xs text-muted">www.ico.org.uk</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
