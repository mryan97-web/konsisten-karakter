-- ===================== INDEXES =====================

-- USERS
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);

-- SUBSCRIPTIONS
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subs_expires ON subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subs_user_active ON subscriptions(user_id) WHERE status = 'active';

-- PAYMENT TRANSACTIONS
CREATE INDEX IF NOT EXISTS idx_pay_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_pay_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pay_created ON payment_transactions(created_at DESC);

-- CHARACTERS
CREATE INDEX IF NOT EXISTS idx_chars_user ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_chars_share ON characters(share_mode) WHERE share_mode IN ('public', 'unlisted');
CREATE INDEX IF NOT EXISTS idx_chars_created ON characters(user_id, created_at DESC);

-- CHARACTER DNA
CREATE INDEX IF NOT EXISTS idx_dna_char ON character_dna(char_id);
CREATE INDEX IF NOT EXISTS idx_dna_current ON character_dna(char_id, is_current) WHERE is_current = true;

-- CHARACTER IMAGES
CREATE INDEX IF NOT EXISTS idx_img_char ON character_images(char_id);
CREATE INDEX IF NOT EXISTS idx_img_moderation ON character_images(moderation_status) WHERE moderation_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_img_sort ON character_images(char_id, sort_order);

-- CHARACTER SHARES
CREATE INDEX IF NOT EXISTS idx_share_char ON character_shares(char_id);
CREATE INDEX IF NOT EXISTS idx_share_with ON character_shares(shared_with);

-- PROMPT HISTORY
CREATE INDEX IF NOT EXISTS idx_prompt_user ON prompt_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_char ON prompt_history(char_id);
CREATE INDEX IF NOT EXISTS idx_prompt_favorite ON prompt_history(user_id) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_prompt_created ON prompt_history(created_at);

-- PROMPT TEMPLATES
CREATE INDEX IF NOT EXISTS idx_template_user ON prompt_templates(user_id);

-- DAILY USAGE
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON daily_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_date ON daily_usage(date);

-- SCENE LIBRARY
CREATE INDEX IF NOT EXISTS idx_scene_tier ON scene_library(tier);
CREATE INDEX IF NOT EXISTS idx_scene_sort ON scene_library(sort_order);

-- OUTFIT LIBRARY
CREATE INDEX IF NOT EXISTS idx_outfit_tier ON outfit_library(tier);
CREATE INDEX IF NOT EXISTS idx_outfit_gender ON outfit_library(gender);
CREATE INDEX IF NOT EXISTS idx_outfit_sort ON outfit_library(sort_order);

-- MODERATION QUEUE
CREATE INDEX IF NOT EXISTS idx_mod_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_mod_pending ON moderation_queue(created_at) WHERE status = 'pending';

-- ADMIN LOGS
CREATE INDEX IF NOT EXISTS idx_log_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_log_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_log_created ON admin_logs(created_at DESC);

-- AI USAGE
CREATE INDEX IF NOT EXISTS idx_ai_user ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_type ON ai_usage(job_type);
CREATE INDEX IF NOT EXISTS idx_ai_created ON ai_usage(created_at);
