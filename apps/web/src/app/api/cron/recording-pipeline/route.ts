import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  getConferenceRecord,
  getTranscriptDocId,
  getTranscriptEntries,
  exportGoogleDoc,
  searchDriveForTranscript,
} from "@/lib/google";
import { tracePipeline, traceError } from "@/lib/google/pipeline-tracer";
import { requireGoogleEnv } from "@/lib/google/env";
import { notifyCollaboratorsFeedbackReady } from "@/lib/notifications";
import {
  getBot,
  fetchTranscript,
  transcriptToPlainText,
  isRecallConfigured,
} from "@/lib/recall/client";
import { timingSafeEqual } from "crypto";

export const maxDuration = 300;

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(req: NextRequest) {
  const cronStart = Date.now();

  // Auth: CRON_SECRET (timing-safe to prevent timing attacks)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  if (!cronSecret || !timingSafeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify Google env is configured before processing
  try {
    requireGoogleEnv();
  } catch {
    return NextResponse.json(
      { error: "Google Recording not configured" },
      { status: 503 },
    );
  }

  const supabase = createServiceRoleClient();
  const stats = { phase1: 0, phase2: 0, failed: 0, errors: 0 };

  try {
    // ─── Phase 1: Detect completed interviews (scheduled → pending) ───
    const thirtyMinAgo = new Date(
      Date.now() - 30 * 60 * 1000,
    ).toISOString();

    const { data: scheduledInterviews, error: phase1Error } = await supabase
      .from("interviews")
      .select("id, meet_link, meet_conference_id, scheduled_at")
      .eq("recording_status", "scheduled")
      .lt("scheduled_at", thirtyMinAgo)
      .neq("status", "cancelled");

    if (phase1Error) {
      console.error("[cron:phase1] Query failed:", phase1Error.message);
      stats.errors++;
    }

    if (scheduledInterviews && scheduledInterviews.length > 0) {
      for (const interview of scheduledInterviews) {
        // Optimistic lock: atomic transition
        const { data: claimed } = await supabase
          .from("interviews")
          .update({ recording_status: "pending" })
          .eq("id", interview.id)
          .eq("recording_status", "scheduled")
          .select("id")
          .single();

        if (claimed) {
          stats.phase1++;
          await tracePipeline(interview.id, {
            from: "scheduled",
            to: "pending",
            detail:
              "Interview time passed, starting transcript retrieval",
          });
        }
      }
    }

    console.log(
      `[TRACE:cron:phase1] found=${scheduledInterviews?.length ?? 0} transitioned=${stats.phase1}`,
    );

    // ─── Phase 1b: Poll Recall.ai bots (scheduled → transcribed) ───
    if (isRecallConfigured()) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: recallInterviews, error: recallError } = await supabase
        .from("interviews")
        .select("id, recall_bot_id, recording_status")
        .eq("recording_status", "scheduled")
        .not("recall_bot_id", "is", null)
        .lt("scheduled_at", fiveMinAgo)
        .neq("status", "cancelled");

      if (recallError) {
        console.error("[cron:recall] Query failed:", recallError.message);
        stats.errors++;
      }

      if (recallInterviews && recallInterviews.length > 0) {
        for (const interview of recallInterviews) {
          try {
            const bot = await getBot(interview.recall_bot_id!);
            const lastStatus =
              bot.status_changes[bot.status_changes.length - 1]?.code;

            if (lastStatus === "done") {
              // Bot finished — fetch transcript
              if (!bot.transcriptDownloadUrl) {
                console.warn(
                  `[cron:recall] Bot done but no transcript for ${interview.recall_bot_id}`,
                );
                await supabase
                  .from("interviews")
                  .update({ recording_status: "failed_transcription" })
                  .eq("id", interview.id)
                  .eq("recording_status", "scheduled");
                continue;
              }

              const entries = await fetchTranscript(bot.transcriptDownloadUrl);
              const plainText = transcriptToPlainText(entries);

              if (!plainText.trim() || plainText.length < 50) {
                console.warn(
                  `[cron:recall] Transcript too short: ${plainText.length} chars`,
                );
                await supabase
                  .from("interviews")
                  .update({ recording_status: "failed_transcription" })
                  .eq("id", interview.id)
                  .eq("recording_status", "scheduled");
                continue;
              }

              // Store transcript
              const { error: insertError } = await supabase
                .from("interview_transcripts")
                .upsert(
                  {
                    interview_id: interview.id,
                    transcript: plainText,
                    metadata: {
                      source: "recall_ai",
                      recall_bot_id: interview.recall_bot_id,
                      speakers: [
                        ...new Set(entries.map((e) => e.participant.name)),
                      ],
                      entries_count: entries.length,
                      char_count: plainText.length,
                      retrieved_at: new Date().toISOString(),
                    },
                  },
                  { onConflict: "interview_id" },
                );

              if (insertError) {
                throw insertError;
              }

              await supabase
                .from("interviews")
                .update({ recording_status: "transcribed", status: "completed" })
                .eq("id", interview.id)
                .eq("recording_status", "scheduled");

              stats.phase2++;
              await tracePipeline(interview.id, {
                from: "scheduled",
                to: "transcribed",
                detail: `Recall.ai poll: ${plainText.length} chars, ${entries.length} entries`,
                metadata: {
                  recall_bot_id: interview.recall_bot_id,
                  source: "recall_ai_poll",
                },
              });

              // Notify collaborators that feedback is ready
              await notifyCollaboratorsFeedbackReady(interview.id);

              console.log(
                `[TRACE:cron:recall] interviewId=${interview.id} transcribed via poll`,
              );
            } else if (lastStatus === "fatal") {
              await supabase
                .from("interviews")
                .update({ recording_status: "failed_recording" })
                .eq("id", interview.id)
                .eq("recording_status", "scheduled");

              await tracePipeline(interview.id, {
                from: "scheduled",
                to: "failed_recording",
                detail: "Recall.ai bot fatal error (detected by poll)",
                metadata: { recall_bot_id: interview.recall_bot_id },
              });
            }
            // Other statuses (joining_call, in_call_recording, processing) — skip, check next run
          } catch (err) {
            stats.errors++;
            traceError(interview.id, err, "cron:recall");
          }
        }
      }

      console.log(
        `[TRACE:cron:recall] polled=${recallInterviews?.length ?? 0}`,
      );
    }

    // ─── Phase 2: Retrieve transcripts (pending → transcribed) ───
    const { data: pendingInterviews, error: phase2Error } = await supabase
      .from("interviews")
      .select(
        "id, meet_link, meet_conference_id, pipeline_log, retry_count",
      )
      .eq("recording_status", "pending")
      .lt("retry_count", 3);

    if (phase2Error) {
      console.error("[cron:phase2] Query failed:", phase2Error.message);
      stats.errors++;
    }

    if (pendingInterviews && pendingInterviews.length > 0) {
      for (const interview of pendingInterviews) {
        try {
          // Exponential backoff check
          const retryCount = (interview.retry_count as number) ?? 0;
          if (retryCount > 0) {
            const logs = (interview.pipeline_log ?? []) as Array<{
              ts: string;
            }>;
            const lastLog = logs[logs.length - 1];
            if (lastLog?.ts) {
              const elapsed =
                Date.now() - new Date(lastLog.ts).getTime();
              const minGap =
                retryCount === 1
                  ? 15 * 60 * 1000
                  : 60 * 60 * 1000;
              if (elapsed < minGap) {
                continue; // Skip — not enough time since last retry
              }
            }
          }

          // Extract meeting code from meet_conference_id or meet_link
          const meetingCode =
            interview.meet_conference_id ??
            interview.meet_link?.split("/").pop() ??
            null;

          if (!meetingCode) {
            traceError(
              interview.id,
              "No meeting code available",
              "cron:phase2",
            );
            await supabase
              .from("interviews")
              .update({ retry_count: retryCount + 1 })
              .eq("id", interview.id);
            continue;
          }

          // Step 1: Find conference record
          const conferenceRecord =
            await getConferenceRecord(meetingCode);
          console.log(
            `[TRACE:cron:meet-lookup] interviewId=${interview.id} meetingCode=${meetingCode} found=${!!conferenceRecord}`,
          );

          if (!conferenceRecord) {
            // Transcript not ready yet — retry later
            await supabase
              .from("interviews")
              .update({ retry_count: retryCount + 1 })
              .eq("id", interview.id);
            await tracePipeline(interview.id, {
              from: "pending",
              to: "pending",
              detail: `No conference record yet, retry ${retryCount + 1}/3`,
            });
            continue;
          }

          // Step 2: Get Google Docs transcript (primary source — persistent)
          let docText: string | null = null;
          let docId: string | null = null;
          try {
            docId = await getTranscriptDocId(conferenceRecord);
            if (docId) {
              docText = await exportGoogleDoc(docId);
              console.log(
                `[TRACE:cron:doc-export] interviewId=${interview.id} docId=${docId} chars=${docText.length}`,
              );
            }
          } catch (docErr) {
            traceError(interview.id, docErr, "cron:doc-export");
            // Non-fatal — we can still try Drive search or Meet API entries
          }

          // Step 2b: Drive search fallback — search for transcript doc by meeting code
          if (!docText && meetingCode) {
            try {
              const driveDocId = await searchDriveForTranscript(meetingCode);
              if (driveDocId) {
                docId = driveDocId;
                docText = await exportGoogleDoc(driveDocId);
                console.log(
                  `[TRACE:cron:drive-search] interviewId=${interview.id} docId=${driveDocId} chars=${docText.length}`,
                );
              }
            } catch (driveErr) {
              traceError(interview.id, driveErr, "cron:drive-search");
            }
          }

          // Step 3: Get Meet API structured entries (fallback, expires in 30 days)
          let entriesResult = null;
          try {
            entriesResult =
              await getTranscriptEntries(conferenceRecord);
            console.log(
              `[TRACE:cron:entries] interviewId=${interview.id} entries=${entriesResult.entries.length}`,
            );
          } catch (entriesErr) {
            traceError(interview.id, entriesErr, "cron:entries");
          }

          // Need at least one transcript source
          const transcript = docText ?? entriesResult?.plainText;
          if (!transcript) {
            await supabase
              .from("interviews")
              .update({ retry_count: retryCount + 1 })
              .eq("id", interview.id);
            await tracePipeline(interview.id, {
              from: "pending",
              to: "pending",
              detail: `Transcript not available yet (no doc, no entries), retry ${retryCount + 1}/3`,
            });
            continue;
          }

          // Step 4: Store transcript in dedicated table
          const { error: transcriptError } = await supabase
            .from("interview_transcripts")
            .insert({
              interview_id: interview.id,
              transcript,
              metadata: {
                source: docText
                  ? "google_docs"
                  : "meet_api_entries",
                doc_id: docId,
                entries_count:
                  entriesResult?.entries.length ?? 0,
                retrieved_at: new Date().toISOString(),
                char_count: transcript.length,
              },
            });

          if (transcriptError) {
            // 23505 = unique constraint violation (already transcribed)
            if (transcriptError.code === "23505") {
              console.log(
                `[TRACE:cron:duplicate] interviewId=${interview.id} already transcribed`,
              );
            } else {
              throw transcriptError;
            }
          }

          // Step 5: Transition to transcribed
          await supabase
            .from("interviews")
            .update({
              recording_status: "transcribed",
              status: "completed",
              transcript_doc_id: docId,
            })
            .eq("id", interview.id)
            .eq("recording_status", "pending"); // optimistic lock

          stats.phase2++;
          await tracePipeline(interview.id, {
            from: "pending",
            to: "transcribed",
            detail: `Transcript retrieved: ${transcript.length} chars, source=${docText ? "docs" : "meet_api"}${docId ? `, docId=${docId}` : ""}`,
          });

          // Notify collaborators that feedback is ready
          await notifyCollaboratorsFeedbackReady(interview.id);

          console.log(
            `[TRACE:cron:transcribed] interviewId=${interview.id}`,
          );
        } catch (err) {
          stats.errors++;
          traceError(interview.id, err, "cron:phase2");

          // Increment retry
          const retryCount =
            (interview.retry_count as number) ?? 0;
          await supabase
            .from("interviews")
            .update({ retry_count: retryCount + 1 })
            .eq("id", interview.id);
        }
      }
    }

    // ─── Phase 3: Handle exhausted retries ───
    const { data: exhausted } = await supabase
      .from("interviews")
      .select("id")
      .eq("recording_status", "pending")
      .gte("retry_count", 3);

    if (exhausted && exhausted.length > 0) {
      for (const interview of exhausted) {
        await supabase
          .from("interviews")
          .update({ recording_status: "failed_transcription" })
          .eq("id", interview.id)
          .eq("recording_status", "pending");

        stats.failed++;
        await tracePipeline(interview.id, {
          from: "pending",
          to: "failed_transcription",
          detail:
            "Max retries (3) exhausted. Manual intervention required.",
        });
      }
    }

    const totalDuration = Date.now() - cronStart;
    console.log(
      `[TRACE:cron:complete] phase1=${stats.phase1} phase2=${stats.phase2} failed=${stats.failed} errors=${stats.errors} duration=${totalDuration}ms`,
    );

    // If every interview errored and none succeeded, report partial failure
    const hasWork = stats.phase1 > 0 || stats.phase2 > 0 || stats.failed > 0;
    const allFailed = hasWork && stats.phase2 === 0 && stats.errors > 0;

    return NextResponse.json({
      success: !allFailed,
      stats,
      duration: totalDuration,
    });
  } catch (err) {
    console.error("[cron/recording-pipeline] fatal error:", err);
    return NextResponse.json(
      { error: "Pipeline failed", duration: Date.now() - cronStart },
      { status: 500 },
    );
  }
}
