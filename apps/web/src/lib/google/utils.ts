/** Strip potential tokens/secrets from API error bodies before logging or throwing */
export function sanitizeErrorBody(body: string): string {
  return body
    .replace(/Bearer\s+[^\s"]+/gi, "Bearer [REDACTED]")
    .replace(/"(access_token|refresh_token|client_secret)"\s*:\s*"[^"]*"/g, '"$1":"[REDACTED]"')
    .slice(0, 500);
}
