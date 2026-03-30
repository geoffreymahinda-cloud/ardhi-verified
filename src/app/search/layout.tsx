import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Land",
  description:
    "Search NLIMS-verified land listings across Kenya. Filter by county, price, size, and land type to find the perfect plot with transparent trust scores.",
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
