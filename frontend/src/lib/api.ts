/**
 * API base URL — semua fetch panggil ini biar gak hardcode.
 * Set NEXT_PUBLIC_API_URL di Vercel setelah backend deploy.
 */
export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}
