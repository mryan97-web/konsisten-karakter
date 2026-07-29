import { Hono } from 'hono';
import { getSupabase, getSupabaseAdmin } from '../lib/supabase';
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

  const sbAdmin = getSupabaseAdmin();

  // Sign up via Supabase Auth
  const { data: authData, error: authError } = await sbAdmin.auth.admin.createUser({
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
  const sb = getSupabase();
  const { data: user } = await sb
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

  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes('Invalid')) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Email atau password salah' } }, 401);
    }
    return c.json({ success: false, error: { code: 'AUTH_ERROR', message: error.message } }, 500);
  }

  // Get user profile from public.users
  const { data: user } = await sb
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

  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithIdToken({
    provider: 'google',
    token: id_token,
  });

  if (error) {
    return c.json({ success: false, error: { code: 'AUTH_ERROR', message: error.message } }, 500);
  }

  // Upsert into public.users
  const email = data.user?.email || '';
  const { data: user } = await sb
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
  const userData = c.var.user;

  // Load subscription separately
  const sb = getSupabase();
  const { data: sub } = await sb
    .from('subscriptions')
    .select('plan, status, expires_at, grace_until')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return c.json({
    success: true,
    data: {
      user_id: userId,
      email: userData.email,
      display_name: userData.email.split('@')[0],
      tier: userData.tier,
      status: userData.status,
      subscription: sub || null,
    },
  });
});

// ─── POST /api/auth/forgot-password ───
auth.post('/forgot-password', async (c) => {
  const { email } = await c.req.json();

  if (!email) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email wajib diisi' } }, 400);
  }

  await getSupabaseAdmin().auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  // Always return success — anti-enumeration
  return c.json({
    success: true,
    data: { message: 'Jika email terdaftar, link reset password telah dikirim' },
  });
});

// ─── POST /api/auth/reset-password ───
auth.post('/reset-password', async (c) => {
  const authHeader = c.req.header('Authorization') || '';
  const token = authHeader.slice(7);

  if (!token) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token reset wajib diisi' } }, 401);
  }

  const { password } = await c.req.json();

  if (!password || password.length < 6) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password minimal 6 karakter' } }, 400);
  }

  const sb = getSupabase();
  const { data: { user }, error: userError } = await sb.auth.getUser(token);

  if (userError || !user) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token tidak valid atau expired' } }, 401);
  }

  const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(user.id, {
    password,
  });

  if (updateError) {
    return c.json({ success: false, error: { code: 'AUTH_ERROR', message: updateError.message } }, 500);
  }

  return c.json({
    success: true,
    data: { message: 'Password berhasil direset' },
  });
});

// ─── POST /api/auth/refresh ───
auth.post('/refresh', async (c) => {
  const { refresh_token } = await c.req.json();

  if (!refresh_token) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Refresh token wajib diisi' } }, 400);
  }

  const { data, error } = await getSupabase().auth.refreshSession({ refresh_token });

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
  await getSupabaseAdmin().auth.admin.signOut(c.var.userId);
  return c.json({ success: true, data: { message: 'Logout berhasil' } });
});

export default auth;
