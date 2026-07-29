import { Hono } from 'hono';
import { getSupabaseAdmin } from '../lib/supabase';
import { E, ok, created } from '../shared/response';
import { CONSTANTS } from '../shared/constants';
import { validateFingerprint } from '../shared/validators';
import { StartDemoRequest } from '../shared/types';

const demo = new Hono();

function getIp(c: any): string {
  return c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}

// ─── GET /api/demo/check ───
demo.get('/check', async (c) => {
  const fingerprint = c.req.query('fp');
  const fpErr = validateFingerprint(fingerprint);
  if (fpErr) return E.VALIDATION(fpErr);

  const sb = getSupabaseAdmin();
  const { data: session } = await sb
    .from('demo_sessions')
    .select('session_id, status, prompt_count, expires_at, char_id')
    .eq('fingerprint', fingerprint!)
    .eq('status', 'active')
    .maybeSingle();

  if (!session) return ok({ has_session: false });

  // Check TTL
  if (new Date(session.expires_at) < new Date()) {
    await sb.from('demo_sessions').update({ status: 'expired' }).eq('session_id', session.session_id);
    return ok({ has_session: false, reason: 'expired' });
  }

  return ok({
    has_session: true,
    session_id: session.session_id,
    char_id: session.char_id,
    prompt_count: session.prompt_count,
    prompts_remaining: CONSTANTS.DEMO_MAX_PROMPTS - session.prompt_count,
    expires_at: session.expires_at,
  });
});

// ─── POST /api/demo/start ───
demo.post('/start', async (c) => {
  const sb = getSupabaseAdmin();
  const ip = getIp(c);
  const userAgent = c.req.header('user-agent') || '';
  const body: StartDemoRequest = await c.req.json();

  const fpErr = validateFingerprint(body.fingerprint);
  if (fpErr) return E.VALIDATION(fpErr);

  // Check existing active session
  const { data: existing } = await sb
    .from('demo_sessions')
    .select('session_id')
    .eq('fingerprint', body.fingerprint)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) return E.DEMO_ALREADY_EXISTS(existing.session_id);

  // IP rate limit
  const { count: ipToday } = await sb
    .from('demo_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', new Date(Date.now() - 86400000).toISOString());

  if (ipToday && ipToday >= CONSTANTS.DEMO_MAX_PER_IP_PER_DAY) {
    return E.DEMO_LIMIT('Terlalu banyak percobaan dari IP ini. Daftar akun gratis untuk akses penuh.');
  }

  // Create demo character
  const { data: char } = await sb
    .from('characters')
    .insert({
      name: 'Demo Karakter',
      type: 'custom',
      description: 'Karakter demo — buat akun untuk menyimpan data ini!',
      share_mode: 'private',
    })
    .select('char_id')
    .single();

  if (!char) return E.INTERNAL('Gagal membuat demo session');

  // Create demo session
  const expiresAt = new Date(Date.now() + CONSTANTS.DEMO_TTL_HOURS * 3600000).toISOString();
  const { data: session } = await sb
    .from('demo_sessions')
    .insert({
      fingerprint: body.fingerprint,
      ip_address: ip,
      user_agent: userAgent,
      char_id: char.char_id,
      status: 'active',
      prompt_count: 0,
      expires_at: expiresAt,
    })
    .select('session_id, expires_at, prompt_count')
    .single();

  if (!session) {
    await sb.from('characters').delete().eq('char_id', char.char_id);
    return E.INTERNAL('Gagal membuat demo session');
  }

  return created({
    session_id: session.session_id,
    char_id: char.char_id,
    char_name: 'Demo Karakter',
    prompt_count: 0,
    prompts_remaining: CONSTANTS.DEMO_MAX_PROMPTS,
    expires_at: session.expires_at,
  });
});

export default demo;
