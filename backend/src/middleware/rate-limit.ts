import { createMiddleware } from 'hono/factory';

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
      c.header('Retry-After', String(retryAfter));
      return c.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT',
            message: `Terlalu banyak request. Coba lagi dalam ${retryAfter} detik`,
            details: { retry_after: retryAfter, limit },
          },
        },
        429,
      );
    } else {
      entry.count++;
    }

    await next();
  });
