import Link from "next/link";
import Image from "next/image";
import { listings } from "@/lib/data";
import PropertyCard from "@/components/ui/PropertyCard";
import HeroSearch from "@/components/HeroSearch";

const featuredCounties = [
  { name: "Kiambu", count: 342, seed: "kiambu" },
  { name: "Nakuru", count: 218, seed: "nakuru" },
  { name: "Kajiado", count: 187, seed: "kajiado" },
  { name: "Kisumu", count: 134, seed: "kisumu" },
  { name: "Mombasa", count: 156, seed: "mombasa" },
];

const steps = [
  {
    number: "1",
    title: "Search",
    description:
      "Browse verified land listings across Kenya. Filter by county, price, size, and use type to find the perfect plot.",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
    ),
  },
  {
    number: "2",
    title: "Verify",
    description:
      "Every listing is checked against the National Land Information System. View title deeds, encumbrance reports, and trust scores.",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
  },
  {
    number: "3",
    title: "Buy Safely",
    description:
      "Connect with LSK-registered conveyancers. Complete your purchase with escrow protection and end-to-end legal support.",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
        />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-navy px-4 pb-16 pt-20 sm:pb-20 sm:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Find verified land in Kenya
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70 sm:text-xl">
            Every listing checked against the National Land Information System.
            Buy with confidence from anywhere in the world.
          </p>
          <div className="mt-10">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ────────────────────────────────────────────────────── */}
      <section className="bg-ardhi px-4 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-4 text-center sm:flex-row sm:gap-12">
          <div className="text-white">
            <span className="text-2xl font-bold">1,200+</span>
            <span className="ml-1.5 text-sm text-white/80">verified plots</span>
          </div>
          <div className="hidden h-6 w-px bg-white/30 sm:block" />
          <div className="text-white">
            <span className="text-2xl font-bold">KES 5B+</span>
            <span className="ml-1.5 text-sm text-white/80">fraud prevented</span>
          </div>
          <div className="hidden h-6 w-px bg-white/30 sm:block" />
          <div className="text-white">
            <span className="text-2xl font-bold">3M+</span>
            <span className="ml-1.5 text-sm text-white/80">
              diaspora buyers protected
            </span>
          </div>
        </div>
      </section>

      {/* ─── RECENTLY LISTED ──────────────────────────────────────────────── */}
      <section className="bg-bg px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-serif text-2xl font-bold text-navy sm:text-3xl">
              Recently listed
            </h2>
            <Link
              href="/search"
              className="text-sm font-semibold text-ardhi transition hover:text-ardhi-dark"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.slice(0, 6).map((listing) => (
              <PropertyCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED COUNTIES ────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-navy sm:text-3xl">
            Browse by county
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {featuredCounties.map((county) => (
              <Link
                key={county.name}
                href={`/search?county=${county.name}`}
                className="group relative overflow-hidden rounded-xl shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={`https://picsum.photos/seed/${county.seed}/400/300`}
                    alt={county.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 p-4">
                  <h3 className="text-lg font-bold text-white">
                    {county.name}
                  </h3>
                  <p className="text-sm text-white/80">
                    {county.count} listings
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="bg-bg px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center font-serif text-2xl font-bold text-navy sm:text-3xl">
            How it works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ardhi/10 text-ardhi">
                  {step.icon}
                </div>
                <span className="mb-1 inline-block rounded-full bg-navy px-3 py-0.5 text-xs font-bold text-white">
                  Step {step.number}
                </span>
                <h3 className="mt-3 text-lg font-bold text-navy">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
