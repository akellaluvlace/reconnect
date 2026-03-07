import { z } from "zod";

export const RefineProfileSectionSchema = z.object({
  alternatives: z
    .array(
      z.object({
        value: z.union([z.string(), z.array(z.string())]),
        rationale: z.string(),
      }),
    )
    .min(2)
    .max(3),
});

export type RefineProfileSectionOutput = z.infer<typeof RefineProfileSectionSchema>;
