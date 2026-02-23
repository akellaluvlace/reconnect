/**
 * Strips AI metadata and disclaimer text that the model sometimes embeds
 * in generated content strings.
 *
 * Patterns removed:
 * - "Metadata: model_used=..., prompt_version=..., generated_at=..."
 * - "This AI-generated content is for informational purposes only..."
 */

const METADATA_PATTERN =
  /\s*Metadata:\s*model_used=.*?(?:,\s*prompt_version=.*?)?(?:,\s*generated_at=.*?)?\.?\s*$/i;

const DISCLAIMER_PATTERN =
  /\s*This AI-generated content is for informational purposes only\.?\s*All hiring decisions must be made by humans\.?\s*$/i;

export function stripAIMetadata(text: string): string {
  return text.replace(METADATA_PATTERN, "").replace(DISCLAIMER_PATTERN, "").trim();
}
