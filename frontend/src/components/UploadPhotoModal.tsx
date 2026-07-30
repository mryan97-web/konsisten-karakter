'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const MIN_FILES = 5;
const MAX_FILES = 20;
const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_RETRIES = 3;

type UploadPhotoModalProps = {
  charId: string;
  charName: string;
  onClose: () => void;
  onComplete: () => void;
};

export default function UploadPhotoModal({ charId, charName, onClose, onComplete }: UploadPhotoModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [failedFiles, setFailedFiles] = useState<{ index: number; name: string; reason: string }[]>([]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const newFiles = Array.from(incoming);
    const valid: File[] = [];
    const newPreviews: string[] = [];
    const errors: string[] = [];

    for (const f of newFiles) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        errors.push(`${f.name}: format tidak didukung`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errors.push(`${f.name}: maksimal ${MAX_FILE_SIZE_MB}MB`);
        continue;
      }
      valid.push(f);
      newPreviews.push(URL.createObjectURL(f));
    }

    const combined = [...files, ...valid].slice(0, MAX_FILES);
    setFiles(combined);
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, MAX_FILES));

    if (errors.length > 0) {
      setError(errors.join('; '));
    } else {
      setError('');
    }
  }, [files]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (files.length < MIN_FILES) {
      setError(`Minimal ${MIN_FILES} foto. Upload ${MIN_FILES - files.length} lagi.`);
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);
    setFailedFiles([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      let totalUploaded = 0;
      let retries = 0;

      // Upload file satu per satu dengan retry
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('files', files[i]);

        // Coba upload dengan retry
        let lastError = '';
        let success = false;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            await new Promise(r => setTimeout(r, 1000 * attempt)); // 1s, 2s, 3s
          }

          try {
            const res = await fetch(`${baseUrl}/api/character/${charId}/upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.access_token}` },
              body: formData,
            });
            const data = await res.json();
            if (data.success) {
              totalUploaded++;
              success = true;
              break;
            }
            lastError = data.error?.message || 'Upload gagal';
          } catch {
            lastError = 'Gagal terhubung ke server';
          }
        }

        if (!success) {
          setFailedFiles(prev => [...prev, { index: i, name: files[i].name, reason: lastError }]);
        }

        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      if (totalUploaded >= MIN_FILES) {
        onComplete();
        router.refresh();
      } else if (totalUploaded > 0) {
        setError(`${totalUploaded} foto berhasil diupload. Minimal ${MIN_FILES} foto. Upload lagi.`);
        setFiles([]);
        setPreviews([]);
      } else {
        setError('Gagal upload semua foto. Cek koneksi dan coba lagi.');
      }
    } catch {
      setError('Gagal terhubung ke server');
    } finally {
      setUploading(false);
    }
  };

  const fileCount = files.length;
  const canUpload = fileCount >= MIN_FILES && !uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Upload Foto</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Karakter: <span className="font-medium text-[var(--foreground)]">{charName}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-white transition-colors text-xl leading-none">&times;</button>
        </div>

        {/* ─── Aspect Ratio Guide ─── */}
        <div className="mb-4 rounded-lg bg-[var(--muted-bg)] p-3 text-xs text-[var(--muted)]">
          <p className="font-medium text-[var(--foreground)] mb-1">📐 Tips Upload:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Gunakan foto dengan rasio <strong>1:1 (square)</strong> atau minimal <strong>3:4</strong></li>
            <li>Hindari foto terlalu gelap atau terlalu terang (backlight)</li>
            <li>Wajah harus terlihat jelas — minimal 512px di dimensi terpendek</li>
            <li>Variasi angle: depan, samping (45°), lingkungan natural</li>
            <li>Format: JPG/PNG/WEBP · Max {MAX_FILE_SIZE_MB}MB per file · {MIN_FILES}-{MAX_FILES} foto</li>
          </ul>
        </div>

        {/* ─── Drop Zone / File Picker ─── */}
        {files.length < MAX_FILES && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--muted-bg)] py-10 transition-colors hover:border-[var(--primary)]"
          >
            <div className="mb-2 text-4xl">📁</div>
            <p className="text-sm font-medium">Klik atau drag & drop foto</p>
            <p className="text-xs text-[var(--muted)]">
              {files.length}/{MAX_FILES} · JPG, PNG, WEBP
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* ─── Preview Gallery ─── */}
        {previews.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {previews.map((src, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)]">
                  <img src={src} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeFile(i)}
                    disabled={uploading}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    &times;
                  </button>
                  <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-xs text-white/70">
                    #{i + 1}
                  </div>
                </div>
              ))}
              {Array.from({ length: Math.max(0, MIN_FILES - previews.length) }).map((_, i) => (
                <div key={`placeholder-${i}`} className="aspect-square rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted-bg)] flex items-center justify-center text-2xl text-[var(--muted)] opacity-40">
                  +
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {fileCount >= MIN_FILES
                ? `✅ ${fileCount} foto siap upload`
                : `📷 ${fileCount}/${MIN_FILES} foto — upload ${MIN_FILES - fileCount} lagi`}
            </p>
          </div>
        )}

        {/* ─── Upload Progress ─── */}
        {uploading && (
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-[var(--muted)]">Uploading...</span>
              <span className="text-[var(--primary)]">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted-bg)]">
              <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* ─── Failed Files ─── */}
        {failedFiles.length > 0 && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
            <p className="text-xs font-medium text-red-400 mb-1">⚠️ {failedFiles.length} file gagal (akan di-retry otomatis):</p>
            {failedFiles.map((f, i) => (
              <p key={i} className="text-xs text-[var(--muted)] pl-2">{f.name}: {f.reason}</p>
            ))}
          </div>
        )}

        {/* ─── Error ─── */}
        {error && !failedFiles.length && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">{error}</div>
        )}

        {/* ─── Actions ─── */}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={uploading} className="btn btn-secondary flex-1 px-4 py-2.5 disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Batal'}
          </button>
          <button onClick={handleUpload} disabled={!canUpload} className="btn btn-primary flex-1 px-4 py-2.5 disabled:opacity-50">
            {uploading ? `Upload ${progress}%` : `📤 Upload ${fileCount} Foto`}
          </button>
        </div>
      </div>
    </div>
  );
}
