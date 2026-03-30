"use client";

interface TrustScoreGaugeProps {
  score: number;
  size?: number;
}

export default function TrustScoreGauge({
  score,
  size = 160,
}: TrustScoreGaugeProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  const strokeColor =
    score >= 80
      ? "stroke-trust-green"
      : score >= 60
        ? "stroke-trust-amber"
        : "stroke-trust-red";

  const textColor =
    score >= 80
      ? "text-trust-green"
      : score >= 60
        ? "text-trust-amber"
        : "text-trust-red";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="-rotate-90"
      >
        {/* Background track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-border"
        />
        {/* Score arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={`${strokeColor} transition-all duration-1000 ease-out`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ animation: "score-fill 1.2s ease-out forwards" }}
        />
      </svg>

      {/* Score number overlaid in center */}
      <div
        className="flex flex-col items-center justify-center"
        style={{ marginTop: -(size * 0.62) }}
      >
        <span className={`${textColor} text-3xl font-bold`}>{score}</span>
      </div>

      {/* Spacer to push label below SVG */}
      <div style={{ marginTop: size * 0.22 }}>
        <span className="text-sm font-medium text-muted">Trust Score</span>
      </div>
    </div>
  );
}
