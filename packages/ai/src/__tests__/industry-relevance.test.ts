import { describe, it, expect } from "vitest";
import { scoreIndustryRelevance, INDUSTRY_KEYWORDS } from "../search-client";

describe("scoreIndustryRelevance", () => {
  it("scores high for manufacturing listing with manufacturing keywords", () => {
    const score = scoreIndustryRelevance(
      "Sales Manager - Industrial Manufacturing",
      "Join our manufacturing plant as a sales leader in the industrial sector",
      "Manufacturing",
    );
    expect(score).toBeGreaterThan(0.5);
  });

  it("scores low for tech company when industry is manufacturing", () => {
    const score = scoreIndustryRelevance(
      "Sales Rep at Salesforce",
      "Join Salesforce's SaaS sales team building cloud software solutions",
      "Manufacturing",
    );
    expect(score).toBeLessThan(0.3);
  });

  it("scores high for technology listing with tech keywords", () => {
    const score = scoreIndustryRelevance(
      "Senior Engineer at Cloud Startup",
      "Building SaaS software platform with AI and cloud technology",
      "Technology",
    );
    expect(score).toBeGreaterThan(0.5);
  });

  it("handles custom industry by extracting keywords", () => {
    const score = scoreIndustryRelevance(
      "Aerospace Engineer at Boeing",
      "Design aerospace systems and aviation components",
      "Aerospace Engineering",
    );
    expect(score).toBeGreaterThan(0);
  });

  it("returns neutral score for empty industry", () => {
    const score = scoreIndustryRelevance("Job Title", "Some content", "");
    expect(score).toBe(0.5);
  });

  it("is case-insensitive", () => {
    const score = scoreIndustryRelevance(
      "MANUFACTURING PLANT MANAGER",
      "INDUSTRIAL PRODUCTION ENGINEERING",
      "manufacturing",
    );
    expect(score).toBeGreaterThan(0.5);
  });

  it("covers all predefined industries", () => {
    expect(Object.keys(INDUSTRY_KEYWORDS)).toContain("technology");
    expect(Object.keys(INDUSTRY_KEYWORDS)).toContain("finance");
    expect(Object.keys(INDUSTRY_KEYWORDS)).toContain("healthcare");
    expect(Object.keys(INDUSTRY_KEYWORDS)).toContain("retail");
    expect(Object.keys(INDUSTRY_KEYWORDS)).toContain("manufacturing");
    expect(Object.keys(INDUSTRY_KEYWORDS)).toContain("professional services");
  });
});
