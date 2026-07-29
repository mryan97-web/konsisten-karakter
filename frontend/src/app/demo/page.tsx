'use client';

import { useEffect, useState } from 'react';
import { useDemo } from '@/lib/demo-context';

type DemoChar = {
  char_id: string;
  name: string;
  gender: string | null;
  description: string | null;
  is_locked: boolean;
  images: { image_id: string; blob_url: string; file_type: string; sort_order: number }[];
  dna: Record<string, unknown> | null;
  prompt_count: number;
  prompts_remaining: number;
};

export default function DemoPage() {
  const { session, fingerprint, startDemo, loading, refreshSession } = useDemo();
  const [char, setChar] = useState<DemoChar | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const apiHeaders = () => ({
    'x-demo-session': session?.session_id || '',
    'x-device-fingerprint': fingerprint || '',
  });

  const loadChar = async () => {
    if (!session) return;
    const res = await fetch('/api/demo/char', { headers: apiHeaders() });
    const data = await res.json();
    if (data.success) setChar(data.data);
  };

  useEffect(() => {
    if (session) loadChar();
  }, [session]);

  // ─── File Upload ───
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !session) return;

    setUploading(true);
    const formData = new FormData();
    for (const f of files) formData.append('files', f);

    await fetch('/api/demo/char/upload', {
      method: 'POST',
      headers: apiHeaders() as any,
      body: formData,
    });
    setUploading(false);
    loadChar();
  };

  // ─── Analyze DNA ───
  const handleAnalyze = async () => {
    if (!session) return;
    setBusy(true);
    await fetch('/api/demo/char/analyze-dna', {
      method: 'POST',
      headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
      body: '{}',
    });
    setBusy(false);
    refreshSession();
    loadChar();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--muted)]">Memuat...</div>
      </div>
    );
  }

  // ─── START DEMO ───
  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-2xl">
          <div className="mb-4 text-6xl">🎭</div>
          <h1 className="mb-2 text-2xl font-bold">Coba ConsistentChar</h1>
          <p className="mb-6 text-sm text-[var(--muted)]">
            Upload 5 foto karakter, AI akan mengekstrak DNA dan siap generate prompt konsisten.
            <br /><br />
            <strong className="text-[var(--foreground)]">Demo gratis:</strong><br />
            • 1 karakter · 3 prompt · 24 jam<br />
            • Terikat perangkat (browser + IP)<br />
            • Hasil bisa disimpan setelah daftar
          </p>
          <button
            onClick={startDemo}
            className="btn btn-primary w-full px-6 py-3 text-base"
          >
            🚀 Mulai Demo Gratis
          </button>
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <a href="/" className="text-sm text-[var(--primary)] hover:underline">
              Saya sudah punya akun → Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── DEMO DASHBOARD ───
  const imageCount = char?.images?.length || 0;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* ─── Demo Banner ─── */}
      <div className="bg-gradient-to-r from-[var(--primary)]/20 via-[var(--secondary)]/20 to-[var(--accent)]/20 border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">🧪</span>
            <span><strong>Mode Demo</strong> — {char?.prompts_remaining || session.prompts_remaining}/3 prompt tersisa</span>
            <span className="hidden sm:inline text-[var(--muted)]">
              · {new Date(session.expires_at).toLocaleDateString('id-ID')} expired
            </span>
          </div>
          <a href="/" className="btn btn-primary text-xs px-4 py-1.5">
            ✨ Daftar Gratis — Simpan Data!
          </a>
        </div>
      </div>

      {/* ─── Body ─── */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {!char ? (
          <div className="text-center py-12 text-[var(--muted)]">Memuat karakter demo...</div>
        ) : (
          <>
            {/* Hero */}
            <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)]/10 text-3xl">🎭</div>
                <div>
                  <h2 className="text-2xl font-bold">{char.name}</h2>
                  <p className="text-sm text-[var(--muted)]">
                    {imageCount} foto · {char.dna ? '✅ DNA siap' : '⏳ Belum analisis'} · {char.prompts_remaining} prompt sisa
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {/* Upload */}
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)] transition-colors">
                <div className="mb-1 text-2xl">📸</div>
                <div className="font-semibold text-sm">{imageCount > 0 ? `${imageCount} Foto` : 'Upload Foto'}</div>
                <div className="text-xs text-[var(--muted)]">{imageCount >= 5 ? '✅ Siap' : `${5 - imageCount} lagi`}</div>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" disabled={uploading} />
              </label>

              {/* Analyze */}
              <button
                onClick={handleAnalyze}
                disabled={imageCount < 5 || busy || char.prompts_remaining <= 0}
                className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)] transition-colors disabled:opacity-50"
              >
                <div className="mb-1 text-2xl">🧬</div>
                <div className="font-semibold text-sm">
                  {busy ? 'Menganalisis...' : char.dna ? 'Analisis Ulang' : 'Analisis DNA'}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {char.prompts_remaining <= 0 ? 'Habis' : imageCount >= 5 ? `${char.prompts_remaining}x lagi` : '5 foto dulu'}
                </div>
              </button>

              {/* Register CTA */}
              <a href="/" className="flex flex-col items-center justify-center rounded-xl border border-[var(--primary)]/50 bg-[var(--primary)]/5 p-5 hover:bg-[var(--primary)]/10 transition-colors">
                <div className="mb-1 text-2xl">🔓</div>
                <div className="font-semibold text-sm text-[var(--primary)]">Daftar Gratis</div>
                <div className="text-xs text-[var(--muted)]">Simpan data demo-mu!</div>
              </a>
            </div>

            {/* Photos */}
            {char.images && char.images.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 font-semibold">Foto</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {char.images.map((img) => (
                    <div key={img.image_id} className="aspect-square overflow-hidden rounded-lg border border-[var(--border)]">
                      <img src={img.blob_url} alt={`Foto ${img.sort_order}`} loading="lazy" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DNA Result */}
            {char.dna && char.dna.base && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                <h3 className="mb-3 font-semibold">🧬 DNA Karakter</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(char.dna.base).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-sm">
                      <span className="text-[var(--muted)] min-w-[100px]">{k.replace(/_/g, ' ')}:</span>
                      <span>{String(v || '-')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer CTA */}
            <div className="mt-8 rounded-xl bg-gradient-to-r from-[var(--primary)]/10 to-[var(--secondary)]/10 border border-[var(--border)] p-6 text-center">
              <p className="text-sm mb-3">
                📢 Hasil ini <strong>akan hilang</strong> setelah 24 jam. Daftar akun untuk menyimpan selamanya!
              </p>
              <a href="/" className="btn btn-primary px-8 py-3">✨ Daftar Gratis — 30 Prompt Percobaan</a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
