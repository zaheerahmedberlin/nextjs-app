// lib/redis.js
// ─────────────────────────────────────────────────────────────
// Redis cache using `ioredis`.
// Used to cache hot API responses (product lists, categories)
// so we don't hit PostgreSQL on every request.
//
// If Redis is not available (local dev without Redis),
// all cache calls are no-ops — the app falls back to DB.
// ─────────────────────────────────────────────────────────────
import Redis from "ioredis";

let redis;

try {
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  redis.on("error", (err) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Redis unavailable – running without cache:", err.message);
    }
  });
} catch {
  redis = null;
}

// ── Safe wrappers that silently skip if Redis is down ─────────

export async function cacheGet(key) {
  if (!redis) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // silently ignore
  }
}

export async function cacheDel(key) {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {}
}

export { redis };
