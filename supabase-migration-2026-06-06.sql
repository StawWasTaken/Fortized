-- =============================================================================
-- Fortized — pending schema migration (2026-06-06)
-- =============================================================================
-- Adds columns + tables that the app already references but that aren't yet
-- provisioned in Supabase. Safe to re-run: every statement uses IF NOT EXISTS.
--
-- What this unlocks:
--   • dms.flags                — automod "rephrased" / threat tag persistence
--   • users.staff_caps_extra   — one-off extra capabilities for staff members
--   • users.country_code       — staff Live Ops world map
--   • users.region_code        — sub-country detail for the same map
--   • incidents (table)        — staff console incidents rail
--   • watchlist (table)        — staff console watchlist rail
--   • v_country_user_count     — aggregated count powering the world map
--
-- How to run:
--   Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
-- =============================================================================

-- 1) DM flag persistence ------------------------------------------------------
ALTER TABLE dms
  ADD COLUMN IF NOT EXISTS flags jsonb DEFAULT '{}'::jsonb;

-- 2) Staff capability overrides ----------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS staff_caps_extra jsonb DEFAULT '[]'::jsonb;

-- 3) Geo columns for the Live Ops world map ----------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country_code text;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS region_code  text;

CREATE INDEX IF NOT EXISTS users_country_code_idx ON users (country_code);

-- 4) Staff console — incidents ------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           text NOT NULL,                -- e.g. 'spam_wave', 'mass_report', 'raid'
  severity       text NOT NULL DEFAULT 'low',  -- low | medium | high | critical
  title          text NOT NULL,
  summary        text,
  payload        jsonb DEFAULT '{}'::jsonb,    -- arbitrary structured context
  related_users  text[] DEFAULT '{}'::text[],
  status         text NOT NULL DEFAULT 'open', -- open | acknowledged | resolved
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at    timestamptz,
  resolved_by    text
);
CREATE INDEX IF NOT EXISTS incidents_status_idx  ON incidents (status);
CREATE INDEX IF NOT EXISTS incidents_created_idx ON incidents (created_at DESC);

-- 5) Staff console — watchlist ------------------------------------------------
CREATE TABLE IF NOT EXISTS watchlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username   text NOT NULL,
  level      text NOT NULL DEFAULT 'observe',  -- observe | elevated | critical | lockdown
  reason     text,
  added_by   text,
  added_at   timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (username)
);
CREATE INDEX IF NOT EXISTS watchlist_level_idx ON watchlist (level);

-- 6) Aggregated view used by the world map -----------------------------------
CREATE OR REPLACE VIEW v_country_user_count AS
SELECT country_code,
       COUNT(*)::int AS user_count
FROM   users
WHERE  country_code IS NOT NULL
GROUP  BY country_code;

-- 7) Realtime publication (incidents + watchlist live updates) ---------------
DO $$
DECLARE
  _tbl TEXT;
BEGIN
  FOREACH _tbl IN ARRAY ARRAY['incidents','watchlist']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = _tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', _tbl);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- Done. Verify in the Supabase Table Editor that:
--   • dms.flags + users.staff_caps_extra + users.country_code + users.region_code
--     all show up as columns
--   • incidents and watchlist appear as tables
--   • v_country_user_count appears under Views
-- =============================================================================
