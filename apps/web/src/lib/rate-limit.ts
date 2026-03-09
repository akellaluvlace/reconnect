/**
 * Simple in-memory rate limiter for AI endpoints.
 * Tracks calls per user in a sliding window. Resets on deploy/cold start.
 * Good enough for beta — upgrade to DB-backed if needed post-launch.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/**
 * Check if a request should be rate limited.
 *
 * @param userId - The user's ID
 * @param maxRequests - Max requests allowed in the window (default: 10)
 * @param windowMs - Sliding window in milliseconds (default: 60_000 = 1 minute)
 * @returns `null` if allowed, or `{ retryAfterMs }` if rate limited
 */
export function checkRateLimit(
  userId: string,
  maxRequests = 10,
  windowMs = 60_000,
): { retryAfterMs: number } | null {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(userId);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(userId, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return { retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  // Allow request — record timestamp
  entry.timestamps.push(now);
  return null;
}
