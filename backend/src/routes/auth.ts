import { Hono } from 'hono';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { withAuth } from '../middleware/auth.js';

const auth = new Hono();

// ─── POST /api/auth/register ───
auth.post('/register', async (c) => {
  const { email, password, display_name, agreed_age_17, agreed_tos } = await c.req.json();

  // Validation
  if (!email || !password) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email dan password wajib diisi' } }, 400);
  }
  if (password.length < 6) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password minimal 6 karakter' } }, 400);
  }
  if (!agreed_age_17 || !agreed_tos) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Setujui syarat dan ketentuan' } }, 400);
  }

  // Sign up via Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name, tier: 'free', agreed_age_17, agreed_tos },
  });

  if (authError) {
    if (authError.message.includes('already')) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email sudah terdaftar' } }, 400);
    }
    return c.json({ success: false, error: { code: 'AUTH_ERROR', message: authError.message } }, 500);
  }

  // Insert into public.users
  const { data: user, error: dbError } = await supabase
    .from('users')
    .insert({
      user_id: authData.user.id,
      email,
      display_name: display_name || email.split('@')[0],
      tier: 'free',
      agreed_age_17,
      agreed_tos,
    })
    .select('user_id, email, display_name, tier, created_at')
    .single();

  if (dbError) {
    console.error('DB insert error:', dbError);
  }

  return c.json({
    success: true,
    data: user || { user_id: authData.user.id, email, display_name, tier: 'free' },
    meta: { message: 'Pendaftaran berhasil' },
  }, 201);
});

// ─── POST /api/auth/login ───
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email dan password wajib diisi' } }, 400);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes('Invalid')) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Email atau password salah' } }, 401);
    }
    return c.json({ success: false, error: { code: 'AUTH_ERROR', message: error.message } }, 500);
  }

  // Get user profile from public.users
  const { data: user } = await supabase
    .from('users')
    .select('user_id, email, display_name, avatar_url, tier, status')
    .eq('user_id', data.user.id)
    .single();

  return c.json({
    success: true,
    data: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      user: user || {
        user_id: data.user.id,
        email: data.user.email,
        display_name: data.user.email?.split('@')[0],
        tier: 'free',
      },
    },
  });
});

// ─── POST /api/auth/google ───
auth.post('/google', async (c) => {
  const { id_token } = await c.req.json();

  if (!id_token) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ID token Google wajib diisi' } }, 400);
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: id_token,
  });

  if (error) {
    return c.json({ success: false, error: { code: 'AUTH_ERROR', message: error.message } }, 500);
  }

  // Upsert into public.users
  const email = data.user?.email || '';
  const { data: user } = await supabase
    .from('users')
    .upsert({
      user_id: data.user.id,
      email,
      display_name: data.user.user_metadata?.full_name || email.split('@')[0],
      avatar_url: data.user.user_metadata?.avatar_url,
      auth_provider: 'google',
      google_id: data.user.id,
      tier: 'free',
      agreed_age_17: true,
      agreed_tos: true,
    }, { onConflict: 'email' })
    .select('user_id, email, display_name, avatar_url, tier')
    .single();

  return c.json({
    success: true,
    data: {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: user || { user_id: data.user.id, email, tier: 'free' },
    },
  });
});

// ─── GET /api/auth/me ───
auth.get('/me', withAuth, async (c) => {
  const userId = c.var.userId;

  const { data: user, error } = await supabase
    .from('users')
    .select(`
      user_id, email, display_name, avatar_url, tier, status, created_at,
      subscriptions!inner(plan, status, expires_at, grace_until)
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !user) {
    // Fallback: return from JWT
    return c.json({
      success: true,
      data: {
        user_id: userId,
        email: c.var.user.email,
        display_name: c.var.user.email.split('@')[0],
        tier: c.var.user.tier,
        status: 'active',
      },
    });
  }

  return c.json({ success: true, data: user });
});

// ─── POST /api/auth/refresh ───
auth.post('/refresh', async (c) => {
  const { refresh_token } = await c.req.json();

  if (!refresh_token) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Refresh token wajib diisi' } }, 400);
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });

  if (error) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Refresh token tidak valid' } }, 401);
  }

  return c.json({
    success: true,
    data: {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_in: data.session?.expires_in,
    },
  });
});

// ─── POST /api/auth/logout ───
auth.post('/logout', withAuth, async (c) => {
  const authHeader = c.req.header('Authorization') || '';
  const token = authHeader.slice(7);

  await supabaseAdmin.auth.admin.signOut(c.var.userId);

  return c.json({ success: true, data: { message: 'Logout berhasil' } });
});

export default auth;
