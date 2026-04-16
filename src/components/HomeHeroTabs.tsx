"use client";

import { useState } from "react";
import Link from "next/link";

const tabs = [
  { key: "browse", label: "Browse Land" },
  { key: "verify", label: "Verify a Title Deed" },
  { key: "search", label: "Search by LR Number" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const countyOptions = [
  "Nairobi", "Kiambu", "Nakuru", "Mombasa", "Kisumu", "Machakos",
  "Kajiado", "Uasin Gishu", "Nyeri", "Murang'a",
];

const filters = ["For Sale", "Agricultural", "Commercial"];

export default function HomeHeroTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [activeFilter, setActiveFilter] = useState("For Sale");
  const [dragOver, setDragOver] = useState(false);

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
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) redirectWithFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) redirectWithFile(file);
  }

  function redirectWithFile(_file: File) {
    // Can't pass files across navigation — redirect to HatiScan with a hint
    window.location.href = "/hatiscan?upload=true";
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
              onClick={() => setActiveTab(tab.key)}
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

          {/* Tab 2: Verify Title Deed */}
          {activeTab === "verify" && (
            <div>
              <div
                className={`rounded-xl border-2 border-dashed py-8 px-6 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-[#c8a96e] bg-[#c8a96e]/5"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById("home-upload")?.click()}
              >
                <input
                  id="home-upload"
                  type="file"
                  accept="image/*,application/pdf"
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
              <Link
                href="/hatiscan"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#c8a96e] py-3.5 text-sm font-semibold text-white transition hover:bg-[#b89a5e]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Scan Title Deed
              </Link>
              <p className="text-center text-xs text-gray-400 mt-2">Upload or photograph your title deed. Full report in 60 seconds.</p>
            </div>
          )}

          {/* Tab 3: Search by LR Number */}
          {activeTab === "search" && (
            <form onSubmit={handleLRSearch}>
              <div className="space-y-3">
                <input
                  type="text"
                  value={lrNumber}
                  onChange={(e) => setLrNumber(e.target.value)}
                  placeholder="e.g. LR 209/21922 or Nairobi Block 45/78"
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
                Supports LR, IR, FR, CR numbers and Nairobi Block references
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
