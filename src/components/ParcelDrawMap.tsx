"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// ── Types ──────────────────────────────────────────────────────────────────

interface SpatialRisk {
  feature_name: string;
  severity: string;
  legal_basis: string;
  overlap_sqm: number;
  overlap_percentage: number;
  distance_metres: number;
  details: Record<string, unknown>;
}

interface SpatialSummary {
  risk_type: string;
  count: number;
  highest_severity: string;
  any_overlap: boolean;
  max_overlap_pct: number;
  nearest_metres: number;
}

interface SpatialResult {
  spatial_verdict: "clear" | "caution" | "high_risk" | "critical";
  total_risks_found: number;
  parcel_center: { lat: number; lng: number };
  summary: SpatialSummary[];
  risks: Record<string, SpatialRisk[]>;
  analysed_at: string;
}

interface ParcelDrawMapProps {
  parcelReference?: string;
  onAnalysisComplete?: (result: SpatialResult) => void;
  onBack?: () => void;
}

// ── Severity colours ───────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#eab308",
  low: "#22c55e",
};

const VERDICT_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  clear: { label: "CLEAR", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  caution: { label: "CAUTION", color: "text-amber-400", bg: "bg-amber-500/10" },
  high_risk: {
    label: "HIGH RISK",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  critical: {
    label: "CRITICAL",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
};

const RISK_LABELS: Record<string, string> = {
  road_reserve: "Road Reserve",
  protected_zone: "Protected Zone",
  flood_zone: "Flood Zone",
  riparian_zone: "Riparian Zone",
  forest_reserve: "Forest Reserve",
};

// ── Map Component (loaded dynamically to avoid SSR issues) ─────────────────

function MapInner({ parcelReference, onAnalysisComplete, onBack }: ParcelDrawMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const drawnLayerRef = useRef<L.FeatureGroup | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<GeoJSON.Geometry | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState<SpatialResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (initializedRef.current || !mapContainerRef.current) return;
    initializedRef.current = true;

    const L = require("leaflet") as typeof import("leaflet");
    require("leaflet/dist/leaflet.css");
    require("leaflet-draw");
    require("leaflet-draw/dist/leaflet.draw.css");

    // Fix default marker icons
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    // Create map centered on Kenya
    const map = L.map(mapContainerRef.current!, {
      center: [-1.2921, 36.8219], // Nairobi
      zoom: 7,
      zoomControl: true,
    });

    // Dark tile layer
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }
    ).addTo(map);

    // Satellite layer (toggle)
    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "&copy; Esri",
        maxZoom: 19,
      }
    );

    // Layer control
    L.control
      .layers(
        { Dark: map.options.layers?.[0] as L.Layer, Satellite: satellite },
        {},
        { position: "topright" }
      )
      .addTo(map);

    // Drawing layer
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnLayerRef.current = drawnItems;

    // Draw control
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drawControl = new (L.Control as any).Draw({
      position: "topleft",
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: "#c8a96e",
            weight: 2,
            fillOpacity: 0.15,
          },
        },
        rectangle: {
          shapeOptions: {
            color: "#c8a96e",
            weight: 2,
            fillOpacity: 0.15,
          },
        },
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
      },
      edit: {
        featureGroup: drawnItems,
      },
    }) as L.Control;
    map.addControl(drawControl);

    // Handle draw events
    map.on("draw:created" as string, (e: unknown) => {
      const event = e as { layer: L.Layer };
      drawnItems.clearLayers();
      drawnItems.addLayer(event.layer);
      const geojson = (event.layer as L.Polygon).toGeoJSON();
      setDrawnPolygon(geojson.geometry);
      setResult(null);
      setError(null);
    });

    map.on("draw:deleted" as string, () => {
      setDrawnPolygon(null);
      setResult(null);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      initializedRef.current = false;
    };
  }, []);

  // Run spatial analysis
  const handleAnalyse = useCallback(async () => {
    if (!drawnPolygon) return;
    setAnalysing(true);
    setError(null);

    try {
      const res = await fetch("/api/hatiscan/spatial-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          polygon: drawnPolygon,
          parcel_reference: parcelReference,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }

      const data: SpatialResult = await res.json();
      setResult(data);
      onAnalysisComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalysing(false);
    }
  }, [drawnPolygon, parcelReference, onAnalysisComplete]);

  const verdict = result ? VERDICT_CONFIG[result.spatial_verdict] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Draw Your Plot Boundary
          </h3>
          <p className="text-sm text-white/50">
            Use the polygon or rectangle tool to outline the plot on the map
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-[#c8a96e] hover:text-[#c8a96e]/80"
          >
            ← Back to results
          </button>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapContainerRef}
        className="h-[400px] w-full rounded-lg border border-white/10 overflow-hidden"
      />

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAnalyse}
          disabled={!drawnPolygon || analysing}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
            drawnPolygon && !analysing
              ? "bg-[#c8a96e] text-[#0a0f1a] hover:bg-[#c8a96e]/90"
              : "bg-white/5 text-white/30 cursor-not-allowed"
          }`}
        >
          {analysing
            ? "Analysing spatial risks..."
            : drawnPolygon
              ? "Run Spatial Analysis"
              : "Draw a polygon first"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Verdict */}
          <div
            className={`rounded-lg border border-white/10 ${verdict?.bg} px-4 py-3 text-center`}
          >
            <div className={`text-xl font-bold ${verdict?.color}`}>
              {verdict?.label}
            </div>
            <div className="text-sm text-white/50">
              {result.total_risks_found} risk
              {result.total_risks_found !== 1 ? "s" : ""} detected
            </div>
          </div>

          {/* Summary cards */}
          {result.summary.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {result.summary.map((s) => (
                <div
                  key={s.risk_type}
                  className="rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div className="text-xs text-white/40">
                    {RISK_LABELS[s.risk_type] || s.risk_type}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {s.count}
                  </div>
                  {s.any_overlap ? (
                    <div className="text-xs text-red-400">
                      {s.max_overlap_pct.toFixed(1)}% overlap
                    </div>
                  ) : (
                    <div className="text-xs text-white/30">
                      {Math.round(s.nearest_metres)}m away
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Detailed risks */}
          {Object.entries(result.risks).map(([riskType, items]) => (
            <div
              key={riskType}
              className="rounded-lg border border-white/10 bg-white/5 p-4"
            >
              <h4 className="text-sm font-medium text-white/70">
                {RISK_LABELS[riskType] || riskType}
              </h4>
              <div className="mt-2 space-y-2">
                {items.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <div className="flex-1">
                      <span className="text-white">{item.feature_name}</span>
                      <span className="ml-2 text-white/30">
                        {item.legal_basis}
                      </span>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      {item.overlap_percentage > 0 ? (
                        <span
                          className="font-mono"
                          style={{
                            color:
                              SEVERITY_COLORS[item.severity] || "#94a3b8",
                          }}
                        >
                          {item.overlap_percentage.toFixed(1)}% overlap
                        </span>
                      ) : (
                        <span className="text-white/40 font-mono">
                          {Math.round(item.distance_metres)}m
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {items.length > 5 && (
                  <div className="text-xs text-white/30">
                    and {items.length - 5} more...
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Clear result */}
          {result.total_risks_found === 0 && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-6 text-center">
              <div className="text-emerald-400 text-lg font-semibold">
                No spatial risks detected
              </div>
              <div className="text-sm text-white/50 mt-1">
                This plot does not overlap or border any known hazard zones
                within our database coverage.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Dynamic import to prevent SSR (Leaflet requires window)
const ParcelDrawMap = dynamic(() => Promise.resolve(MapInner), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
      <div className="text-white/30 text-sm">Loading map...</div>
    </div>
  ),
});

export default ParcelDrawMap;
