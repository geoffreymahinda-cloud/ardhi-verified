import { getListings } from "@/lib/data.server";
import SearchClient from "./SearchClient";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const listings = await getListings();
  return <SearchClient listings={listings} />;
}
