/**
 * Sanitize user-supplied input before interpolation into AI prompts.
 * Strips control characters and wraps content in XML-style delimiters
 * to reduce prompt injection risk.
 */
export function sanitizeInput(input: string): string {
  // Strip control characters (except newlines and tabs)
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Wrap user content in XML delimiters for structured separation from instructions.
 */
export function wrapUserContent(label: string, content: string): string {
  const sanitized = sanitizeInput(content);
  return `<${label}>\n${sanitized}\n</${label}>`;
}
