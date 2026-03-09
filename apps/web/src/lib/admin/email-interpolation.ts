/**
 * Replaces {{variable}} placeholders in a template string.
 * Unknown variables are left unchanged.
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    variables[key] ?? match,
  );
}
