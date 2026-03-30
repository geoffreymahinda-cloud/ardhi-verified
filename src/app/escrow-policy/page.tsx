import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Escrow Policy — Ardhi Verified",
  description:
    "How Ardhi Verified Escrow protects your land purchase. Funds held in CBK-licensed accounts, released only after title transfer is confirmed.",
};

export default function EscrowPolicyPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-4 pb-12 pt-20 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Escrow Policy
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Your money is protected at every step. We never release funds until
            the title is in your name.
          </p>
        </div>
      </section>

      {/* Trust banner */}
      <section className="bg-ardhi px-4 py-5">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-8">
          <div className="flex items-center gap-2 text-white">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            <span className="text-sm font-semibold">CBK-Licensed Partner</span>
          </div>
          <div className="hidden h-4 w-px bg-white/30 sm:block" />
          <div className="flex items-center gap-2 text-white">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <span className="text-sm font-semibold">Segregated Accounts</span>
          </div>
          <div className="hidden h-4 w-px bg-white/30 sm:block" />
          <div className="flex items-center gap-2 text-white">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-semibold">Assurance Fund</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-bg px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-10 text-text leading-relaxed">
            {/* 1 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                1. What is Ardhi Escrow?
              </h2>
              <p className="text-muted">
                Ardhi Escrow is a secure, independent payment holding service
                designed to protect both buyers and sellers in land transactions
                facilitated through the Ardhi Verified platform. When you use
                Ardhi Escrow, your funds are held in a segregated client account
                managed by a Central Bank of Kenya (CBK)-licensed financial
                institution. The money is never mixed with Ardhi
                Verified&apos;s operating funds and is never released to the
                seller until the agreed conditions — including confirmation of
                title transfer — have been met.
              </p>
              <p className="mt-3 text-muted">
                For diaspora buyers purchasing land remotely, Ardhi Escrow
                eliminates the single biggest risk in Kenyan land transactions:
                paying for land and never receiving the title. With escrow, your
                money only moves when you are legally the owner.
              </p>
            </div>

            {/* 2 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                2. How It Works
              </h2>
              <p className="mb-4 text-muted">
                Every escrow transaction follows a clear, transparent process:
              </p>
              <div className="space-y-4">
                {[
                  {
                    step: "1",
                    title: "Agreement",
                    desc: "Buyer and seller agree on the purchase terms, including price, timeline, and conditions. Both parties sign a digital Sale Agreement through the Ardhi Verified platform.",
                  },
                  {
                    step: "2",
                    title: "Deposit",
                    desc: "The buyer deposits the agreed purchase amount (or an initial deposit as specified in the Sale Agreement) into the Ardhi Escrow account via M-Pesa, bank transfer, or international wire.",
                  },
                  {
                    step: "3",
                    title: "Verification",
                    desc: "Ardhi Verified conducts a final verification of the title, confirming it is free from encumbrances, caveats, or disputes. The buyer is provided a comprehensive verification report.",
                  },
                  {
                    step: "4",
                    title: "Legal Transfer",
                    desc: "An LSK-registered conveyancer prepares and executes the transfer documents. Both parties sign (the buyer may sign via power of attorney for remote transactions).",
                  },
                  {
                    step: "5",
                    title: "Registration",
                    desc: "Transfer documents are lodged at the relevant Land Registry. Ardhi Verified monitors the registration process and provides status updates.",
                  },
                  {
                    step: "6",
                    title: "Confirmation & Release",
                    desc: "Once the title is registered in the buyer's name (confirmed via NLIMS), the buyer approves release. Funds are then disbursed to the seller within 3 business days.",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex gap-4 rounded-xl border border-border bg-card p-5"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ardhi text-sm font-bold text-white">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                3. Escrow Account Details
              </h2>
              <p className="text-muted">
                All escrow funds are held in a segregated client trust account
                at a Tier 1 commercial bank licensed and regulated by the
                Central Bank of Kenya (CBK). Key safeguards include:
              </p>
              <ul className="ml-4 mt-3 list-disc space-y-2 text-muted">
                <li>
                  <strong className="text-navy">Full segregation</strong> —
                  Client funds are held in a separate trust account, distinct
                  from Ardhi Verified&apos;s operational accounts. Your money is
                  never used for our business operations.
                </li>
                <li>
                  <strong className="text-navy">CBK oversight</strong> — The
                  escrow banking partner is subject to full CBK prudential
                  supervision and reporting requirements.
                </li>
                <li>
                  <strong className="text-navy">Dual authorisation</strong> —
                  Disbursements from the escrow account require dual
                  authorisation by designated signatories, ensuring no single
                  individual can release funds unilaterally.
                </li>
                <li>
                  <strong className="text-navy">Regular audits</strong> — Escrow
                  accounts are independently audited quarterly by a Big Four
                  audit firm, with results available to regulators upon request.
                </li>
              </ul>
            </div>

            {/* 4 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                4. Deposit &amp; Payment Process
              </h2>
              <p className="text-muted">
                Buyers can deposit funds into escrow through the following
                channels:
              </p>
              <ul className="ml-4 mt-3 list-disc space-y-2 text-muted">
                <li>
                  <strong className="text-navy">M-Pesa</strong> — Instant
                  deposit confirmation via Safaricom M-Pesa. Available for
                  transactions up to KES 150,000 per transfer (multiple
                  transfers permitted).
                </li>
                <li>
                  <strong className="text-navy">Bank transfer (Kenya)</strong> —
                  EFT or RTGS transfer to the designated escrow account.
                  Confirmation within 1 business day.
                </li>
                <li>
                  <strong className="text-navy">
                    International wire transfer
                  </strong>{" "}
                  — SWIFT transfer in KES, GBP, USD, or EUR. Funds are converted
                  at the prevailing market rate on the day of receipt.
                  Confirmation within 2-5 business days depending on the
                  originating bank.
                </li>
              </ul>
              <p className="mt-3 text-muted">
                You will receive real-time confirmation of your deposit via
                email and SMS. Your transaction dashboard on the Platform will
                reflect the current escrow balance and status at all times.
              </p>
            </div>

            {/* 5 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                5. Release Conditions
              </h2>
              <p className="text-muted">
                Escrow funds are released to the seller only when ALL of the
                following conditions have been satisfied:
              </p>
              <ul className="ml-4 mt-3 list-disc space-y-2 text-muted">
                <li>
                  The title has been successfully transferred and registered in
                  the buyer&apos;s name at the relevant Land Registry
                </li>
                <li>
                  The transfer has been independently confirmed via the NLIMS
                  registry by Ardhi Verified
                </li>
                <li>
                  The buyer has reviewed the verification report and confirmed
                  satisfaction (or the 7-day automatic confirmation period has
                  elapsed without objection)
                </li>
                <li>
                  All conditions specified in the Sale Agreement have been
                  fulfilled
                </li>
                <li>
                  There are no pending disputes, caveats, or court orders
                  relating to the property
                </li>
              </ul>
              <div className="mt-4 rounded-xl border border-ardhi/20 bg-ardhi-light p-4">
                <p className="text-sm font-semibold text-navy">
                  Your protection guarantee
                </p>
                <p className="mt-1 text-sm text-muted">
                  If the title transfer cannot be completed for any reason
                  attributable to the seller, your funds will be returned in
                  full. No exceptions.
                </p>
              </div>
            </div>

            {/* 6 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                6. Refund Policy
              </h2>
              <p className="text-muted">
                Ardhi Verified is committed to fair and transparent refund
                practices:
              </p>
              <ul className="ml-4 mt-3 list-disc space-y-2 text-muted">
                <li>
                  <strong className="text-navy">Full refund</strong> — If the
                  transaction fails due to the seller&apos;s inability to
                  transfer a valid title, the buyer receives a full refund of
                  all deposited funds, including any escrow fees paid.
                </li>
                <li>
                  <strong className="text-navy">
                    Refund on mutual cancellation
                  </strong>{" "}
                  — If both parties agree to cancel the transaction, funds are
                  returned to the buyer less any applicable processing fees (see
                  Section 8).
                </li>
                <li>
                  <strong className="text-navy">
                    Refund on buyer withdrawal
                  </strong>{" "}
                  — If the buyer withdraws unilaterally before the transfer
                  process has commenced, the deposit is returned less the escrow
                  service fee and any costs already incurred (e.g., search fees).
                </li>
                <li>
                  <strong className="text-navy">Refund timeline</strong> —
                  Refunds are processed within 14 business days of the refund
                  decision. Funds are returned to the original payment method.
                  International wire refunds may take up to 21 business days.
                </li>
              </ul>
            </div>

            {/* 7 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                7. Dispute Resolution
              </h2>
              <p className="text-muted">
                In the event of a dispute between the buyer and seller during an
                escrow transaction, funds will be frozen in the escrow account
                until the dispute is resolved. Our dispute resolution process
                operates as follows:
              </p>
              <ol className="ml-4 mt-3 list-decimal space-y-2 text-muted">
                <li>
                  <strong className="text-navy">Internal mediation</strong> —
                  Both parties present their case to Ardhi Verified&apos;s
                  Transaction Disputes team. We will attempt to mediate a
                  resolution within 14 days.
                </li>
                <li>
                  <strong className="text-navy">Independent mediation</strong> —
                  If internal mediation fails, the dispute is referred to the
                  Nairobi Centre for International Arbitration (NCIA) for
                  mediation.
                </li>
                <li>
                  <strong className="text-navy">Binding arbitration</strong> —
                  If mediation does not produce a resolution, the matter
                  proceeds to binding arbitration under NCIA rules. The
                  arbitrator&apos;s decision regarding fund disbursement is
                  final.
                </li>
              </ol>
              <p className="mt-3 text-muted">
                During any dispute, escrow funds remain securely held and are
                not accessible to either party until a resolution is reached.
                This ensures your money is always protected, regardless of the
                outcome.
              </p>
            </div>

            {/* 8 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                8. Fees
              </h2>
              <p className="mb-3 text-muted">
                Ardhi Escrow fees are transparent and competitive:
              </p>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-navy text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Service</th>
                      <th className="px-4 py-3 font-semibold">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    <tr>
                      <td className="px-4 py-3 text-muted">
                        Escrow service fee
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">
                        1.5% of transaction value
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted">
                        Minimum escrow fee
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">
                        KES 15,000
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted">
                        M-Pesa deposit fee
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">
                        Free
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted">
                        Bank transfer deposit
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">
                        Free
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted">
                        International wire deposit
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">
                        KES 2,500 per transfer
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted">
                        Disbursement to seller
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">
                        Free
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted">
                        Refund processing
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">
                        Free (seller fault) / KES 5,000 (buyer withdrawal)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-muted">
                All fees are inclusive of applicable taxes. Escrow fees are
                typically paid by the buyer unless otherwise agreed in the Sale
                Agreement. Fee schedules are subject to change with 30
                days&apos; notice.
              </p>
            </div>

            {/* 9 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                9. Assurance Fund
              </h2>
              <p className="text-muted">
                To provide an additional layer of protection, Ardhi Verified
                maintains a dedicated Assurance Fund funded by allocating 10% of
                all escrow service fees collected. The Assurance Fund exists to
                compensate buyers in the rare event of a loss that is directly
                attributable to a failure in Ardhi Verified&apos;s verification
                or escrow process.
              </p>
              <p className="mt-3 text-muted">
                The Assurance Fund covers situations including but not limited
                to: a verification error that fails to detect a forged title
                deed, a system failure that results in premature fund release,
                or a breach of escrow procedures by Ardhi Verified personnel.
              </p>
              <p className="mt-3 text-muted">
                The Fund does not cover losses arising from buyer negligence,
                undisclosed side agreements between buyer and seller, or
                circumstances beyond Ardhi Verified&apos;s control (such as
                government-ordered compulsory acquisition). Claims against the
                Assurance Fund are assessed on a case-by-case basis by an
                independent committee.
              </p>
              <div className="mt-4 rounded-xl border border-trust-amber/20 bg-trust-amber/5 p-4">
                <p className="text-sm font-semibold text-navy">
                  As of March 2026
                </p>
                <p className="mt-1 text-sm text-muted">
                  The Assurance Fund balance is independently audited and
                  reported semi-annually. Ardhi Verified is committed to
                  maintaining a minimum fund balance of KES 10,000,000 at all
                  times.
                </p>
              </div>
            </div>

            {/* 10 */}
            <div>
              <h2 className="mb-4 font-serif text-2xl font-bold text-navy">
                10. Contact
              </h2>
              <p className="text-muted">
                For questions about our escrow service or to discuss a specific
                transaction:
              </p>
              <div className="mt-4 rounded-xl border border-border bg-card p-6">
                <p className="font-semibold text-navy">
                  Ardhi Verified Escrow Team
                </p>
                <p className="mt-2 text-sm text-muted">
                  Email:{" "}
                  <a
                    href="mailto:escrow@ardhiverified.com"
                    className="text-ardhi hover:text-ardhi-dark"
                  >
                    escrow@ardhiverified.com
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
                  WhatsApp:{" "}
                  <a
                    href="https://wa.me/254700000000"
                    className="text-ardhi hover:text-ardhi-dark"
                  >
                    +254 700 000 000
                  </a>
                </p>
                <p className="mt-2 text-sm text-muted">
                  Available Monday to Friday, 8:00 AM - 6:00 PM (EAT)
                </p>
              </div>
              <p className="mt-4 text-sm text-muted">
                For general terms and conditions, please refer to our{" "}
                <Link
                  href="/terms"
                  className="text-ardhi underline underline-offset-2 hover:text-ardhi-dark"
                >
                  Terms of Service
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
