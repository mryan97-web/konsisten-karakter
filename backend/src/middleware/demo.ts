import { createMiddleware } from 'hono/factory';
import { getSupabaseAdmin } from '../lib/supabase';
import { E } from '../shared/response';

type DemoUser = {
  type: 'demo';
  session_id: string;
  fingerprint: string;
  char_id: string;
  prompt_count: number;
};

declare module 'hono' {
  interface ContextVariableMap {
    demoUser?: DemoUser;
  }
}

export const withDemo = createMiddleware(async (c, next) => {
  const sessionId = c.req.header('x-demo-session');
  const fingerprint = c.req.header('x-device-fingerprint');

  if (!sessionId || !fingerprint) {
    return E.VALIDATION('Header demo session diperlukan');
  }

  const sb = getSupabaseAdmin();
  const { data: session } = await sb
    .from('demo_sessions')
    .select('session_id, status, prompt_count, expires_at, char_id')
    .eq('session_id', sessionId)
    .eq('fingerprint', fingerprint)
    .eq('status', 'active')
    .maybeSingle();

  if (!session) {
    return E.DEMO_LIMIT('Session demo tidak valid atau sudah expired');
  }

  if (new Date(session.expires_at) < new Date()) {
    await sb.from('demo_sessions').update({ status: 'expired' }).eq('session_id', sessionId);
    return E.DEMO_EXPIRED();
  }

  c.set('demoUser', {
    type: 'demo',
    session_id: session.session_id,
    fingerprint,
    char_id: session.char_id,
    prompt_count: session.prompt_count,
  });

  await next();
});
