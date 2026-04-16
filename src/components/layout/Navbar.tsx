"use client";

import { useState } from "react";
import Link from "next/link";
import UserMenu from "./UserMenu";

const navLinks = [
  { href: "/pricing", label: "Pricing" },
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

        {/* Desktop links + auth */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-navy transition-colors hover:text-ardhi"
            >
              {link.label}
            </Link>
          ))}
          <UserMenu />
          <Link
            href="/hatiscan"
            className="rounded-lg bg-ardhi px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ardhi-dark"
          >
            Verify Free
          </Link>
        </div>

        {/* Hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          <Link
            href="/hatiscan"
            className="rounded-lg bg-ardhi px-4 py-2 text-xs font-semibold text-white"
          >
            Verify Free
          </Link>
          <button
            type="button"
            aria-label="Toggle menu"
            className="flex flex-col items-center justify-center gap-1.5"
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
            <li>
              <Link href="/pricing" className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-ardhi-light hover:text-ardhi" onClick={() => setMobileOpen(false)}>
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/browse" className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-ardhi-light hover:text-ardhi" onClick={() => setMobileOpen(false)}>
                Browse Land
              </Link>
            </li>
            <li>
              <Link href="/hatiscan" className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-ardhi-light hover:text-ardhi" onClick={() => setMobileOpen(false)}>
                HatiScan
              </Link>
            </li>
            <li>
              <Link href="/enterprise" className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-ardhi-light hover:text-ardhi" onClick={() => setMobileOpen(false)}>
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
