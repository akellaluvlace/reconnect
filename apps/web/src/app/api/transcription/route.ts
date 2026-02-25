import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { transcribeAudio } from "@/lib/openai/client";

const RequestSchema = z.object({
  interview_id: z.string().uuid(),
  recording_url: z.string().url().max(2048),
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

    const { interview_id, recording_url } = parsed.data;

    // SSRF prevention: only allow Supabase Storage and Google Drive URLs
    // Exact hostname match only — no subdomain bypass, HTTPS required
    const allowedHosts = new Set([
      "vfufxduwywrnwbjtwdjz.supabase.co",
      "www.googleapis.com",
      "drive.google.com",
    ]);
    try {
      const urlObj = new URL(recording_url);
      if (urlObj.protocol !== "https:") {
        return NextResponse.json(
          { error: "Only HTTPS URLs are allowed" },
          { status: 400 },
        );
      }
      if (!allowedHosts.has(urlObj.hostname.toLowerCase())) {
        return NextResponse.json(
          { error: "Recording URL must be from an allowed source" },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid recording URL" },
        { status: 400 },
      );
    }

    // Update recording status to "transcribing"
    const { error: statusError } = await supabase
      .from("interviews")
      .update({ recording_status: "transcribing" })
      .eq("id", interview_id);

    if (statusError) {
      console.error(
        "[transcription] Status update failed:",
        statusError.message,
      );
    }

    // Download audio from the recording URL
    const audioResponse = await fetch(recording_url);
    if (!audioResponse.ok) {
      // Mark as failed
      await supabase
        .from("interviews")
        .update({ recording_status: "failed" })
        .eq("id", interview_id);

      return NextResponse.json(
        { error: "Failed to download recording" },
        { status: 500 },
      );
    }

    const audioBlob = await audioResponse.blob();
    const audioFile = new File([audioBlob], "recording.m4a", {
      type: audioBlob.type || "audio/mp4",
    });

    // Transcribe with Whisper
    const transcription = await transcribeAudio(audioFile);

    // Store transcript using service_role (interview_transcripts has no RLS policies)
    const serviceClient = createServiceRoleClient();
    const { error: upsertError } = await serviceClient
      .from("interview_transcripts")
      .upsert(
        {
          interview_id,
          transcript: transcription.text,
          metadata: {
            duration: transcription.duration,
            language: transcription.language,
            segment_count: transcription.segments?.length ?? 0,
          },
        },
        { onConflict: "interview_id" },
      );

    if (upsertError) {
      console.error("[transcription] Upsert failed:", upsertError.message);
      await supabase
        .from("interviews")
        .update({ recording_status: "failed" })
        .eq("id", interview_id);

      return NextResponse.json(
        { error: "Failed to store transcript" },
        { status: 500 },
      );
    }

    // Update recording status to "completed"
    await supabase
      .from("interviews")
      .update({ recording_status: "completed" })
      .eq("id", interview_id);

    return NextResponse.json({
      success: true,
      duration_seconds: transcription.duration,
    });
  } catch (error) {
    console.error("[transcription] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Transcription failed",
      },
      { status: 500 },
    );
  }
}
