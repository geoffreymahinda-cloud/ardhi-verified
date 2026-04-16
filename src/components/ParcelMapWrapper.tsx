"use client";

import dynamic from "next/dynamic";

const ParcelBoundaryMap = dynamic(() => import("./ParcelBoundaryMap"), { ssr: false });

interface Props {
  geometry: { type: string; coordinates: number[][][] } | null;
}

export default function ParcelMapWrapper({ geometry }: Props) {
  if (!geometry) return null;
  return <ParcelBoundaryMap geometry={geometry} />;
}
