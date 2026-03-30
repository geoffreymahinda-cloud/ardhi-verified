import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Verified Agents",
  description:
    "Browse LSK-registered advocates verified by Ardhi. Find trusted conveyancers specialising in your county for safe land transactions in Kenya.",
};

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
