import { createMiddleware } from 'hono/factory';
import { getSupabase, getSupabaseAdmin } from '../lib/supabase.js';

type Env = {
  Variables: {
    userId: string;
    user: {
      user_id: string;
      email: string;
      tier: string;
      status: string;
    };
  };
};

export const withAuth = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Token tidak ditemukan' } },
      401,
    );
  }

  const token = authHeader.slice(7);
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return c.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Token tidak valid atau expired' } },
      401,
    );
  }

  // Debug: get file path
  console.log('[withAuth] user.id:', user.id);

  // Load tier + status dari public.users (service_role bypass RLS)
  const supabaseAdmin = getSupabaseAdmin();

  // Debug: check env
  console.log('[withAuth] has service key:', !!process.env.SUPABASE_SERVICE_KEY);
  console.log('[withAuth] service key length:', process.env.SUPABASE_SERVICE_KEY?.length);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('tier, status')
    .eq('user_id', user.id)
    .maybeSingle();

  console.log('[withAuth] profile:', JSON.stringify(profile));
  console.log('[withAuth] profileError:', profileError);

  // Fallback ke metadata JWT jika belum ada di public.users
  const tier = profile?.tier || user.user_metadata?.tier || 'free';
  const status = profile?.status || 'active';

  // Cek suspended
  if (status === 'suspended') {
    return c.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Akun Anda telah dinonaktifkan' } },
      403,
    );
  }

  c.set('userId', user.id);
  c.set('user', {
    user_id: user.id,
    email: user.email || '',
    tier,
    status,
  });

  await next();
});
