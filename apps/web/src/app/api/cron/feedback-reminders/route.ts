import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { notifyCollaborator } from "@/lib/notifications";
import { timingSafeEqual } from "crypto";

export const maxDuration = 60;

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Collaborator row with extra column not yet in generated types */
interface CollaboratorWithReminder {
  id: string;
  name: string | null;
  email: string;
  invite_token: string | null;
  last_reminder_sent_at: string | null;
}

export async function GET(req: NextRequest) {
  const cronStart = Date.now();

  // Auth: CRON_SECRET (timing-safe to prevent timing attacks)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  if (
    !cronSecret ||
    !timingSafeCompare(authHeader, `Bearer ${cronSecret}`)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const stats = { sent: 0, skipped: 0, errors: 0 };

  try {
    // Find interviews where scheduled_at > 24h ago and not cancelled/no_consent
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: interviews, error: queryError } = await supabase
      .from("interviews")
      .select("id, stage_id, candidate_id, scheduled_at")
      .lt("scheduled_at", twentyFourHoursAgo)
      .not("recording_status", "in", '("cancelled","no_consent")')
      .limit(100);

    if (queryError) {
      console.error(
        "[cron:feedback-reminders] Query failed:",
        queryError.message,
      );
      return NextResponse.json(
        { error: "Query failed", duration: Date.now() - cronStart },
        { status: 500 },
      );
    }

    if (!interviews || interviews.length === 0) {
      const duration = Date.now() - cronStart;
      console.log(
        `[TRACE:cron:feedback-reminders] sent=0 skipped=0 errors=0 duration=${duration}ms (no interviews)`,
      );
      return NextResponse.json({ success: true, stats, duration });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.axil.ie";

    for (const interview of interviews) {
      if (!interview.stage_id) continue;

      try {
        // Get stage info (name + playbook_id) for notification content
        const { data: stage } = await supabase
          .from("interview_stages")
          .select("name, playbook_id")
          .eq("id", interview.stage_id)
          .single();

        if (!stage?.playbook_id) continue;

        // Get candidate name
        const { data: candidate } = await supabase
          .from("candidates")
          .select("name")
          .eq("id", interview.candidate_id!)
          .single();

        // Find collaborators assigned to this stage
        // last_reminder_sent_at is added by migration #31 but not yet in generated types —
        // we select known columns and cast the result to include the extra column
        const { data: rawCollaborators } = await supabase
          .from("collaborators")
          .select("id, name, email, invite_token")
          .eq("playbook_id", stage.playbook_id)
          .contains("assigned_stages", [interview.stage_id]);

        // Cast to include the runtime-available column
        const collaborators =
          (rawCollaborators as unknown as CollaboratorWithReminder[] | null) ??
          [];

        if (collaborators.length === 0) continue;

        // Get IDs of collaborators who already submitted feedback
        const { data: existingFeedback } = await supabase
          .from("feedback")
          .select("collaborator_id")
          .eq("interview_id", interview.id)
          .not("collaborator_id", "is", null);

        const submittedCollaboratorIds = new Set(
          existingFeedback?.map((f) => f.collaborator_id) ?? [],
        );

        for (const collaborator of collaborators) {
          // Skip if already submitted feedback
          if (submittedCollaboratorIds.has(collaborator.id)) {
            stats.skipped++;
            continue;
          }

          // Skip if reminder sent within last 24 hours
          const lastSent = collaborator.last_reminder_sent_at;
          if (lastSent) {
            const elapsed = Date.now() - new Date(lastSent).getTime();
            if (elapsed < 24 * 60 * 60 * 1000) {
              stats.skipped++;
              continue;
            }
          }

          try {
            await notifyCollaborator({
              collaboratorId: collaborator.id,
              type: "feedback_reminder",
              data: {
                collaboratorName: collaborator.name ?? "",
                stageName: stage.name ?? "Interview",
                candidateName: candidate?.name ?? "Candidate",
                feedbackLink: `${appUrl}/auth/collaborator/feedback?token=${collaborator.invite_token ?? ""}&interview_id=${interview.id}`,
              },
            });

            // Update last_reminder_sent_at (column exists in DB but not in generated types)
            await supabase
              .from("collaborators")
              .update({
                last_reminder_sent_at: new Date().toISOString(),
              } as never)
              .eq("id", collaborator.id);

            stats.sent++;
          } catch {
            stats.errors++;
          }
        }
      } catch (err) {
        console.error(
          `[cron:feedback-reminders] Error processing interview=${interview.id}:`,
          err,
        );
        stats.errors++;
      }
    }

    const duration = Date.now() - cronStart;
    console.log(
      `[TRACE:cron:feedback-reminders] sent=${stats.sent} skipped=${stats.skipped} errors=${stats.errors} duration=${duration}ms`,
    );

    return NextResponse.json({ success: true, stats, duration });
  } catch (err) {
    console.error("[cron/feedback-reminders] fatal error:", err);
    return NextResponse.json(
      { error: "Cron failed", duration: Date.now() - cronStart },
      { status: 500 },
    );
  }
}
