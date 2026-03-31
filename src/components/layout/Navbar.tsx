"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { href: "/search", label: "Search", badge: "" },
  { href: "/concierge", label: "Concierge", badge: "" },
  { href: "/land-guardian", label: "Land Guardian", badge: "Soon" },
  { href: "/how-it-works", label: "How it Works", badge: "" },
  { href: "/agents", label: "Agents", badge: "" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="font-serif text-2xl font-bold text-ardhi">
            Ardhi
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-ardhi" />
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center gap-1.5 text-sm font-medium text-navy transition-colors hover:text-ardhi"
              >
                {link.label}
                {link.badge && (
                  <span className="rounded-full bg-ardhi/10 px-1.5 py-0.5 text-[10px] font-semibold text-ardhi">
                    {link.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA + hamburger */}
        <div className="flex items-center gap-4">
          <Link
            href="/list"
            className="hidden rounded-lg bg-ardhi px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ardhi-dark md:inline-block"
          >
            List Your Land
          </Link>

          {/* Hamburger */}
          <button
            type="button"
            aria-label="Toggle menu"
            className="flex flex-col items-center justify-center gap-1.5 md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span
              className={`block h-0.5 w-6 bg-navy transition-transform ${
                mobileOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-navy transition-opacity ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-navy transition-transform ${
                mobileOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-white px-4 pb-4 md:hidden">
          <ul className="flex flex-col gap-3 pt-3">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-ardhi-light hover:text-ardhi"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/list"
                className="block rounded-lg bg-ardhi px-5 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-ardhi-dark"
                onClick={() => setMobileOpen(false)}
              >
                List Your Land
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
