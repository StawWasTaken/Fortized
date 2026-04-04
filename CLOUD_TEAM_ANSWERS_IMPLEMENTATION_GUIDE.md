# Cloud Team Answers to Fortized - Implementation Guide

**Date:** April 4, 2026  
**To:** Fortized Team  
**From:** Swiftaw Cloud Team  
**Status:** ✅ All Questions Answered - Ready for Implementation

---

## Executive Summary

Cloud team has provided definitive answers on all architectural questions. The path forward is clear:

1. **Display Name:** Fortized Step 2 (confirmed ✅)
2. **Subaccount Creation:** Fortized creates (Option C) ✅
3. **Product ID:** Cloud tracks in `product_links` table ✅
4. **Token Validation:** Use one-time auth codes, not JWT ✅
5. **Subaccount Switching:** Not needed for MVP (Phase 2) ✅
6. **Error Handling:** Cloud provided exact formats ✅

**Test Credentials Ready:**
```
Cloud Account (for QA testing):
  Username: staw
  Password: Elstart125
  Email: theelicoter@gmail.com
```

---

## 1. Implementation Architecture (CONFIRMED)

### Authentication Flow (Final)

```
┌────────────────────────────────────────────────────────┐
│ SIGNUP FLOW                                            │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Step 1: Cloud Auth (NEW TAB)                          │
│ ───────────────────────────────────                   │
│ 1. User clicks "Connect Cloud"                        │
│ 2. Opens: https://swiftaw.com/cloud/auth/link?...    │
│ 3. Cloud auth happens                                │
│ 4. Cloud redirects with:                              │
│    - code (one-time auth code)                       │
│    - state (CSRF protection)                         │
│    - cloud_user_id (Cloud user ID)                   │
│    - cloud_username (Cloud username)                 │
│                                                        │
│ Step 2: Fortized Profile (ORIGINAL WINDOW)            │
│ ────────────────────────────────────────             │
│ 1. Show Step 2 form                                   │
│ 2. Display Name (auto-filled, editable)              │
│ 3. Date of Birth (validate: 13-150 years)            │
│ 4. About Me (auto-filled template, editable)         │
│ 5. User submits → Backend creates account            │
│                                                        │
│ Step 3: Backend Account Creation                      │
│ ──────────────────────────────────                   │
│ 1. Fortized creates user with display_name           │
│ 2. Fortized creates link in cloud_account_links      │
│ 3. Fortized creates entry in Cloud's product_links   │
│ 4. Return session token                              │
│ 5. User logged in                                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Key Decisions

| Decision | Option | Rationale |
|----------|--------|-----------|
| Account Creation | Fortized (Step 2) | Fortized has all profile data |
| Product ID | Cloud tracks | Enables multi-product Cloud later |
| Token Validation | Auth codes only | Reduces API calls between systems |
| Subaccount Switching | Phase 2 | Not needed for MVP |

---

## 2. Cloud's Answers to Each Question

### Question 1: Who Creates Subaccount?

**Cloud's Answer:** ✅ **Fortized creates it (Option C)**

**Details:**
- Cloud provides: `code`, `state`, `cloud_user_id`, `cloud_username`
- Fortized collects: `display_name`, `date_of_birth`, `about_me` in Step 2
- Fortized creates subaccount with all data
- Cloud tracks relationship in `product_links` table

**Why this works:**
- Cloud focuses on authentication
- Fortized handles its own account creation logic
- Cleaner separation of concerns

---

### Question 2: Subaccounts Table Schema

**Cloud's Answer:** ✅ **Use your schema, we track with product_links**

**Cloud Side:**
```sql
-- Cloud's product_links table (tracks Fortized subaccounts)
CREATE TABLE product_links (
  id UUID PRIMARY KEY,
  cloud_user_id UUID NOT NULL,
  product_id VARCHAR(50),  -- e.g., 'fortized'
  external_subaccount_id VARCHAR(255),  -- Fortized's subaccount_id
  product_username VARCHAR(255),  -- Can differ per product
  created_at TIMESTAMP,
  is_active BOOLEAN
);
```

**Fortized Side (YOUR SCHEMA - KEEP IT):**
```sql
users table:
  id, cloud_user_id, username, display_name, date_of_birth, 
  about_me, is_linked_to_cloud, last_login, created_at

cloud_account_links table:
  id, cloud_user_id, fortized_user_id, subaccount_id, username, 
  email, linked_at, linked_by, is_active, created_at
```

**No changes needed** - Cloud will reference your `subaccount_id` in their `product_links` table.

---

### Question 3: Email Field Storage

**Cloud's Answer:** ✅ **Optional - store in cloud_account_links.email**

Cloud will provide `cloud_email` in callback if available.

**Implementation:**
```javascript
// In /api/auth/create-fortized-account
const { cloudEmail } = req.body;

// Store in cloud_account_links
await db.from('cloud_account_links').insert({
  cloud_user_id: cloudUserId,
  fortized_user_id: newUserId,
  subaccount_id: subaccountId,
  username: cloudUsername,
  email: cloudEmail || null,  // Optional
  // ... rest of fields
});

// Don't create separate email column in users table
// Cloud handles email verification, not Fortized
```

---

### Question 4: Token Validation Approach

**Cloud's Answer:** ✅ **Use one-time authorization codes, skip JWT validation**

**IMPORTANT CHANGE FROM EARLIER:**

❌ **Don't do this:**
```javascript
const validation = await validateCloudToken(cloudToken);
```

✅ **Do this instead:**
```javascript
// The 'code' parameter IS the auth proof
// Cloud already validated it when they generated it
const { code, state, cloud_user_id, cloud_username } = req.body;

// 1. Validate state (CSRF)
if (!validateState(state)) {
  return res.status(400).json({ error: 'Invalid state' });
}

// 2. Trust cloud_user_id + cloud_username (Cloud already verified)
// 3. Create Fortized account with these values
```

**Why:**
- Cloud provides auth codes only once (one-time use)
- No need for Fortized to re-validate with Cloud
- Faster, fewer API calls
- More secure (code is single-use)

---

### Question 5: Subaccount Switching

**Cloud's Answer:** ✅ **Not needed for MVP - Phase 2 feature**

**Current Implementation (MVP):**
- One Cloud user → One Fortized account
- No account switcher needed
- Keep `cloud_account_links` for future multi-account support

**Phase 2 (Later):**
- Implement account switcher UI
- Query `/api/accounts` endpoint
- Allow switching between Fortized accounts

---

### Question 6: Error Handling

**Cloud's Answer:** ✅ **Exact error formats provided**

#### Cloud Auth Errors (from Cloud)

**Invalid credentials:**
```json
{
  "status": 400,
  "error": "invalid_credentials",
  "message": "Username or password is incorrect"
}
```

**Account locked:**
```json
{
  "status": 403,
  "error": "account_locked",
  "message": "Account has been locked due to multiple failed login attempts"
}
```

**Authorization code expired:**
```json
{
  "status": 401,
  "error": "code_expired",
  "message": "Authorization code has expired (valid for 10 minutes)"
}
```

#### Fortized Must Handle

**Missing parameters:**
```json
{
  "status": 400,
  "error": "missing_parameters",
  "message": "Missing: code, state, cloud_user_id, cloud_username",
  "required": ["code", "state", "cloud_user_id", "cloud_username"]
}
```

**Invalid state (CSRF):**
```json
{
  "status": 400,
  "error": "csrf_validation_failed",
  "message": "State parameter does not match session state"
}
```

**Age validation failed:**
```json
{
  "status": 400,
  "error": "age_validation_failed",
  "message": "Must be 13-150 years old with birth year 1870 or later",
  "valid_range": "13-150 years old"
}
```

**Cloud user already has account:**
```json
{
  "status": 409,
  "error": "account_exists",
  "message": "This Cloud account already has a Fortized account",
  "action": "use_login_flow"
}
```

**Internal server error:**
```json
{
  "status": 500,
  "error": "internal_server_error",
  "message": "An unexpected error occurred",
  "request_id": "req_123abc..."
}
```

---

## 3. Test Credentials

**Use these for QA testing:**

```
Swiftaw Cloud Account:
  Username: staw
  Password: Elstart125
  Email: theelicoter@gmail.com

Notes:
  - Account is pre-verified
  - No email confirmation needed
  - Has multiple test scenarios set up
  - Cloud team can reset password if needed
```

**Testing scenarios with this account:**
1. First-time signup (new Fortized account)
2. Logout and re-login with same Cloud account
3. Try creating duplicate account (should be blocked)
4. Test age validation edge cases
5. Test display name editing

---

## 4. Implementation Checklist

### Backend Tasks

- [ ] **Update `/api/auth/cloud-callback` endpoint**
  - Change from JWT validation to auth code validation
  - Validate state parameter (CSRF)
  - Accept: `code`, `state`, `cloud_user_id`, `cloud_username`
  - Return: session_token (Fortized JWT)
  - Handle all error cases with Cloud's error formats

- [ ] **Create `/api/auth/create-fortized-account` endpoint**
  - Accept: `cloudUserId`, `cloudUsername`, `cloudEmail`, `displayName`, `dateOfBirth`, `aboutMe`
  - Validate age (13-150 years, 1870+)
  - Create user in `users` table
  - Create link in `cloud_account_links` table
  - Generate `subaccount_id` 
  - Call Cloud API to register in `product_links` (if needed)
  - Return: `session_token`, `subaccount_id`

- [ ] **Add Cloud API client**
  - Library: Use auth codes from Cloud (no token exchange)
  - Endpoint: Cloud's product_links registration (if needed)
  - Error handling: Return Cloud's error messages verbatim

- [ ] **Database: Add `product_id` column (optional)**
  ```sql
  ALTER TABLE cloud_account_links 
  ADD COLUMN product_id VARCHAR(50) DEFAULT 'fortized';
  ```

- [ ] **Rate limiting**
  - Apply to `/api/auth/cloud-callback`: 100 req/min per IP
  - Apply to `/api/auth/create-fortized-account`: 100 req/min per IP
  - Return 429 on limit exceeded

- [ ] **Session token generation**
  - JWT with: `sub`, `cloud_user_id`, `username`, `display_name`
  - Expires: 24 hours
  - Secret: Stored in environment variable

### Frontend Tasks

- [ ] **Signup Step 1: Cloud Connection**
  - Button: "Connect Swiftaw Cloud Account" with logo
  - Logo: `https://swiftaw.com/Cloud%20logo.png` with #ffa43b stroke
  - Opens: Cloud auth in new tab (600x700)
  - Waits for: postMessage from callback handler

- [ ] **Signup Step 2: Profile Details**
  - Display Name input (auto-filled from `cloud_username`, editable)
  - Date of Birth input (validate: 13-150 years)
  - About Me textarea (auto-filled with template, editable)
  - Create Account button
  - Submit to: `/api/auth/create-fortized-account`

- [ ] **Cloud Callback Handler** (`/auth/cloud-callback.html`)
  - Parse URL params: `code`, `state`, `cloud_user_id`, `cloud_username`
  - Validate state (CSRF) from `sessionStorage`
  - If from signup: Send postMessage + close window
  - If from login: POST to `/api/auth/cloud-callback`
  - Handle error responses from Cloud

- [ ] **Login Page: Cloud Sign In**
  - Button: "Sign in with Swiftaw Cloud"
  - Opens Cloud auth in popup (600x700)
  - If already logged into Cloud: Auto-closes + redirects
  - If not logged in: Shows Cloud login form
  - On success: Redirects to `/app`

- [ ] **Error Messages**
  - Age validation: "You must be 13+ years old"
  - Account exists: "Cloud account already linked to Fortized account. Sign in instead."
  - Network error: "Connection error. Please try again."
  - Server error: "An error occurred. Please try again later."

### Database Tasks

- [ ] **Verify `users` table has:**
  - `cloud_user_id` (UUID, unique)
  - `display_name` (VARCHAR)
  - `date_of_birth` (DATE)
  - `about_me` (TEXT)
  - `is_linked_to_cloud` (BOOLEAN)
  - `last_login` (TIMESTAMP)

- [ ] **Verify `cloud_account_links` table has:**
  - `id`, `cloud_user_id`, `fortized_user_id`
  - `subaccount_id` (unique)
  - `username`, `email`
  - `linked_at`, `linked_by`, `is_active`, `created_at`

- [ ] **Create indexes:**
  ```sql
  CREATE INDEX idx_cloud_user_id ON users(cloud_user_id);
  CREATE INDEX idx_cloud_links_cloud_user ON cloud_account_links(cloud_user_id);
  CREATE INDEX idx_cloud_links_subaccount ON cloud_account_links(subaccount_id);
  ```

### Testing Tasks

- [ ] **Unit Tests:**
  - Age validation (test: 12, 13, 100, 150, 151 years old)
  - State parameter validation (CSRF)
  - Display name validation (not empty, no special chars)
  - Email validation (if applicable)

- [ ] **Integration Tests:**
  - Full signup flow: Cloud auth → Step 2 → Backend creates account
  - Full login flow: Cloud auth → Session token → Redirect to /app
  - Error handling: Invalid state, missing params, age validation fail
  - Duplicate account: Try signing up with same Cloud user twice

- [ ] **E2E Tests (with test credentials):**
  - Username: `staw`
  - Password: `Elstart125`
  - Email: `theelicoter@gmail.com`
  - Scenarios:
    - [ ] New signup (create account)
    - [ ] Logout and re-login (use existing account)
    - [ ] Try duplicate signup (should fail)
    - [ ] Test age edge cases
    - [ ] Display name editing

- [ ] **Manual Testing:**
  - [ ] Sign up with Cloud (test account)
  - [ ] Verify email in Step 1 shows Cloud username
  - [ ] Edit display name in Step 2
  - [ ] Change about me text
  - [ ] Log out and sign back in
  - [ ] Check user data in database
  - [ ] Verify session token works for `/app` access

### Deployment Tasks

- [ ] **Environment Variables:**
  ```env
  CLOUD_AUTH_URL=https://swiftaw.com/cloud/auth/link?product=fortized&redirect_uri=https://fortized.com/auth/cloud-callback&state=
  FORTIZED_TOKEN_SECRET=<generate-random-secret>
  FORTIZED_TOKEN_EXPIRES=86400
  DB_HOST=<your-db>
  DB_NAME=fortized
  ```

- [ ] **Cloud Team Coordination:**
  - [ ] Confirm redirect URI is correct: `https://fortized.com/auth/cloud-callback`
  - [ ] Get Cloud's public key endpoint (if doing JWT validation later)
  - [ ] Test with Cloud's test credentials
  - [ ] Verify error message formats match
  - [ ] Set up monitoring/logging

- [ ] **Production Checklist:**
  - [ ] HTTPS enabled on all endpoints
  - [ ] Rate limiting configured
  - [ ] Error logging set up
  - [ ] Database backups configured
  - [ ] Session token rotation configured
  - [ ] Age validation working for all edge cases
  - [ ] CSRF protection (state parameter) verified

---

## 5. Implementation Priority

### Phase 1 (MVP - This Sprint)
1. ✅ Backend: `/api/auth/create-fortized-account` endpoint
2. ✅ Frontend: Signup Step 2 form (display_name, DOB, aboutMe)
3. ✅ Backend: `/api/auth/cloud-callback` endpoint (update for auth codes)
4. ✅ Database: Verify schema is correct
5. ✅ Testing: E2E signup + login flow with test credentials
6. ✅ Deployment: Get environment variables configured

### Phase 2 (Later)
1. Account switcher UI (multiple Fortized accounts per Cloud user)
2. Account disconnection
3. Cloud account linking for existing Fortized users
4. Advanced security (JWT validation, token refresh)

---

## 6. Open Issues & Clarifications

**Resolved:**
- ✅ Display name comes from Step 2
- ✅ Fortized creates subaccount
- ✅ Product ID tracked by Cloud
- ✅ Use auth codes, not JWT
- ✅ Skip subaccount switching for MVP
- ✅ Error formats provided

**Still to confirm:**
- When should Fortized call Cloud's API to register in `product_links`? (After creating account? During?)
- Should Fortized store `code` anywhere for audit purposes?
- How long are authorization codes valid from Cloud? (Cloud said "10 minutes" — is that correct?)

---

## 7. Next Steps

1. **This Week:**
   - [ ] Implement backend endpoints
   - [ ] Update frontend signup flow
   - [ ] Run unit tests

2. **Next Week:**
   - [ ] Integration testing with Cloud team
   - [ ] E2E testing with test credentials
   - [ ] Fix any integration issues

3. **By End of Sprint:**
   - [ ] Deploy to staging
   - [ ] Run full QA cycle
   - [ ] Get Cloud team sign-off
   - [ ] Deploy to production

---

**Status:** ✅ All questions answered, ready to implement  
**Branch:** `claude/migrate-auth-swiftaw-xgYQr`  
**Test Account:** `staw` / `Elstart125` / `theelicoter@gmail.com`  
**Last Updated:** April 4, 2026

---

## Quick Reference: What's Different From Original Plan

| Item | Original | Cloud's Answer |
|------|----------|-----------------|
| Account Creation | Cloud creates | Fortized creates ✅ |
| Display Name | From Cloud | From Fortized Step 2 ✅ |
| Token Type | JWT token from Cloud | Auth code from Cloud ✅ |
| Schema | Simple subaccounts table | Your cloud_account_links table ✅ |
| Product ID | In Fortized table | In Cloud's product_links ✅ |
| Subaccount Switching | MVP feature | Phase 2 feature ✅ |

**Everything else is correct as designed!** ✅
