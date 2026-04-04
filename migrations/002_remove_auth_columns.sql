-- ════════════════════════════════════════════════════════════════════════════
-- FORTIZED × SWIFTAW CLOUD INTEGRATION
-- Database Migration: Remove Auth Columns (Moved to Cloud)
-- ════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- REMOVE COLUMNS FROM USERS TABLE (now in Cloud database)
-- ──────────────────────────────────────────────────────────────────────────
-- These columns have been migrated to Swiftaw Cloud database
-- Fortized now only stores: username (linking identifier)

ALTER TABLE users DROP COLUMN IF EXISTS password CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS email CASCADE;

-- ──────────────────────────────────────────────────────────────────────────
-- KEEP: username
-- ──────────────────────────────────────────────────────────────────────────
-- Username remains in Fortized as the linking identifier
-- Example: Cloud has "alice@example.com" → Fortized has username "alice_pro"
-- System matches them via cloud_account_links table

-- ──────────────────────────────────────────────────────────────────────────
-- NOTES
-- ──────────────────────────────────────────────────────────────────────────
-- What changed:
-- ✅ REMOVED: password column (now in Cloud)
-- ✅ REMOVED: email column (now in Cloud)
-- ✅ KEPT: username column (linking identifier between Fortized & Cloud)
-- ✅ KEPT: cloud_user_id (links to Cloud user)
-- ✅ KEPT: is_linked_to_cloud (tracks linking status)
-- ✅ KEPT: last_login (last login timestamp)
--
-- Data Flow:
-- 1. User logs into Cloud with email + password
-- 2. Cloud validates against Cloud database
-- 3. Cloud generates JWT with cloud_user_id
-- 4. Fortized validates JWT and looks up cloud_user_id
-- 5. Fortized finds username in cloud_account_links table
-- 6. User is logged into Fortized subaccount
--
-- ──────────────────────────────────────────────────────────────────────────
