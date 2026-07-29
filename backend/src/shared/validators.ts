import { CONSTANTS, GENDERS } from './constants';
import { FileValidationResult } from './types';

export function validateCharacterName(name: unknown): string | null {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return 'Nama karakter wajib diisi';
  }
  if (name.length > 100) {
    return 'Nama karakter maksimal 100 karakter';
  }
  return null;
}

export function validateGender(gender: unknown): string | null {
  if (gender === undefined || gender === null) return null; // optional
  if (!GENDERS.includes(gender as typeof GENDERS[number])) {
    return 'Gender harus Laki-laki atau Perempuan';
  }
  return null;
}

export function validateImageFile(file: File): FileValidationResult {
  if (!CONSTANTS.ALLOWED_MIME_TYPES.includes(file.type as typeof CONSTANTS.ALLOWED_MIME_TYPES[number])) {
    return { valid: false, error: `Format ${file.type} tidak didukung. Gunakan JPG, PNG, atau WEBP` };
  }
  if (file.size > CONSTANTS.MAX_FILE_SIZE) {
    return { valid: false, error: `File terlalu besar (max ${CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB)` };
  }
  return { valid: true };
}

export function validateFingerprint(fp: unknown): string | null {
  if (!fp || typeof fp !== 'string' || fp.length < 10) {
    return 'Device fingerprint tidak valid';
  }
  return null;
}
