/**
 * In-process sliding-window rate limiter.
 *
 * Deliberately dependency-free: a single Node process keeps counters in
 * memory. For multi-instance deployments swap `hit()` for a Redis-backed
 * implementation (the call signature stays identical).
 */

type Bucket = number[];

const buckets = new Map<string, Bucket>();

let lastSweep = Date.now();

/** Occasionally drop stale buckets so memory stays bounded. */
function sweep(windowMs: number) {
  const now = Date.now();
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  const cutoff = now - windowMs * 2;
  for (const [key, hits] of buckets) {
    const recent = hits.filter((t) => t > cutoff);
    if (recent.length === 0) buckets.delete(key);
    else buckets.set(key, recent);
  }
}

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export function hit(
  key: string,
  limit: number,
  windowMs = 60_000,
): RateLimitResult {
  sweep(windowMs);
  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = buckets.get(key) ?? [];
  const recent = existing.filter((t) => t > windowStart);

  if (recent.length >= limit) {
    const retryAfterMs = windowMs - (now - recent[0]);
    buckets.set(key, recent);
    return {
      ok: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  recent.push(now);
  buckets.set(key, recent);

  return {
    ok: true,
    limit,
    remaining: limit - recent.length,
    retryAfterSeconds: 0,
  };
}

/** Best-effort client IP behind proxies (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    ...(result.ok
      ? {}
      : { "Retry-After": String(result.retryAfterSeconds) }),
  };
}
