import { describe, it, expect } from "vitest";

// Test input sanitization and validation logic

describe("Input sanitization", () => {
  function sanitize(input: string): string {
    return input.trim().slice(0, 2000);
  }

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
  }

  function isBot(honeypot: string | undefined): boolean {
    return !!honeypot && honeypot.trim().length > 0;
  }

  it("trims whitespace", () => {
    expect(sanitize("  hello  ")).toBe("hello");
    expect(sanitize("\n\ttest\n")).toBe("test");
  });

  it("caps at 2000 characters", () => {
    const long = "a".repeat(3000);
    expect(sanitize(long).length).toBe(2000);
  });

  it("handles empty string", () => {
    expect(sanitize("")).toBe("");
    expect(sanitize("   ")).toBe("");
  });

  it("validates correct emails", () => {
    expect(isValidEmail("james@example.com")).toBe(true);
    expect(isValidEmail("user@ardhiverified.com")).toBe(true);
    expect(isValidEmail("name.surname@domain.co.ke")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user @domain.com")).toBe(false);
  });

  it("rejects emails over 254 chars", () => {
    const longEmail = "a".repeat(250) + "@b.com";
    expect(isValidEmail(longEmail)).toBe(false);
  });

  it("detects bot honeypot", () => {
    expect(isBot(undefined)).toBe(false);
    expect(isBot("")).toBe(false);
    expect(isBot("   ")).toBe(false);
    expect(isBot("http://spam.com")).toBe(true);
    expect(isBot("anything")).toBe(true);
  });
});

describe("Parcel reference sanitization", () => {
  it("normalizes parcel references", () => {
    const input = "  LR 209/21922  ";
    const sanitized = input.trim().substring(0, 100);
    expect(sanitized).toBe("LR 209/21922");
  });

  it("caps at 100 characters", () => {
    const long = "LR " + "1".repeat(200);
    const sanitized = long.trim().substring(0, 100);
    expect(sanitized.length).toBe(100);
  });
});
