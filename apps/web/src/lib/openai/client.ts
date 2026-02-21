/**
 * OpenAI Whisper client for audio transcription.
 * Only used server-side for the transcription pipeline.
 */

let _apiKey: string | undefined;

function getApiKey(): string {
  if (!_apiKey) {
    _apiKey = process.env.OPENAI_API_KEY;
    if (!_apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
  }
  return _apiKey;
}

export interface TranscriptionResult {
  text: string;
  duration: number;
  language: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

/**
 * Transcribe audio using OpenAI Whisper-1 API.
 * Returns verbose JSON including segments, duration, and language.
 */
export async function transcribeAudio(
  file: File,
): Promise<TranscriptionResult> {
  const apiKey = getApiKey();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Whisper API error (${response.status}): ${errorBody}`,
    );
  }

  const result = await response.json();

  return {
    text: result.text,
    duration: result.duration ?? 0,
    language: result.language ?? "unknown",
    segments: result.segments?.map(
      (s: { start: number; end: number; text: string }) => ({
        start: s.start,
        end: s.end,
        text: s.text,
      }),
    ),
  };
}
