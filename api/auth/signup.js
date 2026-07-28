// Authentication API
// Email signup, login, Google OAuth

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, method } = req.body;

  try {
    if (method === 'email' && !email?.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (method === 'email' && password?.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    // Simulate user creation (replace with Supabase in production)
    const user = {
      id: `user_${Date.now()}`,
      email,
      created_at: new Date().toISOString(),
      verified: false,
    };

    // TODO: In production, hash password + store in Supabase
    // For now, just return success
    return res.json({
      success: true,
      user,
      message: 'Signup berhasil! Check email untuk verifikasi.',
    });
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ error: err.message });
  }
}
