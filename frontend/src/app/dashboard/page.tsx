'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type User = {
  user_id: string;
  email: string;
  display_name: string;
  tier: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
        return;
      }

      // Fetch user profile from backend
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/api/auth/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--muted)]">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* ─── Header ─── */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-xl font-bold tracking-tight">ConsistentChar</span>
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)] uppercase">
              {user?.tier || 'free'}
            </span>
            <span className="text-sm text-[var(--muted)]">{user?.display_name || user?.email}</span>
            <button onClick={handleLogout} className="btn btn-secondary text-sm px-4 py-2">
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-[var(--muted)]">Kelola karakter AI dan prompt kamu</p>
        </div>

        {/* ─── Stats ─── */}
        <div className="mb-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="text-3xl font-bold">0</div>
            <div className="mt-1 text-sm text-[var(--muted)]">Karakter</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="text-3xl font-bold">0</div>
            <div className="mt-1 text-sm text-[var(--muted)]">Prompt Bulan Ini</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="text-3xl font-bold">30</div>
            <div className="mt-1 text-sm text-[var(--muted)]">Sisa Prompt</div>
          </div>
        </div>

        {/* ─── Empty State ─── */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-24">
          <div className="mb-4 text-6xl">🎭</div>
          <h2 className="mb-2 text-xl font-semibold">Belum Ada Karakter</h2>
          <p className="mb-6 max-w-md text-center text-[var(--muted)]">
            Buat karakter AI pertamamu. Upload 5-20 foto, AI akan mengekstrak DNA karakter dan siap digunakan untuk generate prompt.
          </p>
          <button
            onClick={() => router.push('/character/create')}
            className="btn btn-primary px-6 py-3"
          >
            + Buat Karakter
          </button>
        </div>
      </main>
    </div>
  );
}
