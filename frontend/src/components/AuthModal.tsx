'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'register'
            ? { email, password, display_name: displayName, agreed_age_17: true, agreed_tos: true }
            : { email, password }
        ),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Terjadi kesalahan');
        return;
      }

      if (mode === 'login') {
        // Set session via Supabase client
        await supabase.auth.setSession({
          access_token: data.data.access_token,
          refresh_token: data.data.refresh_token,
        });
      }

      onClose();
      router.refresh();
      router.push('/dashboard');
    } catch (err) {
      setError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{mode === 'login' ? 'Masuk' : 'Daftar'}</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-white transition-colors text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
              placeholder="nama@email.com"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">Nama</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                placeholder="Nama kamu"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
              placeholder="Minimal 6 karakter"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar Gratis'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-[var(--muted)]">
          {mode === 'login' ? (
            <>Belum punya akun?{' '}<button onClick={() => { setMode('register'); setError(''); }} className="text-[var(--primary)] hover:underline">Daftar</button></>
          ) : (
            <>Sudah punya akun?{' '}<button onClick={() => { setMode('login'); setError(''); }} className="text-[var(--primary)] hover:underline">Masuk</button></>
          )}
        </div>
      </div>
    </div>
  );
}
