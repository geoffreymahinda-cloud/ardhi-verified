"use client";

import { useState } from "react";
import Link from "next/link";

const tabs = [
  { key: "browse", label: "Browse Land" },
  { key: "verify", label: "Verify Title" },
  { key: "search", label: "LR Search" },
  { key: "apartments", label: "Apartments" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const countyOptions = [
  "Nairobi", "Kiambu", "Nakuru", "Mombasa", "Kisumu", "Machakos",
  "Kajiado", "Uasin Gishu", "Nyeri", "Murang'a",
];

const filters = ["For Sale", "Agricultural", "Commercial"];

interface ExtractResult {
  lr_number: string | null;
  block_number: string | null;
  county: string | null;
  registered_owner: string | null;
  property_description: string | null;
  title_type: string | null;
  confidence: number;
  is_sectional?: boolean;
  sectional_plan_no?: string | null;
  unit_number?: string | null;
  development_name?: string | null;
  parent_lr_number?: string | null;
}

export default function HomeHeroTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [activeFilter, setActiveFilter] = useState("For Sale");
  const [dragOver, setDragOver] = useState(false);
  const [aptSearch, setAptSearch] = useState("");
  const [propertyMode, setPropertyMode] = useState<"freehold" | "sectional">("freehold");

  // Inline extraction state — no redirects
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [extractError, setExtractError] = useState("");
  const [extractedLR, setExtractedLR] = useState("");

  function handleBrowseSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (activeFilter === "Agricultural") params.set("use", "Agricultural");
    if (activeFilter === "Commercial") params.set("use", "Commercial");
    window.location.href = `/search?${params}`;
  }

  function handleLRSearch(e: React.FormEvent) {
    e.preventDefault();
    if (lrNumber.trim()) {
      window.location.href = `/hatiscan?parcel=${encodeURIComponent(lrNumber.trim())}`;
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFileInline(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) processFileInline(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  async function processFileInline(file: File) {
    setExtracting(true);
    setExtractResult(null);
    setExtractError("");
    setExtractedLR("");

    // If PDF, we need to convert to image first (client-side)
    let imageFile = file;
    if (file.type === "application/pdf") {
      try {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const blob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
            "image/jpeg",
            0.92
          );
        });
        imageFile = new File([blob], "page1.jpg", { type: "image/jpeg" });
      } catch {
        setExtractError("Could not read this PDF. Try uploading a photo instead.");
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
        throw new Error(data.error || "Could not read document");
      }

      setExtractResult(data);
      const ref = data.lr_number || data.block_number || "";
      setExtractedLR(ref);
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : "Could not analyze this image. Try typing the LR number instead."
      );
    } finally {
      setExtracting(false);
    }
  }

  function handleConfirmScan() {
    if (!extractedLR.trim()) return;
    // Route sectional titles to sectional search
    if (extractResult?.is_sectional) {
      const q = extractResult.development_name || extractResult.sectional_plan_no || extractedLR;
      window.location.href = `/sectional/search?q=${encodeURIComponent(q)}`;
    } else {
      window.location.href = `/hatiscan?parcel=${encodeURIComponent(extractedLR.trim())}`;
    }
  }

  function handleResetExtract() {
    setExtractResult(null);
    setExtractError("");
    setExtractedLR("");
    setExtracting(false);
  }

  return (
    <div className="relative mx-auto max-w-2xl w-full">
      {/* Tab card */}
      <div className="rounded-2xl bg-white shadow-2xl shadow-black/20 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); handleResetExtract(); }}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "text-ardhi border-b-2 border-ardhi bg-white"
                  : "text-gray-400 hover:text-gray-600 bg-gray-50/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* Tab 1: Browse Land */}
          {activeTab === "browse" && (
            <form onSubmit={handleBrowseSearch}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by county, town or area..."
                    list="county-suggestions"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-ardhi focus:outline-none focus:ring-2 focus:ring-ardhi/20"
                  />
                  <datalist id="county-suggestions">
                    {countyOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-ardhi px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-ardhi-dark flex-shrink-0"
                >
                  Search
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                {filters.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActiveFilter(f)}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                      activeFilter === f
                        ? "bg-ardhi/10 text-ardhi border border-ardhi/30"
                        : "bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </form>
          )}

          {/* Tab 2: Verify Title Deed — fully inline, no redirect */}
          {activeTab === "verify" && (
            <div>
              {/* STATE: Extracting — spinner */}
              {extracting && (
                <div className="py-10 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full border-2 border-[#c8a96e]/30 border-t-[#c8a96e] animate-spin mb-4" />
                  <p className="text-sm font-medium text-gray-700">Reading your title deed...</p>
                  <p className="text-xs text-gray-400 mt-1">AI is extracting the LR number and property details</p>
                </div>
              )}

              {/* STATE: Error */}
              {!extracting && extractError && (
                <div className="py-6 text-center">
                  <p className="text-sm text-red-600 mb-4">{extractError}</p>
                  <button
                    onClick={handleResetExtract}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* STATE: Result — show extracted fields inline */}
              {!extracting && !extractError && extractResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-emerald-700">Document read successfully</span>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                    {/* Editable LR number */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">LR / Title Number</label>
                      <input
                        type="text"
                        value={extractedLR}
                        onChange={(e) => setExtractedLR(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#c8a96e] focus:outline-none focus:ring-1 focus:ring-[#c8a96e]/30"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {extractResult.registered_owner && (
                        <div className="col-span-2">
                          <span className="text-xs text-gray-400">Owner</span>
                          <p className="font-medium text-gray-900">{extractResult.registered_owner}</p>
                        </div>
                      )}
                      {extractResult.county && (
                        <div>
                          <span className="text-xs text-gray-400">County</span>
                          <p className="text-gray-700">{extractResult.county}</p>
                        </div>
                      )}
                      {extractResult.title_type && (
                        <div>
                          <span className="text-xs text-gray-400">Type</span>
                          <p className="text-gray-700 capitalize">{extractResult.title_type}</p>
                        </div>
                      )}
                    </div>

                    {/* Sectional fields */}
                    {extractResult.is_sectional && (
                      <div className="rounded-lg bg-[#c8a96e]/5 border border-[#c8a96e]/20 p-3 space-y-2">
                        <span className="text-[10px] font-bold text-[#c8a96e] uppercase tracking-wider">Sectional Title Detected</span>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {extractResult.development_name && (
                            <div className="col-span-2">
                              <span className="text-xs text-gray-400">Building</span>
                              <p className="font-medium text-gray-900">{extractResult.development_name}</p>
                            </div>
                          )}
                          {extractResult.unit_number && (
                            <div>
                              <span className="text-xs text-gray-400">Unit</span>
                              <p className="text-gray-700">{extractResult.unit_number}</p>
                            </div>
                          )}
                          {extractResult.sectional_plan_no && (
                            <div>
                              <span className="text-xs text-gray-400">S.P. No.</span>
                              <p className="text-gray-700 font-mono text-xs">{extractResult.sectional_plan_no}</p>
                            </div>
                          )}
                          {extractResult.parent_lr_number && (
                            <div className="col-span-2">
                              <span className="text-xs text-gray-400">Parent LR</span>
                              <p className="text-gray-700 font-mono text-xs">{extractResult.parent_lr_number}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Confidence */}
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            extractResult.confidence >= 0.8 ? "bg-emerald-500" :
                            extractResult.confidence >= 0.5 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${extractResult.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {extractResult.confidence >= 0.8 ? "High" : extractResult.confidence >= 0.5 ? "Medium" : "Low"} confidence
                      </span>
                    </div>
                  </div>

                  {/* Confirm + Reset buttons */}
                  <button
                    onClick={handleConfirmScan}
                    disabled={!extractedLR.trim()}
                    className="w-full rounded-xl bg-[#c8a96e] py-3.5 text-sm font-semibold text-white transition hover:bg-[#b89a5e] disabled:opacity-40"
                  >
                    Run full HatiScan report on {extractedLR || "this title"}
                  </button>
                  <button
                    onClick={handleResetExtract}
                    className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Upload a different document
                  </button>
                </div>
              )}

              {/* STATE: Default — upload zone (only when not extracting/showing result) */}
              {!extracting && !extractError && !extractResult && (
                <>
                  <div
                    className={`rounded-xl border-2 border-dashed py-8 px-6 text-center cursor-pointer transition-all ${
                      dragOver
                        ? "border-[#c8a96e] bg-[#c8a96e]/5"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                    onDragLeave={(e) => { e.stopPropagation(); setDragOver(false); }}
                    onDrop={handleFileDrop}
                    onClick={(e) => { e.stopPropagation(); document.getElementById("home-upload")?.click(); }}
                  >
                    <input
                      id="home-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                    <svg className="mx-auto h-10 w-10 text-gray-300 mb-3 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <svg className="mx-auto h-10 w-10 text-gray-300 mb-3 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-600 sm:hidden">Take a photo of your title deed</p>
                    <p className="text-sm font-medium text-gray-600 hidden sm:block">Drag &amp; drop your title deed, or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, or PDF — AI extracts the LR number automatically</p>
                  </div>

                  {/* Mobile camera button */}
                  <label className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm font-medium text-gray-500 cursor-pointer sm:hidden hover:bg-gray-100">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    Open Camera
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />
                  </label>

                  <p className="text-center text-xs text-gray-400 mt-3">Upload or photograph your title deed. Full report in 60 seconds.</p>
                </>
              )}
            </div>
          )}

          {/* Tab 3: Search by LR Number */}
          {activeTab === "search" && (
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!lrNumber.trim()) return;
              if (propertyMode === "sectional") {
                window.location.href = `/sectional/search?q=${encodeURIComponent(lrNumber.trim())}`;
              } else {
                window.location.href = `/hatiscan?parcel=${encodeURIComponent(lrNumber.trim())}`;
              }
            }}>
              {/* Freehold / Sectional toggle */}
              <div className="flex rounded-lg bg-gray-100 p-0.5 mb-4">
                <button
                  type="button"
                  onClick={() => setPropertyMode("freehold")}
                  className={`flex-1 rounded-md py-2 text-xs font-semibold transition ${
                    propertyMode === "freehold"
                      ? "bg-white text-navy shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Freehold / Lease
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyMode("sectional")}
                  className={`flex-1 rounded-md py-2 text-xs font-semibold transition ${
                    propertyMode === "sectional"
                      ? "bg-white text-[#c8a96e] shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Sectional / Apartment
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={lrNumber}
                  onChange={(e) => setLrNumber(e.target.value)}
                  placeholder={propertyMode === "sectional"
                    ? "Development name, unit number, or S.P. No..."
                    : "e.g. LR 209/21922 or Nairobi Block 45/78"
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#c8a96e] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/20"
                />
                <button
                  type="submit"
                  disabled={!lrNumber.trim()}
                  className="w-full rounded-xl bg-[#c8a96e] py-3.5 text-sm font-semibold text-white transition hover:bg-[#b89a5e] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Search
                </button>
              </div>
              <p className="text-center text-xs text-gray-400 mt-3">
                {propertyMode === "sectional"
                  ? "Apartments, flats, and multi-unit developments"
                  : "Supports LR, IR, FR, CR numbers and Nairobi Block references"
                }
              </p>
            </form>
          )}

          {/* Tab 4: Apartments / Sectional */}
          {activeTab === "apartments" && (
            <form onSubmit={(e) => {
              e.preventDefault();
              if (aptSearch.trim()) {
                window.location.href = `/sectional/search?q=${encodeURIComponent(aptSearch.trim())}`;
              }
            }}>
              <div className="space-y-3">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                  <input
                    type="text"
                    value={aptSearch}
                    onChange={(e) => setAptSearch(e.target.value)}
                    placeholder="Search by building name, developer, or unit number..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#c8a96e] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!aptSearch.trim()}
                  className="w-full rounded-xl bg-[#c8a96e] py-3.5 text-sm font-semibold text-white transition hover:bg-[#b89a5e] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Search Apartments
                </button>
              </div>
              <p className="text-center text-xs text-gray-400 mt-3">
                Sectional titles — apartments, flats, and multi-unit developments not covered by Ardhisasa
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
