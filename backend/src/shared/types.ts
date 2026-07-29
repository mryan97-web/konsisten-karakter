// ─── DTOs ───

export interface UserDto {
  user_id: string;
  email: string;
  tier: string;
  status: string;
}

export interface AuthUser {
  userId: string;
  user: UserDto;
}

export interface CharacterDto {
  char_id: string;
  name: string;
  gender: string | null;
  type: string;
  description: string | null;
  share_mode: string;
  share_code: string | null;
  is_locked: boolean;
  locked_at: string | null;
  prompt_count: number;
  created_at: string;
  updated_at: string | null;
  images?: CharacterImageDto[];
  dna?: DnaDto | null;
}

export interface CharacterImageDto {
  image_id: string;
  char_id?: string;
  blob_url: string;
  thumbnail_url?: string;
  file_type: string;
  file_size?: number;
  sort_order: number;
  angle?: string | null;
}

export interface DnaDto {
  dna_id: string;
  version: number;
  is_current: boolean;
  base: Record<string, string | string[]>;
  face: Record<string, unknown>;
  hair: Record<string, unknown>;
  body: Record<string, unknown>;
  style: Record<string, unknown>;
  expression: Record<string, unknown>;
  created_at: string;
}

export interface DnaExtractionResult {
  success: boolean;
  dna?: RawDna;
  error?: string;
}

export interface RawDna {
  base: Record<string, unknown>;
  face: Record<string, unknown>;
  hair: Record<string, unknown>;
  body: Record<string, unknown>;
  style: Record<string, unknown>;
  expression: Record<string, unknown>;
  raw_ai_output: string;
}

export interface DemoSessionDto {
  session_id: string;
  char_id: string;
  prompt_count: number;
  expires_at: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadResult {
  image_id: string;
  blob_url: string;
  file_type: string;
  sort_order: number;
}

// ─── Request types ───

export interface CreateCharacterRequest {
  name: string;
  gender?: string;
  description?: string;
  height_cm?: number;
  weight_kg?: number;
  notes?: string;
}

export interface UpdateCharacterRequest {
  name?: string;
  gender?: string;
  description?: string;
}

export interface StartDemoRequest {
  fingerprint: string;
}

// ─── Response types ───

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: Record<string, unknown>;
}
