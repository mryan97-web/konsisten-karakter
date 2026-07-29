import { createMiddleware } from 'hono/factory';
import { E } from '../shared/response';

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export const withRateLimit = (limit: number, windowMs: number = 60_000) =>
  createMiddleware(async (c, next) => {
    const key = c.req.header('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    const entry = requestCounts.get(key);

    if (!entry || now > entry.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    } else if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return E.RATE_LIMIT(retryAfter, limit);
    } else {
      entry.count++;
    }

    await next();
  });
