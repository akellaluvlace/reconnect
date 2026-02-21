import { describe, it, expect } from "vitest";
import { CandidateProfileSchema } from "../schemas/candidate-profile";

const validProfile = {
  ideal_background:
    "5+ years in full-stack development with experience in high-growth SaaS startups",
  must_have_skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
  nice_to_have_skills: ["AWS", "Docker", "GraphQL"],
  experience_range: "5-8 years",
  cultural_fit_indicators: [
    "Self-directed problem solver",
    "Comfortable with ambiguity",
    "Strong written communicator",
  ],
  disclaimer:
    "This AI-generated content is for informational purposes only. All hiring decisions must be made by humans.",
};

describe("CandidateProfileSchema", () => {
  it("validates a valid profile", () => {
    const result = CandidateProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it("requires disclaimer field", () => {
    const { disclaimer: _, ...noDisclaimer } = validProfile;
    const result = CandidateProfileSchema.safeParse(noDisclaimer);
    expect(result.success).toBe(false);
  });

  it("allows minimal profile (only disclaimer)", () => {
    const result = CandidateProfileSchema.safeParse({
      disclaimer: "AI-generated content.",
    });
    expect(result.success).toBe(true);
  });

  it("allows all optional fields to be omitted", () => {
    const result = CandidateProfileSchema.safeParse({
      disclaimer: "Required disclaimer text.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ideal_background).toBeUndefined();
      expect(result.data.must_have_skills).toBeUndefined();
      expect(result.data.nice_to_have_skills).toBeUndefined();
      expect(result.data.experience_range).toBeUndefined();
      expect(result.data.cultural_fit_indicators).toBeUndefined();
    }
  });

  it("enforces max 15 must_have_skills", () => {
    const result = CandidateProfileSchema.safeParse({
      ...validProfile,
      must_have_skills: Array.from({ length: 16 }, (_, i) => `Skill${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("enforces max 15 nice_to_have_skills", () => {
    const result = CandidateProfileSchema.safeParse({
      ...validProfile,
      nice_to_have_skills: Array.from({ length: 16 }, (_, i) => `Skill${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("enforces max 10 cultural_fit_indicators", () => {
    const result = CandidateProfileSchema.safeParse({
      ...validProfile,
      cultural_fit_indicators: Array.from(
        { length: 11 },
        (_, i) => `Indicator${i}`,
      ),
    });
    expect(result.success).toBe(false);
  });

  it("enforces min 1 must_have_skills when provided", () => {
    const result = CandidateProfileSchema.safeParse({
      ...validProfile,
      must_have_skills: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-string items in skill arrays", () => {
    const result = CandidateProfileSchema.safeParse({
      ...validProfile,
      must_have_skills: [123, true],
    });
    expect(result.success).toBe(false);
  });
});
