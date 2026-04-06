import { describe, it, expect } from "vitest";
import {
  formatKES,
  formatGBP,
  formatUSD,
  kesToGbp,
  kesToUsd,
  calculateInstalment,
  KES_TO_GBP,
  KES_TO_USD,
} from "@/lib/data";

describe("Currency formatting", () => {
  it("formats KES correctly", () => {
    expect(formatKES(4200000)).toBe("KES 4,200,000");
    expect(formatKES(0)).toBe("KES 0");
    expect(formatKES(999)).toBe("KES 999");
  });

  it("formats GBP correctly", () => {
    expect(formatGBP(25455)).toBe("£25,455");
    expect(formatGBP(0)).toBe("£0");
  });

  it("formats USD correctly", () => {
    expect(formatUSD(32308)).toBe("$32,308");
  });
});

describe("Currency conversion", () => {
  it("converts KES to GBP", () => {
    const result = kesToGbp(165000);
    expect(result).toBe(1000); // 165,000 KES / 165 = 1,000 GBP
  });

  it("converts KES to USD", () => {
    const result = kesToUsd(130000);
    expect(result).toBe(1000); // 130,000 KES / 130 = 1,000 USD
  });

  it("rounds to whole numbers", () => {
    expect(kesToGbp(100)).toBe(Math.round(100 * KES_TO_GBP));
    expect(kesToUsd(100)).toBe(Math.round(100 * KES_TO_USD));
  });
});

describe("Instalment calculation", () => {
  it("calculates correctly for standard case", () => {
    const result = calculateInstalment(3000000, 20, 36);
    expect(result.deposit).toBe(600000); // 20% of 3M
    expect(result.monthly).toBe(66667); // (3M - 600K) / 36 rounded
    expect(result.total).toBe(3000000);
    expect(result.termMonths).toBe(36);
  });

  it("handles 10% deposit", () => {
    const result = calculateInstalment(5000000, 10, 60);
    expect(result.deposit).toBe(500000);
    expect(result.monthly).toBe(75000); // (5M - 500K) / 60
  });

  it("handles full payment (100% deposit)", () => {
    const result = calculateInstalment(1000000, 100, 12);
    expect(result.deposit).toBe(1000000);
    expect(result.monthly).toBe(0);
  });

  it("handles minimum values", () => {
    const result = calculateInstalment(0, 20, 12);
    expect(result.deposit).toBe(0);
    expect(result.monthly).toBe(0);
  });
});
