import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { withRequestId } from './middleware/request-id.js';
import { withRateLimit } from './middleware/rate-limit.js';

const app = new Hono();

// ─── Global middleware ───
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,https://konsisten-karakter.vercel.app')
  .split(',')
  .map(s => s.trim());

app.use('*', cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use('*', logger());
app.use('*', withRequestId);
app.use('/api/*', withRateLimit(100, 60_000)); // 100 req/min per IP

// ─── Health ───
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───
const { default: authRoutes } = await import('./routes/auth.js');
app.route('/api/auth', authRoutes);

const { default: characterRoutes } = await import('./routes/character.js');
app.route('/api/character', characterRoutes);

const { default: uploadRoutes } = await import('./routes/upload.js');
app.route('/api', uploadRoutes);

const { default: analyzeRoutes } = await import('./routes/analyze.js');
app.route('/api', analyzeRoutes);

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
