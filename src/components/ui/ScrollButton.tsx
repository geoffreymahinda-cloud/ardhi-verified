"use client";

export function ScrollToTop({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={className}
    >
      {children}
    </button>
  );
}

export function ScrollToElement({ targetId, className, children }: { targetId: string; className: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })}
      className={className}
    >
      {children}
    </button>
  );
}
