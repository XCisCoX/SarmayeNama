import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

/**
 * Shared server-side API helpers: consistent error envelope, request ids,
 * and a simple in-memory rate limiter (per IP, sliding window).
 */

export interface ApiError {
  error: { code: string; message: string; requestId?: string };
}

export function errorResponse(code: string, message: string, status: number, requestId?: string): NextResponse<ApiError> {
  return NextResponse.json({ error: { code, message, requestId } }, { status });
}

export function okResponse<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function withRequestId(): string {
  return randomUUID().slice(0, 8);
}

/* ------------------------------------------------------------------ */
/* Rate limiting (in-memory token bucket per IP)                       */
/* ------------------------------------------------------------------ */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Sliding-window rate limit. Returns remaining quota or throws a
 * RateLimitExceededError-like response factory when exceeded.
 */
export function checkRateLimit(
  ip: string,
  opts: { limit?: number; windowMs?: number } = {}
): { ok: true; remaining: number } | { ok: false; retryAfterSec: number } {
  const limit = opts.limit ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  return { ok: true, remaining: limit - bucket.count };
}

/** Best-effort client IP extraction (works behind proxies via x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'local';
}

/** Wrap a route handler with rate limiting + request id + sanitized errors. */
export function withRateLimit(
  handler: (req: Request, ctx: { requestId: string }) => Promise<NextResponse>,
  opts: { limit?: number; windowMs?: number } = {}
) {
  return async (req: Request): Promise<NextResponse> => {
    const requestId = withRequestId();
    const rate = checkRateLimit(clientIp(req), opts);
    if (rate.ok === false) {
      return errorResponse(
        'rate_limited',
        `Rate limit exceeded. Try again in ${rate.retryAfterSec}s.`,
        429,
        requestId
      );
    }
    try {
      return await handler(req, { requestId });
    } catch {
      // Never leak stack traces or internal details to the client.
      return errorResponse('internal', 'Internal server error', 500, requestId);
    }
  };
}
