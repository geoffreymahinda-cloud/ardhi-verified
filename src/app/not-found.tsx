import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20">
      {/* Logo mark */}
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-ardhi/10">
        <svg
          className="h-8 w-8 text-ardhi"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
          />
        </svg>
      </div>

      <h1 className="font-serif text-4xl font-bold text-navy sm:text-5xl">
        Page not found
      </h1>

      <p className="mx-auto mt-4 max-w-md text-center text-lg text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/search"
          className="inline-flex items-center justify-center rounded-lg bg-ardhi px-6 py-3 font-semibold text-white transition-colors hover:bg-ardhi-dark"
        >
          Search for land
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border-2 border-navy/20 px-6 py-3 font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy/5"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
