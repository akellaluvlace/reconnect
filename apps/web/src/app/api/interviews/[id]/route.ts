import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google";
import { tracePipeline } from "@/lib/google/pipeline-tracer";
import { scheduleBot, cancelBot, isRecallConfigured } from "@/lib/recall/client";
import { audit } from "@/lib/audit";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RescheduleSchema = z.object({
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().int().min(15).max(240).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Auth: admin/manager
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
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Org ownership check: RLS-scoped client ensures interview belongs to user's org
    const { data: rlsCheck } = await supabase
      .from("interviews")
      .select("id")
      .eq("id", id)
      .single();
    if (!rlsCheck) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = RescheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (!parsed.data.scheduled_at && !parsed.data.duration_minutes) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const serviceClient = createServiceRoleClient();
    const { data: interview } = await serviceClient
      .from("interviews")
      .select("id, calendar_event_id, scheduled_at, meet_link, recall_bot_id")
      .eq("id", id)
      .single();

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }

    // Update Calendar event if we have one
    if (interview.calendar_event_id) {
      const { data: config } = await serviceClient
        .from("platform_google_config")
        .select("interview_calendar_id")
        .limit(1)
        .single();
      const calId = config?.interview_calendar_id;
      if (!calId) {
        console.error("[interviews/PATCH] No interview_calendar_id configured");
        return NextResponse.json(
          { error: "Google Calendar integration not configured" },
          { status: 503 },
        );
      }

      const calUpdate: Record<string, string> = {};
      if (parsed.data.scheduled_at) {
        calUpdate.startTime = parsed.data.scheduled_at;
        const dur = parsed.data.duration_minutes ?? 60;
        calUpdate.endTime = new Date(
          new Date(parsed.data.scheduled_at).getTime() + dur * 60 * 1000,
        ).toISOString();
      }
      await updateCalendarEvent(calId, interview.calendar_event_id, calUpdate);
    }

    // Update DB
    const updateData: Record<string, unknown> = {};
    if (parsed.data.scheduled_at)
      updateData.scheduled_at = parsed.data.scheduled_at;
    if (parsed.data.duration_minutes)
      updateData.duration_minutes = parsed.data.duration_minutes;

    const { data: updated, error: updateError } = await serviceClient
      .from("interviews")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[interviews/PATCH] update error:", updateError);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    // Reschedule Recall.ai bot if configured
    if (isRecallConfigured() && interview.meet_link && parsed.data.scheduled_at) {
      try {
        // Cancel old bot
        if (interview.recall_bot_id) {
          await cancelBot(interview.recall_bot_id);
        }
        // Schedule new bot
        const result = await scheduleBot({
          meetUrl: interview.meet_link,
          joinAt: parsed.data.scheduled_at,
          interviewId: id,
        });
        const { error: botUpdateError } = await serviceClient
          .from("interviews")
          .update({ recall_bot_id: result.botId })
          .eq("id", id);
        if (botUpdateError) {
          console.error(
            `[RECALL:reschedule] Bot scheduled but DB update failed for ${id}:`,
            botUpdateError,
          );
        }
        console.log(
          `[RECALL:reschedule] interviewId=${id} oldBot=${interview.recall_bot_id} newBot=${result.botId}`,
        );
      } catch (recallErr) {
        console.warn(`[RECALL:reschedule] Failed for interview ${id}:`, recallErr);
        // Clear stale bot ID since old bot was cancelled but new one failed (#7)
        if (interview.recall_bot_id) {
          await serviceClient
            .from("interviews")
            .update({ recall_bot_id: null })
            .eq("id", id);
        }
      }
    }

    await tracePipeline(id, {
      from: "scheduled",
      to: "scheduled",
      detail: `Rescheduled to ${parsed.data.scheduled_at ?? "same time"}`,
    });

    await audit({
      userId: user.id,
      userEmail: user.email,
      action: "update",
      table: "interviews",
      recordId: id,
      metadata: { scheduled_at: parsed.data.scheduled_at, duration_minutes: parsed.data.duration_minutes },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[interviews/PATCH] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Auth: admin/manager
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
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Org ownership check: RLS-scoped client ensures interview belongs to user's org
    const { data: rlsCheck } = await supabase
      .from("interviews")
      .select("id")
      .eq("id", id)
      .single();
    if (!rlsCheck) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }

    const serviceClient = createServiceRoleClient();
    const { data: interview } = await serviceClient
      .from("interviews")
      .select("id, status, calendar_event_id, recall_bot_id")
      .eq("id", id)
      .single();

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }

    // Only allow deleting scheduled or cancelled interviews
    if (!["scheduled", "cancelled", "completed"].includes(interview.status ?? "")) {
      return NextResponse.json(
        { error: "Cannot delete this interview" },
        { status: 400 },
      );
    }

    // Cancel Recall.ai bot (if still scheduled)
    if (interview.recall_bot_id && isRecallConfigured()) {
      try {
        await cancelBot(interview.recall_bot_id);
        console.log(
          `[RECALL:cancel] botId=${interview.recall_bot_id} interviewId=${id}`,
        );
      } catch (recallErr) {
        console.warn(`[RECALL:cancel] Failed for bot ${interview.recall_bot_id}:`, recallErr);
      }
    }

    // Delete Calendar event (if not already cancelled)
    if (interview.calendar_event_id && interview.status === "scheduled") {
      const { data: config } = await serviceClient
        .from("platform_google_config")
        .select("interview_calendar_id")
        .limit(1)
        .single();
      const calId = config?.interview_calendar_id;
      if (calId) {
        try {
          await deleteCalendarEvent(calId, interview.calendar_event_id);
        } catch (calErr) {
          console.warn("[interviews/DELETE] Calendar delete failed (may already be deleted):", calErr);
        }
      }
    }

    // Hard delete the interview
    const { error: deleteError } = await serviceClient
      .from("interviews")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[interviews/DELETE] delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete interview" },
        { status: 500 },
      );
    }

    console.log(`[interviews/DELETE] interviewId=${id} hard-deleted`);

    await audit({
      userId: user.id,
      userEmail: user.email,
      action: "delete",
      table: "interviews",
      recordId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[interviews/DELETE] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
