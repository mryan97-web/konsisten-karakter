import { ApiResponse } from './types';

/**
 * Build consistent API responses.
 * Single source of truth — no more inline response templates.
 */
export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200): Response {
  const body: ApiResponse<T> = { success: true, data, meta };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function created<T>(data: T, meta?: Record<string, unknown>): Response {
  return ok(data, meta, 201);
}

export function err(code: string, message: string, status = 400, details?: unknown): Response {
  const body: ApiResponse = { success: false, error: { code, message, details } };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const E = {
  VALIDATION: (msg: string) => err('VALIDATION_ERROR', msg, 400),
  NOT_FOUND: (msg = 'Tidak ditemukan') => err('NOT_FOUND', msg, 404),
  UNAUTHORIZED: (msg = 'Token tidak valid') => err('UNAUTHORIZED', msg, 401),
  FORBIDDEN: (msg = 'Akses ditolak') => err('FORBIDDEN', msg, 403),
  TIER_LIMIT: (msg: string, requiredTier: string) =>
    err('TIER_LIMIT', msg, 403, { required_tier: requiredTier }),
  RATE_LIMIT: (retryAfter: number, limit: number) => {
    const r = new Response(JSON.stringify({
      success: false,
      error: { code: 'RATE_LIMIT', message: `Terlalu banyak request. Coba lagi dalam ${retryAfter} detik`, details: { retry_after: retryAfter, limit } },
    }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } });
    return r;
  },
  INTERNAL: (msg = 'Terjadi kesalahan server') => err('INTERNAL_ERROR', msg, 500),
  DEMO_ALREADY_EXISTS: (sessionId: string) =>
    err('DEMO_ALREADY_EXISTS', 'Demo session masih aktif', 409, { session_id: sessionId }),
  DEMO_LIMIT: (msg = 'Batas demo tercapai') => err('DEMO_LIMIT', msg, 403),
  DEMO_EXPIRED: () => err('DEMO_EXPIRED', 'Session demo sudah habis', 401),
  NOT_IMPLEMENTED: (feature: string) => err('NOT_IMPLEMENTED', `${feature} belum tersedia`, 501),
} as const;
