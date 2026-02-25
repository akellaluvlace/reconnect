import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analyzeCoverage, AIError } from "@reconnect/ai";

const RequestSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  jd_requirements: z.object({
    required: z.array(z.string()),
    preferred: z.array(z.string()),
    responsibilities: z.array(z.string()),
  }),
  stages: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      focus_areas: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
        }),
      ),
    }),
  ),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await analyzeCoverage(parsed.data);

    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("[analyze-coverage] Error:", error);
    const message =
      error instanceof AIError
        ? error.message
        : "Failed to analyze coverage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
