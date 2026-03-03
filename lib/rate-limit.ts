/**
 * Simple in-memory rate limiter.
 * Fine for a 4-person internal admin tool.
 * Resets on server restart (acceptable for dev + Vercel serverless).
 */

const store = new Map<string, number[]>();

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param key    - Usually IP address or user ID
 * @param limit  - Max requests allowed in the window
 * @param windowMs - Rolling window in milliseconds (default 60s)
 */
export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const timestamps = (store.get(key) ?? []).filter(t => now - t < windowMs);
  if (timestamps.length >= limit) return false;
  store.set(key, [...timestamps, now]);
  return true;
}
