import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  getOrCreateInterviewCalendar,
  createMeetEvent,
  deleteCalendarEvent,
} from "@/lib/google";
import { tracePipeline } from "@/lib/google/pipeline-tracer";
import { requireGoogleEnv } from "@/lib/google/env";
import { scheduleBot, isRecallConfigured } from "@/lib/recall/client";
import { audit } from "@/lib/audit";

const CreateInterviewSchema = z.object({
  candidate_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  interviewer_email: z.string().email().max(200),
  interviewer_user_id: z.string().uuid().optional(),
  collaborator_id: z.string().uuid().optional(),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().int().min(15).max(240),
  candidate_email: z.string().email().max(200).optional(),
});

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    // Auth: admin/manager only
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = CreateInterviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;

    // Verify candidate belongs to a playbook in user's org
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id, name, email, playbook_id")
      .eq("id", input.candidate_id)
      .single();

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 },
      );
    }

    // Verify stage belongs to same playbook
    const { data: stage } = await supabase
      .from("interview_stages")
      .select("id, name, playbook_id, duration_minutes")
      .eq("id", input.stage_id)
      .single();

    if (!stage || stage.playbook_id !== candidate.playbook_id) {
      return NextResponse.json(
        {
          error:
            "Stage not found or doesn't belong to candidate's playbook",
        },
        { status: 400 },
      );
    }

    // Verify Google env is configured
    requireGoogleEnv();

    // Compute end time
    const startDate = new Date(input.scheduled_at);
    const endDate = new Date(
      startDate.getTime() + input.duration_minutes * 60 * 1000,
    );

    // Get candidate email for Calendar invite
    const candidateEmail = input.candidate_email ?? candidate.email;

    // Create Calendar event + Meet link
    const calendarId = await getOrCreateInterviewCalendar();
    const meetResult = await createMeetEvent({
      calendarId,
      title: `${stage.name} — ${candidate.name}`,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      interviewerEmail: input.interviewer_email,
      candidateEmail: candidateEmail ?? undefined,
      description: `${stage.name} Interview\nCandidate: ${candidate.name}`,
    });

    // Insert interview row (service-role to bypass RLS for pipeline columns)
    const serviceClient = createServiceRoleClient();
    const { data: interview, error: insertError } = await serviceClient
      .from("interviews")
      .insert({
        candidate_id: input.candidate_id,
        stage_id: input.stage_id,
        interviewer_id: input.interviewer_user_id ?? null,
        scheduled_at: input.scheduled_at,
        status: "scheduled",
        recording_status: "scheduled",
        meet_link: meetResult.meetLink,
        meet_conference_id: meetResult.meetingCode,
        calendar_event_id: meetResult.calendarEventId,
        pipeline_log: [],
      })
      .select()
      .single();

    if (insertError) {
      console.error("[interviews/POST] insert error:", insertError);
      // Cleanup orphaned Calendar event
      try {
        await deleteCalendarEvent(calendarId, meetResult.calendarEventId);
      } catch (cleanupErr) {
        console.error("[interviews/POST] Calendar cleanup failed:", cleanupErr);
      }
      return NextResponse.json(
        { error: "Failed to create interview" },
        { status: 500 },
      );
    }

    // Schedule Recall.ai recording bot (non-blocking — failure doesn't fail the interview)
    let recallBotId: string | null = null;
    if (isRecallConfigured()) {
      try {
        const result = await scheduleBot({
          meetUrl: meetResult.meetLink,
          joinAt: input.scheduled_at,
          interviewId: interview.id,
        });
        recallBotId = result.botId;

        // Store bot ID on interview
        await serviceClient
          .from("interviews")
          .update({ recall_bot_id: recallBotId })
          .eq("id", interview.id);
      } catch (recallErr) {
        // Graceful degradation: log warning, interview proceeds without recording bot
        console.warn(
          `[RECALL:scheduleBot] Failed for interview ${interview.id}:`,
          recallErr,
        );
        // Trace the failure so it's visible in the pipeline log (#6)
        try {
          await tracePipeline(interview.id, {
            from: "scheduled",
            to: "scheduled",
            detail: `Recall.ai bot scheduling failed: ${recallErr instanceof Error ? recallErr.message : String(recallErr)}. Interview proceeds without recording bot.`,
          });
        } catch {
          // Best-effort trace
        }
      }
    }

    // Trace the creation
    await tracePipeline(interview.id, {
      from: null,
      to: "scheduled",
      detail: `Interview created. Calendar event: ${meetResult.calendarEventId}. Meet: ${meetResult.meetLink}${recallBotId ? `. Recall bot: ${recallBotId}` : ""}`,
      metadata: recallBotId ? { recall_bot_id: recallBotId } : undefined,
    });

    console.log(
      `[TRACE:interview:schedule] interviewId=${interview.id} meetLink=${meetResult.meetLink} calendarEventId=${meetResult.calendarEventId}${recallBotId ? ` recallBotId=${recallBotId}` : ""}`,
    );

    await audit({
      userId: user.id,
      userEmail: user.email,
      action: "create",
      table: "interviews",
      recordId: interview.id,
      metadata: { candidate_id: input.candidate_id, stage_id: input.stage_id },
    });

    return NextResponse.json(
      { data: interview, meetLink: meetResult.meetLink },
      { status: 201 },
    );
  } catch (err) {
    console.error("[interviews/POST] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
