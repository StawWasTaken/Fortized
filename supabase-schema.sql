-- ════════════════════════════════════════════════════
-- FORTIZED — Supabase Schema (migrated from Firebase RTDB)
-- ════════════════════════════════════════════════════

-- ── Users ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  email TEXT DEFAULT '',
  display_name TEXT,
  pfp TEXT,
  banner TEXT,
  onyx INTEGER DEFAULT 25,
  status TEXT DEFAULT 'online',
  custom_status JSONB,
  friends JSONB DEFAULT '[]'::jsonb,
  friend_requests_sent JSONB DEFAULT '[]'::jsonb,
  friend_requests_received JSONB DEFAULT '[]'::jsonb,
  bastions JSONB DEFAULT '[]'::jsonb,
  radiance_until BIGINT,
  radiance_plus BIGINT,
  last_daily BIGINT,
  blocked_users JSONB DEFAULT '[]'::jsonb,
  ignored_users JSONB DEFAULT '{}'::jsonb,
  group_chats JSONB DEFAULT '[]'::jsonb,
  suspension JSONB,
  suspended_until BIGINT,
  active_warning JSONB,
  game_activity JSONB,
  last_seen BIGINT,
  profile_theme JSONB,
  active_decoration TEXT,
  bio TEXT DEFAULT '',
  badges JSONB DEFAULT '[]'::jsonb,
  connections JSONB DEFAULT '[]'::jsonb,
  banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  created_at TEXT,
  raw JSONB
);

-- ── Statuses ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS statuses (
  username TEXT PRIMARY KEY REFERENCES users(username),
  status TEXT DEFAULT 'offline'
);

-- ── Notifications ──────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT NOT NULL,
  username TEXT NOT NULL REFERENCES users(username),
  type TEXT,
  "from" TEXT,
  "time" TEXT,
  read BOOLEAN DEFAULT false,
  data JSONB,
  PRIMARY KEY (username, id)
);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(username);

-- ── DM Index ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS dm_index (
  username TEXT PRIMARY KEY REFERENCES users(username),
  partners JSONB DEFAULT '[]'::jsonb
);

-- ── DM Messages ────────────────────────────────────
CREATE TABLE IF NOT EXISTS dms (
  dm_key TEXT NOT NULL,
  id TEXT NOT NULL,
  "from" TEXT,
  text TEXT,
  "time" TEXT,
  "timestamp" TEXT,
  edited BOOLEAN DEFAULT false,
  new_text TEXT,
  reactions JSONB,
  PRIMARY KEY (dm_key, id)
);
CREATE INDEX IF NOT EXISTS idx_dms_key ON dms(dm_key);

-- ── Global Bastions ────────────────────────────────
CREATE TABLE IF NOT EXISTS global_bastions (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- ── Bastion Members ────────────────────────────────
CREATE TABLE IF NOT EXISTS bastion_members (
  bastion_id TEXT PRIMARY KEY,
  members JSONB DEFAULT '[]'::jsonb
);

-- ── Bastion Messages ───────────────────────────────
CREATE TABLE IF NOT EXISTS bastion_msgs (
  bastion_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  id TEXT NOT NULL,
  "from" TEXT,
  text TEXT,
  "time" TEXT,
  "timestamp" TEXT,
  edited BOOLEAN DEFAULT false,
  reactions JSONB,
  PRIMARY KEY (bastion_id, channel_id, id)
);
CREATE INDEX IF NOT EXISTS idx_bastion_msgs ON bastion_msgs(bastion_id, channel_id);

-- ── Invites ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- ── Bastion Templates ──────────────────────────────
CREATE TABLE IF NOT EXISTS bastion_templates (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- ── Group Chats ────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_chat_meta (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS group_chat_messages (
  gc_id TEXT NOT NULL,
  id TEXT NOT NULL,
  "from" TEXT,
  text TEXT,
  "time" TEXT,
  "timestamp" TEXT,
  edited BOOLEAN DEFAULT false,
  data JSONB,
  PRIMARY KEY (gc_id, id)
);
CREATE INDEX IF NOT EXISTS idx_gc_msgs ON group_chat_messages(gc_id);

-- ── Admin ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_bans (
  username TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_staff (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS admin_global_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_nsfw_queue (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_nsfw_banned_hashes (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS admin_nsfw_safe_hashes (
  hash TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_nsfw_ai_feedback (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_scheduled_actions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_staff_revoked (
  username TEXT PRIMARY KEY,
  revoked_at BIGINT
);

CREATE TABLE IF NOT EXISTS admin_force_refresh (
  id INTEGER PRIMARY KEY DEFAULT 1,
  ts BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admin_clear_sessions (
  id INTEGER PRIMARY KEY DEFAULT 1,
  ts BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admin_trial_links (
  code TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- ── Reports ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- ── Support ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  username TEXT,
  data JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(username);

-- ── Feedback ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- ── Voice Channels ─────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_channels (
  bastion_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  username TEXT NOT NULL,
  data JSONB NOT NULL,
  PRIMARY KEY (bastion_id, channel_name, username)
);

-- ── VC Signaling ───────────────────────────────────
CREATE TABLE IF NOT EXISTS vc_signal (
  path TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- ── Typing ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS typing (
  path TEXT NOT NULL,
  username TEXT NOT NULL,
  ts BIGINT DEFAULT 0,
  PRIMARY KEY (path, username)
);

-- ── Polls ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS polls (
  bastion_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (bastion_id, channel_name, id)
);

-- ── Threads ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threads (
  bastion_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  message_id TEXT NOT NULL,
  reply_id TEXT NOT NULL,
  data JSONB NOT NULL,
  PRIMARY KEY (bastion_id, channel_name, message_id, reply_id)
);

CREATE TABLE IF NOT EXISTS thread_counts (
  bastion_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  message_id TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (bastion_id, channel_name, message_id)
);

-- ── Bastion Settings ───────────────────────────────
CREATE TABLE IF NOT EXISTS bastion_settings (
  bastion_id TEXT NOT NULL,
  key TEXT NOT NULL,
  data JSONB,
  PRIMARY KEY (bastion_id, key)
);

-- ── Bastions (full bastion data from Firebase bastions node) ──
CREATE TABLE IF NOT EXISTS bastions (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- ── Events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  bastion_id TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  PRIMARY KEY (bastion_id, id)
);

-- ── Enable Realtime for tables that need live updates ──
-- Use DO block to safely add tables that may already be members
DO $$
DECLARE
  _tbl TEXT;
BEGIN
  FOREACH _tbl IN ARRAY ARRAY[
    'notifications','statuses','dms','bastion_msgs','group_chat_messages',
    'typing','vc_signal','voice_channels','admin_bans','admin_global_settings',
    'admin_staff','admin_staff_revoked','admin_force_refresh',
    'admin_clear_sessions','bastions'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = _tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', _tbl);
    END IF;
  END LOOP;
END $$;
