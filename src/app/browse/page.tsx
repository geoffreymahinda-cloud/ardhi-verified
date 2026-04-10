import { getListings } from "@/lib/data.server";
import BrowseClient from "./BrowseClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Browse Land — Ardhi Verified",
  description: "Browse verified land listings from Kenya's leading banks, SACCOs, and developers. Monthly instalments available.",
};

export default async function BrowsePage() {
  const listings = await getListings();
  return <BrowseClient listings={listings} />;
}
