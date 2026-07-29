'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type UploadPhotoModalProps = {
  charId: string;
  charName: string;
  onClose: () => void;
  onComplete: () => void;
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_FILES = 5;
const MAX_FILES = 20;

export default function UploadPhotoModal({ charId, charName, onClose, onComplete }: UploadPhotoModalProps) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const valid: File[] = [];
    const errors: string[] = [];
    const existingCount = files.length;

    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];
      if (!ALLOWED_TYPES.includes(f.type)) {
        errors.push(`"${f.name}" bukan JPG/PNG/WEBP`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        errors.push(`"${f.name}" terlalu besar (max 5MB)`);
        continue;
      }
      if (existingCount + files.length + valid.length >= MAX_FILES) {
        errors.push(`Maksimal ${MAX_FILES} foto`);
        break;
      }
      valid.push(f);
    }

    if (errors.length > 0) setError(errors.join('; '));

    setFiles((prev) => [...prev, ...valid]);

    // Generate previews
    const newPreviews = valid.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, [files.length]);

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleSelect = () => inputRef.current?.click();

  const handleUpload = async () => {
    if (files.length < MIN_FILES) {
      setError(`Minimal ${MIN_FILES} foto. Upload ${MIN_FILES - files.length} lagi.`);
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/api/character/${charId}/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Gagal upload');
        return;
      }

      onComplete();
      router.refresh();
    } catch (err) {
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
        {/* ─── Header ─── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Upload Foto</h2>
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

        {/* ─── Drop Zone ─── */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleSelect}
          className={`mb-6 cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            dragOver
              ? 'border-[var(--primary)] bg-[var(--primary)]/5'
              : 'border-[var(--border)] bg-[var(--muted-bg)] hover:border-[var(--muted)]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <div className="mb-2 text-4xl">
            {dragOver ? '📸' : '🖼️'}
          </div>
          <p className="font-medium">
            {dragOver ? 'Lepaskan foto di sini' : 'Klik atau tarik foto ke sini'}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            JPG, PNG, atau WEBP · max 5MB/file · {MIN_FILES}-{MAX_FILES} foto
          </p>
        </div>

        {/* ─── File Count ─── */}
        {fileCount > 0 && (
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">{fileCount} foto dipilih</span>
            <span
              className={
                fileCount >= MIN_FILES
                  ? 'text-green-400'
                  : fileCount >= 1
                    ? 'text-yellow-400'
                    : 'text-[var(--muted)]'
              }
            >
              {fileCount >= MIN_FILES
                ? '✅ Siap upload'
                : `Perlu ${MIN_FILES - fileCount} lagi (min ${MIN_FILES})`}
            </span>
          </div>
        )}

        {/* ─── Preview Grid ─── */}
        {previews.length > 0 && (
          <div className="mb-6 grid grid-cols-4 gap-3 sm:grid-cols-5">
            {previews.map((src, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)]">
                <img
                  src={src}
                  alt={`Foto ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/80 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  &times;
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4">
                  <span className="text-[10px] text-white/80">{i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Error ─── */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ─── Progress ─── */}
        {uploading && (
          <div className="mb-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted-bg)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">Mengupload... {progress}%</p>
          </div>
        )}

        {/* ─── Info ─── */}
        <div className="mb-6 rounded-lg bg-[var(--muted-bg)] p-4 text-xs text-[var(--muted)]">
          <p className="font-medium mb-1 text-[var(--foreground)]">📋 Tips Upload:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Gunakan foto dengan wajah jelas dan ekspresi natural</li>
            <li>Variasi angle: depan, samping, 3/4, atas/bawah</li>
            <li>Hindari aksesoris yang menutupi wajah (masker, kacamata gelap)</li>
            <li>Resolusi minimal 512px</li>
            <li>Setelah upload, AI akan mengekstrak DNA karakter</li>
          </ul>
        </div>

        {/* ─── Actions ─── */}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1 px-4 py-2.5">
            Batal
          </button>
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            className="btn btn-primary flex-1 px-4 py-2.5 disabled:opacity-50"
          >
            {uploading ? 'Mengupload...' : `Upload ${fileCount} Foto`}
          </button>
        </div>
      </div>
    </div>
  );
}
