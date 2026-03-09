import { z } from "zod";

export const ORG_STATUSES = ["active", "pending", "suspended"] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];

export const createOrgSchema = z.object({
  name: z.string().min(1).max(200),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(ORG_STATUSES).optional(),
});
