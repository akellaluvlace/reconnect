/**
 * Detect expired session (401) from API responses and redirect to login.
 * Returns true if the session was expired (redirect initiated), false otherwise.
 *
 * Usage:
 *   const res = await fetch("/api/...", { ... });
 *   if (handleSessionExpired(res)) return;
 */
export function handleSessionExpired(response: Response): boolean {
  if (response.status === 401) {
    window.location.href = "/login?session_expired=true";
    return true;
  }
  return false;
}
