"use client";

import { useCallback, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Bearing {
  line: string;
  bearing: string;
  bearing_decimal: number | null;
  distance_m: number | null;
  from_point: string;
  to_point: string;
}

interface CornerCoordinate {
  point: string;
  easting: string;
  northing: string;
  coordinate_system: string;
}

interface SpatialRisk {
  risk_type: string;
  feature_name: string;
  severity: string;
  legal_basis: string;
  overlap_sqm: number;
  overlap_percentage: number;
  distance_metres: number;
}

interface Flag {
  type: "Warning" | "Info" | "Error";
  message: string;
}

interface ParseResult {
  parcel_reference: string | null;
  survey_reference: string | null;
  country: string;
  county_district: string | null;
  area_ha: number | string | null;
  area_acres: number | string | null;
  confidence: "High" | "Medium" | "Low";
  geometry_method: string;
  bearings: Bearing[];
  corner_coordinates: CornerCoordinate[];
  datum_reference: string | null;
  scale: string | null;
  survey_date: string | null;
  surveyor: string | null;
  adjacent_parcels: string[];
  beacons: string[];
  wgs84_polygon: {
    available: boolean;
    coordinates: number[][];
    method: string;
    centroid: [number, number] | null;
    notes: string;
  } | null;
  flags: Flag[];
  summary: string;
  spatial_risks?: SpatialRisk[];
  spatial_verdict?: string;
  stored_parcel_reference?: string | null;
}

interface SurveyPlanParserProps {
  parcelReference?: string;
  onBack?: () => void;
  onParcelStored?: (ref: string) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SCAN_STEPS = [
  "Reading survey document...",
  "Extracting bearings & distances...",
  "Converting to polygon coordinates...",
  "Checking spatial risk layers...",
  "Calculating risk profile...",
  "Complete!",
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400",
  high: "text-amber-400",
  medium: "text-yellow-400",
  low: "text-emerald-400",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-red-500/10",
  high: "bg-amber-500/10",
  medium: "bg-yellow-500/10",
  low: "bg-emerald-500/10",
};

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  clear: { label: "CLEAR", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  caution: { label: "CAUTION", color: "text-amber-400", bg: "bg-amber-500/10" },
  high_risk: { label: "HIGH RISK", color: "text-red-400", bg: "bg-red-500/10" },
  critical: { label: "CRITICAL RISK", color: "text-red-400", bg: "bg-red-500/10" },
};

const RISK_LABELS: Record<string, string> = {
  road_reserve: "Road Reserve",
  protected_zone: "Protected Zone",
  flood_zone: "Flood Zone",
  riparian_zone: "Riparian Zone",
  forest_reserve: "Forest Reserve",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function SurveyPlanParser({
  parcelReference,
  onBack,
  onParcelStored,
}: SurveyPlanParserProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parcelRef, setParcelRef] = useState(parcelReference || "");

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/tiff",
      "image/webp",
    ];
    if (!allowed.includes(f.type)) {
      setError("Unsupported file. Use PDF, JPG, PNG, TIFF, or WebP.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError("File too large. Maximum 20MB.");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const runParse = useCallback(async () => {
    if (!file) return;
    setParsing(true);
    setError(null);
    setScanStep(0);

    // Animate scan steps
    const stepInterval = setInterval(() => {
      setScanStep((s) => Math.min(s + 1, SCAN_STEPS.length - 1));
    }, 1200);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("country", "Kenya");
      form.append("parcel_reference", parcelRef);

      const res = await fetch("/api/hatiscan/survey-parse", {
        method: "POST",
        body: form,
      });

      clearInterval(stepInterval);
      setScanStep(SCAN_STEPS.length - 1);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Parse failed");
      }

      const data: ParseResult = await res.json();
      setResult(data);

      if (data.stored_parcel_reference) {
        onParcelStored?.(data.stored_parcel_reference);
      }
    } catch (err) {
      clearInterval(stepInterval);
      setError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  }, [file, parcelRef, onParcelStored]);

  const confPct =
    result?.confidence === "High"
      ? 92
      : result?.confidence === "Medium"
        ? 65
        : 35;
  const confColor =
    result?.confidence === "High"
      ? "bg-emerald-500"
      : result?.confidence === "Medium"
        ? "bg-amber-500"
        : "bg-red-500";

  const verdict = result?.spatial_verdict
    ? VERDICT_CONFIG[result.spatial_verdict]
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Survey Plan Parser
          </h3>
          <p className="text-sm text-white/50">
            Upload a deed plan, PDP, or survey plan to extract parcel geometry
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-[#c8a96e] hover:text-[#c8a96e]/80"
          >
            ← Back
          </button>
        )}
      </div>

      {/* Upload zone */}
      {!result && (
        <>
          <div
            className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
              file
                ? "border-[#c8a96e]/50 bg-[#c8a96e]/5"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.webp"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <>
                <div className="text-2xl mb-2">✓</div>
                <div className="text-sm text-white">{file.name}</div>
                <div className="text-xs text-white/40 mt-1">
                  {(file.size / 1024).toFixed(1)} KB — tap to change
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl mb-3 opacity-40">📐</div>
                <div className="text-sm text-white/70">
                  Drop survey plan here
                </div>
                <div className="text-xs text-white/30 mt-2">
                  PDF · JPG · PNG · TIFF
                  <br />
                  Deed plan · PDP · Mutation form · Survey plan
                </div>
              </>
            )}
          </div>

          {/* Parcel reference input */}
          <div>
            <label className="text-[10px] text-white/30 tracking-wider block mb-1">
              LR / PARCEL REFERENCE (optional)
            </label>
            <input
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-[#c8a96e]/50 focus:outline-none"
              placeholder="e.g. LR 4872/5"
              value={parcelRef}
              onChange={(e) => setParcelRef(e.target.value)}
            />
          </div>

          {/* Parse button */}
          <button
            onClick={runParse}
            disabled={!file || parsing}
            className={`w-full rounded-xl px-4 py-4 text-sm font-medium tracking-wider transition-all ${
              file && !parsing
                ? "bg-[#c8a96e] text-[#0a0f1a] hover:bg-[#c8a96e]/90"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            }`}
          >
            {parsing ? "EXTRACTING..." : "EXTRACT GEOMETRY & ANALYSE"}
          </button>
        </>
      )}

      {/* Scanning animation */}
      {parsing && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-5 rounded-full border-2 border-[#c8a96e]/30 border-t-[#c8a96e] animate-spin" />
            <span className="text-sm text-[#c8a96e] tracking-wider">
              {SCAN_STEPS[scanStep]}
            </span>
          </div>
          <div className="space-y-2">
            {SCAN_STEPS.map((step, i) => (
              <div
                key={i}
                className={`text-xs transition-colors ${
                  i < scanStep
                    ? "text-emerald-400"
                    : i === scanStep
                      ? "text-white"
                      : "text-white/20"
                }`}
              >
                {i < scanStep ? "✓" : i === scanStep ? "●" : "○"} {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Spatial verdict */}
          {verdict && (
            <div
              className={`rounded-xl border border-white/10 ${verdict.bg} px-4 py-4 text-center`}
            >
              <div className={`text-xl font-bold ${verdict.color}`}>
                {verdict.label}
              </div>
              <div className="text-sm text-white/50 mt-1">
                {result.spatial_risks?.length || 0} spatial risk
                {(result.spatial_risks?.length || 0) !== 1 ? "s" : ""} detected
              </div>
            </div>
          )}

          {/* Extracted fields grid */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-[10px] text-white/30 tracking-wider mb-3">
              EXTRACTED PARCEL
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Parcel Ref", result.parcel_reference],
                ["Survey Ref", result.survey_reference],
                ["Area", result.area_ha ? `${result.area_ha} ha` : null],
                ["County", result.county_district],
                ["Survey Date", result.survey_date],
                ["Surveyor", result.surveyor],
                ["Scale", result.scale],
                ["Datum", result.datum_reference],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div
                    key={label as string}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-2"
                  >
                    <div className="text-[8px] text-white/30 tracking-wider">
                      {(label as string).toUpperCase()}
                    </div>
                    <div className="text-xs text-white mt-0.5">
                      {value as string}
                    </div>
                  </div>
                ))}
            </div>

            {/* Confidence bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[9px] text-white/30">
                <span>GEOMETRY CONFIDENCE</span>
                <span className={result.confidence === "High" ? "text-emerald-400" : result.confidence === "Medium" ? "text-amber-400" : "text-red-400"}>
                  {result.confidence}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${confColor} transition-all duration-1000`}
                  style={{ width: `${confPct}%` }}
                />
              </div>
              <div className="text-[9px] text-white/20 mt-1">
                Method: {result.geometry_method}
              </div>
            </div>
          </div>

          {/* Bearings table */}
          {result.bearings?.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] text-white/30 tracking-wider mb-3">
                BEARINGS ({result.bearings.length} lines)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[8px] text-white/30 tracking-wider">
                      <th className="text-left pb-2">LINE</th>
                      <th className="text-left pb-2">BEARING</th>
                      <th className="text-left pb-2">DISTANCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.bearings.map((b, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="py-1.5 text-[#c8a96e]">
                          {b.line || `${b.from_point}→${b.to_point}`}
                        </td>
                        <td className="py-1.5 text-white/70">
                          {b.bearing || "—"}
                        </td>
                        <td className="py-1.5 text-white/70">
                          {b.distance_m ? `${b.distance_m}m` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Corner coordinates */}
          {result.corner_coordinates?.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] text-white/30 tracking-wider mb-3">
                CORNER COORDINATES ({result.corner_coordinates.length} points)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[8px] text-white/30 tracking-wider">
                      <th className="text-left pb-2">PT</th>
                      <th className="text-left pb-2">EASTING</th>
                      <th className="text-left pb-2">NORTHING</th>
                      <th className="text-left pb-2">SYSTEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.corner_coordinates.map((c, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="py-1.5 text-[#c8a96e]">{c.point}</td>
                        <td className="py-1.5 text-white/70 font-mono text-[10px]">
                          {c.easting || "—"}
                        </td>
                        <td className="py-1.5 text-white/70 font-mono text-[10px]">
                          {c.northing || "—"}
                        </td>
                        <td className="py-1.5 text-white/30 text-[9px]">
                          {c.coordinate_system || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Spatial risks */}
          {result.spatial_risks && result.spatial_risks.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] text-white/30 tracking-wider mb-3">
                SPATIAL RISKS ({result.spatial_risks.length})
              </div>
              <div className="space-y-2">
                {result.spatial_risks.slice(0, 10).map((risk, i) => (
                  <div
                    key={i}
                    className={`flex items-start justify-between gap-2 rounded-lg ${SEVERITY_BG[risk.severity] || "bg-white/5"} px-3 py-2`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">
                        {risk.feature_name}
                      </div>
                      <div className="text-[9px] text-white/30 mt-0.5">
                        {RISK_LABELS[risk.risk_type] || risk.risk_type} —{" "}
                        {risk.legal_basis}
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap flex-shrink-0">
                      {risk.overlap_percentage > 0 ? (
                        <div
                          className={`text-xs font-mono ${SEVERITY_COLORS[risk.severity]}`}
                        >
                          {risk.overlap_percentage.toFixed(1)}% overlap
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-white/40">
                          {Math.round(risk.distance_metres)}m away
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document flags */}
          {result.flags?.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] text-white/30 tracking-wider mb-3">
                DOCUMENT FLAGS
              </div>
              <div className="space-y-2">
                {result.flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span
                      className={`mt-0.5 flex-shrink-0 h-2 w-2 rounded-full ${
                        flag.type === "Error"
                          ? "bg-red-400"
                          : flag.type === "Warning"
                            ? "bg-amber-400"
                            : "bg-blue-400"
                      }`}
                    />
                    <span className="text-white/60">{flag.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {result.summary && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] text-white/30 tracking-wider mb-2">
                SUMMARY
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                {result.summary}
              </p>
            </div>
          )}

          {/* Stored notice */}
          {result.stored_parcel_reference && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center">
              <div className="text-xs text-emerald-400">
                Parcel geometry stored as{" "}
                <span className="font-mono">
                  {result.stored_parcel_reference}
                </span>
              </div>
              <div className="text-[9px] text-white/30 mt-1">
                Future HatiScan scans on this reference will use parcel-level
                spatial analysis automatically
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setFile(null);
                setResult(null);
                setError(null);
              }}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10"
            >
              Parse Another
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="flex-1 rounded-xl bg-[#c8a96e] py-3 text-sm font-semibold text-[#0a0f1a] transition hover:bg-[#d4b87a]"
              >
                Back to Results
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
