'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type DnaAnalysisModalProps = {
  charId: string;
  charName: string;
  imageCount: number;
  onClose: () => void;
  onComplete: () => void;
};

type DnaField = Record<string, unknown>;

type DnaResult = {
  dna: {
    base: DnaField;
    face: DnaField;
    hair: DnaField;
    body: DnaField;
    style: DnaField;
    expression: DnaField;
  };
};

export default function DnaAnalysisModal({ charId, charName, imageCount, onClose, onComplete }: DnaAnalysisModalProps) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DnaResult | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'confirm' | 'analyzing' | 'result' | 'error'>('confirm');

  const canAnalyze = imageCount >= 5;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setStep('analyzing');
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/character/${charId}/analyze-dna`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Gagal menganalisis DNA');
        setStep('error');
        return;
      }

      setResult(data.data);
      setStep('result');
      onComplete();
      router.refresh();
    } catch {
      setError('Gagal terhubung ke server');
      setStep('error');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Analisis DNA Karakter</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Karakter: <span className="font-medium text-[var(--foreground)]">{charName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-white transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* ─── Confirm Step ─── */}
        {step === 'confirm' && (
          <>
            <div className="mb-6 rounded-xl bg-[var(--muted-bg)] p-6 text-center">
              <div className="mb-3 text-5xl">🧬</div>
              <h3 className="mb-2 text-lg font-semibold">
                {canAnalyze ? 'Siap Analisis DNA' : 'Belum Cukup Foto'}
              </h3>
              <p className="mb-2 text-sm text-[var(--muted)]">
                {canAnalyze
                  ? `AI akan menganalisis ${imageCount} foto dan mengekstrak data wajah, rambut, tubuh, gaya, dan ekspresi.`
                  : `Minimal 5 foto diperlukan. Saat ini ${imageCount} foto.`}
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  {imageCount >= 5 ? '✅' : '❌'} {imageCount}/5 foto
                </span>
                <span>·</span>
                <span>Estimasi: ~15-30 detik</span>
              </div>
            </div>

            <div className="mb-6 rounded-lg bg-[var(--muted-bg)] p-4 text-xs text-[var(--muted)]">
              <p className="font-medium mb-1 text-[var(--foreground)]">📋 Yang akan diekstrak:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Base:</strong> usia, etnis, tipe tubuh, fitur khas</li>
                <li><strong>Wajah:</strong> bentuk, mata, hidung, bibir, rahang</li>
                <li><strong>Rambut:</strong> warna, panjang, tekstur, gaya</li>
                <li><strong>Tubuh:</strong> leher, bahu, tangan, postur</li>
                <li><strong>Gaya:</strong> fashion, warna favorit, aksesoris</li>
                <li><strong>Ekspresi:</strong> mood dasar, tipe senyum, tatapan</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="btn btn-secondary flex-1 px-4 py-2.5">
                Batal
              </button>
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="btn btn-primary flex-1 px-4 py-2.5 disabled:opacity-50"
              >
                Mulai Analisis 🧬
              </button>
            </div>
          </>
        )}

        {/* ─── Analyzing Step ─── */}
        {step === 'analyzing' && (
          <div className="py-12 text-center">
            <div className="mb-4 text-5xl animate-pulse">🧬</div>
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-[var(--muted-bg)]">
              <div className="h-full w-full animate-pulse rounded-full bg-[var(--primary)]" style={{ width: '60%' }} />
            </div>
            <p className="text-sm text-[var(--muted)]">AI sedang menganalisis foto dan mengekstrak DNA karakter...</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Ini memakan waktu 15-60 detik tergantung jumlah foto</p>
          </div>
        )}

        {/* ─── Result Step ─── */}
        {step === 'result' && result && (
          <>
            <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-2.5 text-sm text-green-400">
              ✅ Analisis DNA berhasil! Karakter siap digunakan untuk generate prompt.
            </div>

            <div className="space-y-1">
              {renderSection('Base', result.dna.base)}
              {renderSection('Wajah', result.dna.face)}
              {renderSection('Rambut', result.dna.hair)}
              {renderSection('Tubuh', result.dna.body)}
              {renderSection('Gaya & Fashion', result.dna.style)}
              {renderSection('Ekspresi', result.dna.expression)}
            </div>

            <div className="mt-6">
              <button onClick={onClose} className="btn btn-primary w-full px-4 py-2.5">
                ✅ Selesai — Gunakan Karakter
              </button>
            </div>
          </>
        )}

        {/* ─── Error Step ─── */}
        {step === 'error' && (
          <>
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-center">
              <div className="mb-3 text-5xl">❌</div>
              <h3 className="mb-2 text-lg font-semibold text-red-400">Analisis Gagal</h3>
              <p className="text-sm text-[var(--muted)]">{error}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="btn btn-secondary flex-1 px-4 py-2.5">
                Tutup
              </button>
              <button onClick={handleAnalyze} className="btn btn-primary flex-1 px-4 py-2.5">
                Coba Lagi
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function renderSection(title: string, data: DnaField): React.ReactNode {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="mb-3">
      <h4 className="text-sm font-medium text-[var(--primary)] mb-1">{title}</h4>
      <div className="rounded-lg bg-[var(--muted-bg)] p-3">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-sm mb-0.5">
            <span className="text-[var(--muted)] min-w-[100px]">{k.replace(/_/g, ' ')}:</span>
            <span className="text-[var(--foreground)]">{String(v ?? '-')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
