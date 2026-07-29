-- ===================== 017: DEMO SESSIONS =====================
CREATE TABLE IF NOT EXISTS demo_sessions (
  session_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fingerprint   TEXT NOT NULL,
  ip_address    VARCHAR(45) NOT NULL,
  user_agent    TEXT,
  char_id       UUID REFERENCES characters(char_id) ON DELETE SET NULL,
  status        VARCHAR(20) DEFAULT 'active'
                CHECK (status IN ('active', 'expired', 'converted')),
  prompt_count  INTEGER DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  converted_at  TIMESTAMPTZ,
  converted_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_demo_fingerprint ON demo_sessions(fingerprint, status);
CREATE INDEX IF NOT EXISTS idx_demo_ip ON demo_sessions(ip_address, status);

-- Auto-cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_demo_sessions()
RETURNS void AS $$
BEGIN
  UPDATE demo_sessions
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < NOW();

  DELETE FROM characters
  WHERE char_id IN (
    SELECT char_id FROM demo_sessions
    WHERE status = 'expired'
    AND char_id IS NOT NULL
    AND created_at < NOW() - INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql;
