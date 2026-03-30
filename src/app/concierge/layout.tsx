import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Concierge Service",
  description:
    "Ardhi Concierge is a bespoke, end-to-end land acquisition service for Kenyans abroad. Your dedicated advisor handles everything from shortlisting to title transfer.",
};

export default function ConciergeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
