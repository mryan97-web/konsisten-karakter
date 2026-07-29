// ─── Constants ───
export const CONSTANTS = {
  // File
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  MIN_IMAGES: 5,
  MAX_IMAGES: 20,
  MIN_DIMENSION: 512,

  // Tier
  FREE_MAX_CHARACTERS: 1,
  FREE_MAX_PROMPTS: 30,

  // Demo
  DEMO_TTL_HOURS: 24,
  DEMO_MAX_PROMPTS: 3,
  DEMO_MAX_PER_IP_PER_DAY: 3,

  // Rate limit
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW_MS: 60_000,

  // DNA
  DNA_GEMINI_MODEL: 'gemini-2.5-flash',
  DNA_MAX_IMAGES_PER_REQUEST: 10,
  DNA_RETRY_MAX: 3,
  DNA_RETRY_TIMEOUT_MS: 30_000,
  DNA_ESTIMATED_COST_PER_IMAGE: 0.002,
} as const;

// ─── Enums ───
export const GENDERS = ['Laki-laki', 'Perempuan'] as const;
export const SHARE_MODES = ['private', 'public', 'shared'] as const;
export const DEMO_SESSION_STATUSES = ['active', 'expired', 'converted'] as const;
export const MODERATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const TIERS = ['free', 'pro', 'business'] as const;
