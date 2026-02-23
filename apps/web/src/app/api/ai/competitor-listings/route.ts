import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  searchWebParallel,
  generateCacheKey,
  AISearchError,
} from "@reconnect/ai";
import type { Json } from "@reconnect/database";

const InputSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(200),
  industry: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  playbook_id: z.string().uuid(),
});

interface CompetitorListing {
  url: string;
  title: string;
  company: string;
  source: string;
  snippet: string;
  postedDate?: string;
  relevanceScore: number;
}

/**
 * Extract company name heuristically from title/content.
 * Common patterns: "Software Engineer at Acme Corp", "Acme Corp - Software Engineer"
 */
function extractCompany(title: string, content: string): string {
  // "... at Company" pattern
  const atMatch = title.match(/\bat\s+(.+?)(?:\s*[-–|]|$)/i);
  if (atMatch) return atMatch[1].trim();

  // "Company - Role" or "Company | Role" pattern
  const dashMatch = title.match(/^(.+?)\s*[-–|]\s+/);
  if (dashMatch && dashMatch[1].length < 60) return dashMatch[1].trim();

  // "Company is hiring" in content
  const hiringMatch = content.match(/^(.+?)\s+is\s+(?:hiring|looking|seeking)/i);
  if (hiringMatch && hiringMatch[1].length < 60) return hiringMatch[1].trim();

  return "Unknown";
}

/**
 * Strip markdown formatting from text, returning plain text.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")          // headings
    .replace(/\*{1,3}(.+?)\*{1,3}/g, "$1") // bold/italic
    .replace(/_{1,3}(.+?)_{1,3}/g, "$1")   // bold/italic underscores
    .replace(/~~(.+?)~~/g, "$1")           // strikethrough
    .replace(/`(.+?)`/g, "$1")             // inline code
    .replace(/^\s*[-*+]\s+/gm, "")         // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, "")         // ordered list markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // images
    .replace(/^>\s+/gm, "")               // blockquotes
    .replace(/^---+$/gm, "")              // horizontal rules
    .replace(/\n{3,}/g, "\n\n")            // collapse extra newlines
    .trim();
}

/**
 * Check if a URL is reachable via HEAD request (short timeout).
 * Returns true if the server responds with a non-error status.
 */
async function isUrlLive(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ReconnectBot/1.0)" },
    });
    clearTimeout(timeout);
    return res.status < 400;
  } catch {
    return false;
  }
}

/**
 * Extract source domain from URL.
 */
function extractSource(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname;
  } catch {
    return "unknown";
  }
}

/**
 * POST /api/ai/competitor-listings
 * Search job boards for competitor listings via Tavily.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { role, level, industry, location } = parsed.data;

  // Get user's org
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.organization_id) {
    return NextResponse.json(
      { error: "User organization not found" },
      { status: 403 },
    );
  }

  const orgId = userData.organization_id;

  // Generate cache key specific to listings
  const cacheKey = generateCacheKey({
    role,
    level,
    industry,
    location,
    market_focus: "irish",
  });
  // Prefix to avoid collision with market insights cache using same params
  const listingsCacheKey = `listings-${cacheKey}`.slice(0, 64);

  // Check cache (7-day TTL for listings)
  const { data: cached, error: cacheError } = await supabase
    .from("ai_research_cache")
    .select("results, created_at")
    .eq("organization_id", orgId)
    .eq("cache_key", listingsCacheKey)
    .eq("phase", "listings")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (cacheError && cacheError.code !== "PGRST116") {
    console.error("[competitor-listings] Cache read error:", cacheError);
  }

  if (cached?.results) {
    return NextResponse.json({
      listings: cached.results as unknown as CompetitorListing[],
      cached: true,
      generated_at: cached.created_at,
    });
  }

  // Run Tavily searches
  const currentYear = new Date().getFullYear();
  const queries = [
    `"${role}" "${level}" job ${location} site:indeed.com OR site:linkedin.com/jobs OR site:glassdoor.com OR site:irishjobs.ie`,
    `"${role}" ${industry} hiring ${location}`,
    `"${role}" vacancy ${location} ${currentYear}`,
  ];

  try {
    const results = await searchWebParallel(queries, { maxResults: 8 });

    // Map to listing format (strip markdown from Tavily content)
    const allListings: CompetitorListing[] = results
      .map((r) => ({
        url: r.url,
        title: stripMarkdown(r.title),
        company: extractCompany(r.title, r.content),
        source: extractSource(r.url),
        snippet: stripMarkdown(r.content).slice(0, 300),
        postedDate: r.publishedDate,
        relevanceScore: r.score,
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20);

    // Filter out dead links (parallel HEAD checks, 4s timeout each)
    // Fall back to all listings if every URL fails (avoids empty results from network issues)
    const liveChecks = await Promise.all(
      allListings.map(async (listing) => ({
        listing,
        live: await isUrlLive(listing.url),
      })),
    );
    const liveListings = liveChecks
      .filter((c) => c.live)
      .map((c) => c.listing);
    const listings = liveListings.length > 0 ? liveListings : allListings;

    // Cache with 7-day TTL
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: upsertError } = await supabase
      .from("ai_research_cache")
      .upsert(
        {
          organization_id: orgId,
          cache_key: listingsCacheKey,
          phase: "listings",
          search_params: { role, level, industry, location } as unknown as Json,
          results: listings as unknown as Json,
          sources: [] as unknown as Json,
          model_used: "tavily-search",
          prompt_version: "1.0.0",
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "organization_id,cache_key,phase" },
      );

    if (upsertError) {
      console.error("[competitor-listings] Cache write error:", upsertError);
    }

    return NextResponse.json({
      listings,
      cached: false,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof AISearchError
        ? error.message
        : "Failed to search for competitor listings";
    console.error("[competitor-listings] Search error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
