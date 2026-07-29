'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import UploadPhotoModal from '@/components/UploadPhotoModal';
import DnaAnalysisModal from '@/components/DnaAnalysisModal';
import EditCharacterModal from '@/components/EditCharacterModal';

type CharacterImage = {
  image_id: string;
  blob_url: string;
  thumbnail_url: string | null;
  file_type: string;
  sort_order: number;
};

type CharacterDna = {
  dna_id: string;
  version: number;
  is_current: boolean;
  base: Record<string, string>;
  face: Record<string, unknown>;
  hair: Record<string, unknown>;
  body: Record<string, unknown>;
  style: Record<string, unknown>;
  expression: Record<string, unknown>;
  created_at: string;
};

type CharacterDetail = {
  char_id: string;
  name: string;
  gender: string | null;
  type: string;
  description: string | null;
  share_mode: string;
  share_code: string | null;
  is_locked: boolean;
  prompt_count: number;
  created_at: string;
  updated_at: string;
  dna: CharacterDna | null;
  images: CharacterImage[];
};

type DnaSectionProps = {
  title: string;
  data: Record<string, unknown>;
};

function DnaSection({ title, data }: DnaSectionProps) {
  return (
    <div>
      <h4 className="text-xs font-medium text-[var(--primary)] uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-1 text-sm">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="text-[var(--muted)] min-w-[100px]">{k.replace(/_/g, ' ')}:</span>
            <span>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '-')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CharacterDetailClient({
  charId,
  initialChar,
}: {
  charId: string;
  initialChar: CharacterDetail | null;
}) {
  const router = useRouter();
  const [char, setChar] = useState<CharacterDetail | null>(initialChar);
  const [loading, setLoading] = useState(!initialChar);
  const [showEdit, setShowEdit] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showDna, setShowDna] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadChar = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/'); return; }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/api/character/${charId}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    const data = await res.json();
    if (data.success) setChar(data.data);
    setLoading(false);
  };

  useEffect(() => {
    if (!initialChar) loadChar();
  }, [charId]);

  const handleDelete = async () => {
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/api/character/${charId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--muted)]">Memuat...</div>
      </div>
    );
  }

  if (!char) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] gap-4">
        <div className="text-4xl">😕</div>
        <div className="text-[var(--muted)]">Karakter tidak ditemukan</div>
        <button onClick={() => router.push('/dashboard')} className="btn btn-primary px-6 py-2.5">
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  const imageCount = char.images?.length || 0;
  const dna = char.dna;
  const hasDna = dna !== null && dna !== undefined;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-white transition-colors">
            ← Dashboard
          </button>
          <span className="text-xl font-bold tracking-tight">ConsistentChar</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-4xl">
                {char.gender === 'Perempuan' ? '👩' : char.gender === 'Laki-laki' ? '👨' : '🎭'}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{char.name}</h1>
                <div className="mt-1 flex items-center gap-3 text-sm text-[var(--muted)]">
                  <span>{char.gender || 'Tidak ada gender'}</span>
                  <span>·</span>
                  <span>{char.type === 'default' ? 'Default' : 'Custom'}</span>
                  {char.is_locked && <span>· 🔒 Locked</span>}
                  <span>·</span>
                  <span>{char.prompt_count} prompt</span>
                </div>
                {char.description && (
                  <p className="mt-3 max-w-2xl text-sm text-[var(--muted)] leading-relaxed">{char.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowEdit(true)} className="btn btn-secondary text-sm px-4 py-2">✏️ Edit</button>
              <button onClick={() => setShowDeleteConfirm(true)}
                className="btn text-sm px-4 py-2 text-red-400 hover:bg-red-500/10 border border-red-500/30 rounded-xl transition-colors">🗑️</button>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <button onClick={() => setShowUpload(true)}
            className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 hover:border-[var(--primary)] transition-all group">
            <div className="mb-2 text-3xl group-hover:scale-110 transition-transform">
              {imageCount >= 5 ? '📸' : '📷'}
            </div>
            <div className="font-semibold text-sm">{imageCount > 0 ? `${imageCount} Foto` : 'Upload Foto'}</div>
            <div className="text-xs text-[var(--muted)]">
              {imageCount > 0 ? (imageCount >= 5 ? '✅ Minimal terpenuhi' : `${5 - imageCount} foto lagi`) : 'Min 5 foto'}
            </div>
          </button>

          <button onClick={() => setShowDna(true)} disabled={imageCount < 5}
            className={`flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 transition-all group
              ${imageCount >= 5 ? 'hover:border-[var(--primary)] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
            <div className="mb-2 text-3xl group-hover:scale-110">🧬</div>
            <div className="font-semibold text-sm">{hasDna ? 'Analisis Ulang DNA' : 'Analisis DNA'}</div>
            <div className="text-xs text-[var(--muted)]">
              {hasDna ? `v${char.dna!.version}` : imageCount >= 5 ? 'Siap dianalisis' : 'Upload 5+ foto dulu'}
            </div>
          </button>

          <button disabled
            className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 opacity-50 cursor-not-allowed">
            <div className="mb-2 text-3xl">🤖</div>
            <div className="font-semibold text-sm">Generate Prompt</div>
            <div className="text-xs text-[var(--muted)]">Coming soon</div>
          </button>
        </div>

        {char.images && char.images.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">Foto Karakter</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {char.images.slice(0, 10).map((img) => (
                <div key={img.image_id} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]">
                  <a href={img.blob_url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                    <img
                      src={img.thumbnail_url || img.blob_url}
                      alt={`Foto ${img.sort_order}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </a>
                  <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white/70">#{img.sort_order}</div>
                </div>
              ))}
              {char.images.length > 10 && (
                <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted-bg)] text-sm text-[var(--muted)]">
                  +{char.images.length - 10} foto
                </div>
              )}
            </div>
            <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-[var(--primary)] hover:underline">+ Tambah foto</button>
          </div>
        )}

        {hasDna && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">🧬 DNA Karakter (v{dna!.version})</h2>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dna!.base && <DnaSection title="Base" data={dna!.base as Record<string, unknown>} />}
                {dna!.face && <DnaSection title="Wajah" data={dna!.face} />}
                {dna!.hair && <DnaSection title="Rambut" data={dna!.hair} />}
              </div>
              <button onClick={() => setShowDna(true)} className="mt-4 text-sm text-[var(--primary)] hover:underline">
                🔄 Analisis ulang
              </button>
            </div>
          </div>
        )}

        <div className="text-xs text-[var(--muted)] space-y-1">
          <div>Dibuat: {new Date(char.created_at).toLocaleString('id-ID')}</div>
          {char.updated_at && <div>Diupdate: {new Date(char.updated_at).toLocaleString('id-ID')}</div>}
        </div>
      </main>

      {showEdit && (
        <EditCharacterModal
          charId={char.char_id} charName={char.name} charGender={char.gender}
          charDesc={char.description} isLocked={char.is_locked}
          onClose={() => setShowEdit(false)}
          onSaved={(data) => { setChar((prev) => prev ? { ...prev, ...data } : prev); setShowEdit(false); }}
        />
      )}
      {showUpload && (
        <UploadPhotoModal charId={char.char_id} charName={char.name}
          onClose={() => setShowUpload(false)}
          onComplete={() => { setShowUpload(false); loadChar(); }}
        />
      )}
      {showDna && (
        <DnaAnalysisModal charId={char.char_id} charName={char.name} imageCount={imageCount}
          onClose={() => setShowDna(false)}
          onComplete={() => { setShowDna(false); loadChar(); }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-red-500/30 bg-[var(--card)] p-8 shadow-2xl">
            <div className="mb-4 text-center text-5xl">⚠️</div>
            <h3 className="mb-2 text-center text-xl font-semibold">Hapus Karakter?</h3>
            <p className="mb-6 text-center text-sm text-[var(--muted)]">
              Semua foto dan data DNA akan dihapus permanen.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary flex-1 px-4 py-2.5">Batal</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                {deleting ? 'Menghapus...' : '🗑️ Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
