import { createMiddleware } from 'hono/factory';

export const withRequestId = createMiddleware(async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  await next();
});
