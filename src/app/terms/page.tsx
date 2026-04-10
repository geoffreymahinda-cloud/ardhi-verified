import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Ardhi Verified",
  description:
    "Terms of Service for Ardhi Verified, Kenya's trusted land verification and marketplace platform.",
};

export default function TermsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-4 pb-12 pt-20 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Terms of Service
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
                Welcome to Ardhi Verified (&quot;Platform&quot;, &quot;we&quot;,
                &quot;us&quot;, or &quot;our&quot;). Ardhi Verified is a
                technology platform operated by Ardhi Verified Limited, a
                company incorporated under the laws of the Republic of Kenya
                (Company Registration No. PVT-XXXXXXXXX). These Terms of
                Service (&quot;Terms&quot;) govern your access to and use of the
                Ardhi Verified website, mobile applications, APIs, and all
                related services (collectively, the &quot;Services&quot;).
              </p>
              <div className="mt-4 rounded-xl border border-trust-amber/20 bg-trust-amber/5 p-5">
                <p className="text-sm font-semibold text-navy">
                  Important: Ardhi Verified is an information service, not a legal title guarantor.
                </p>
                <p className="mt-2 text-sm text-muted">
                  Ardhi Verified provides land verification information, data aggregation,
                  and technology-assisted due diligence tools. We do not guarantee, warrant,
                  or insure the validity of any land title, nor do we act as a conveyancer,
                  legal adviser, or title insurance provider. Our verification reports,
                  Trust Scores, and monitoring alerts are informational tools designed to
                  assist your decision-making — they are not substitutes for independent
                  legal advice. You should always engage a qualified, independently
                  appointed advocate before completing any land transaction.
                </p>
              </div>
              <p className="mt-3 text-muted">
                By creating an account or using any part of our Services, you
                acknowledge that you have read, understood, and agree to be
                bound by these Terms. If you do not agree, you must not access
                or use the Services.
              </p>
            </div>

            {/* 2 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                2. Definitions
              </h2>
              <ul className="ml-4 list-disc space-y-2 text-muted">
                <li>
                  <strong className="text-navy">&quot;Agent&quot;</strong> means a
                  registered land agent, broker, or conveyancer who lists
                  properties or provides services on the Platform.
                </li>
                <li>
                  <strong className="text-navy">&quot;Buyer&quot;</strong> means
                  any individual or entity that uses the Platform to search for,
                  enquire about, or purchase land.
                </li>
                <li>
                  <strong className="text-navy">&quot;Listing&quot;</strong>{" "}
                  means any land or property advertisement published on the
                  Platform by an Agent or verified landowner.
                </li>
                <li>
                  <strong className="text-navy">&quot;NLIMS&quot;</strong> means
                  the National Land Information Management System maintained by
                  the Ministry of Lands, Public Works, Housing and Urban
                  Development of the Republic of Kenya.
                </li>
                <li>
                  <strong className="text-navy">&quot;Trust Score&quot;</strong>{" "}
                  means the proprietary verification rating assigned to each
                  Listing based on our multi-factor verification methodology.
                </li>
                <li>
                  <strong className="text-navy">&quot;Partner Institution&quot;</strong>{" "}
                  means any SACCO, bank, or verified developer that lists
                  property on the Platform and manages the sale transaction
                  directly with the Buyer.
                </li>
                <li>
                  <strong className="text-navy">
                    &quot;Land Guardian&quot;
                  </strong>{" "}
                  means the subscription-based title monitoring service offered by
                  Ardhi Verified.
                </li>
                <li>
                  <strong className="text-navy">
                    &quot;Concierge Service&quot;
                  </strong>{" "}
                  means the end-to-end guided purchase service offered to
                  diaspora and remote buyers.
                </li>
              </ul>
            </div>

            {/* 3 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                3. User Accounts
              </h2>
              <p className="text-muted">
                To access certain features of the Services, you must register
                for an account. You agree to provide accurate, current, and
                complete information during registration and to keep your
                account information updated. You are responsible for
                safeguarding your account credentials and for all activities
                that occur under your account.
              </p>
              <p className="mt-3 text-muted">
                We reserve the right to suspend or terminate accounts that
                provide false information, engage in fraudulent activity, or
                violate these Terms. Account holders must be at least 18 years
                of age or the age of legal majority in their jurisdiction,
                whichever is greater.
              </p>
              <p className="mt-3 text-muted">
                For Agent accounts, additional verification is required,
                including a valid national identification document, Kenya
                Revenue Authority (KRA) PIN certificate, and, where applicable,
                a practising certificate from the Law Society of Kenya (LSK) or
                registration with the Estate Agents Registration Board (EARB).
              </p>
            </div>

            {/* 4 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                4. Listings &amp; Verification
              </h2>
              <p className="text-muted">
                All Listings on the Platform undergo a multi-stage verification
                process, which may include cross-referencing with the NLIMS
                registry, title deed authentication, encumbrance searches, and
                physical site inspections. Ardhi Verified provides this
                verification as an information service only. We do not guarantee
                the absolute accuracy or completeness of any Listing information,
                and our verification is provided on a best-efforts basis. Our
                reports reflect the information available to us at the time of
                verification and should not be treated as a legal opinion or
                title guarantee.
              </p>
              <p className="mt-3 text-muted">
                Agents and landowners who submit Listings warrant that they have
                the legal authority to sell or advertise the property, that all
                information provided is accurate and not misleading, and that
                the property is free from undisclosed encumbrances, caveats, or
                disputes. Misrepresentation of Listing information constitutes a
                material breach of these Terms and may result in immediate
                account termination, removal of Listings, and referral to
                relevant authorities.
              </p>
            </div>

            {/* 5 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                5. Trust Score
              </h2>
              <p className="text-muted">
                The Trust Score is a proprietary composite rating derived from
                multiple factors, including but not limited to: NLIMS registry
                match status, title deed authenticity, agent verification level,
                historical transaction data, community feedback, and physical
                inspection results.
              </p>
              <p className="mt-3 text-muted">
                Trust Scores are provided for informational purposes only as
                part of our information service. They do not constitute legal
                advice, a guarantee of title validity, a title insurance policy,
                or a recommendation to purchase. A high Trust Score does not mean
                a title is guaranteed to be valid — it means the information
                available to us at the time of assessment met our verification
                criteria. Buyers are strongly advised to engage independent legal
                counsel and conduct their own due diligence before completing any
                transaction. Ardhi Verified shall not be liable for any loss
                arising from reliance on Trust Score information alone.
              </p>
            </div>

            {/* 6 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                6. Payments &amp; Role of the Platform
              </h2>
              <p className="text-muted">
                Ardhi Verified is a technology platform and verified buyer
                acquisition channel. We do not hold buyer funds, process payment
                for land, or participate in title transfer. From the point of
                deposit onwards, your SACCO or institutional Partner manages all
                payments and title transfer directly with you under their own
                regulated processes.
              </p>
              <p className="mt-3 text-muted">
                Payment terms, deposit amounts, instalment schedules, and refund
                policies for any land purchase are agreed directly with your
                Partner Institution and are governed by their own terms of
                business. Ardhi Verified is not a party to the sale agreement
                between a Buyer and a Partner Institution.
              </p>
              <p className="mt-3 text-muted">
                Ardhi Verified earns a technology services fee from Partner
                Institutions for each completed introduction. Where a Buyer
                separately purchases a paid service from the Platform (such as
                the Concierge Service or Land Guardian subscription), those
                service fees are paid directly to Ardhi Verified and are
                governed by the terms of those specific services.
              </p>
            </div>

            {/* 7 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                7. Land Guardian Subscription
              </h2>
              <p className="text-muted">
                Land Guardian is a subscription service that monitors registered
                titles against the NLIMS registry and alerts subscribers to any
                detected changes, including ownership transfers, new
                encumbrances, caveats, or court orders.
              </p>
              <p className="mt-3 text-muted">
                Subscriptions are billed on a monthly or annual basis as
                selected at the time of purchase. You may cancel your
                subscription at any time; cancellation takes effect at the end
                of the current billing period. No refunds are issued for partial
                billing periods.
              </p>
              <p className="mt-3 text-muted">
                While Land Guardian employs commercially reasonable efforts to
                detect registry changes promptly, Ardhi Verified does not
                guarantee detection of all changes in real time. Land Guardian
                is an information and monitoring tool only — it does not
                constitute legal protection, title insurance, or a guarantee
                against fraud. Alerts generated by Land Guardian are
                informational notifications, not legal advice. You should
                consult a qualified advocate before taking any action based on
                a Land Guardian alert.
              </p>
            </div>

            {/* 8 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                8. Concierge Service
              </h2>
              <p className="text-muted">
                The Concierge Service provides guided buyer qualification and
                warm introduction support for Buyers who wish to purchase land
                remotely. This includes property shortlisting, site visit
                coordination via video call or local representative,
                independent advocate review of any sale agreement, warm
                introduction to the Partner Institution, and post-introduction
                support. The Concierge Service does not include payment
                processing or title transfer — those are handled directly by
                your Partner Institution.
              </p>
              <p className="mt-3 text-muted">
                Concierge Service fees are quoted on a per-transaction basis and
                must be agreed upon before the service commences. Ardhi
                Verified acts as a facilitator and does not assume the role of a
                legal adviser. All Concierge Buyers are advised to retain
                independent legal representation.
              </p>
            </div>

            {/* 9 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                9. Agent Responsibilities
              </h2>
              <p className="text-muted">
                Agents registered on the Platform agree to maintain current and
                valid professional credentials, respond to Buyer enquiries
                within 48 hours, provide accurate and truthful Listing
                information, comply with all applicable Kenyan laws and
                regulations, and act in good faith in all dealings facilitated
                through the Platform.
              </p>
              <p className="mt-3 text-muted">
                Agents are independent professionals and are not employees,
                partners, or representatives of Ardhi Verified. Ardhi Verified
                shall not be liable for the acts, omissions, or representations
                of any Agent.
              </p>
              <p className="mt-3 text-muted">
                Agents found to be engaged in fraudulent activity, material
                misrepresentation, or conduct that undermines Platform integrity
                will be permanently suspended and reported to the relevant
                regulatory authorities, including the EARB and the Directorate
                of Criminal Investigations (DCI).
              </p>
            </div>

            {/* 10 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                10. Limitation of Liability
              </h2>
              <p className="text-muted">
                Ardhi Verified is an information service provider. We do not
                guarantee the validity, accuracy, or completeness of any land
                title, ownership record, or registry data. To the fullest extent
                permitted by the laws of the Republic of Kenya, Ardhi Verified,
                its directors, officers, employees, agents, and affiliates shall
                not be liable for any indirect, incidental, special,
                consequential, or punitive damages, including but not limited to
                loss of profits, data, business opportunities, or goodwill,
                arising from your use of or inability to use the Services, or
                from any reliance on verification information, Trust Scores, or
                Land Guardian alerts provided through the Services.
              </p>
              <p className="mt-3 text-muted">
                In no event shall Ardhi Verified&apos;s total aggregate liability
                exceed the greater of (a) the fees paid by you to Ardhi
                Verified in the twelve (12) months preceding the claim, or (b)
                KES 100,000. This limitation applies regardless of the legal
                theory on which the claim is based.
              </p>
              <p className="mt-3 text-muted">
                Nothing in these Terms shall exclude or limit liability for
                death or personal injury caused by negligence, fraud, or any
                other liability that cannot be excluded under applicable law.
              </p>
            </div>

            {/* 11 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                11. Data Protection
              </h2>
              <p className="text-muted">
                Ardhi Verified processes personal data in accordance with the
                Kenya Data Protection Act, 2019 (Act No. 24 of 2019) and the
                regulations made thereunder. We are registered as a data
                controller and data processor with the Office of the Data
                Protection Commissioner (ODPC).
              </p>
              <p className="mt-3 text-muted">
                Your personal data is collected, processed, and stored for the
                purposes of providing and improving our Services, verifying
                identities, facilitating transactions, and complying with legal
                obligations. For full details on our data processing practices,
                please refer to our{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-ardhi underline underline-offset-2 hover:text-ardhi-dark"
                >
                  Privacy Policy
                </Link>
                .
              </p>
              <p className="mt-3 text-muted">
                You have the right to access, rectify, and request deletion of
                your personal data, as well as the right to data portability and
                the right to object to certain processing activities, in
                accordance with the Act.
              </p>
            </div>

            {/* 12 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                12. Dispute Resolution
              </h2>
              <p className="text-muted">
                In the event of any dispute arising out of or in connection with
                these Terms or the Services, the parties shall first attempt to
                resolve the matter through good-faith negotiation within thirty
                (30) days of written notice of the dispute.
              </p>
              <p className="mt-3 text-muted">
                If the dispute cannot be resolved through negotiation, it shall
                be referred to mediation administered by the Nairobi Centre for
                International Arbitration (NCIA) in accordance with its
                mediation rules. If mediation fails, the dispute shall be
                referred to and finally resolved by arbitration under the NCIA
                Arbitration Rules. The seat of arbitration shall be Nairobi,
                Kenya, and the language of arbitration shall be English.
              </p>
              <p className="mt-3 text-muted">
                Notwithstanding the foregoing, either party may seek urgent
                injunctive or interim relief from the courts of Kenya where
                necessary to prevent irreparable harm.
              </p>
            </div>

            {/* 13 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                13. Governing Law
              </h2>
              <p className="text-muted">
                These Terms shall be governed by and construed in accordance
                with the laws of the Republic of Kenya, without regard to
                conflict of law principles. The courts of the Republic of Kenya
                shall have exclusive jurisdiction over any proceedings arising
                out of or in connection with these Terms, subject to the dispute
                resolution mechanism set out in Section 12 above.
              </p>
            </div>

            {/* 14 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                14. Contact
              </h2>
              <p className="text-muted">
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="mt-4 rounded-xl border border-border bg-card p-6">
                <p className="font-semibold text-navy">
                  Ardhi Verified Limited
                </p>
                <p className="mt-2 text-sm text-muted">
                  Email:{" "}
                  <a
                    href="mailto:legal@ardhiverified.com"
                    className="text-ardhi hover:text-ardhi-dark"
                  >
                    legal@ardhiverified.com
                  </a>
                </p>
                <p className="text-sm text-muted">
                  Phone:{" "}
                  <a
                    href="tel:+254700000000"
                    className="text-ardhi hover:text-ardhi-dark"
                  >
                    +254 700 000 000
                  </a>
                </p>
                <p className="text-sm text-muted">
                  Postal Address: P.O. Box 00000-00100, Nairobi, Kenya
                </p>
                <p className="text-sm text-muted">
                  Physical Address: Westlands, Nairobi, Kenya
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
