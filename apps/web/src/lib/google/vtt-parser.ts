/**
 * A single segment of a parsed transcript.
 */
export interface TranscriptSegment {
  start: string;
  end: string;
  speaker: string;
  text: string;
}

/**
 * Result of parsing a VTT or SBV transcript file.
 */
export interface ParsedTranscript {
  segments: TranscriptSegment[];
  plainText: string;
}

/**
 * Parse a WebVTT transcript into structured segments.
 *
 * Handles:
 * - WEBVTT header lines (skipped)
 * - NOTE blocks (skipped)
 * - Speaker labels in "Speaker Name: text" format
 * - Multiline text within a single cue
 */
export function parseVTT(raw: string): ParsedTranscript {
  if (!raw || !raw.trim()) {
    return { segments: [], plainText: "" };
  }

  // Normalize line endings and split by double-newlines into blocks
  const blocks = raw.replace(/\r\n/g, "\n").trim().split(/\n\n+/);

  const segments: TranscriptSegment[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");

    // Skip WEBVTT header block
    if (lines[0].startsWith("WEBVTT")) {
      continue;
    }

    // Skip NOTE blocks
    if (lines[0].startsWith("NOTE")) {
      continue;
    }

    // Find the timestamp line containing " --> "
    const timestampIndex = lines.findIndex((line) => line.includes(" --> "));
    if (timestampIndex === -1) {
      continue;
    }

    const timestampLine = lines[timestampIndex];
    const [start, end] = timestampLine.split(" --> ").map((s) => s.trim());

    // Text is everything after the timestamp line
    const textLines = lines.slice(timestampIndex + 1);
    const fullText = textLines.join("\n").trim();

    if (!fullText) {
      continue;
    }

    // Extract speaker label if present (e.g. "Speaker 1: Hello")
    let speaker = "";
    let text = fullText;

    // Check only the first line for speaker pattern
    const speakerMatch = textLines[0].match(/^(.+?):\s(.+)$/);
    if (speakerMatch) {
      speaker = speakerMatch[1];
      // Rebuild text with the speaker-stripped first line + remaining lines
      const strippedFirstLine = speakerMatch[2];
      text =
        textLines.length > 1
          ? [strippedFirstLine, ...textLines.slice(1)].join("\n").trim()
          : strippedFirstLine;
    }

    segments.push({ start, end, speaker, text });
  }

  const plainText = segments.map((s) => s.text).join("\n");

  return { segments, plainText };
}

/**
 * Parse an SBV (SubViewer) transcript into structured segments.
 *
 * SBV format:
 * - Timestamps: H:MM:SS.mmm,H:MM:SS.mmm
 * - Text follows on subsequent lines (may be multiline)
 * - No speaker labels
 */
export function parseSBV(raw: string): ParsedTranscript {
  if (!raw || !raw.trim()) {
    return { segments: [], plainText: "" };
  }

  // Normalize line endings and split by double-newlines into blocks
  const blocks = raw.replace(/\r\n/g, "\n").trim().split(/\n\n+/);

  const segments: TranscriptSegment[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 2) {
      continue;
    }

    // First line: timestamps separated by comma
    const timestampLine = lines[0];
    const commaIndex = timestampLine.indexOf(",");
    if (commaIndex === -1) {
      continue;
    }

    const start = timestampLine.slice(0, commaIndex).trim();
    const end = timestampLine.slice(commaIndex + 1).trim();

    // Rest of lines: text (may be multiline)
    const text = lines.slice(1).join("\n").trim();

    if (!text) {
      continue;
    }

    segments.push({ start, end, speaker: "", text });
  }

  const plainText = segments.map((s) => s.text).join("\n");

  return { segments, plainText };
}
