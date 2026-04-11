"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Only same-origin relative paths are allowed as redirect targets to
// prevent open-redirect attacks. Must start with "/" and not "//".
function sanitizeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  const fromEoi = next.startsWith("/purchase/");

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-navy">Welcome back</h1>
          <p className="mt-2 text-muted">Sign in to your Ardhi Verified account</p>
        </div>

        {fromEoi && (
          <div className="mb-6 rounded-xl border border-ardhi/30 bg-ardhi/5 p-4">
            <p className="text-sm text-navy leading-relaxed">
              <strong>Sign in to continue your expression of interest.</strong> Ardhi Verified requires a verified account so we can prepare your Buyer Pack and introduce you to the right partner institution.
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-5">
          {error && (
            <div className="rounded-lg bg-trust-red/5 border border-trust-red/20 px-4 py-3 text-sm text-trust-red">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-navy mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-navy mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ardhi/30 focus:border-ardhi"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ardhi text-white py-3 rounded-lg font-semibold transition-colors hover:bg-ardhi-dark disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div className="text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href={`/auth/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-medium text-ardhi hover:text-ardhi-dark"
            >
              Create one
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh]" />}>
      <LoginForm />
    </Suspense>
  );
}
