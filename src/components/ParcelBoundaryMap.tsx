"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  geometry: { type: string; coordinates: number[][][] };
}

export default function ParcelBoundaryMap({ geometry }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add parcel boundary polygon
    const geojsonLayer = L.geoJSON(geometry as GeoJSON.GeoJsonObject, {
      style: {
        color: "#00A550",
        weight: 3,
        fillColor: "#00A550",
        fillOpacity: 0.15,
        dashArray: "5, 5",
      },
    }).addTo(map);

    // Fit map to parcel bounds with padding
    const bounds = geojsonLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [geometry]);

  return (
    <div
      ref={mapRef}
      className="h-[300px] w-full rounded-xl overflow-hidden border border-border"
    />
  );
}
