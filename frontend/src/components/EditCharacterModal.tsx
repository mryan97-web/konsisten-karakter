'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type EditCharacterModalProps = {
  charId: string;
  charName: string;
  charGender: string | null;
  charDesc: string | null;
  isLocked: boolean;
  onClose: () => void;
  onSaved: (data: { name: string; gender: string | null; description: string | null }) => void;
};

export default function EditCharacterModal({
  charId, charName, charGender, charDesc, isLocked, onClose, onSaved,
}: EditCharacterModalProps) {
  const [name, setName] = useState(charName || '');
  const [gender, setGender] = useState(charGender || '');
  const [description, setDescription] = useState(charDesc || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nama karakter wajib diisi');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const payload: Record<string, any> = { name: name.trim() };
      if (!isLocked) payload.gender = gender || null;
      payload.description = description || null;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/api/character/${charId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || 'Gagal menyimpan');
        return;
      }

      onSaved(data.data);
    } catch {
      setError('Gagal terhubung ke server');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Edit Karakter</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="space-y-4">
          {/* Nama */}
          <div>
            <label className="block text-sm font-medium mb-1">Nama Karakter</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)] transition-colors"
              placeholder="Nama karakter..."
            />
          </div>

          {/* Gender — disabled if locked */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Gender {isLocked && <span className="text-xs text-[var(--muted)]">(terkunci — tidak bisa diubah)</span>}
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={isLocked}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)] transition-colors disabled:opacity-50"
            >
              <option value="">Pilih gender</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)] transition-colors resize-none"
              placeholder="Deskripsi singkat tentang karakter..."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1 px-4 py-2.5">Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 px-4 py-2.5 disabled:opacity-50">
            {saving ? 'Menyimpan...' : '💾 Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
