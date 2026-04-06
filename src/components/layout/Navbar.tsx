"use client";

import { useState } from "react";
import Link from "next/link";
import UserMenu from "./UserMenu";

const navLinks = [
  { href: "/browse", label: "Browse Land" },
  { href: "/saccos", label: "Our Partners" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/intelligence", label: "Intelligence" },
  { href: "/about", label: "About" },
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
                className="text-sm font-medium text-navy transition-colors hover:text-ardhi"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Auth + hamburger */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <UserMenu />
          </div>

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
            <li className="text-xs text-muted px-3 pt-2 border-t border-border">
              <Link href="/enterprise" onClick={() => setMobileOpen(false)} className="hover:text-ardhi transition-colors">
                Enterprise
              </Link>
            </li>
            <li className="pt-2 border-t border-border">
              <UserMenu />
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
