import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateJobDescription, AIError } from "@reconnect/ai";

const RequestSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  industry: z.string().min(1).max(200),
  company_context: z.string().max(2000).optional(),
  style: z.enum(["formal", "creative", "concise"]),
  currency: z.string().optional(),
  market_context: z
    .object({
      salary_range: z
        .object({
          min: z.number(),
          max: z.number(),
          currency: z.string(),
        })
        .optional(),
      key_skills: z.array(z.string()).optional(),
      demand_level: z.string().optional(),
      competitors: z.array(z.string()).optional(),
    })
    .optional(),
});

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
  } catch (parseError) {
    console.warn("Invalid JSON in generate-jd request:", parseError);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await generateJobDescription(parsed.data);

    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("JD generation error:", error);
    const message =
      error instanceof AIError
        ? error.message
        : "Failed to generate job description";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
