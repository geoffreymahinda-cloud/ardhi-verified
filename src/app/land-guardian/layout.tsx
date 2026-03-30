import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Land Guardian — Title Monitoring",
  description:
    "Land Guardian monitors your title deed against Kenya's NLIMS registry every night. Get instant WhatsApp alerts if anyone tries to transfer, charge, or dispute your land.",
};

export default function LandGuardianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
