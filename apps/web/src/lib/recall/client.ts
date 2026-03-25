/**
 * Recall.ai API client for scheduling meeting recording bots.
 *
 * Region: eu-central-1 (Frankfurt) — GDPR compliant.
 * Docs: https://docs.recall.ai
 */

import { sanitizeErrorBody } from "@/lib/google/utils";

const RECALL_REGION = "eu-central-1";
const RECALL_BASE = `https://${RECALL_REGION}.recall.ai/api/v1`;
const RECALL_DOMAIN = `${RECALL_REGION}.recall.ai`;
/** Allowed domains for transcript download URLs (Recall.ai direct + pre-signed S3) */
const ALLOWED_DOWNLOAD_DOMAINS = [
  `${RECALL_REGION}.recall.ai`,
  `${RECALL_REGION}-recallai-production-bot-data.s3.amazonaws.com`,
];

/** Timeout for scheduling/cancel calls (in user request path) */
const API_TIMEOUT_MS = 10_000;
/** Timeout for transcript download (larger payloads) */
const DOWNLOAD_TIMEOUT_MS = 30_000;

function getApiKey(): string {
  const key = process.env.RECALL_API_KEY;
  if (!key) throw new Error("RECALL_API_KEY not configured");
  return key;
}

/** Create an AbortController with a timeout */
function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

/** Transcript entry from Recall.ai download */
export interface RecallTranscriptEntry {
  participant: {
    id: number;
    name: string;
    is_host: boolean;
    platform: string;
    extra_data: unknown;
  };
  words: Array<{
    text: string;
    start_timestamp: { relative: number; absolute: string };
    end_timestamp: { relative: number; absolute: string };
  }>;
}

/**
 * Schedule a recording bot to join a Google Meet call.
 * Uses meeting_captions provider (cheapest, perfect diarization).
 */
export async function scheduleBot(params: {
  meetUrl: string;
  joinAt: string;
  interviewId: string;
  botName?: string;
}): Promise<{ botId: string }> {
  const { meetUrl, joinAt, interviewId, botName = "Axil Recorder" } = params;

  const { signal, clear } = withTimeout(API_TIMEOUT_MS);
  try {
    const res = await fetch(`${RECALL_BASE}/bot/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meeting_url: meetUrl,
        join_at: joinAt,
        bot_name: botName,
        metadata: { interview_id: interviewId },
        recording_config: {
          transcript: {
            provider: {
              meeting_captions: {},
            },
          },
        },
      }),
      signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Recall.ai scheduleBot failed: ${res.status} ${sanitizeErrorBody(body)}`,
      );
    }

    let data: Record<string, unknown>;
    try {
      data = await res.json();
    } catch {
      throw new Error(
        `Recall.ai scheduleBot returned non-JSON response (status ${res.status})`,
      );
    }

    // Validate response contains a bot ID (#14)
    if (!data.id || typeof data.id !== "string") {
      throw new Error(
        `Recall.ai scheduleBot returned unexpected response: missing or invalid bot ID`,
      );
    }

    console.log(
      `[RECALL:scheduleBot] botId=${data.id} interviewId=${interviewId} joinAt=${joinAt}`,
    );
    return { botId: data.id };
  } finally {
    clear();
  }
}

/**
 * Cancel/delete a scheduled bot. Only works if bot hasn't joined yet.
 * Silently succeeds if bot is already deleted or in-call.
 */
export async function cancelBot(botId: string): Promise<void> {
  const { signal, clear } = withTimeout(API_TIMEOUT_MS);
  try {
    const res = await fetch(`${RECALL_BASE}/bot/${botId}/`, {
      method: "DELETE",
      headers: {
        Authorization: `Token ${getApiKey()}`,
      },
      signal,
    });

    // 204 = success, 404 = already gone, 409 = already in call (can't cancel)
    if (res.ok || res.status === 404 || res.status === 409) {
      console.log(`[RECALL:cancelBot] botId=${botId} status=${res.status}`);
      return;
    }

    const body = await res.text().catch(() => "");
    throw new Error(
      `Recall.ai cancelBot failed: ${res.status} ${sanitizeErrorBody(body)}`,
    );
  } finally {
    clear();
  }
}

/**
 * Get bot details including transcript download URL.
 * Call after receiving bot.done webhook.
 */
export async function getBot(botId: string): Promise<{
  id: string;
  metadata: Record<string, string>;
  transcriptDownloadUrl: string | null;
  status_changes: Array<{ code: string; created_at: string }>;
}> {
  const { signal, clear } = withTimeout(DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(`${RECALL_BASE}/bot/${botId}/`, {
      method: "GET",
      headers: {
        Authorization: `Token ${getApiKey()}`,
        Accept: "application/json",
      },
      signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Recall.ai getBot failed: ${res.status} ${sanitizeErrorBody(body)}`,
      );
    }

    const data = await res.json();

    // Navigate: recordings[0].media_shortcuts.transcript.data.download_url
    const downloadUrl =
      data.recordings?.[0]?.media_shortcuts?.transcript?.data?.download_url ??
      null;

    if (!downloadUrl) {
      console.warn(
        `[RECALL:getBot] No transcript URL. botId=${botId} recordings=${data.recordings?.length ?? 0} ` +
          `hasMediaShortcuts=${!!data.recordings?.[0]?.media_shortcuts} ` +
          `hasTranscript=${!!data.recordings?.[0]?.media_shortcuts?.transcript}`,
      );
    } else {
      console.log(`[RECALL:getBot] botId=${botId} hasTranscript=true`);
    }

    return {
      id: data.id,
      metadata: data.metadata ?? {},
      transcriptDownloadUrl: downloadUrl,
      status_changes: data.status_changes ?? [],
    };
  } finally {
    clear();
  }
}

/**
 * Download transcript from Recall.ai download URL.
 * Validates URL domain before sending auth header (#11).
 * Returns array of participant entries with timestamped words.
 */
export async function fetchTranscript(
  downloadUrl: string,
): Promise<RecallTranscriptEntry[]> {
  // Validate URL domain before fetching (#11)
  const isAllowedDomain = ALLOWED_DOWNLOAD_DOMAINS.some((d) =>
    downloadUrl.startsWith(`https://${d}/`),
  );
  if (!isAllowedDomain) {
    throw new Error(
      `Unexpected transcript download URL domain: ${downloadUrl.slice(0, 60)}`,
    );
  }

  // Pre-signed S3 URLs have auth in query params — don't send API key header
  const isPreSignedS3 = downloadUrl.includes(".s3.amazonaws.com/");
  const headers: Record<string, string> = isPreSignedS3
    ? {}
    : { Authorization: `Token ${getApiKey()}` };

  const { signal, clear } = withTimeout(DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(downloadUrl, {
      headers,
      signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Recall.ai fetchTranscript failed: ${res.status} ${sanitizeErrorBody(body)}`,
      );
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error(
        `Recall.ai fetchTranscript returned non-JSON response (status ${res.status})`,
      );
    }

    if (!Array.isArray(data)) {
      throw new Error("Unexpected transcript format: expected array");
    }

    return data as RecallTranscriptEntry[];
  } finally {
    clear();
  }
}

/**
 * Convert Recall.ai transcript entries to plain text.
 * Format: "Speaker Name: words\n" per participant segment.
 */
export function transcriptToPlainText(
  entries: RecallTranscriptEntry[],
): string {
  return entries
    .map((entry) => {
      const speaker = entry.participant.name || "Unknown Speaker";
      const text = entry.words.map((w) => w.text).join(" ");
      return `${speaker}: ${text}`;
    })
    .join("\n\n");
}

/**
 * Check if Recall.ai is configured (API key present).
 * Used to decide whether to schedule bots.
 */
export function isRecallConfigured(): boolean {
  return !!process.env.RECALL_API_KEY;
}
