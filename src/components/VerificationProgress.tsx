"use client";

import { useState } from "react";

interface VerificationProgressProps {
  stages: {
    elc: "pending" | "clear" | "flagged";
    gazette: "pending" | "clear" | "flagged";
    community: "pending" | "clear" | "flagged";
    hatiscan: "pending" | "clear" | "flagged";
    rim:
      | "pending"
      | "in_progress"
      | "confirmed"
      | "mutation_flagged"
      | "discrepancy_found";
    advocate:
      | "pending"
      | "awaiting_rim"
      | "in_review"
      | "signed_off"
      | "rejected";
  };
  rimTargetDate?: string;
  verificationTier: "unverified" | "digital_verified" | "complete_verified";
}

// ── Icons ─────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg className="h-4 w-4 text-[#C8902A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ShieldIcon({ full }: { full: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L3.5 6.5V11.5C3.5 16.74 7.16 21.64 12 23C16.84 21.64 20.5 16.74 20.5 11.5V6.5L12 2Z"
        fill={full ? "#1A3A2A" : "#C8902A"}
        fillOpacity={full ? 1 : 0.9}
      />
      {full ? (
        <path d="M10 15.5L7.5 13L8.91 11.59L10 12.67L15.09 7.59L16.5 9L10 15.5Z" fill="#C8902A" />
      ) : (
        <path d="M12 7V13M12 15.5V16" stroke="white" strokeWidth={2} strokeLinecap="round" />
      )}
    </svg>
  );
}

// ── Status row helpers ────────────────────────────────────────────────────

type RowStatus = "clear" | "pending" | "flagged";

function getRowStatus(status: string): RowStatus {
  if (["clear", "confirmed", "signed_off"].includes(status)) return "clear";
  if (["flagged", "mutation_flagged", "discrepancy_found", "rejected"].includes(status)) return "flagged";
  return "pending";
}

function StatusRow({
  label,
  status,
  description,
  tooltip,
}: {
  label: string;
  status: RowStatus;
  description: string;
  tooltip?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex items-start gap-3 py-2.5 relative">
      <div className="flex-shrink-0 mt-0.5">
        {status === "clear" && <CheckIcon />}
        {status === "pending" && <PendingIcon />}
        {status === "flagged" && <FlagIcon />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-[#1A3A2A]">{label}</span>
          {tooltip && (
            <button
              type="button"
              className="text-[#C8902A]/60 hover:text-[#C8902A] transition-colors"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              aria-label={`Learn about ${label}`}
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
        {tooltip && showTooltip && (
          <div className="absolute z-10 left-7 top-full mt-1 w-72 rounded-lg bg-[#1A3A2A] px-4 py-3 text-xs text-white/90 leading-relaxed shadow-lg">
            {tooltip}
            <div className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 bg-[#1A3A2A]" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function VerificationProgress({
  stages,
  rimTargetDate,
  verificationTier,
}: VerificationProgressProps) {
  // ── Top badge ─────────────────────────────────────────────────────────
  const badgeMap = {
    unverified: {
      bg: "bg-gray-100",
      border: "border-gray-200",
      text: "text-gray-600",
      label: "Verification In Progress",
      icon: null as React.ReactNode,
    },
    digital_verified: {
      bg: "bg-[#C8902A]/10",
      border: "border-[#C8902A]/30",
      text: "text-[#C8902A]",
      label: "Ardhi Verified Digital\u2122",
      icon: <ShieldIcon full={false} />,
    },
    complete_verified: {
      bg: "bg-[#1A3A2A]/10",
      border: "border-[#1A3A2A]/30",
      text: "text-[#1A3A2A]",
      label: "Ardhi Verified Complete\u2122",
      icon: <ShieldIcon full={true} />,
    },
  };
  // Defensive fallback: if the DB returns an unexpected verification_tier
  // value (e.g. NULL or a new state we don't know about), default to
  // the "unverified" badge rather than crashing the page.
  const badge = badgeMap[verificationTier] ?? badgeMap.unverified;

  // ── Row descriptions ──────────────────────────────────────────────────
  const elcDesc = {
    clear: "No litigation found",
    flagged: "Court cases detected \u2014 review report",
    pending: "Screening in progress",
  }[stages.elc];

  const gazetteDesc = {
    clear: "No acquisition orders or caveats",
    flagged: "Gazette notice found \u2014 review report",
    pending: "Checking gazette records",
  }[stages.gazette];

  const communityDesc = {
    clear: "No community flags reported",
    flagged: "Community flags present \u2014 review report",
    pending: "Collecting community data",
  }[stages.community];

  const hatiscanDesc = {
    clear: "Document verified \u2014 no anomalies",
    flagged: "Document anomaly detected",
    pending: "Awaiting document submission",
  }[stages.hatiscan];

  const rimDescMap: Record<typeof stages.rim, string> = {
    pending: "Physical check not yet started",
    in_progress: `Field verification in progress${rimTargetDate ? ` \u2014 est. ${rimTargetDate}` : ""}`,
    confirmed: "Boundary confirmed on Registry Index Map",
    mutation_flagged: "Mutation detected \u2014 title being reviewed",
    discrepancy_found: "Boundary discrepancy \u2014 listing under review",
  };
  const rimDesc = rimDescMap[stages.rim];

  const advocateDescMap: Record<typeof stages.advocate, string> = {
    pending: "Awaiting RIM confirmation",
    awaiting_rim: "Awaiting RIM confirmation",
    in_review: "Advocate review in progress",
    signed_off: "Signed off by licensed LSK advocate",
    rejected: "Advocate review failed \u2014 listing suspended",
  };
  const advocateDesc = advocateDescMap[stages.advocate];

  const showAdvocate =
    stages.rim === "confirmed" ||
    stages.advocate === "in_review" ||
    stages.advocate === "signed_off" ||
    stages.advocate === "rejected";

  return (
    <div className="rounded-xl border border-[#C8902A]/20 bg-white overflow-hidden shadow-sm">
      {/* Gold left accent */}
      <div className="flex">
        <div className="w-1 bg-[#C8902A]/40 flex-shrink-0" />
        <div className="flex-1 p-5">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2 rounded-full ${badge.bg} border ${badge.border} px-4 py-2 mb-5 ${
              verificationTier === "complete_verified" ? "shadow-[0_0_12px_rgba(26,58,42,0.15)]" : ""
            }`}
          >
            {badge.icon}
            <span className={`text-sm font-bold tracking-wide ${badge.text}`}>
              {badge.label}
            </span>
          </div>

          {/* Checkpoints */}
          <div className="divide-y divide-gray-100">
            <StatusRow
              label="ELC Court Screening"
              status={getRowStatus(stages.elc)}
              description={elcDesc}
            />
            <StatusRow
              label="Gazette Notice Check"
              status={getRowStatus(stages.gazette)}
              description={gazetteDesc}
            />
            <StatusRow
              label="Community Intelligence"
              status={getRowStatus(stages.community)}
              description={communityDesc}
            />
            <StatusRow
              label="HatiScan\u2122 Document Analysis"
              status={getRowStatus(stages.hatiscan)}
              description={hatiscanDesc}
            />
            <StatusRow
              label="Registry Index Map (RIM)"
              status={getRowStatus(stages.rim)}
              description={rimDesc}
              tooltip="The Registry Index Map is Kenya's master land boundary record held at Survey of Kenya. Physical confirmation that the title deed boundary matches the RIM is the highest standard of land verification available."
            />
            {showAdvocate && (
              <StatusRow
                label="LSK Advocate Sign-Off"
                status={getRowStatus(stages.advocate)}
                description={advocateDesc}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
