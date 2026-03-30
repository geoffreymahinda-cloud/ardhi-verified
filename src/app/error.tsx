"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20">
      {/* Icon */}
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-trust-amber/10">
        <svg
          className="h-8 w-8 text-trust-amber"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <h1 className="font-serif text-4xl font-bold text-navy sm:text-5xl">
        Something went wrong
      </h1>

      <p className="mx-auto mt-4 max-w-md text-center text-lg text-muted">
        We hit an unexpected error. Please try again, or head back to the home
        page.
      </p>

      {process.env.NODE_ENV === "development" && error?.message && (
        <pre className="mx-auto mt-6 max-w-lg overflow-auto rounded-lg border border-border bg-bg p-4 text-left font-mono text-sm text-trust-red">
          {error.message}
        </pre>
      )}

      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-lg bg-ardhi px-6 py-3 font-semibold text-white transition-colors hover:bg-ardhi-dark"
        >
          Try again
        </button>
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
