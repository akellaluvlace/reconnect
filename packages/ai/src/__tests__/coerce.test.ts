import { describe, it, expect } from "vitest";
import { z } from "zod";
import { coerceAIResponse } from "../coerce";
import {
  InterviewStageSchema,
  InterviewStagesSchema,
  FocusAreaSchema,
} from "../schemas";

describe("coerceAIResponse", () => {
  describe("passthrough for valid data", () => {
    it("returns data without coercion when already valid", () => {
      const schema = z.object({ name: z.string(), count: z.number() });
      const result = coerceAIResponse({ name: "test", count: 5 }, schema);
      expect(result.data).toEqual({ name: "test", count: 5 });
      expect(result.coerced).toBe(false);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("array trimming", () => {
    it("trims oversized array to max", () => {
      const schema = z.object({
        items: z.array(z.string()).max(3),
      });
      const raw = { items: ["a", "b", "c", "d", "e"] };
      const result = coerceAIResponse(raw, schema);
      expect(result.data).toEqual({ items: ["a", "b", "c"] });
      expect(result.coerced).toBe(true);
    });

    it("trims focus_areas from 6 to 5", () => {
      const stage = {
        name: "Technical",
        type: "technical",
        duration_minutes: 60,
        description: "Test",
        focus_areas: Array.from({ length: 6 }, (_, i) => ({
          name: `Area ${i}`,
          description: `Desc ${i}`,
          weight: Math.min(i + 1, 4),
        })),
        suggested_questions: Array.from({ length: 6 }, (_, i) => ({
          question: `Q${i}`,
          purpose: `P${i}`,
          look_for: ["X"],
          focus_area: `Area ${i % 3}`,
        })),
      };
      const result = coerceAIResponse(stage, InterviewStageSchema);
      expect(result.data).not.toBeNull();
      expect(result.data!.focus_areas).toHaveLength(5);
      expect(result.coerced).toBe(true);
    });
  });

  describe("number clamping", () => {
    it("clamps confidence > 1 down to 1", () => {
      const schema = z.object({
        confidence: z.number().min(0).max(1),
      });
      const result = coerceAIResponse({ confidence: 1.2 }, schema);
      expect(result.data).toEqual({ confidence: 1 });
      expect(result.coerced).toBe(true);
    });

    it("clamps weight > 4 down to 4", () => {
      const result = coerceAIResponse(
        { name: "Test", description: "Desc", weight: 5 },
        FocusAreaSchema,
      );
      expect(result.data).not.toBeNull();
      expect(result.data!.weight).toBe(4);
      expect(result.coerced).toBe(true);
    });

    it("clamps negative number up to min", () => {
      const schema = z.object({ score: z.number().min(0).max(100) });
      const result = coerceAIResponse({ score: -5 }, schema);
      expect(result.data).toEqual({ score: 0 });
      expect(result.coerced).toBe(true);
    });
  });

  describe("string-to-number coercion", () => {
    it("converts string number to number", () => {
      const schema = z.object({ count: z.number() });
      const result = coerceAIResponse({ count: "42" }, schema);
      expect(result.data).toEqual({ count: 42 });
      expect(result.coerced).toBe(true);
    });

    it("does not coerce non-numeric strings", () => {
      const schema = z.object({ count: z.number() });
      const result = coerceAIResponse({ count: "abc" }, schema);
      expect(result.data).toBeNull();
    });
  });

  describe("unfixable errors", () => {
    it("returns null for missing required fields", () => {
      const schema = z.object({
        name: z.string(),
        required_field: z.string(),
      });
      const result = coerceAIResponse({ name: "test" }, schema);
      expect(result.data).toBeNull();
      expect(result.coerced).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("returns null for array too short", () => {
      const schema = z.object({
        items: z.array(z.string()).min(3),
      });
      const result = coerceAIResponse({ items: ["a"] }, schema);
      expect(result.data).toBeNull();
    });

    it("returns null for completely wrong type", () => {
      const schema = z.object({ name: z.string() });
      const result = coerceAIResponse("not an object", schema);
      expect(result.data).toBeNull();
    });
  });

  describe("nested path coercion", () => {
    it("fixes nested number in salary object", () => {
      const schema = z.object({
        salary: z.object({
          confidence: z.number().min(0).max(1),
        }),
      });
      const result = coerceAIResponse(
        { salary: { confidence: 1.5 } },
        schema,
      );
      expect(result.data).toEqual({ salary: { confidence: 1 } });
      expect(result.coerced).toBe(true);
    });
  });

  describe("real-world AI output scenarios", () => {
    it("handles stage with too many focus areas and questions over max", () => {
      const stages = {
        stages: [
          {
            name: "Screen",
            type: "screening",
            duration_minutes: 30,
            description: "Initial screen",
            focus_areas: Array.from({ length: 6 }, (_, i) => ({
              name: `Area ${i}`,
              description: `Desc ${i}`,
              weight: Math.min(i + 1, 4),
            })),
            suggested_questions: Array.from({ length: 25 }, (_, i) => ({
              question: `Q${i}`,
              purpose: `P${i}`,
              look_for: ["X"],
              focus_area: `Area ${i % 3}`,
            })),
          },
        ],
      };
      const result = coerceAIResponse(stages, InterviewStagesSchema);
      expect(result.data).not.toBeNull();
      expect(result.data!.stages[0].focus_areas.length).toBeLessThanOrEqual(5);
      expect(result.data!.stages[0].suggested_questions.length).toBeLessThanOrEqual(20);
      expect(result.coerced).toBe(true);
    });
  });
});
