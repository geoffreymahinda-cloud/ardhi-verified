"use client";

import { useState } from "react";

export type Currency = "KES" | "GBP" | "USD";

interface CurrencyToggleProps {
  defaultCurrency?: Currency;
  onChange?: (currency: Currency) => void;
}

export const RATES = {
  KES: 1,
  GBP: 1 / 165,
  USD: 1 / 130,
} as const;

const currencies: Currency[] = ["KES", "GBP", "USD"];

export default function CurrencyToggle({
  defaultCurrency = "KES",
  onChange,
}: CurrencyToggleProps) {
  const [active, setActive] = useState<Currency>(defaultCurrency);

  const handleClick = (currency: Currency) => {
    setActive(currency);
    onChange?.(currency);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-white p-1">
      {currencies.map((currency) => (
        <button
          key={currency}
          type="button"
          onClick={() => handleClick(currency)}
          className={`relative rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            active === currency
              ? "text-ardhi"
              : "text-muted hover:text-navy"
          }`}
        >
          {currency}
          {active === currency && (
            <span className="absolute inset-x-1 -bottom-1 h-0.5 rounded-full bg-ardhi" />
          )}
        </button>
      ))}
    </div>
  );
}
