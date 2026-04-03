import ArdhiShield from "./ArdhiShield";

interface VerifiedBadgeProps {
  verified: boolean;
}

export default function VerifiedBadge({ verified }: VerifiedBadgeProps) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ardhi/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm">
        <ArdhiShield size="sm" className="drop-shadow-sm" />
        Ardhi Verified
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-trust-amber/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      Pending
    </span>
  );
}
