import { describe, it, expect } from "vitest";
import { generateCacheKey } from "../pipelines/market-insights";

describe("generateCacheKey", () => {
  it("generates consistent keys for same input", () => {
    const input = {
      role: "Software Engineer",
      level: "Senior",
      industry: "Tech",
      location: "Dublin",
      market_focus: "irish" as const,
    };

    const key1 = generateCacheKey(input);
    const key2 = generateCacheKey(input);
    expect(key1).toBe(key2);
  });

  it("normalizes case", () => {
    const lower = generateCacheKey({
      role: "software engineer",
      level: "senior",
      industry: "tech",
      location: "dublin",
    });
    const upper = generateCacheKey({
      role: "Software Engineer",
      level: "Senior",
      industry: "Tech",
      location: "Dublin",
    });
    expect(lower).toBe(upper);
  });

  it("normalizes whitespace", () => {
    const trimmed = generateCacheKey({
      role: "Software Engineer",
      level: "Senior",
      industry: "Tech",
      location: "Dublin",
    });
    const padded = generateCacheKey({
      role: "  Software Engineer  ",
      level: "  Senior  ",
      industry: "  Tech  ",
      location: "  Dublin  ",
    });
    expect(trimmed).toBe(padded);
  });

  it("generates different keys for different inputs", () => {
    const key1 = generateCacheKey({
      role: "Software Engineer",
      level: "Senior",
      industry: "Tech",
      location: "Dublin",
    });
    const key2 = generateCacheKey({
      role: "Product Manager",
      level: "Senior",
      industry: "Tech",
      location: "Dublin",
    });
    expect(key1).not.toBe(key2);
  });

  it("defaults market_focus to irish", () => {
    const withDefault = generateCacheKey({
      role: "Dev",
      level: "Mid",
      industry: "Tech",
      location: "Dublin",
    });
    const withExplicit = generateCacheKey({
      role: "Dev",
      level: "Mid",
      industry: "Tech",
      location: "Dublin",
      market_focus: "irish",
    });
    expect(withDefault).toBe(withExplicit);
  });

  it("returns a hex string", () => {
    const key = generateCacheKey({
      role: "Dev",
      level: "Mid",
      industry: "Tech",
      location: "Dublin",
    });
    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });
});
