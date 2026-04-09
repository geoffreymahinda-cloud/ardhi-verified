import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Danstan Omari Listed Every Check You Need Before Buying Land in Kenya. We Built the System That Does It. \u2014 Ardhi Verified",
  description:
    "Kenya\u2019s top litigation lawyers say a standard title search is not enough. Here is an honest mapping of every check now required \u2014 and where Ardhi Verified stands on each one.",
  openGraph: {
    title:
      "Danstan Omari Listed Every Check You Need Before Buying Land in Kenya. We Built the System That Does It.",
    description:
      "An honest mapping of every due diligence check Kenya\u2019s leading advocates now say is required \u2014 and where Ardhi Verified stands on each one.",
    type: "article",
    publishedTime: "2026-04-08T00:00:00Z",
    authors: ["Ardhi Verified Team"],
    siteName: "Ardhi Verified",
  },
};

export default function BlogPost() {
  return (
    <article className="min-h-screen bg-white">
      {/* Hero */}
      <header className="bg-navy px-4 pb-12 pt-20 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Blog
          </Link>
          <h1 className="font-serif text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-[2.5rem] lg:leading-tight">
            Danstan Omari Listed Every Check You Need Before Buying Land in Kenya. We Built the System That Does It.
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/50">
            <span className="font-medium text-[#C4A44A]">The Ardhi Verified Team</span>
            <span className="hidden sm:inline">&middot;</span>
            <span>April 2026</span>
            <span className="hidden sm:inline">&middot;</span>
            <span>8 min read</span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="prose prose-lg prose-slate max-w-none prose-headings:font-serif prose-headings:text-navy prose-a:text-ardhi prose-a:no-underline hover:prose-a:underline prose-strong:text-navy prose-blockquote:border-ardhi prose-blockquote:text-muted">
          <p className="text-xl leading-relaxed text-muted">
            Kenya&rsquo;s top litigation lawyers are now publicly telling buyers the
            same thing: a standard title search is not enough. The Supreme Court has
            confirmed it. The courts have enforced it. And experienced advocates
            &mdash; the ones who spend their professional lives untangling land
            disputes that began with an innocent purchase &mdash; are spelling out,
            step by step, what adequate due diligence actually looks like.
          </p>
          <p>We listened carefully to that checklist.</p>
          <p>Then we cross-referenced it against what Ardhi Verified has built.</p>
          <p>
            What follows is an honest mapping of every check that Kenya&rsquo;s
            leading legal commentators now say is required &mdash; and where our
            system stands on each one today.
          </p>

          <hr />

          <h2>The Checklist &mdash; What Is Now Required</h2>

          {/* ── Check 1 ── */}
          <h3>
            <span className="not-prose inline-flex items-center justify-center rounded-full bg-trust-green/10 text-trust-green w-7 h-7 text-sm font-bold mr-2">&#10003;</span>
            1. Check the Court Records
          </h3>
          <blockquote>
            &ldquo;Check if there is any court case going on in that matter.&rdquo;
          </blockquote>
          <p>
            This is the check most diaspora buyers never make &mdash; not because
            they don&rsquo;t want to, but because accessing Kenya&rsquo;s court
            records has historically required physical presence in Nairobi or
            expensive legal fees.
          </p>
          <p>
            <strong>Ardhi Verified status: Live.</strong>
          </p>
          <p>
            Our database now holds <strong>44,084 Environment and Land Court
            records</strong> &mdash; every publicly available ELC judgment we could
            extract, structured by parcel reference, court station, outcome, and
            date. When you run a HatiScan&trade; check, this database is queried in
            real time. If your parcel has ever appeared in an ELC case, you will
            know.
          </p>
          <p>And the database grows every week automatically.</p>

          <hr />

          {/* ── Check 2 ── */}
          <h3>
            <span className="not-prose inline-flex items-center justify-center rounded-full bg-trust-green/10 text-trust-green w-7 h-7 text-sm font-bold mr-2">&#10003;</span>
            2. Check the Gazette
          </h3>
          <blockquote>
            &ldquo;Check if there are any encumbrances or caveats put
            there.&rdquo;
          </blockquote>
          <p>
            The Kenya Gazette is published every Friday. It contains, among other
            things, compulsory acquisition orders from the National Land Commission,
            caution notices, caveat registrations, and &mdash; critically &mdash;
            land title conversion lists that change the parcel numbers under which
            records are filed.
          </p>
          <p>Most Kenyans have never read the Gazette. Land fraudsters rely on this.</p>
          <p>
            <strong>Ardhi Verified status: Live.</strong>
          </p>
          <p>
            Our gazette intelligence database holds <strong>45,073 structured
            notices</strong>, extracted from gazette editions going back years and
            classified by type &mdash; acquisitions, cautions, caveats, revocations,
            and register reconstruction notices. The scraper runs automatically
            every week.
          </p>
          <p>
            Crucially, we also capture <strong>title conversion notices</strong>
            &mdash; the lists that show which old LR numbers have been reassigned to
            new parcel numbers under the Land Registration Act 2012. If you search
            for a plot by its old title number and the parcel has been converted, we
            catch the mismatch before you commit your savings.
          </p>
          <div className="not-prose my-6 rounded-xl border border-ardhi/20 bg-ardhi/5 px-6 py-4">
            <p className="text-lg font-bold text-navy">89,157 total intelligence records. Both databases self-updating.</p>
          </div>

          <hr />

          {/* ── Check 3 ── */}
          <h3>
            <span className="not-prose inline-flex items-center justify-center rounded-full bg-trust-green/10 text-trust-green w-7 h-7 text-sm font-bold mr-2">&#10003;</span>
            3. Community Intelligence &mdash; Ask the Neighbours
          </h3>
          <blockquote>
            &ldquo;Those who are levies, the neighbours, the surrounding people
            know the history of the land better than that person you are relying on
            called the land register.&rdquo;
          </blockquote>
          <p>
            This is not a casual observation. A Malindi court judgment specifically
            noted that physical neighbours hold land history that the registry does
            not. Ardhi Verified&rsquo;s community intelligence portal exists
            precisely because of this insight.
          </p>
          <p>
            <strong>Ardhi Verified status: Live.</strong>
          </p>
          <p>
            Our community intelligence layer allows verified local contributors
            &mdash; neighbours, community members, local agents &mdash; to submit
            flags against specific parcel references. These flags are moderated,
            severity-scored, and fed directly into the Trust Score calculation. A
            community flag carries real weight: a high-severity flag deducts 20
            points from the Trust Score.
          </p>
          <p>No other platform has this layer.</p>

          <hr />

          {/* ── Check 4 ── */}
          <h3>
            <span className="not-prose inline-flex items-center justify-center rounded-full bg-trust-green/10 text-trust-green w-7 h-7 text-sm font-bold mr-2">&#10003;</span>
            4. HatiScan&trade; &mdash; Document Analysis and Forgery Detection
          </h3>
          <blockquote>
            &ldquo;Is the title fake? Check there.&rdquo;
          </blockquote>
          <p>
            In March 2025, a multi-agency operation at Ardhi House recovered 287
            forged stamps, blank title deed papers, and materials for creating
            convincing fraudulent documents &mdash; including a printer from the
            Government Press among the suspects. Fake titles look genuine. That is
            the point.
          </p>
          <p>
            <strong>Ardhi Verified status: Live.</strong>
          </p>
          <p>
            HatiScan&trade; uses Claude Vision AI to read an uploaded title deed
            document and check it against our databases. It extracts the title
            number, registered owner, county, plot area, and registration date
            &mdash; then cross-references them. It checks for font anomalies,
            metadata inconsistencies, document editing software traces, and title
            number mismatches.
          </p>
          <p>
            A full HatiScan&trade; Standard scan costs &pound;9.99. It returns a
            numbered, time-stamped PDF report.
          </p>

          <hr />

          {/* ── Check 5 ── */}
          <h3>
            <span className="not-prose inline-flex items-center justify-center rounded-full bg-[#C8902A]/10 text-[#C8902A] w-7 h-7 text-sm font-bold mr-2">&#8987;</span>
            5. Registry Index Map Verification
          </h3>
          <blockquote>
            &ldquo;Check whether there exists a registry index map, what is called
            RIM. Ensure that the physical ground matches with what is at the
            registry.&rdquo;
          </blockquote>
          <p>
            The Registry Index Map is the master boundary record held by the
            government. Unlike a title deed, it cannot be forged. It shows every
            parcel in an area, not just one. If a mutation form has been filed
            &mdash; changing the boundary of your plot &mdash; the RIM will show it
            even if the title deed does not.
          </p>
          <p>
            <strong>Ardhi Verified status: Architecture built. Field network in build.</strong>
          </p>
          <p>
            We have designed the full Supabase schema for RIM data collection, built
            the verification_stages tracking system, and designed the five-checkpoint
            badge that appears on every listing. Our 47-county field collector
            network &mdash; one trained person per county visiting land registries to
            photograph RIM sheets and record mutation history &mdash; is currently in
            the pilot design phase.
          </p>
          <p>
            This is Layer 4 of our five-layer system. It is the layer that makes the
            Ardhi Verified Complete&trade; badge the most rigorous land verification
            standard available to diaspora buyers anywhere.
          </p>
          <p>
            When complete, every listing on Ardhi Verified with the Complete&trade;
            seal will have a photograph of its RIM sheet, a confirmed mutation
            history, and a field-verified boundary match.
          </p>

          <hr />

          {/* ── Check 6 ── */}
          <h3>
            <span className="not-prose inline-flex items-center justify-center rounded-full bg-[#C8902A]/10 text-[#C8902A] w-7 h-7 text-sm font-bold mr-2">&#8987;</span>
            6. Historical / Root Search
          </h3>
          <blockquote>
            &ldquo;Check the legal ownership and the history of the title. Trace the
            ownership lineage &mdash; how has the land moved from one person to
            another? Check if there is any fraudulent or any irregular
            transfer.&rdquo;
          </blockquote>
          <p>
            This is the check the Supreme Court specifically mandated in{" "}
            <em>Dina Management v County Government of Mombasa 2023</em>. A
            standard search shows you today&rsquo;s registered owner. A root search
            traces every transaction from the first registry entry &mdash; in some
            cases back to 1901.
          </p>
          <p>
            <strong>Ardhi Verified status: Planned &mdash; preseed funded.</strong>
          </p>
          <p>
            The <code>title_ownership_chain</code> table that captures historical
            transfer records is our next major database build. Our county field
            collectors extract green card records &mdash; the master ownership
            history document at each registry &mdash; as part of their regular
            visits. This check, once live, directly satisfies the Supreme
            Court&rsquo;s standard.
          </p>

          <hr />

          {/* ── Check 7 ── */}
          <h3>
            <span className="not-prose inline-flex items-center justify-center rounded-full bg-[#C8902A]/10 text-[#C8902A] w-7 h-7 text-sm font-bold mr-2">&#8987;</span>
            7. Physical Planning Zoning
          </h3>
          <blockquote>
            &ldquo;Check under the Physical Planning Act of 2019 whether that land
            is allocated for high density, low density, is it allocated for a
            cemetery, is it allocated for a dam, is it allocated for SGR.&rdquo;
          </blockquote>
          <p>
            A plot with a clean title that is zoned for an SGR corridor or a public
            cemetery has no investable value. County governments publish Integrated
            Development Plans and zoning maps. Some are available digitally. Some
            require on-ground extraction.
          </p>
          <p>
            <strong>Ardhi Verified status: Planned &mdash; preseed funded.</strong>
          </p>
          <p>
            GIS overlay of physical planning zones against parcel references is a
            natural extension of the geodata layer we have already built for all 47
            counties. This becomes an automatic flag:{" "}
            <em>
              &ldquo;This parcel falls within a zone designated for [use] under the
              Physical Planning Act 2019.&rdquo;
            </em>
          </p>

          <hr />

          {/* ── Check 8 ── */}
          <h3>
            <span className="not-prose inline-flex items-center justify-center rounded-full bg-[#C8902A]/10 text-[#C8902A] w-7 h-7 text-sm font-bold mr-2">&#8987;</span>
            8. Riparian Zone Check
          </h3>
          <blockquote>
            &ldquo;Confirm if the land falls under the riparian act. Is the land 50
            metres away from the river? If you are buying that land, that land
            belongs to the government.&rdquo;
          </blockquote>
          <p>
            OpenStreetMap holds river boundary data for Kenya. Combining it with
            parcel coordinates creates an automatic riparian flag &mdash; a check
            that currently requires either a licensed surveyor visit or specialised
            legal knowledge most diaspora buyers don&rsquo;t have.
          </p>
          <p>
            <strong>Ardhi Verified status: Planned &mdash; preseed funded.</strong>
          </p>
          <p>
            A single GIS query against river boundary data produces this flag
            automatically. It is one of the highest-value additions we can make to
            the Trust Score with minimal complexity.
          </p>

          <hr />

          {/* ── Check 9 ── */}
          <h3>
            <span className="not-prose inline-flex items-center justify-center rounded-full bg-[#C8902A]/10 text-[#C8902A] w-7 h-7 text-sm font-bold mr-2">&#8987;</span>
            9. Land Control Board Consent
          </h3>
          <blockquote>
            &ldquo;Any agricultural land &mdash; confirm that there was Land Control
            Board consent. You cannot divide your land in this country before the
            land control board agrees. You cannot sell before the land control board
            agrees.&rdquo;
          </blockquote>
          <p>
            LCB consent is mandatory for agricultural land transactions. Its absence
            voids the transaction. County field collectors attending monthly LCB
            sittings captures this data going forward.
          </p>
          <p>
            <strong>Ardhi Verified status: Planned &mdash; preseed funded.</strong>
          </p>

          <hr />

          <h2>What This Means in Practice</h2>
          <p>
            Of the nine checks now considered necessary by Kenya&rsquo;s leading
            advocates and confirmed by Supreme Court precedent, Ardhi Verified has
            four fully operational today and five in active build funded by the
            preseed round.
          </p>
          <p>No other platform serving diaspora buyers has any of them systematically.</p>
          <p>A diaspora buyer who uses Ardhi Verified today gets:</p>
          <ul>
            <li>44,084 ELC court records searched automatically</li>
            <li>45,073 gazette notices cross-referenced</li>
            <li>AI document analysis of their title deed</li>
            <li>Community intelligence from people on the ground</li>
            <li>A Trust Score that reflects all of the above</li>
          </ul>
          <p>
            A diaspora buyer who does not use Ardhi Verified gets a search result
            and a prayer.
          </p>
          <p>
            The Supreme Court has told Kenya&rsquo;s land buyers that the search
            result is not enough.
          </p>
          <p>
            <strong>We built the alternative.</strong>
          </p>

          <hr />

          <div className="not-prose rounded-2xl border border-ardhi/20 bg-ardhi/5 p-8 space-y-4">
            <p className="text-lg font-semibold text-navy">
              Free basic check:{" "}
              <Link href="/hatiscan" className="text-ardhi hover:underline">
                ardhiverified.com/hatiscan
              </Link>
            </p>
            <p className="text-sm text-muted">
              Full document intelligence scan: <strong className="text-navy">&pound;9.99</strong>
            </p>
            <p className="text-sm text-muted">
              For institutional API access and SACCO partnerships:{" "}
              <a href="mailto:hello@ardhiverified.com" className="text-ardhi hover:underline">
                hello@ardhiverified.com
              </a>
            </p>
          </div>

          <p className="text-xs text-muted/60 italic mt-8">
            Ardhi Verified UK Limited is a technology and data intelligence
            company. We do not sell land. We verify it.
          </p>
        </div>
      </div>
    </article>
  );
}
