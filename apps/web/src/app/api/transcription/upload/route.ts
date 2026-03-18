import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { tracePipeline, traceError } from "@/lib/google/pipeline-tracer";

export const maxDuration = 300;

const ALLOWED_TYPES = [
  "audio/mp4",
  "audio/mpeg",
  "audio/webm",
  "audio/wav",
  "video/mp4",
  "video/webm",
];
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(req: NextRequest) {
  try {
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

    // Parse multipart form data
    const formData = await req.formData();
    const interviewId = formData.get("interview_id") as string;
    const file = formData.get("file") as File;

    if (!interviewId || !file) {
      return NextResponse.json(
        { error: "interview_id and file are required" },
        { status: 400 },
      );
    }

    // Validate interview_id format
    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(interviewId)) {
      return NextResponse.json(
        { error: "Invalid interview_id" },
        { status: 400 },
      );
    }

    // Verify interview belongs to user's org (RLS-scoped query)
    const { data: interviewCheck } = await supabase
      .from("interviews")
      .select("id")
      .eq("id", interviewId)
      .single();
    if (!interviewCheck) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }

    // Validate file
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 100MB)" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 },
      );
    }

    const serviceClient = createServiceRoleClient();

    // Sanitize file name for storage path
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
    const storagePath = `recordings/${interviewId}/${safeName}`;
    const { error: uploadError } = await serviceClient.storage
      .from("recordings")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[transcription/upload] upload error:", uploadError);
      return NextResponse.json(
        { error: "File upload failed" },
        { status: 500 },
      );
    }

    // Update interview status (validate current state to prevent overwriting later states)
    const { error: statusError } = await serviceClient
      .from("interviews")
      .update({
        recording_status: "uploaded",
        recording_url: storagePath,
      })
      .eq("id", interviewId)
      .in("recording_status", [
        "scheduled",
        "pending",
        "no_consent",
        "failed_transcription",
      ]);
    if (statusError) {
      console.error("[transcription/upload] status update error:", statusError);
    }

    await tracePipeline(interviewId, {
      from: null,
      to: "uploaded",
      detail: `Manual upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    });

    // Transcribe with Whisper
    const whisperKey = process.env.OPENAI_API_KEY;
    if (!whisperKey) {
      return NextResponse.json(
        { error: "Whisper API not configured" },
        { status: 503 },
      );
    }

    const whisperForm = new FormData();
    whisperForm.append("file", file);
    whisperForm.append("model", "whisper-1");
    whisperForm.append("response_format", "verbose_json");

    const start = Date.now();
    const whisperRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${whisperKey}` },
        body: whisperForm,
      },
    );

    const latency = Date.now() - start;
    console.log(
      `[TRACE:transcription:whisper] interviewId=${interviewId} status=${whisperRes.status} latency=${latency}ms`,
    );

    if (!whisperRes.ok) {
      const errBody = await whisperRes.text();
      traceError(interviewId, errBody, "whisper");
      await serviceClient
        .from("interviews")
        .update({ recording_status: "failed_transcription" })
        .eq("id", interviewId);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 502 },
      );
    }

    const whisperData = (await whisperRes.json()) as {
      text: string;
      duration: number;
      language: string;
    };
    const transcript = whisperData.text;

    // Store transcript
    const { error: transcriptInsertError } = await serviceClient
      .from("interview_transcripts")
      .insert({
        interview_id: interviewId,
        transcript,
        metadata: {
          source: "whisper",
          model: "whisper-1",
          duration_seconds: whisperData.duration,
          language: whisperData.language,
          file_name: file.name,
          file_size: file.size,
          latency_ms: latency,
        },
      });

    if (transcriptInsertError) {
      // 23505 = unique constraint (already transcribed) — not fatal
      if (transcriptInsertError.code !== "23505") {
        console.error("[transcription/upload] transcript insert error:", transcriptInsertError);
        return NextResponse.json(
          { error: "Failed to store transcript" },
          { status: 500 },
        );
      }
    }

    const { error: transcribedError } = await serviceClient
      .from("interviews")
      .update({ recording_status: "transcribed" })
      .eq("id", interviewId);
    if (transcribedError) {
      console.error("[transcription/upload] status update to transcribed error:", transcribedError);
    }

    await tracePipeline(interviewId, {
      from: "uploaded",
      to: "transcribed",
      detail: `Whisper transcription complete: ${transcript.length} chars, ${whisperData.duration}s audio, ${latency}ms`,
    });

    return NextResponse.json({
      data: {
        transcript_length: transcript.length,
        duration: whisperData.duration,
      },
    });
  } catch (err) {
    console.error("[transcription/upload] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
