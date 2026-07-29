import { Hono } from 'hono';
import { getSupabase, getSupabaseAdmin } from '../lib/supabase';
import { withAuth } from '../middleware/auth.js';
import { E, ok, created } from '../shared/response';

const auth = new Hono();

// ─── POST /api/auth/register ───
auth.post('/register', async (c) => {
  const { email, password, display_name, agreed_age_17, agreed_tos } = await c.req.json();

  if (!email || !password) return E.VALIDATION('Email dan password wajib diisi');
  if (password.length < 6) return E.VALIDATION('Password minimal 6 karakter');
  if (!agreed_age_17 || !agreed_tos) return E.VALIDATION('Setujui syarat dan ketentuan');

  const sbAdmin = getSupabaseAdmin();

  const { data: authData, error: authError } = await sbAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name, tier: 'free', agreed_age_17, agreed_tos },
  });

  if (authError) {
    if (authError.message?.includes('already registered')) {
      return E.VALIDATION('Email sudah terdaftar');
    }
    return E.INTERNAL(authError.message);
  }

  const uid = authData.user!.id;

  // Create public.users record
  const { error: profileError } = await sbAdmin.from('users').insert({
    user_id: uid,
    email,
    display_name: display_name || email.split('@')[0],
    tier: 'free',
    status: 'active',
    agreed_age_17: true,
    agreed_tos: true,
  });

  if (profileError) {
    // Rollback — delete auth user
    await sbAdmin.auth.admin.deleteUser(uid);
    return E.INTERNAL('Gagal membuat profil. Coba lagi.');
  }

  return created({
    user_id: uid,
    email,
    display_name: display_name || email.split('@')[0],
    tier: 'free',
  });
});

// ─── POST /api/auth/login ───
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) return E.VALIDATION('Email dan password wajib diisi');

  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return E.UNAUTHORIZED('Email atau password salah');
  }

  return ok({
    token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
});

// ─── POST /api/auth/logout ───
auth.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return E.UNAUTHORIZED();

  const token = authHeader.slice(7);
  await getSupabaseAdmin().auth.admin.signOut(token);

  return ok({ message: 'Berhasil logout' });
});

// ─── GET /api/auth/me ───
auth.get('/me', withAuth, async (c) => {
  const user = c.var.user;
  return ok(user);
});

// ─── POST /api/auth/convert-demo ───
auth.post('/convert-demo', withAuth, async (c) => {
  const userId = c.var.userId;
  const { fingerprint } = await c.req.json();

  if (!fingerprint) return E.VALIDATION('Fingerprint diperlukan');

  const sb = getSupabaseAdmin();

  // Find demo session by fingerprint
  const { data: session } = await sb
    .from('demo_sessions')
    .select('session_id, char_id, prompt_count')
    .eq('fingerprint', fingerprint)
    .eq('status', 'active')
    .maybeSingle();

  if (!session) return E.NOT_FOUND('Demo session tidak ditemukan');

  // Transfer ownership: assign all demo data to real user
  await sb.from('characters')
    .update({ user_id: userId })
    .eq('char_id', session.char_id);

  await sb.from('character_images')
    .update({ user_id: userId })
    .eq('char_id', session.char_id);

  await sb.from('demo_sessions')
    .update({ status: 'converted', converted_at: new Date().toISOString(), converted_user_id: userId })
    .eq('session_id', session.session_id);

  return ok({
    message: 'Data demo berhasil dipindahkan ke akun Anda!',
    char_id: session.char_id,
    prompt_count: session.prompt_count,
  });
});

export default auth;
