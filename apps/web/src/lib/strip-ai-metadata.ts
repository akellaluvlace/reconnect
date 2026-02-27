/**
 * Strips AI metadata, disclaimers, and cleans up AI-generated text.
 *
 * Patterns removed:
 * - "Metadata: model_used=..., prompt_version=..., generated_at=..."
 * - "This AI-generated content is for informational purposes only..."
 * - "All hiring decisions must be made by humans."
 * - Standalone "Disclaimer:" prefix
 *
 * cleanAIText() additionally:
 * - Replaces raw enum values (candidate_market → candidate's market)
 * - Replaces raw confidence decimals (confidence of 0.55 → moderate confidence)
 */

const METADATA_PATTERN =
  /\s*Metadata:\s*model_used=.*?(?:,\s*prompt_version=.*?)?(?:,\s*generated_at=.*?)?\.?\s*$/i;

// Match disclaimer at end of string (original behavior)
const DISCLAIMER_TAIL_PATTERN =
  /\s*This AI-generated content is for informational purposes only\.?\s*All hiring decisions must be made by humans\.?\s*$/i;

// Match individual disclaimer sentences ANYWHERE in text
const DISCLAIMER_SENTENCES = [
  /This AI-generated content is for informational purposes only\.?\s*/gi,
  /All hiring decisions must be made by humans\.?\s*/gi,
];

// Snake_case enum values the AI leaks into rationale text
const ENUM_REPLACEMENTS: [RegExp, string][] = [
  [/\bcandidate_market\b/g, "candidate's market"],
  [/\bemployer_market\b/g, "employer's market"],
  [/\bbalanced_market\b/g, "balanced market"],
  [/\bfast_track\b/g, "fast-track"],
];

// "confidence of 0.55" or "confidence: 0.55" → "moderate confidence"
const CONFIDENCE_INLINE_PATTERN = /confidence\s*(?:of|is|at|:| =)\s*(0\.\d+)/gi;

function confidenceLabel(val: number): string {
  if (val >= 0.8) return "high";
  if (val >= 0.6) return "good";
  if (val >= 0.4) return "moderate";
  return "low";
}

/** Strip metadata + disclaimer from end of text (backwards-compatible) */
export function stripAIMetadata(text: string): string {
  const cleaned = text
    .replace(METADATA_PATTERN, "")
    .replace(DISCLAIMER_TAIL_PATTERN, "")
    .trim();
  if (/^\s*Disclaimer:\s*$/i.test(cleaned)) return "";
  return cleaned;
}

/** Deep clean: strip disclaimers everywhere, fix enums, fix confidence decimals */
export function cleanAIText(text: string): string {
  let cleaned = stripAIMetadata(text);

  // Remove disclaimer sentences anywhere (not just at end)
  for (const pattern of DISCLAIMER_SENTENCES) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Replace raw enum values
  for (const [pattern, replacement] of ENUM_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Replace raw confidence decimals with labels
  cleaned = cleaned.replace(CONFIDENCE_INLINE_PATTERN, (_, val) => {
    return `${confidenceLabel(parseFloat(val))} confidence`;
  });

  // Strip standalone "Disclaimer:" remnants
  if (/^\s*Disclaimer:\s*$/i.test(cleaned)) return "";

  // Collapse multiple spaces
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

/**
 * Parse AI text that contains numbered items like "(1) text (2) text"
 * into { heading?, items[] }. The heading captures any intro text before
 * the first numbered item (e.g. "A lead strategy is essential for five reasons:").
 * Falls back to sentence splitting if no numbered pattern found.
 */
export function parseNumberedItems(text: string): {
  heading: string | null;
  items: string[];
} {
  if (!text) return { heading: null, items: [] };

  // Check for (1)...(2)... pattern
  if (/\(\d+\)\s/.test(text)) {
    const parts = text
      .split(/\(\d+\)\s*/)
      .map((s) => s.trim().replace(/;$/, "").replace(/\.$/, "").trim())
      .filter((s) => s.length > 0);

    if (parts.length > 1) {
      // First part before (1) is the intro/heading if it ends with ":"
      // or contains "reason" / "because" / "factor" phrasing
      const first = parts[0];
      const looksLikeHeading =
        first.endsWith(":") ||
        /\b(reasons?|because|factors?|considerations?)\b/i.test(first);

      if (looksLikeHeading) {
        return {
          heading: first.replace(/:$/, ""),
          items: parts.slice(1),
        };
      }
      return { heading: null, items: parts };
    }
  }

  // Fallback: split on sentence boundaries
  const sentences = text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return { heading: null, items: sentences };
}
