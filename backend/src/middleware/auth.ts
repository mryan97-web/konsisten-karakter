import { createMiddleware } from 'hono/factory';
import { getSupabase, getSupabaseAdmin } from '../lib/supabase.js';
import { UserDto } from '../shared/types';

type Env = {
  Variables: {
    userId: string;
    user: UserDto;
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

  const supabaseAdmin = getSupabaseAdmin();
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('tier, status')
    .eq('user_id', user.id)
    .maybeSingle();

  const tier = profile?.tier || user.user_metadata?.tier || 'free';
  const status = profile?.status || 'active';

  if (status === 'suspended') {
    return c.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Akun Anda telah dinonaktifkan' } },
      403,
    );
  }

  c.set('userId', user.id);
  c.set('user', { user_id: user.id, email: user.email || '', tier, status });

  await next();
});
