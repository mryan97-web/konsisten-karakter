'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type CreatedChar = {
  char_id: string;
  name: string;
  gender: string | null;
  type: string;
  share_mode: string;
  is_locked: boolean;
  prompt_count: number;
  created_at: string;
};

type CreateCharacterProps = {
  onClose: () => void;
  onCreated: (char: CreatedChar) => void;
};

export default function CreateCharacterForm({ onClose, onCreated }: CreateCharacterProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan' | ''>('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/api/character`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name, gender: gender || undefined, description: description || undefined }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Gagal membuat karakter');
        return;
      }

      onCreated(data.data);
      router.refresh();
    } catch {
      setError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Buat Karakter Baru</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-white transition-colors text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Nama Karakter *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
              placeholder="Contoh: Areka Casual"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Gender</label>
            <div className="flex gap-3">
              {(['Perempuan', 'Laki-laki'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(gender === g ? '' : g)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                    gender === g
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)] hover:border-[var(--muted)]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
              placeholder="Deskripsi singkat tentang karakter ini..."
              rows={3}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Membuat...' : 'Buat Karakter'}
          </button>
        </form>
      </div>
    </div>
  );
}
