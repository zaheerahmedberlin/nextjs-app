// lib/rateLimit.js
// Simple Redis-backed fixed-window rate limiter for login endpoints, which
// had no throttling at all — unlimited password guessing was possible.
// Fails open (allows the request) if Redis is unreachable, matching the
// rest of the app's "Redis down => degrade, don't hard-fail" pattern
// (see lib/redis.js) — availability of the site takes priority over this
// specific defense-in-depth layer.
import { redis } from "@/lib/redis";

export async function isRateLimited(key, { max = 8, windowSeconds = 300 } = {}) {
  if (!redis) return false;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count > max;
  } catch {
    return false;
  }
}

// Caddy sits in front of the app (see docs referenced in run_cron.sh/deploy.sh
// comments elsewhere) and is expected to set x-forwarded-for — falls back to
// "unknown" (a single shared bucket) rather than throwing if it's ever missing,
// which still rate-limits, just coarsely across all callers instead of per-IP.
export function getClientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}
