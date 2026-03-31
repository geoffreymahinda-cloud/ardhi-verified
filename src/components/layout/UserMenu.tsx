"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setOpen(false);
    window.location.href = "/";
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/auth/login"
          className="hidden text-sm font-medium text-navy transition-colors hover:text-ardhi sm:inline-block"
        >
          Sign in
        </Link>
        <Link
          href="/auth/signup"
          className="rounded-lg bg-ardhi px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ardhi-dark"
        >
          Get Started
        </Link>
      </div>
    );
  }

  const initials = (user.user_metadata?.full_name || user.email || "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-ardhi text-sm font-bold text-white transition-colors hover:bg-ardhi-dark"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-border bg-white p-2 shadow-lg">
          <div className="border-b border-border px-3 py-2 mb-1">
            <p className="text-sm font-medium text-navy truncate">
              {user.user_metadata?.full_name || "User"}
            </p>
            <p className="text-xs text-muted truncate">{user.email}</p>
          </div>

          <Link
            href="/search"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-text hover:bg-bg transition-colors"
          >
            My Searches
          </Link>
          <Link
            href="/concierge"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-text hover:bg-bg transition-colors"
          >
            My Enquiries
          </Link>

          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={handleSignOut}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-trust-red hover:bg-trust-red/5 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
