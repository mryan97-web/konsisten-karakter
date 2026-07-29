import { Hono } from 'hono';
import { getSupabaseAdmin } from '../lib/supabase';

const demo = new Hono();

const DEMO_TTL_HOURS = 24;
const DEMO_MAX_PROMPTS = 3;
const DEMO_CLEANUP_INTERVAL = 1_800_000; // 30 minutes

// ─── GET /api/demo/check ───
// Check if device fingerprint still has active demo session
demo.get('/check', async (c) => {
  const fingerprint = c.req.query('fp');
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

  if (!fingerprint) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Device fingerprint diperlukan' } });
  }

  const sb = getSupabaseAdmin();
  const { data: session } = await sb
    .from('demo_sessions')
    .select('session_id, status, prompt_count, expires_at, char_id')
    .eq('fingerprint', fingerprint)
    .eq('status', 'active')
    .maybeSingle();

  if (!session) {
    return c.json({ success: false, data: { has_session: false } });
  }

  // Check TTL
  if (new Date(session.expires_at) < new Date()) {
    await sb.from('demo_sessions').update({ status: 'expired' }).eq('session_id', session.session_id);
    return c.json({ success: false, data: { has_session: false, reason: 'expired' } });
  }

  return c.json({
    success: true,
    data: {
      has_session: true,
      session_id: session.session_id,
      char_id: session.char_id,
      prompt_count: session.prompt_count,
      prompts_remaining: DEMO_MAX_PROMPTS - session.prompt_count,
      expires_at: session.expires_at,
    },
  });
});

// ─── POST /api/demo/start ───
// Start a new demo session (creates guest character)
demo.post('/start', async (c) => {
  const sb = getSupabaseAdmin();
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const userAgent = c.req.header('user-agent') || '';
  const { fingerprint } = await c.req.json();

  if (!fingerprint) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Device fingerprint diperlukan' } });
  }

  // Check existing active session
  const { data: existing } = await sb
    .from('demo_sessions')
    .select('session_id, status, expires_at')
    .eq('fingerprint', fingerprint)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    return c.json({
      success: false,
      error: {
        code: 'DEMO_ALREADY_EXISTS',
        message: 'Demo session masih aktif. Gunakan session yang ada.',
        data: { session_id: existing.session_id },
      },
    });
  }

  // Rate limit: max 3 demo per IP per day
  const { count: ipToday } = await sb
    .from('demo_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', new Date(Date.now() - 86400000).toISOString());

  if (ipToday && ipToday >= 3) {
    return c.json({
      success: false,
      error: {
        code: 'DEMO_LIMIT',
        message: 'Terlalu banyak percobaan dari IP ini. Daftar akun gratis untuk akses penuh.',
      },
    });
  }

  // Create demo character (type=demo, no real user_id)
  const { data: char, error: charError } = await sb
    .from('characters')
    .insert({
      name: 'Demo Karakter',
      type: 'custom',
      description: 'Karakter demo — buat akun untuk menyimpan data ini!',
      share_mode: 'private',
    })
    .select('char_id')
    .single();

  if (charError) {
    console.error('Demo char creation error:', charError);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Gagal membuat demo session' } }, 500);
  }

  // Create demo session
  const expiresAt = new Date(Date.now() + DEMO_TTL_HOURS * 3600000).toISOString();
  const { data: session, error: sessionError } = await sb
    .from('demo_sessions')
    .insert({
      fingerprint,
      ip_address: ip,
      user_agent: userAgent,
      char_id: char.char_id,
      status: 'active',
      prompt_count: 0,
      expires_at: expiresAt,
    })
    .select('session_id, expires_at, prompt_count')
    .single();

  if (sessionError) {
    console.error('Demo session error:', sessionError);
    // Cleanup orphan character
    await sb.from('characters').delete().eq('char_id', char.char_id);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Gagal membuat demo session' } }, 500);
  }

  return c.json({
    success: true,
    data: {
      session_id: session.session_id,
      char_id: char.char_id,
      char_name: 'Demo Karakter',
      prompt_count: 0,
      prompts_remaining: DEMO_MAX_PROMPTS,
      expires_at: session.expires_at,
    },
  }, 201);
});

export default demo;
