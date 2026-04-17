"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

import SurveyPlanParser from "./SurveyPlanParser";
const ParcelDrawMap = dynamic(() => import("./ParcelDrawMap"), { ssr: false });

interface DataStats {
  elc_cases: number;
  gazette_notices: number;
  riparian_zones: number;
  road_reserves: number;
  apartment_buildings: number;
  last_updated: string | null;
}

interface ExtractedData {
  lr_number: string | null;
  block_number: string | null;
  county: string | null;
  registered_owner: string | null;
  property_description: string | null;
  title_type: string | null;
  confidence: number;
}

interface FreeResult {
  tier: "free";
  parcel_reference: string;
  report_number: string;
  elc_cases_found: number;
  gazette_hits: number;
  gazette_critical: number;
  county_context: string | null;
  verdict: "risks_found" | "notices_found" | "no_records";
  locked_layers: string[];
  checked_at: string;
  rate_limited?: boolean;
  extracted_data?: ExtractedData | null;
  parcel_match?: {
    lr_number: string | null;
    block_number: string | null;
    county: string | null;
    confidence_score: number | null;
  } | null;
}

interface HatiScanResult {
  tier?: "full";
  report_number: string;
  trust_score: number;
  verdict: "clean" | "caution" | "high_risk" | "unverified";
  elc_cases_found: number;
  judgement_matches?: number;
  gazette_hits: number;
  community_flags: number;
  road_reserve_flag?: boolean;
  road_acquisition_flag?: boolean;
  riparian_flag?: boolean;
  breakdown: {
    elc_detail: string;
    judgement_detail?: string;
    gazette_detail: string;
    community_detail: string;
    rim_detail?: string;
    road_reserve_detail?: string;
    road_acquisition_detail?: string;
    riparian_detail?: string;
  };
  risk_items?: Array<{
    label: string;
    severity: string;
    explanation: string;
    source: string;
  }>;
  checked_at: string;
  parcel_reference: string;
  paid?: boolean;
  extracted_data?: ExtractedData | null;
  parcel_data?: {
    parcel_id: number;
    lr_number: string | null;
    block_number: string | null;
    county: string | null;
    area_sqm: number | null;
    confidence_score: number | null;
    ownership: {
      owner: string | null;
      owner_type: string | null;
      title_type: string | null;
      verified_date: string | null;
      source: string | null;
    } | null;
    encumbrances: Array<{
      type: string;
      holder: string;
      gazette_reference: string | null;
      date_registered: string | null;
    }>;
    intelligence: {
      dev_pressure_index: number | null;
      flood_risk: string | null;
      zoning_class: string | null;
      is_sectional: boolean;
    } | null;
    data_sources: string[];
  } | null;
}

const roles = [
  { value: "diaspora", label: "Diaspora Buyer" },
  { value: "local", label: "Local Buyer" },
  { value: "agent", label: "Agent" },
  { value: "lawyer", label: "Lawyer" },
  { value: "sacco", label: "SACCO Officer" },
  { value: "anonymous", label: "Anonymous" },
];

const verdictConfig = {
  clean: {
    label: "VERIFIED CLEAN",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    ring: "stroke-emerald-500",
  },
  caution: {
    label: "CAUTION ADVISED",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    ring: "stroke-amber-500",
  },
  high_risk: {
    label: "HIGH RISK",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    ring: "stroke-red-500",
  },
  unverified: {
    label: "NO RECORDS FOUND",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    text: "text-slate-400",
    ring: "stroke-slate-400",
  },
};

function ScoreCircle({
  score,
  verdict,
}: {
  score: number;
  verdict: string;
}) {
  const config = verdictConfig[verdict as keyof typeof verdictConfig] || verdictConfig.unverified;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          className={config.ring}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${config.text}`}>{score}</span>
        <span className="text-[10px] text-white/40 uppercase tracking-wider">
          Trust Score
        </span>
      </div>
    </div>
  );
}

function LoadingStages({ stage }: { stage: number }) {
  const stages = [
    "Searching court case database...",
    "Checking gazette notices...",
    "Scanning community intelligence...",
  ];

  return (
    <div className="space-y-4 py-8">
      {stages.map((text, i) => (
        <div key={i} className="flex items-center gap-3">
          {i < stage ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
              <svg
                className="h-4 w-4 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
          ) : i === stage ? (
            <div className="h-6 w-6 rounded-full border-2 border-[#c8a96e] border-t-transparent animate-spin" />
          ) : (
            <div className="h-6 w-6 rounded-full border-2 border-white/10" />
          )}
          <span
            className={`text-sm ${
              i <= stage ? "text-white" : "text-white/30"
            }`}
          >
            {text}
          </span>
        </div>
      ))}
    </div>
  );
}

interface DocumentResult {
  report_number: string;
  trust_score: number | null;
  verdict: string;
  document_type: string;
  document_completeness?: "full" | "partial" | "header_only" | "illegible";
  deed_format?: "chapter_300_repealed" | "lra_2012" | "unknown";
  is_incomplete?: boolean;
  is_chapter_300_repealed?: boolean;
  incomplete_message?: string | null;
  repealed_warning?: string | null;
  extracted_fields: {
    title_number: string | null;
    title_match: boolean | null;
    registered_owner: string | null;
    county: string | null;
    plot_area: string | null;
    registration_date: string | null;
    ir_number?: string | null;
    volume?: string | null;
    folio?: string | null;
    block_plot?: string | null;
    location_in_brackets?: string | null;
  };
  forgery_flags: string[];
  quality_notes?: string[];
  metadata: {
    created: string | null;
    modified: string | null;
    creator: string | null;
    risk_level: string;
  };
  elc_cases_found: number;
  gazette_hits: number;
  community_flags: number;
  location_activity?: {
    keywords: string[];
    elc_matches: number;
    gazette_matches: number;
    riparian_matches: number;
    message: string | null;
  };
  resolved_hierarchy?: {
    county: string | null;
    subcounty: string | null;
    ward: string | null;
    location: string | null;
    sublocation: string | null;
    ai_extracted_county: string | null;
    location_approximate: boolean;
    approximate_message: string | null;
    source: "kenya_gazetteer" | "ai_extracted" | "none";
  };
  county_context?: {
    county: string | null;
    elc_cases_in_county: number;
    gazette_notices_in_county: number;
    riparian_zones_in_county: number;
    road_reserves_in_county: number;
    forest_reserves_in_county: number;
    message: string | null;
  };
  checked_at: string;
  // Populated when survey geometry extraction runs in parallel
  survey_geometry?: {
    parcel_reference: string | null;
    survey_reference: string | null;
    confidence: "High" | "Medium" | "Low";
    geometry_method: string;
    bearings: Array<{ line: string; bearing: string; distance_m: number | null }>;
    corner_coordinates: Array<{ point: string; easting: string; northing: string; coordinate_system: string }>;
    datum_reference: string | null;
    wgs84_polygon: { available: boolean; coordinates: number[][]; centroid: [number, number] | null; notes: string } | null;
    spatial_risks?: Array<{ risk_type: string; feature_name: string; severity: string; legal_basis: string; overlap_sqm: number; overlap_percentage: number; distance_metres: number }>;
    spatial_verdict?: string;
    stored_parcel_reference?: string | null;
    summary?: string;
    flags?: Array<{ type: string; message: string }>;
  } | null;
}

export default function HatiScanTool() {
  const [parcel, setParcel] = useState("");
  const [role, setRole] = useState("anonymous");
  const [step, setStep] = useState<"input" | "loading" | "free-results" | "results" | "spatial" | "survey" | "doc-loading" | "doc-results" | "extract-preview">("input");
  const [loadingStage, setLoadingStage] = useState(0);
  const [freeResult, setFreeResult] = useState<FreeResult | null>(null);
  const [result, setResult] = useState<HatiScanResult | null>(null);
  const [docResult, setDocResult] = useState<DocumentResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [converting, setConverting] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [currency, setCurrency] = useState<"GBP" | "KES">("KES");
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<{
    lr_number: string | null;
    block_number: string | null;
    county: string | null;
    registered_owner: string | null;
    property_description: string | null;
    title_type: string | null;
    confidence: number;
  } | null>(null);
  const [extractPreviewUrl, setExtractPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch("/api/hatiscan/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});

    // Detect Kenya IP for KES pricing
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((geo) => {
        if (geo.country_code === "KE") setCurrency("KES");
      })
      .catch(() => {});

    // Handle return from Stripe Checkout
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const parcelFromUrl = params.get("parcel");
    if (sessionId && parcelFromUrl) {
      setParcel(parcelFromUrl);
      setStep("loading");
      setLoadingStage(0);
      const t1 = setTimeout(() => setLoadingStage(1), 800);
      const t2 = setTimeout(() => setLoadingStage(2), 1600);
      fetch(`/api/hatiscan/report?session_id=${sessionId}`)
        .then((r) => r.json())
        .then(async (data) => {
          await new Promise((r) => setTimeout(r, 2400));
          setLoadingStage(3);
          await new Promise((r) => setTimeout(r, 400));
          if (data.error) {
            setError(data.error);
            setStep("input");
          } else {
            // Restore extracted data from pre-checkout
            const saved = loadExtractedData();
            if (saved) data.extracted_data = saved;
            setResult(data);
            setStep("results");
          }
          // Clean URL
          window.history.replaceState({}, "", "/hatiscan");
        })
        .catch(() => {
          setError("Failed to load paid report. Please contact support.");
          setStep("input");
        });
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (params.get("cancelled") === "true") {
      setParcel(params.get("parcel") || "");
      setError("Payment cancelled. You can still use the free scan.");
      window.history.replaceState({}, "", "/hatiscan");
    }

    // Handle ?parcel=...&buy=true — go straight to Stripe checkout
    const buyDirect = params.get("buy") === "true";
    if (!sessionId && parcelFromUrl && parcelFromUrl.trim() && buyDirect) {
      setParcel(parcelFromUrl);
      const savedExtract = loadExtractedData();
      if (savedExtract) setExtractResult(savedExtract);
      window.history.replaceState({}, "", "/hatiscan");

      // Redirect to Stripe immediately
      fetch("/api/hatiscan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parcel_reference: parcelFromUrl.trim(),
          submitter_type: "anonymous",
          currency: "KES",
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.url) window.location.href = data.url;
          else {
            setError(data.detail || data.error || "Checkout failed");
            setStep("input");
          }
        })
        .catch(() => {
          setError("Payment failed. Please try again.");
          setStep("input");
        });
      return;
    }

    // Handle ?parcel=... from homepage confirm (no session_id, no buy)
    if (!sessionId && parcelFromUrl && parcelFromUrl.trim()) {
      setParcel(parcelFromUrl);
      // Restore extracted data from homepage upload
      const saved = loadExtractedData();
      if (saved) {
        setExtractResult(saved);
      }
      // Auto-run free scan
      setStep("loading");
      setLoadingStage(0);
      const ta = setTimeout(() => setLoadingStage(1), 800);
      const tb = setTimeout(() => setLoadingStage(2), 1600);
      const scanParams = new URLSearchParams({
        parcel: parcelFromUrl.trim(),
        tier: "free",
        submitter_type: "anonymous",
      });
      fetch(`/api/hatiscan?${scanParams}`)
        .then((r) => r.json())
        .then(async (data) => {
          await new Promise((r) => setTimeout(r, 2400));
          setLoadingStage(3);
          await new Promise((r) => setTimeout(r, 400));
          if (saved) data.extracted_data = saved;
          setFreeResult(data);
          setStep("free-results");
          window.history.replaceState({}, "", "/hatiscan");
        })
        .catch(() => {
          setError("Scan failed. Please try again.");
          setStep("input");
        });
      return () => { clearTimeout(ta); clearTimeout(tb); };
    }
  }, []);

  // ── PDF → JPEG conversion (client-side via pdfjs-dist) ─────────────
  // Claude Vision works best with images. Rendering page 1 of a PDF to
  // a canvas and converting to JPEG means PDFs take the same well-tested
  // image code path in the API route.
  async function convertPdfToImage(file: File): Promise<{ converted: File; pageCount: number; previewUrl: string }> {
    // Dynamic import — use the LEGACY build which targets older browsers.
    // The default pdfjs-dist v5 build uses bleeding-edge JS features like
    // Map.prototype.getOrInsertComputed (Safari 18.2+ only) which breaks
    // on older Safari. Legacy build avoids this entirely.
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;

    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 }); // 2x scale for better OCR quality

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get 2D canvas context");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport,
      canvas,
    }).promise;

    // Convert canvas to JPEG blob
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
        "image/jpeg",
        0.92
      );
    });

    const converted = new File(
      [blob],
      file.name.replace(/\.pdf$/i, "_page1.jpg"),
      { type: "image/jpeg", lastModified: Date.now() }
    );
    const previewUrl = URL.createObjectURL(blob);
    return { converted, pageCount, previewUrl };
  }

  async function handleFileSelected(file: File) {
    setError("");
    setPdfPreview(null);
    setPdfPageCount(0);

    if (file.type === "application/pdf") {
      setConverting(true);
      try {
        const { converted, pageCount, previewUrl } = await convertPdfToImage(file);
        setUploadedFile(converted);
        setPdfPreview(previewUrl);
        setPdfPageCount(pageCount);
      } catch (e) {
        console.error("PDF conversion failed:", e);
        setError(
          e instanceof Error
            ? `PDF conversion failed: ${e.message}`
            : "PDF conversion failed. Please try uploading a JPG or PNG instead."
        );
      } finally {
        setConverting(false);
      }
    } else if (file.type === "image/jpeg" || file.type === "image/png") {
      setUploadedFile(file);
    } else {
      setError("Unsupported file type. Please upload a PDF, JPG, or PNG.");
    }
  }

  // Persist extracted data across Stripe redirect
  function saveExtractedData(data: ExtractedData) {
    try { sessionStorage.setItem("hatiscan_extracted", JSON.stringify(data)); } catch {}
  }
  function loadExtractedData(): ExtractedData | null {
    try {
      const raw = sessionStorage.getItem("hatiscan_extracted");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async function handleExtractLR(file: File) {
    setExtracting(true);
    setError("");
    setExtractResult(null);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setExtractPreviewUrl(previewUrl);

    // If PDF, convert to image first
    let imageFile = file;
    if (file.type === "application/pdf") {
      try {
        const { converted } = await convertPdfToImage(file);
        imageFile = converted;
      } catch {
        setError("Could not process PDF. Try uploading a photo instead.");
        setExtracting(false);
        return;
      }
    }

    try {
      const form = new FormData();
      form.append("file", imageFile);

      const res = await fetch("/api/hatiscan/extract-lr", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Extraction failed");
      }

      setExtractResult(data);
      saveExtractedData(data);

      // Auto-populate parcel field
      const ref = data.lr_number || data.block_number;
      if (ref) {
        setParcel(ref);
      }

      setStep("extract-preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read document. Try typing the LR number instead.");
      setStep("input");
    } finally {
      setExtracting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleExtractLR(file);
  }

  function handleUploadInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleExtractLR(file);
  }

  async function handleScan() {
    if (!parcel.trim()) return;

    setStep("loading");
    setLoadingStage(0);
    setError("");

    const timer1 = setTimeout(() => setLoadingStage(1), 800);
    const timer2 = setTimeout(() => setLoadingStage(2), 1600);

    try {
      const params = new URLSearchParams({
        parcel: parcel.trim(),
        tier: "free",
        submitter_type: role,
      });
      const res = await fetch(`/api/hatiscan?${params}`);
      const data = await res.json();

      if (res.status === 429) {
        throw new Error(data.error || "Daily free scan limit reached. Purchase a Full Report for unlimited access.");
      }
      if (!res.ok) {
        throw new Error(data.error || "Scan failed");
      }

      await new Promise((r) => setTimeout(r, 2400));
      setLoadingStage(3);
      await new Promise((r) => setTimeout(r, 400));

      // Attach extracted data from document upload if available
      if (extractResult) {
        data.extracted_data = extractResult;
      }
      setFreeResult(data);
      setStep("free-results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed. Please try again.");
      setStep("input");
    }

    clearTimeout(timer1);
    clearTimeout(timer2);
  }

  async function handleBuyFullReport() {
    if (!parcel.trim() || checkingOut) return;
    setCheckingOut(true);
    setError("");

    try {
      const res = await fetch("/api/hatiscan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parcel_reference: parcel.trim(),
          submitter_type: role,
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      setError(`${msg}. Please try again or contact support.`);
      setCheckingOut(false);
    }
  }


  async function handleDocScan() {
    if (!uploadedFile) return;
    setStep("doc-loading");
    setError("");

    try {
      // Build form data for title analysis
      const titleForm = new FormData();
      titleForm.append("file", uploadedFile);
      titleForm.append("parcel_reference", parcel.trim());
      titleForm.append("submitter_type", role);

      // Build form data for survey geometry extraction (uses original PDF if available)
      const surveyForm = new FormData();
      // For survey parsing, send the original file (not the PDF→JPEG conversion)
      // since survey plans need full resolution for bearing/coordinate extraction
      surveyForm.append("file", uploadedFile);
      surveyForm.append("parcel_reference", parcel.trim());
      surveyForm.append("country", "Kenya");

      // Run both analyses in parallel — single upload, dual intelligence
      const [titleRes, surveyRes] = await Promise.all([
        fetch("/api/hatiscan/document", { method: "POST", body: titleForm }),
        fetch("/api/hatiscan/survey-parse", { method: "POST", body: surveyForm }).catch(() => null),
      ]);

      const titleData = await titleRes.json();
      if (!titleRes.ok) throw new Error(titleData.error || "Document analysis failed");

      // Survey extraction is best-effort — don't fail the whole scan if it errors
      let surveyData = null;
      if (surveyRes && surveyRes.ok) {
        surveyData = await surveyRes.json();
        console.log("[HatiScan] Survey geometry extracted:", surveyData.geometry_method, surveyData.confidence);
      }

      setDocResult({ ...titleData, survey_geometry: surveyData });
      setStep("doc-results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Document analysis failed.");
      setStep("input");
    }
  }

  function handleReset() {
    setParcel("");
    setResult(null);
    setFreeResult(null);
    setDocResult(null);
    setUploadedFile(null);
    if (pdfPreview) URL.revokeObjectURL(pdfPreview);
    setPdfPreview(null);
    setPdfPageCount(0);
    setConverting(false);
    setCheckingOut(false);
    setStep("input");
    setError("");
    setCopied(false);
  }

  function handleCopy() {
    let text = "";

    if (step === "doc-results" && docResult) {
      // Document analysis share
      const ef = docResult.extracted_fields;
      const lines = [
        `HatiScan™ Document Report ${docResult.report_number}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Document: ${docResult.document_type}${docResult.deed_format && docResult.deed_format !== "unknown" ? ` (${docResult.deed_format.replace(/_/g, " ")})` : ""}`,
        `Completeness: ${docResult.document_completeness || "unknown"}`,
        ``,
        ef.title_number ? `Title Number: ${ef.title_number}` : null,
        ef.registered_owner ? `Registered Owner: ${ef.registered_owner}` : null,
        ef.county ? `County: ${ef.county}` : null,
        ef.plot_area ? `Plot Area: ${ef.plot_area}` : null,
        ef.registration_date ? `Registration Date: ${ef.registration_date}` : null,
        ef.ir_number ? `IR Number: ${ef.ir_number}` : null,
        ``,
        docResult.trust_score !== null ? `Trust Score: ${docResult.trust_score}/100 — ${docResult.verdict.toUpperCase().replace(/_/g, " ")}` : null,
        ``,
        docResult.forgery_flags.length > 0 ? `⚠ Flags (${docResult.forgery_flags.length}):` : null,
        ...docResult.forgery_flags.map(f => `  • ${f}`),
        ``,
        (docResult.quality_notes?.length ?? 0) > 0 ? `Quality Notes:` : null,
        ...(docResult.quality_notes || []).map(n => `  • ${n}`),
      ];

      // Spatial risks from survey geometry
      if (docResult.survey_geometry?.spatial_risks?.length) {
        lines.push(``, `Spatial Risks (${docResult.survey_geometry.spatial_risks.length}):`);
        for (const r of docResult.survey_geometry.spatial_risks.slice(0, 5)) {
          const metric = r.overlap_percentage > 0
            ? `${r.overlap_percentage.toFixed(1)}% overlap`
            : `${Math.round(r.distance_metres)}m away`;
          lines.push(`  • ${r.feature_name} — ${r.risk_type.replace(/_/g, " ")} (${metric})`);
        }
      }

      lines.push(
        ``,
        `Checked: ${new Date(docResult.checked_at).toLocaleString()}`,
        `Powered by Ardhi Verified — ardhiverified.com/hatiscan`,
      );

      text = lines.filter(l => l !== null).join("\n");

    } else if (result) {
      // Basic scan share
      const config = verdictConfig[result.verdict];
      const lines = [
        `HatiScan™ Report ${result.report_number}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Parcel: ${result.parcel_reference}`,
        `Score: ${result.trust_score}/100 — ${config.label}`,
        ``,
        `Court Cases: ${result.elc_cases_found}`,
        `Gazette Notices: ${result.gazette_hits}`,
        `Community Flags: ${result.community_flags}`,
      ];

      if (result.road_reserve_flag) lines.push(`⚠ Road Reserve: ${result.breakdown.road_reserve_detail}`);
      if (result.riparian_flag) lines.push(`⚠ Riparian Zone: ${result.breakdown.riparian_detail}`);
      if (result.road_acquisition_flag) lines.push(`⚠ Compulsory Acquisition: ${result.breakdown.road_acquisition_detail}`);

      lines.push(
        ``,
        `Checked: ${new Date(result.checked_at).toLocaleString()}`,
        `Powered by Ardhi Verified — ardhiverified.com/hatiscan`,
      );

      text = lines.join("\n");
    }

    if (!text) return;

    // Try native share first (mobile), fall back to clipboard
    if (navigator.share) {
      navigator.share({
        title: "HatiScan™ Report",
        text,
      }).catch(() => {
        // User cancelled share sheet — fall back to clipboard
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `Checked on ${d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })} at ${d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
        {/* ── STEP 1: INPUT ──────────────────────────────────── */}
        {step === "input" && (
          <div className="text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c8a96e]/30 bg-[#c8a96e]/10 px-4 py-1.5">
              <svg
                className="h-4 w-4 text-[#c8a96e]"
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
              <span className="text-sm font-medium text-[#c8a96e]">
                Land Intelligence Engine
              </span>
            </div>

            <h1 className="font-serif text-4xl font-bold text-white sm:text-5xl">
              HatiScan
              <span className="text-[#c8a96e]">&#8482;</span>
            </h1>
            <h2 className="mt-2 text-lg text-white/40 font-serif">
              Land Intelligence
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm text-white/50">
              Screen any Kenya title against the largest land intelligence
              database in the country — instantly
            </p>

            {/* ── DATA INTELLIGENCE STAT BAR ── */}
            {stats && (
              <div className="mt-8 rounded-2xl border border-[#c8a96e]/20 bg-[#c8a96e]/[0.03] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#c8a96e]/60 mb-3">
                  HatiScan&trade; scans against
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-[#c8a96e]">
                      {stats.elc_cases.toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/50 leading-tight">
                      ELC court cases
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-[#c8a96e]">
                      {stats.gazette_notices.toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/50 leading-tight">
                      gazette notices
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-[#c8a96e]">
                      {stats.riparian_zones.toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/50 leading-tight">
                      water bodies &amp; riparian zones
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-[#c8a96e]">
                      {stats.road_reserves.toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/50 leading-tight">
                      road reserves
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-center text-[10px] text-white/30">
                  Updated weekly &middot; Last refresh:{" "}
                  {stats.last_updated
                    ? new Date(stats.last_updated).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "this week"}
                </p>
              </div>
            )}

            {/* ── DOCUMENT UPLOAD ZONE ── */}
            <div
              className={`mt-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                dragOver
                  ? "border-[#c8a96e] bg-[#c8a96e]/10"
                  : "border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
              } ${extracting ? "pointer-events-none opacity-60" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("hs-upload")?.click()}
            >
              <input
                id="hs-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={handleUploadInput}
              />

              {extracting ? (
                <div className="py-10 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full border-2 border-[#c8a96e]/30 border-t-[#c8a96e] animate-spin mb-4" />
                  <p className="text-sm text-[#c8a96e]">Reading your title deed...</p>
                  <p className="text-xs text-white/30 mt-1">AI is extracting the LR number and property details</p>
                </div>
              ) : (
                <div className="py-8 px-6 text-center">
                  {/* Camera icon for mobile, upload icon for desktop */}
                  <div className="flex justify-center gap-4 mb-4">
                    <svg className="h-10 w-10 text-[#c8a96e]/50 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <svg className="h-10 w-10 text-[#c8a96e]/50 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-white/70 sm:hidden">
                    Take a photo of your title deed
                  </p>
                  <p className="text-sm font-medium text-white/70 hidden sm:block">
                    Drag &amp; drop your title deed here, or click to upload
                  </p>
                  <p className="text-xs text-white/30 mt-2">
                    JPG, PNG, or PDF — AI will extract the LR number automatically
                  </p>
                </div>
              )}
            </div>

            {/* Mobile camera button */}
            <div className="mt-3 sm:hidden">
              <label className="flex items-center justify-center gap-2 rounded-xl border border-[#c8a96e]/30 bg-[#c8a96e]/10 py-3.5 text-sm font-medium text-[#c8a96e] cursor-pointer transition hover:bg-[#c8a96e]/20">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                Open Camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleUploadInput}
                />
              </label>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mt-6 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30 uppercase tracking-wider">or type manually</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Manual input form */}
            <div className="space-y-4 text-left">
              <div>
                <label
                  htmlFor="hs-parcel"
                  className="block text-xs font-medium text-white/60 mb-1.5"
                >
                  Parcel / LR / Title Number
                </label>
                <input
                  id="hs-parcel"
                  type="text"
                  value={parcel}
                  onChange={(e) => setParcel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  placeholder="e.g. LR 209/21922"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder:text-white/20 focus:border-[#c8a96e]/50 focus:outline-none focus:ring-1 focus:ring-[#c8a96e]/30 transition"
                />
              </div>

              <div>
                <label
                  htmlFor="hs-role"
                  className="block text-xs font-medium text-white/60 mb-1.5"
                >
                  Your Role
                </label>
                <select
                  id="hs-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white focus:border-[#c8a96e]/50 focus:outline-none focus:ring-1 focus:ring-[#c8a96e]/30 transition appearance-none"
                >
                  {roles.map((r) => (
                    <option
                      key={r.value}
                      value={r.value}
                      className="bg-[#0a0f1a]"
                    >
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tier buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                <button
                  onClick={handleScan}
                  disabled={!parcel.trim()}
                  className="rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/70 transition-all hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Free Preview
                </button>
                <button
                  onClick={() => { if (parcel.trim()) handleScan(); }}
                  disabled={!parcel.trim()}
                  className="rounded-xl bg-[#c8a96e] px-6 py-3.5 text-sm font-semibold text-[#0a0f1a] transition-all hover:bg-[#d4b87a] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Full Report — KES 2,500
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              <p className="text-center text-[11px] text-white/25 pt-2">
                Checks against 190,000+ intelligence records: court cases, gazette notices, road reserves, riparian zones, protected areas, and flood zones across all 47 Kenyan counties
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 1b: EXTRACT PREVIEW ──────────────────────── */}
        {step === "extract-preview" && extractResult && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5">
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-emerald-400">Document Read Successfully</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-white">We found:</h2>
            </div>

            {/* Document preview thumbnail */}
            {extractPreviewUrl && (
              <div className="mx-auto max-w-[200px] rounded-xl overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={extractPreviewUrl} alt="Uploaded document" className="w-full" />
              </div>
            )}

            {/* Extracted fields — editable */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">LR / Title Number</label>
                <input
                  type="text"
                  value={parcel}
                  onChange={(e) => setParcel(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#c8a96e]/50 focus:outline-none focus:ring-1 focus:ring-[#c8a96e]/30 transition"
                />
              </div>

              {extractResult.registered_owner && (
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Registered Owner</label>
                  <p className="text-white font-medium">{extractResult.registered_owner}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {extractResult.county && (
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">County</label>
                    <p className="text-white/80">{extractResult.county}</p>
                  </div>
                )}
                {extractResult.title_type && (
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">Title Type</label>
                    <p className="text-white/80 capitalize">{extractResult.title_type}</p>
                  </div>
                )}
              </div>

              {extractResult.property_description && (
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Property Description</label>
                  <p className="text-sm text-white/60">{extractResult.property_description}</p>
                </div>
              )}

              {/* Confidence indicator */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      extractResult.confidence >= 0.8 ? "bg-emerald-500" :
                      extractResult.confidence >= 0.5 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${extractResult.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-white/40">
                  {extractResult.confidence >= 0.8 ? "High" : extractResult.confidence >= 0.5 ? "Medium" : "Low"} confidence
                </span>
              </div>

              {extractResult.confidence < 0.5 && (
                <p className="text-xs text-amber-400">
                  Low confidence extraction. Please verify and correct the fields above before scanning.
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={handleScan}
                disabled={!parcel.trim()}
                className="w-full rounded-xl bg-[#c8a96e] px-6 py-4 text-sm font-semibold text-[#0a0f1a] transition-all hover:bg-[#d4b87a] disabled:opacity-40"
              >
                Run HatiScan on {parcel || "this title"}
              </button>
              <button
                onClick={() => {
                  setStep("input");
                  setExtractResult(null);
                  if (extractPreviewUrl) URL.revokeObjectURL(extractPreviewUrl);
                  setExtractPreviewUrl(null);
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: LOADING ────────────────────────────────── */}
        {step === "loading" && (
          <div className="text-center">
            <h2 className="font-serif text-2xl font-bold text-white">
              Scanning <span className="text-[#c8a96e]">{parcel}</span>
            </h2>
            <p className="mt-1 text-sm text-white/40">
              Cross-referencing against all intelligence databases
            </p>
            <div className="mx-auto max-w-xs">
              <LoadingStages stage={loadingStage} />
            </div>
          </div>
        )}

        {/* ── STEP 2b: FREE RESULTS (preview with blurred paid content) ── */}
        {step === "free-results" && freeResult && (
          <div className="space-y-6">
            {/* Free scan summary */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg width="140" height="140" className="-rotate-90">
                  <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(200,169,110,0.3)" strokeWidth="8" strokeLinecap="round" strokeDasharray="339.29" strokeDashoffset="339.29" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <svg className="h-8 w-8 text-[#c8a96e]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span className="text-[10px] text-[#c8a96e]/60 uppercase tracking-wider mt-1">
                    Locked
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/50">{freeResult.parcel_reference}</p>
              {freeResult.county_context && (
                <p className="text-xs text-white/30">{freeResult.county_context} County</p>
              )}
            </div>

            {/* Extracted property details from document upload */}
            {freeResult.extracted_data && (
              <div className="rounded-2xl border border-[#c8a96e]/20 bg-[#c8a96e]/[0.03] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="h-4 w-4 text-[#c8a96e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-xs font-semibold text-[#c8a96e] uppercase tracking-wider">Title Deed Details</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {freeResult.extracted_data.registered_owner && (
                    <div className="col-span-2">
                      <span className="text-white/40 text-[11px]">Registered Owner</span>
                      <p className="text-white font-medium">{freeResult.extracted_data.registered_owner}</p>
                    </div>
                  )}
                  {freeResult.extracted_data.county && (
                    <div>
                      <span className="text-white/40 text-[11px]">County</span>
                      <p className="text-white/80">{freeResult.extracted_data.county}</p>
                    </div>
                  )}
                  {freeResult.extracted_data.title_type && (
                    <div>
                      <span className="text-white/40 text-[11px]">Title Type</span>
                      <p className="text-white/80 capitalize">{freeResult.extracted_data.title_type}</p>
                    </div>
                  )}
                  {freeResult.extracted_data.property_description && (
                    <div className="col-span-2">
                      <span className="text-white/40 text-[11px]">Property</span>
                      <p className="text-white/60 text-xs">{freeResult.extracted_data.property_description}</p>
                    </div>
                  )}
                  {freeResult.extracted_data.lr_number && freeResult.extracted_data.block_number && (
                    <div className="col-span-2 flex gap-3">
                      <div>
                        <span className="text-white/40 text-[11px]">LR Number</span>
                        <p className="text-white/80 font-mono text-xs">{freeResult.extracted_data.lr_number}</p>
                      </div>
                      <div>
                        <span className="text-white/40 text-[11px]">Block</span>
                        <p className="text-white/80 font-mono text-xs">{freeResult.extracted_data.block_number}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Free tier counts */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl border p-5 text-center ${
                freeResult.elc_cases_found > 0
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-emerald-500/20 bg-emerald-500/5"
              }`}>
                <div className={`text-3xl font-bold ${
                  freeResult.elc_cases_found > 0 ? "text-red-400" : "text-emerald-400"
                }`}>
                  {freeResult.elc_cases_found}
                </div>
                <div className="mt-1 text-xs text-white/50">Court Cases Found</div>
                {freeResult.elc_cases_found > 0 && (
                  <p className="mt-2 text-[11px] text-red-300/70">
                    This parcel appears in {freeResult.elc_cases_found} Environment &amp; Land Court case{freeResult.elc_cases_found > 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <div className={`rounded-xl border p-5 text-center ${
                freeResult.gazette_critical > 0
                  ? "border-amber-500/30 bg-amber-500/5"
                  : freeResult.gazette_hits > 0
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-emerald-500/20 bg-emerald-500/5"
              }`}>
                <div className={`text-3xl font-bold ${
                  freeResult.gazette_critical > 0 ? "text-amber-400"
                    : freeResult.gazette_hits > 0 ? "text-amber-300"
                    : "text-emerald-400"
                }`}>
                  {freeResult.gazette_hits}
                </div>
                <div className="mt-1 text-xs text-white/50">Gazette Notices</div>
                {freeResult.gazette_critical > 0 && (
                  <p className="mt-2 text-[11px] text-amber-300/70">
                    {freeResult.gazette_critical} critical (acquisition/caveat)
                  </p>
                )}
              </div>
            </div>

            {/* Risk summary for free tier */}
            {(freeResult.elc_cases_found > 0 || freeResult.gazette_critical > 0) && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex items-start gap-3">
                <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Risks Detected</p>
                  <p className="text-sm text-red-300/70">
                    Records found that may affect this title. Purchase the Full Report to see complete details, trust score, and all 12 verification layers.
                  </p>
                </div>
              </div>
            )}

            {/* Parcel match from structured database */}
            {freeResult.parcel_match && (
              <div className="rounded-2xl border border-[#c8a96e]/20 bg-[#c8a96e]/[0.03] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-4 w-4 text-[#c8a96e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-semibold text-[#c8a96e] uppercase tracking-wider">Parcel Found in Registry</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {freeResult.parcel_match.lr_number && (
                    <div>
                      <span className="text-white/40 text-[11px]">LR Number</span>
                      <p className="text-white/80 font-medium">{freeResult.parcel_match.lr_number}</p>
                    </div>
                  )}
                  {freeResult.parcel_match.block_number && (
                    <div>
                      <span className="text-white/40 text-[11px]">Block Number</span>
                      <p className="text-white/80 font-medium">{freeResult.parcel_match.block_number}</p>
                    </div>
                  )}
                  {freeResult.parcel_match.county && (
                    <div>
                      <span className="text-white/40 text-[11px]">County</span>
                      <p className="text-white/80 font-medium">{freeResult.parcel_match.county}</p>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-[11px] text-white/30">
                  Full ownership, encumbrance, and intelligence data available in the Full Report
                </p>
              </div>
            )}

            {/* Blurred/locked paid content preview */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 overflow-hidden">
              <div className="absolute inset-0 backdrop-blur-md bg-[#0a0f1a]/60 z-10 flex flex-col items-center justify-center">
                <svg className="h-10 w-10 text-[#c8a96e]/60 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p className="text-sm font-semibold text-[#c8a96e]">Full Report Required</p>
                <p className="text-xs text-white/40 mt-1">10 additional verification layers</p>
              </div>

              {/* Fake preview content behind blur */}
              <div className="space-y-4 select-none" aria-hidden="true">
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Full Verification Layers</h3>
                {(freeResult.locked_layers || []).map((layer, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <div className="h-2 w-2 rounded-full bg-white/20 flex-shrink-0" />
                    <span className="text-sm text-white/40">{layer}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA: Buy Full Report */}
            <button
              onClick={handleBuyFullReport}
              disabled={checkingOut}
              className="w-full rounded-xl bg-gradient-to-r from-[#c8a96e] to-[#a08040] px-6 py-4 text-sm font-semibold text-[#0a0f1a] transition-all hover:from-[#d4b87a] hover:to-[#b09050] disabled:opacity-60"
            >
              {checkingOut ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-[#0a0f1a]/30 border-t-[#0a0f1a] animate-spin" />
                  Redirecting to payment...
                </span>
              ) : (
                <>
                  View Full HatiScan&#8482; Report — KES 2,500
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-white/25">
              Includes Trust Score, road reserves, riparian zones, forest reserves, protected areas, flood zones, NLC claims, spatial analysis, and downloadable report
            </p>

            {/* Report meta */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-white/30">Free Scan Reference</p>
                <p className="text-sm font-mono text-white/50">{freeResult.report_number}</p>
              </div>
              <p className="text-xs text-white/30">{formatDate(freeResult.checked_at)}</p>
            </div>

            <button
              onClick={handleReset}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10"
            >
              Check Another Title
            </button>
          </div>
        )}

        {/* ── STEP 3: RESULTS (paid full report) ────────────────────── */}
        {step === "results" && result && (
          <div className="space-y-6">
            {/* Score + Verdict */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <ScoreCircle
                score={result.trust_score}
                verdict={result.verdict}
              />

              <div className="mt-4">
                <span
                  className={`inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
                    verdictConfig[result.verdict as keyof typeof verdictConfig]?.bg || "bg-slate-500/10"
                  } ${verdictConfig[result.verdict as keyof typeof verdictConfig]?.border || "border-slate-500/30"} border ${
                    verdictConfig[result.verdict as keyof typeof verdictConfig]?.text || "text-slate-400"
                  }`}
                >
                  {verdictConfig[result.verdict as keyof typeof verdictConfig]?.label || result.verdict}
                </span>
              </div>

              <p className="mt-3 text-sm text-white/50">
                {result.parcel_reference}
              </p>
            </div>

            {/* Metric boxes */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {result.elc_cases_found}
                </div>
                <div className="mt-1 text-[11px] text-white/40">
                  Court Cases
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {result.gazette_hits}
                </div>
                <div className="mt-1 text-[11px] text-white/40">
                  Gazette Notices
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {result.community_flags}
                </div>
                <div className="mt-1 text-[11px] text-white/40">
                  Community Flags
                </div>
              </div>
            </div>

            {/* Extracted title deed details */}
            {result.extracted_data && (
              <div className="rounded-2xl border border-[#c8a96e]/20 bg-[#c8a96e]/[0.03] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="h-4 w-4 text-[#c8a96e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-xs font-semibold text-[#c8a96e] uppercase tracking-wider">Title Deed Details</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {result.extracted_data.registered_owner && (
                    <div className="col-span-2">
                      <span className="text-white/40 text-[11px]">Registered Owner</span>
                      <p className="text-white font-medium">{result.extracted_data.registered_owner}</p>
                    </div>
                  )}
                  {result.extracted_data.county && (
                    <div>
                      <span className="text-white/40 text-[11px]">County</span>
                      <p className="text-white/80">{result.extracted_data.county}</p>
                    </div>
                  )}
                  {result.extracted_data.title_type && (
                    <div>
                      <span className="text-white/40 text-[11px]">Title Type</span>
                      <p className="text-white/80 capitalize">{result.extracted_data.title_type}</p>
                    </div>
                  )}
                  {result.extracted_data.property_description && (
                    <div className="col-span-2">
                      <span className="text-white/40 text-[11px]">Property</span>
                      <p className="text-white/60 text-xs">{result.extracted_data.property_description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Risk Alerts — Road Reserve, Compulsory Acquisition, Riparian */}
            {(result.road_reserve_flag || result.road_acquisition_flag || result.riparian_flag) && (
              <div className="space-y-3">
                {result.road_reserve_flag && result.breakdown.road_reserve_detail && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-3">
                    <svg className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <div>
                      <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Road Reserve Warning</p>
                      <p className="text-sm text-amber-300/70">{result.breakdown.road_reserve_detail}</p>
                    </div>
                  </div>
                )}
                {result.road_acquisition_flag && result.breakdown.road_acquisition_detail && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 flex items-start gap-3">
                    <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <div>
                      <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Compulsory Acquisition Notice</p>
                      <p className="text-sm text-red-300/70">{result.breakdown.road_acquisition_detail}</p>
                    </div>
                  </div>
                )}
                {result.riparian_flag && result.breakdown.riparian_detail && (
                  <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5 flex items-start gap-3">
                    <svg className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <div>
                      <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">Riparian Zone Caution</p>
                      <p className="text-sm text-cyan-300/70">{result.breakdown.riparian_detail}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Breakdown */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <p className="text-sm text-white/60">
                    {result.breakdown.elc_detail}
                  </p>
                </div>
                {result.breakdown.judgement_detail && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-indigo-400 flex-shrink-0" />
                    <p className="text-sm text-white/60">
                      {result.breakdown.judgement_detail}
                    </p>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-purple-400 flex-shrink-0" />
                  <p className="text-sm text-white/60">
                    {result.breakdown.gazette_detail}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <p className="text-sm text-white/60">
                    {result.breakdown.community_detail}
                  </p>
                </div>
                {result.breakdown.rim_detail && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    <p className="text-sm text-white/60">
                      {result.breakdown.rim_detail}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Report meta */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-white/30">Report Reference</p>
                <p className="text-sm font-mono text-[#c8a96e]">
                  {result.report_number}
                </p>
              </div>
              <p className="text-xs text-white/30">
                {formatDate(result.checked_at)}
              </p>
            </div>

            {/* Paid report badge */}
            {result.paid && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center flex items-center justify-center gap-2">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-emerald-400">Full HatiScan&#8482; Report — All 12 layers verified</span>
              </div>
            )}

            {/* Document upload — included with paid report */}
            {!docResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[11px] text-white/30 uppercase tracking-widest">Upload title deed for document analysis</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <div
                  className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                    converting
                      ? "border-[#c8a96e]/30 bg-[#c8a96e]/5 cursor-wait"
                      : uploadedFile
                        ? "border-[#c8a96e]/50 bg-[#c8a96e]/5 cursor-pointer"
                        : "border-white/10 hover:border-[#c8a96e]/30 cursor-pointer"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (converting) return;
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileSelected(file);
                  }}
                  onClick={() => { if (!converting) document.getElementById("hs-file-input")?.click(); }}
                >
                  <input
                    id="hs-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                  />
                  {converting ? (
                    <div>
                      <div className="mx-auto h-8 w-8 rounded-full border-2 border-[#c8a96e]/30 border-t-[#c8a96e] animate-spin mb-3" />
                      <p className="text-sm text-[#c8a96e] font-medium">Converting PDF — please wait...</p>
                      <p className="text-[11px] text-white/30 mt-1">Rendering page 1 for analysis</p>
                    </div>
                  ) : uploadedFile ? (
                    <div>
                      {pdfPreview ? (
                        <div className="mb-3 flex justify-center">
                          <img src={pdfPreview} alt="PDF page 1 preview" className="max-h-48 rounded-lg border border-[#c8a96e]/30 shadow-lg" />
                        </div>
                      ) : (
                        <svg className="mx-auto h-8 w-8 text-[#c8a96e] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      )}
                      <p className="text-sm text-[#c8a96e] font-medium">{uploadedFile.name}</p>
                      <p className="text-[11px] text-white/30 mt-1">{(uploadedFile.size / 1024).toFixed(0)} KB — Click to change</p>
                      {pdfPageCount > 0 && (
                        <p className="text-[11px] text-[#c8a96e]/80 mt-2 italic">Page 1 extracted for analysis{pdfPageCount > 1 ? ` (${pdfPageCount} pages total)` : ""}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <svg className="mx-auto h-8 w-8 text-white/20 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="text-sm text-white/40">Upload Title Deed for AI Document Analysis</p>
                      <p className="text-[11px] text-white/20 mt-1">PDF, JPG, or PNG — max 10MB — included with your report</p>
                    </div>
                  )}
                </div>
                {uploadedFile && !converting && (
                  <button
                    onClick={handleDocScan}
                    className="w-full rounded-xl bg-gradient-to-r from-[#c8a96e] to-[#a08040] px-6 py-3.5 text-sm font-semibold text-[#0a0f1a] transition-all hover:from-[#d4b87a] hover:to-[#b09050]"
                  >
                    Run Document Analysis
                  </button>
                )}
              </div>
            )}

            {/* Parcel Data — Ownership & Encumbrances */}
            {result.parcel_data && (
              <div className="rounded-2xl border border-[#c8a96e]/20 bg-[#c8a96e]/[0.03] p-6 space-y-4">
                <h3 className="text-sm font-semibold text-[#c8a96e] uppercase tracking-wider">
                  Parcel Registry Data
                </h3>

                {/* LR / Block / County */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {result.parcel_data.lr_number && (
                    <div>
                      <span className="text-white/40 text-xs">LR Number</span>
                      <p className="text-white font-medium">{result.parcel_data.lr_number}</p>
                    </div>
                  )}
                  {result.parcel_data.block_number && (
                    <div>
                      <span className="text-white/40 text-xs">Block Number</span>
                      <p className="text-white font-medium">{result.parcel_data.block_number}</p>
                    </div>
                  )}
                  {result.parcel_data.county && (
                    <div>
                      <span className="text-white/40 text-xs">County</span>
                      <p className="text-white font-medium">{result.parcel_data.county}</p>
                    </div>
                  )}
                  {result.parcel_data.area_sqm && (
                    <div>
                      <span className="text-white/40 text-xs">Area</span>
                      <p className="text-white font-medium">{result.parcel_data.area_sqm.toLocaleString()} sqm</p>
                    </div>
                  )}
                </div>

                {/* Confidence Score */}
                {result.parcel_data.confidence_score !== null && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          result.parcel_data.confidence_score >= 0.8 ? "bg-emerald-500" :
                          result.parcel_data.confidence_score >= 0.5 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${result.parcel_data.confidence_score * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/60 font-mono">
                      {Math.round(result.parcel_data.confidence_score * 100)}% confidence
                    </span>
                  </div>
                )}

                {/* Ownership */}
                {result.parcel_data.ownership && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Registered Owner</p>
                    <p className="text-white font-medium">{result.parcel_data.ownership.owner || "Not available"}</p>
                    <div className="mt-2 flex gap-4 text-xs text-white/40">
                      {result.parcel_data.ownership.title_type && <span>{result.parcel_data.ownership.title_type}</span>}
                      {result.parcel_data.ownership.owner_type && <span>{result.parcel_data.ownership.owner_type}</span>}
                      {result.parcel_data.ownership.verified_date && (
                        <span>Verified {new Date(result.parcel_data.ownership.verified_date).toLocaleDateString("en-GB")}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Encumbrances */}
                {result.parcel_data.encumbrances.length > 0 ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                      Encumbrances ({result.parcel_data.encumbrances.length})
                    </p>
                    {result.parcel_data.encumbrances.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                        <span className="text-red-400 text-xs mt-0.5">!</span>
                        <div>
                          <p className="text-sm text-white/80">{e.type}: {e.holder}</p>
                          {e.gazette_reference && <p className="text-xs text-white/40">{e.gazette_reference}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : result.parcel_data.ownership && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-emerald-400">No encumbrances found</span>
                  </div>
                )}

                {/* Data Sources */}
                {result.parcel_data.data_sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.parcel_data.data_sources.map((src, i) => (
                      <span key={i} className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] text-white/50">
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10"
              >
                {copied ? "Copied!" : "Share Result"}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 rounded-xl bg-[#c8a96e] py-3 text-sm font-semibold text-[#0a0f1a] transition hover:bg-[#d4b87a]"
              >
                Check Another Title
              </button>
            </div>

            {/* Parcel-Level Analysis CTAs */}
            <div className="space-y-2">
              <div className="text-[10px] text-white/30 tracking-wider text-center">
                PARCEL-LEVEL SPATIAL ANALYSIS
              </div>
              <button
                onClick={() => setStep("survey")}
                className="w-full rounded-xl border border-[#c8a96e]/30 bg-[#c8a96e]/5 py-4 text-sm transition hover:bg-[#c8a96e]/10"
              >
                <div className="font-semibold text-[#c8a96e]">
                  Upload Survey Plan for Exact Boundaries
                </div>
                <div className="mt-1 text-xs text-white/40">
                  Extract geometry from deed plan, PDP, or survey document
                </div>
              </button>
              <button
                onClick={() => setStep("spatial")}
                className="w-full rounded-xl border border-white/10 bg-white/[0.02] py-4 text-sm transition hover:bg-white/5"
              >
                <div className="font-medium text-white/70">
                  Draw Plot on Map
                </div>
                <div className="mt-1 text-xs text-white/30">
                  No survey plan? Draw an approximate boundary instead
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3b: SURVEY PLAN PARSER ────────────────── */}
        {step === "survey" && (
          <div className="space-y-4">
            <SurveyPlanParser
              parcelReference={parcel}
              onBack={() => setStep("results")}
            />
          </div>
        )}

        {/* ── STEP 3c: DRAW ON MAP ──────────────────────── */}
        {step === "spatial" && (
          <div className="space-y-4">
            <ParcelDrawMap
              parcelReference={parcel}
              onBack={() => setStep("results")}
            />
          </div>
        )}

        {/* ── STEP 4: DOC LOADING ─────────────────────────── */}
        {step === "doc-loading" && (
          <div className="text-center py-16">
            <div className="mx-auto h-12 w-12 rounded-full border-4 border-[#c8a96e]/30 border-t-[#c8a96e] animate-spin mb-6" />
            <h2 className="font-serif text-2xl font-bold text-white">Analysing document...</h2>
            <p className="mt-2 text-sm text-white/40">AI is extracting fields, checking for forgery indicators, and cross-referencing databases</p>
          </div>
        )}

        {/* ── STEP 5: DOC RESULTS ──────────────────────────── */}
        {step === "doc-results" && docResult && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              {docResult.is_incomplete || docResult.trust_score === null ? (
                <div className="inline-flex items-center justify-center">
                  <div className="relative h-[140px] w-[140px] rounded-full border-4 border-amber-500/30 flex flex-col items-center justify-center">
                    <div className="text-4xl font-bold text-amber-400">—</div>
                    <div className="text-[10px] text-amber-400/70 uppercase tracking-wider mt-1">Incomplete</div>
                  </div>
                </div>
              ) : (
                <ScoreCircle score={docResult.trust_score} verdict={docResult.verdict} />
              )}
              <div className="mt-4">
                {docResult.is_incomplete ? (
                  <span className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-amber-500/10 border-amber-500/30 border text-amber-400">
                    Incomplete Scan
                  </span>
                ) : (
                  <span className={`inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${verdictConfig[docResult.verdict as keyof typeof verdictConfig]?.bg || "bg-slate-500/10"} ${verdictConfig[docResult.verdict as keyof typeof verdictConfig]?.border || "border-slate-500/30"} border ${verdictConfig[docResult.verdict as keyof typeof verdictConfig]?.text || "text-slate-400"}`}>
                    {verdictConfig[docResult.verdict as keyof typeof verdictConfig]?.label || docResult.verdict}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-white/40">Document type: {docResult.document_type}</p>
              <p className="text-xs text-white/30 font-mono">{docResult.report_number}</p>
            </div>

            {/* Incomplete document warning */}
            {docResult.is_incomplete && docResult.incomplete_message && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 flex items-start gap-3">
                <svg className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="text-sm font-bold text-amber-400 mb-1">Incomplete Document Detected</h3>
                  <p className="text-xs text-amber-200/80 leading-relaxed">{docResult.incomplete_message}</p>
                </div>
              </div>
            )}

            {/* Chapter 300 REPEALED warning */}
            {docResult.is_chapter_300_repealed && docResult.repealed_warning && (
              <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-6 flex items-start gap-3">
                <svg className="h-6 w-6 text-orange-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <h3 className="text-sm font-bold text-orange-400 mb-1">Chapter 300 REPEALED — NLIMS Migration Required</h3>
                  <p className="text-xs text-orange-200/80 leading-relaxed">{docResult.repealed_warning}</p>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Extracted Fields</h3>
                {docResult.deed_format && docResult.deed_format !== "unknown" && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    docResult.deed_format === "chapter_300_repealed"
                      ? "bg-orange-500/20 text-orange-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}>
                    {docResult.deed_format === "chapter_300_repealed" ? "Cap. 300 (Repealed)" : "LRA 2012"}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {[
                  { label: "Title Number", value: docResult.extracted_fields.title_number, match: docResult.extracted_fields.title_match },
                  { label: "IR Number", value: docResult.extracted_fields.ir_number },
                  { label: "Volume / Folio", value:
                    [docResult.extracted_fields.volume, docResult.extracted_fields.folio]
                      .filter(Boolean).join(" / ") || null },
                  { label: "Block / Plot", value: docResult.extracted_fields.block_plot },
                  { label: "Location (in brackets)", value: docResult.extracted_fields.location_in_brackets },
                  { label: "Registered Owner", value: docResult.extracted_fields.registered_owner },
                  { label: "County", value: docResult.extracted_fields.county },
                  { label: "Plot Area", value: docResult.extracted_fields.plot_area },
                  { label: "Registration Date", value: docResult.extracted_fields.registration_date },
                ].filter((f) => f.value || f.label === "Title Number" || f.label === "Registered Owner" || f.label === "County").map((field) => (
                  <div key={field.label} className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-xs text-white/40">{field.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${'match' in field && field.match === false ? "text-red-400" : "text-white"}`}>
                        {field.value || "—"}
                      </span>
                      {'match' in field && field.value && field.match !== null && field.match !== undefined && (
                        field.match ? (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-semibold">Match</span>
                        ) : (
                          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400 font-semibold">Mismatch</span>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Administrative Hierarchy — resolved from kenya_places gazetteer */}
            {docResult.resolved_hierarchy && (docResult.resolved_hierarchy.county || docResult.resolved_hierarchy.location_approximate) && (
              <div className={`rounded-2xl border p-6 space-y-3 ${
                docResult.resolved_hierarchy.location_approximate
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-emerald-500/20 bg-emerald-500/5"
              }`}>
                <div className="flex items-center gap-2">
                  <svg className={`h-4 w-4 ${docResult.resolved_hierarchy.location_approximate ? "text-amber-400" : "text-emerald-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                    Administrative Location
                  </h3>
                  {docResult.resolved_hierarchy.location_approximate ? (
                    <span className="text-[10px] text-amber-400 font-semibold">APPROXIMATE</span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-semibold">VERIFIED</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {docResult.resolved_hierarchy.county && (
                    <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-white font-medium">
                      {docResult.resolved_hierarchy.county} County
                    </span>
                  )}
                  {docResult.resolved_hierarchy.subcounty && (
                    <>
                      <span className="text-white/30">›</span>
                      <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-white/80">
                        {docResult.resolved_hierarchy.subcounty}
                      </span>
                    </>
                  )}
                  {docResult.resolved_hierarchy.ward && (
                    <>
                      <span className="text-white/30">›</span>
                      <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-white/80">
                        {docResult.resolved_hierarchy.ward} Ward
                      </span>
                    </>
                  )}
                  {docResult.resolved_hierarchy.location && (
                    <>
                      <span className="text-white/30">›</span>
                      <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-white/80">
                        {docResult.resolved_hierarchy.location}
                      </span>
                    </>
                  )}
                  {docResult.resolved_hierarchy.sublocation && (
                    <>
                      <span className="text-white/30">›</span>
                      <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-white/80">
                        {docResult.resolved_hierarchy.sublocation}
                      </span>
                    </>
                  )}
                </div>

                {docResult.resolved_hierarchy.approximate_message && (
                  <p className="text-[11px] text-amber-300/80 italic">
                    {docResult.resolved_hierarchy.approximate_message}
                  </p>
                )}

                {docResult.resolved_hierarchy.source === "kenya_gazetteer" &&
                  docResult.resolved_hierarchy.ai_extracted_county &&
                  docResult.resolved_hierarchy.ai_extracted_county.toLowerCase() !==
                    (docResult.resolved_hierarchy.county || "").toLowerCase() && (
                    <p className="text-[11px] text-white/40 italic">
                      Note: AI extracted &ldquo;{docResult.resolved_hierarchy.ai_extracted_county}&rdquo;
                      from the document, but the Kenya administrative gazetteer places this parcel in{" "}
                      {docResult.resolved_hierarchy.county} County. Gazetteer takes precedence.
                    </p>
                  )}

                <p className="text-[10px] text-white/30">
                  Resolved from Kenya administrative hierarchy (47 counties › 290 sub-counties › 1,448 wards › 2,656 locations › 6,858 sub-locations)
                </p>
              </div>
            )}

            {/* Forgery Risk — critical issues only */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Forgery Risk</h3>
              {docResult.forgery_flags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {docResult.forgery_flags.map((flag, i) => (
                    <span key={i} className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs text-red-400">{flag}</span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-emerald-400 font-medium">No forgery indicators detected</span>
                </div>
              )}
            </div>

            {/* Quality Notes — advisory, not fraud */}
            {docResult.quality_notes && docResult.quality_notes.length > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-3">
                <h3 className="text-sm font-semibold text-amber-400/80 uppercase tracking-wider">Document Quality Notes</h3>
                <p className="text-[11px] text-white/30">These are quality observations, not fraud indicators. Common for photocopied Kenya title deeds.</p>
                <div className="flex flex-wrap gap-2">
                  {docResult.quality_notes.map((note, i) => (
                    <span key={i} className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs text-amber-400">{note}</span>
                  ))}
                </div>
              </div>
            )}

            {docResult.metadata.creator && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Document Metadata</h3>
                <div className="space-y-2 text-sm">
                  {docResult.metadata.created && <div className="flex justify-between"><span className="text-white/40">Created</span><span className="text-white/70">{docResult.metadata.created}</span></div>}
                  {docResult.metadata.modified && <div className="flex justify-between"><span className="text-white/40">Modified</span><span className="text-white/70">{docResult.metadata.modified}</span></div>}
                  <div className="flex justify-between">
                    <span className="text-white/40">Creator</span>
                    <span className={`font-medium ${docResult.metadata.risk_level === "high" ? "text-red-400" : "text-white/70"}`}>
                      {docResult.metadata.creator}{docResult.metadata.risk_level === "high" && " — HIGH RISK"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Parcel-specific counter boxes */}
            <div>
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">
                Parcel-Specific Matches
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { n: docResult.elc_cases_found, l: "Court Cases" },
                  { n: docResult.gazette_hits, l: "Gazette Notices" },
                  { n: docResult.community_flags, l: "Community Flags" },
                ].map((m) => (
                  <div key={m.l} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                    <div className={`text-2xl font-bold ${docResult.is_incomplete ? "text-amber-400" : m.n === 0 ? "text-emerald-400" : "text-amber-300"}`}>
                      {docResult.is_incomplete ? "—" : m.n}
                    </div>
                    <div className="mt-1 text-[11px] text-white/40">{m.l}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-white/40 text-center">
                {docResult.is_incomplete
                  ? "Parcel-specific search cannot be completed on a partial document"
                  : docResult.elc_cases_found === 0 &&
                    docResult.gazette_hits === 0 &&
                    docResult.community_flags === 0
                    ? "No records found specifically matching this parcel, owner, or location"
                    : "Records below relate to this parcel, its owner, or its specific location"}
              </p>
            </div>

            {/* Location activity — searches on title keywords */}
            {docResult.location_activity && docResult.location_activity.keywords.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#c8a96e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                    Related Area Activity
                  </h3>
                  <span className="text-[10px] text-white/30">informational only</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {docResult.location_activity.keywords.map((kw) => (
                    <span key={kw} className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[11px] font-mono text-white/70">
                      {kw}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <div className="text-base font-semibold text-white/80">{docResult.location_activity.elc_matches.toLocaleString()}</div>
                    <div className="text-[10px] text-white/40">court cases</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <div className="text-base font-semibold text-white/80">{docResult.location_activity.gazette_matches.toLocaleString()}</div>
                    <div className="text-[10px] text-white/40">gazette notices</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <div className="text-base font-semibold text-white/80">{docResult.location_activity.riparian_matches.toLocaleString()}</div>
                    <div className="text-[10px] text-white/40">riparian features</div>
                  </div>
                </div>
                <p className="text-[11px] text-white/30 italic">{docResult.location_activity.message}</p>
              </div>
            )}

            {/* County Risk Context — informational only */}
            {docResult.county_context && docResult.county_context.county && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#c8a96e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                    County Risk Context
                  </h3>
                  <span className="text-[10px] text-white/30">informational only</span>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">
                  {docResult.county_context.message}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <div className="text-base font-semibold text-white/80">
                      {docResult.county_context.elc_cases_in_county.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-white/40">court cases in county</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <div className="text-base font-semibold text-white/80">
                      {docResult.county_context.gazette_notices_in_county.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-white/40">gazette notices in county</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <div className="text-base font-semibold text-white/80">
                      {docResult.county_context.riparian_zones_in_county.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-white/40">riparian zones</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <div className="text-base font-semibold text-white/80">
                      {docResult.county_context.road_reserves_in_county.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-white/40">road reserves</div>
                  </div>
                </div>
                <p className="text-[11px] text-white/30 italic">
                  These numbers describe the entire {docResult.county_context.county} County and do not affect your trust score.
                </p>
              </div>
            )}

            {/* ── Spatial Geometry (from parallel survey parse) ── */}
            {docResult.survey_geometry && (
              <div className="rounded-2xl border border-[#c8a96e]/20 bg-[#c8a96e]/5 p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📐</span>
                  <h3 className="text-sm font-semibold text-[#c8a96e] uppercase tracking-wider">
                    Parcel Geometry Extracted
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    docResult.survey_geometry.confidence === "High"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : docResult.survey_geometry.confidence === "Medium"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                  }`}>
                    {docResult.survey_geometry.confidence} confidence
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {docResult.survey_geometry.geometry_method && (
                    <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                      <div className="text-[10px] text-white/40">Method</div>
                      <div className="text-xs text-white/80">{docResult.survey_geometry.geometry_method}</div>
                    </div>
                  )}
                  {docResult.survey_geometry.bearings?.length > 0 && (
                    <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                      <div className="text-[10px] text-white/40">Bearings</div>
                      <div className="text-xs text-white/80">{docResult.survey_geometry.bearings.length} lines extracted</div>
                    </div>
                  )}
                  {docResult.survey_geometry.corner_coordinates?.length > 0 && (
                    <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                      <div className="text-[10px] text-white/40">Coordinates</div>
                      <div className="text-xs text-white/80">{docResult.survey_geometry.corner_coordinates.length} corner points</div>
                    </div>
                  )}
                  {docResult.survey_geometry.datum_reference && (
                    <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                      <div className="text-[10px] text-white/40">Datum</div>
                      <div className="text-xs text-white/80">{docResult.survey_geometry.datum_reference}</div>
                    </div>
                  )}
                </div>

                {/* Spatial risks from geometry analysis */}
                {(docResult.survey_geometry.spatial_risks?.length ?? 0) > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-[10px] text-white/30 tracking-wider">
                      PARCEL-LEVEL SPATIAL RISKS ({docResult.survey_geometry.spatial_risks!.length})
                    </div>
                    {docResult.survey_geometry.spatial_verdict && (
                      <div className={`text-center py-2 rounded-lg ${
                        docResult.survey_geometry.spatial_verdict === "clear" ? "bg-emerald-500/10 text-emerald-400"
                        : docResult.survey_geometry.spatial_verdict === "caution" ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                      }`}>
                        <span className="text-sm font-bold uppercase">{docResult.survey_geometry.spatial_verdict.replace("_", " ")}</span>
                      </div>
                    )}
                    {docResult.survey_geometry.spatial_risks!.slice(0, 8).map((risk: { feature_name: string; risk_type: string; severity: string; overlap_percentage: number; distance_metres: number; legal_basis: string }, i: number) => (
                      <div key={i} className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 ${
                        risk.severity === "critical" || risk.severity === "high" ? "bg-red-500/10" : "bg-white/[0.03]"
                      }`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white truncate">{risk.feature_name}</div>
                          <div className="text-[9px] text-white/30">{risk.risk_type.replace("_", " ")} — {risk.legal_basis}</div>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          {risk.overlap_percentage > 0 ? (
                            <span className="text-xs font-mono text-red-400">{risk.overlap_percentage.toFixed(1)}% overlap</span>
                          ) : (
                            <span className="text-xs font-mono text-white/40">{Math.round(risk.distance_metres)}m</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {docResult.survey_geometry.stored_parcel_reference && (
                  <p className="text-[11px] text-emerald-400/60 italic">
                    Geometry stored as {docResult.survey_geometry.stored_parcel_reference} — future scans on this parcel will use exact boundaries automatically.
                  </p>
                )}

                {docResult.survey_geometry.summary && (
                  <p className="text-[11px] text-white/40 italic">{docResult.survey_geometry.summary}</p>
                )}
              </div>
            )}

            {/* No geometry extracted — offer manual options */}
            {!docResult.survey_geometry && (
              <div className="space-y-2">
                <div className="text-[10px] text-white/30 tracking-wider text-center">
                  PARCEL-LEVEL SPATIAL ANALYSIS
                </div>
                <button
                  onClick={() => setStep("survey")}
                  className="w-full rounded-xl border border-[#c8a96e]/30 bg-[#c8a96e]/5 py-4 text-sm transition hover:bg-[#c8a96e]/10"
                >
                  <div className="font-semibold text-[#c8a96e]">Upload Survey Plan for Exact Boundaries</div>
                  <div className="mt-1 text-xs text-white/40">Deed plan, PDP, or survey document with bearings</div>
                </button>
                <button
                  onClick={() => setStep("spatial")}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] py-4 text-sm transition hover:bg-white/5"
                >
                  <div className="font-medium text-white/70">Draw Plot on Map</div>
                  <div className="mt-1 text-xs text-white/30">Draw an approximate boundary for spatial risk check</div>
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleCopy} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10">
                {copied ? "Copied!" : "Share Result"}
              </button>
              <button onClick={handleReset} className="flex-1 rounded-xl bg-[#c8a96e] py-3 text-sm font-semibold text-[#0a0f1a] transition hover:bg-[#d4b87a]">
                Scan Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
