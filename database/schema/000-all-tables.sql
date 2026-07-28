-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ===================== 001: USERS =====================
CREATE TABLE IF NOT EXISTS users (
  user_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  VARCHAR(255),
  auth_provider  VARCHAR(20) DEFAULT 'email'
                 CHECK (auth_provider IN ('email', 'google', 'github')),
  google_id      VARCHAR(255) UNIQUE,
  github_id      VARCHAR(255) UNIQUE,
  display_name   VARCHAR(100),
  avatar_url     TEXT,
  tier           VARCHAR(20) DEFAULT 'free'
                 CHECK (tier IN ('free', 'pro', 'business', 'admin')),
  status         VARCHAR(20) DEFAULT 'active'
                 CHECK (status IN ('active', 'suspended', 'archived')),
  agreed_age_17  BOOLEAN DEFAULT false,
  agreed_tos     BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== 002: SUBSCRIPTIONS =====================
CREATE TABLE IF NOT EXISTS subscriptions (
  sub_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  plan           VARCHAR(30) NOT NULL
                 CHECK (plan IN ('pro_monthly', 'pro_yearly', 'business_monthly', 'business_yearly')),
  status         VARCHAR(20) DEFAULT 'active'
                 CHECK (status IN ('active', 'expired', 'cancelled', 'grace')),
  price          INTEGER NOT NULL,
  currency       VARCHAR(3) DEFAULT 'IDR',
  payment_method VARCHAR(20) DEFAULT 'qris'
                 CHECK (payment_method IN ('qris', 'midtrans_va', 'midtrans_gopay', 'midtrans_other')),
  order_id       VARCHAR(100) UNIQUE,
  started_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  grace_until    TIMESTAMPTZ,
  cancelled_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== 003: PAYMENT TRANSACTIONS =====================
CREATE TABLE IF NOT EXISTS payment_transactions (
  tx_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES users(user_id),
  order_id       VARCHAR(100) UNIQUE NOT NULL,
  plan           VARCHAR(30) NOT NULL,
  amount         INTEGER NOT NULL,
  currency       VARCHAR(3) DEFAULT 'IDR',
  method         VARCHAR(30),
  status         VARCHAR(20) DEFAULT 'pending'
                 CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded')),
  qris_image_url TEXT,
  midtrans_url   TEXT,
  midtrans_token VARCHAR(255),
  paid_at        TIMESTAMPTZ,
  expired_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== 004: CHARACTERS =====================
CREATE TABLE IF NOT EXISTS characters (
  char_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name           VARCHAR(100) NOT NULL,
  gender         VARCHAR(20) CHECK (gender IN ('Laki-laki', 'Perempuan')),
  type           VARCHAR(20) DEFAULT 'custom' CHECK (type IN ('default', 'custom')),
  description    TEXT,
  share_mode     VARCHAR(20) DEFAULT 'private'
                 CHECK (share_mode IN ('private', 'public', 'unlisted', 'team')),
  share_code     VARCHAR(20) UNIQUE,
  is_locked      BOOLEAN DEFAULT false,
  locked_at      TIMESTAMPTZ,
  prompt_count   INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== 005: CHARACTER DNA =====================
CREATE TABLE IF NOT EXISTS character_dna (
  dna_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  char_id        UUID NOT NULL REFERENCES characters(char_id) ON DELETE CASCADE,
  version        INTEGER DEFAULT 1,
  is_current     BOOLEAN DEFAULT true,
  base           JSONB DEFAULT '{}',
  face           JSONB DEFAULT '{}',
  hair           JSONB DEFAULT '{}',
  body           JSONB DEFAULT '{}',
  style          JSONB DEFAULT '{}',
  expression     JSONB DEFAULT '{}',
  raw_ai_output  JSONB,
  analysis       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== 006: CHARACTER IMAGES =====================
CREATE TABLE IF NOT EXISTS character_images (
  image_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  char_id          UUID NOT NULL REFERENCES characters(char_id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  blob_url         TEXT NOT NULL,
  thumbnail_url    TEXT,
  face_crop_url    TEXT,
  file_type        VARCHAR(10) DEFAULT 'jpeg' CHECK (file_type IN ('jpeg', 'png', 'webp')),
  file_size        INTEGER,
  width            INTEGER,
  height           INTEGER,
  angle            VARCHAR(20),
  face_detected    BOOLEAN,
  face_confidence  FLOAT,
  moderation_status VARCHAR(20) DEFAULT 'pending'
                    CHECK (moderation_status IN ('pending', 'passed', 'rejected')),
  moderation_notes  TEXT,
  moderated_at      TIMESTAMPTZ,
  is_deleted       BOOLEAN DEFAULT false,
  sort_order       INTEGER DEFAULT 0,
  uploaded_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== 007: CHARACTER SHARES =====================
CREATE TABLE IF NOT EXISTS character_shares (
  share_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  char_id       UUID NOT NULL REFERENCES characters(char_id) ON DELETE CASCADE,
  shared_by     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  shared_with   UUID REFERENCES users(user_id) ON DELETE CASCADE,
  mode          VARCHAR(20) NOT NULL CHECK (mode IN ('public', 'unlisted', 'direct', 'team')),
  access_token  VARCHAR(100),
  expires_at    TIMESTAMPTZ,
  view_count    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== 008: PROMPT HISTORY =====================
CREATE TABLE IF NOT EXISTS prompt_history (
  prompt_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES users(user_id) ON DELETE CASCADE,
  char_id        UUID REFERENCES characters(char_id) ON DELETE SET NULL,
  params         JSONB NOT NULL DEFAULT '{}',
  prompt_text    TEXT NOT NULL,
  prompt_text_en TEXT,
  model          VARCHAR(50) NOT NULL,
  is_favorite    BOOLEAN DEFAULT false,
  tags           TEXT[],
  version        INTEGER DEFAULT 1,
  version_group  UUID,
  is_template    BOOLEAN DEFAULT false,
  template_name  VARCHAR(100),
  export_count   INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== 009: PROMPT TEMPLATES =====================
CREATE TABLE IF NOT EXISTS prompt_templates (
  template_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name           VARCHAR(100) NOT NULL,
  description    TEXT,
  model          VARCHAR(50),
  template_json  JSONB NOT NULL DEFAULT '{}',
  is_public      BOOLEAN DEFAULT false,
  usage_count    INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== 010: DAILY USAGE =====================
CREATE TABLE IF NOT EXISTS daily_usage (
  usage_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(user_id) ON DELETE CASCADE,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  prompt_count  INTEGER DEFAULT 0,
  batch_count   INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- ===================== 011: SCENE LIBRARY =====================
CREATE TABLE IF NOT EXISTS scene_library (
  scene_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50) NOT NULL CHECK (category IN ('indoor', 'outdoor', 'studio')),
  tier        VARCHAR(20) DEFAULT 'basic' CHECK (tier IN ('basic', 'full')),
  icon        VARCHAR(10),
  description TEXT,
  prompt_hint TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true
);

-- ===================== 012: OUTFIT LIBRARY =====================
CREATE TABLE IF NOT EXISTS outfit_library (
  outfit_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50) NOT NULL
              CHECK (category IN ('casual', 'formal', 'sport', 'traditional', 'swimwear', 'outerwear')),
  gender      VARCHAR(20) DEFAULT 'unisex' CHECK (gender IN ('male', 'female', 'unisex')),
  tier        VARCHAR(20) DEFAULT 'basic' CHECK (tier IN ('basic', 'full')),
  icon        VARCHAR(10),
  description TEXT,
  prompt_hint TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true
);

-- ===================== 013: MODERATION QUEUE =====================
CREATE TABLE IF NOT EXISTS moderation_queue (
  mod_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id        UUID NOT NULL REFERENCES character_images(image_id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  nsfw_score      FLOAT DEFAULT 0,
  violence_score  FLOAT DEFAULT 0,
  face_score      FLOAT DEFAULT 0,
  quality_score   FLOAT DEFAULT 0,
  is_nsfw         BOOLEAN,
  is_violence     BOOLEAN,
  has_face        BOOLEAN,
  is_duplicate    BOOLEAN,
  duplicate_of    UUID REFERENCES character_images(image_id),
  reviewed_by     UUID REFERENCES users(user_id),
  reviewed_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== 014: ADMIN LOGS =====================
CREATE TABLE IF NOT EXISTS admin_logs (
  log_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES users(user_id),
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id   UUID,
  details     JSONB DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== 015: AI USAGE =====================
CREATE TABLE IF NOT EXISTS ai_usage (
  usage_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(user_id) ON DELETE SET NULL,
  job_type          VARCHAR(50) NOT NULL CHECK (job_type IN ('dna_extraction', 'prompt_enhance', 'moderation', 'face_detection')),
  model             VARCHAR(50) NOT NULL DEFAULT 'gemini-2.0-flash',
  input_tokens      INTEGER DEFAULT 0,
  output_tokens     INTEGER DEFAULT 0,
  total_tokens      INTEGER DEFAULT 0,
  images_analyzed   INTEGER DEFAULT 0,
  duration_ms       INTEGER,
  estimated_cost_usd FLOAT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== 016: WHITE LABEL CONFIG =====================
CREATE TABLE IF NOT EXISTS white_label_config (
  config_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  app_name        VARCHAR(100),
  logo_url        TEXT,
  favicon_url     TEXT,
  domain          VARCHAR(255) UNIQUE,
  primary_color   VARCHAR(7) DEFAULT '#8b5cf6',
  secondary_color VARCHAR(7) DEFAULT '#6366f1',
  accent_color    VARCHAR(7) DEFAULT '#a78bfa',
  background_color VARCHAR(7) DEFAULT '#0a0a0a',
  custom_css      TEXT,
  feature_flags   JSONB DEFAULT '{}',
  pricing_override JSONB DEFAULT '{}',
  email_branding  JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== TEAMS (V2, placeholder) =====================
CREATE TABLE IF NOT EXISTS teams (
  team_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  owner_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add team_id to characters (nullable, V2)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(team_id) ON DELETE SET NULL;
