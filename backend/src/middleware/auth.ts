import { createMiddleware } from 'hono/factory';
import { supabase } from '../lib/supabase.js';

type Env = {
  Variables: {
    userId: string;
    user: {
      user_id: string;
      email: string;
      tier: string;
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
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return c.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Token tidak valid atau expired' } },
      401,
    );
  }

  c.set('userId', user.id);
  c.set('user', {
    user_id: user.id,
    email: user.email || '',
    tier: user.user_metadata?.tier || 'free',
  });

  await next();
});
