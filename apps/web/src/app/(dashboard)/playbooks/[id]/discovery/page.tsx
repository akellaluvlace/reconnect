import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DiscoveryPageClient } from "@/components/discovery/discovery-page-client";
import { parseJsonb } from "@/lib/utils/parse-jsonb";
import {
  MarketInsightsSchema,
  QuickMarketInsightsSchema,
  JobDescriptionSchema,
  HiringStrategySchema,
} from "@reconnect/ai";
import type { MarketInsights } from "@reconnect/database";

const CompetitorListingSchema = z.object({
  url: z.string(),
  title: z.string(),
  company: z.string(),
  source: z.string(),
  snippet: z.string(),
  postedDate: z.string().optional(),
  relevanceScore: z.number(),
});

const CompetitorListingsWrapperSchema = z.object({
  listings: z.array(CompetitorListingSchema),
  generated_at: z.string().optional(),
});

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MarketInsightsReadSchema = z.union([
  MarketInsightsSchema,
  QuickMarketInsightsSchema,
]);

export default async function DiscoveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: playbook, error } = await supabase
    .from("playbooks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[discovery] Query failed:", error.message);
    }
    notFound();
  }

  return (
    <DiscoveryPageClient
      playbook={{
        id: playbook.id,
        title: playbook.title,
        department: playbook.department,
        level: playbook.level ?? null,
        industry: playbook.industry ?? null,
        skills: parseJsonb(playbook.skills, z.array(z.string()), "skills"),
        location: playbook.location ?? null,
        // Safe assertion: Zod-validated data. Quick phase lacks metadata/sources but UI never accesses them.
        market_insights: parseJsonb(playbook.market_insights, MarketInsightsReadSchema, "market_insights") as MarketInsights | null,
        job_description: parseJsonb(playbook.job_description, JobDescriptionSchema, "job_description"),
        hiring_strategy: parseJsonb(playbook.hiring_strategy, HiringStrategySchema, "hiring_strategy"),
        competitor_listings: parseJsonb(playbook.competitor_listings, CompetitorListingsWrapperSchema, "competitor_listings")?.listings ?? null,
      }}
    />
  );
}
