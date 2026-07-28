import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { withRequestId } from './middleware/request-id.js';

const app = new Hono();

// ─── Global middleware ───
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://consistent-char.vercel.app'],
  credentials: true,
}));
app.use('*', logger());
app.use('*', withRequestId);

// ─── Health ───
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───
const { default: authRoutes } = await import('./routes/auth.js');
app.route('/api/auth', authRoutes);

// ─── 404 ───
app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' } }, 404);
});

// ─── Error handler ───
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: { code: 'HTTP_ERROR', message: err.message } }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan server' } }, 500);
});

const port = parseInt(process.env.PORT || '4000');
console.log(`🚀 Backend running at http://localhost:${port}`);

serve({ fetch: app.fetch, port });
