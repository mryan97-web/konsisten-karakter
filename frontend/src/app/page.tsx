'use client';

import { useState } from 'react';
import AuthModal from '@/components/AuthModal';

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* ─── Header ─── */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-xl font-bold tracking-tight">ConsistentChar</span>
          <button onClick={() => setAuthOpen(true)} className="btn btn-primary text-sm px-5 py-2">
            Masuk
          </button>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="flex min-h-screen items-center justify-center px-6 pt-16">
        <div className="max-w-3xl text-center">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Karakter AI yang{' '}
            <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
              Konsisten
            </span>{' '}
            di Semua Platform
          </h1>
          <p className="mt-6 text-lg text-[var(--muted)] sm:text-xl">
            Upload 5-20 foto, AI ekstrak karakter DNA-mu. Generate prompt konsisten untuk
            FLUX, Midjourney, Gemini, DALL-E, dan 9+ model AI lainnya.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button onClick={() => setAuthOpen(true)} className="btn btn-primary px-8 py-3 text-base">
              Mulai Gratis
            </button>
            <button onClick={() => setAuthOpen(true)} className="btn btn-secondary px-8 py-3 text-base">
              Lihat Demo
            </button>
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">Gratis selamanya — 1 karakter, 30 prompt/bulan</p>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section className="border-t border-[var(--border)] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold">Cara Kerja</h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: '1', title: 'Upload Foto', desc: 'Upload 5-20 foto dari berbagai sudut' },
              { step: '2', title: 'AI Analisis', desc: 'Gemini Vision ekstrak DNA karaktermu' },
              { step: '3', title: 'Review & Lock', desc: 'Edit DNA, lock identity biar konsisten' },
              { step: '4', title: 'Generate Prompt', desc: 'Pilih scene, outfit, model → prompt siap' },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm text-[var(--muted)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[var(--border)] px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-[var(--muted)]">
          &copy; {new Date().getFullYear()} ConsistentChar. All rights reserved.
        </div>
      </footer>

      {/* ─── Auth Modal ─── */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
