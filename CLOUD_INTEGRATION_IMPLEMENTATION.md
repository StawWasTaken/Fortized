# Fortized × Swiftaw Cloud Integration - Implementation Guide

**Status:** ✅ Week 1 Backend API - In Progress  
**Date:** April 4, 2026  
**Version:** 1.0

---

## 📋 Project Overview

This document tracks the implementation of Swiftaw Cloud authentication integration into Fortized. Users will authenticate through Cloud (email + password), then select or create Fortized subaccounts.

### Data Architecture
- **Cloud Database:** Stores `email` + `password` for authentication
- **Fortized Database:** Stores `username` as the linking identifier
- **Link Table:** `cloud_account_links` matches Cloud users to Fortized subaccounts

**Example:**
```
Cloud DB: alice@example.com (password in Cloud)
          ↓
          cloud_user_id: 550e8400-...
          ↓
Fortized: username: alice_pro (in users table)
          cloud_user_id: 550e8400-... (links to Cloud)
          ↓
System identifies it's the same person via cloud_user_id
```

---

## ✅ COMPLETED: Week 1 Backend Setup

### Database Schema
- ✅ Created migration file: `migrations/001_cloud_integration_schema.sql`
- ✅ Creates 2 new tables:
  - `cloud_account_links` - Tracks Fortized accounts linked to Cloud users
  - `cloud_linking_tokens` - One-time tokens for account linking
- ✅ Adds 3 columns to `users` table:
  - `cloud_user_id` (UUID, unique) - Links to Cloud user
  - `is_linked_to_cloud` (boolean) - Linking status
  - `last_login` (timestamp) - Last login time
- ✅ Creates indexes for optimal query performance

- ✅ Created migration file: `migrations/002_remove_auth_columns.sql`
- ✅ Removes columns from `users` table (moved to Cloud):
  - `password` - ❌ REMOVED (now in Cloud database)
  - `email` - ❌ REMOVED (now in Cloud database)
- ✅ Keeps `username` - ✅ KEPT (linking identifier)

**How to apply:**
```bash
# Using Supabase CLI
supabase db push

# Or manually copy each SQL file and run in Supabase dashboard
# Apply in order: 001_cloud_integration_schema.sql → 002_remove_auth_columns.sql
```

### Cloud Authentication Module
- ✅ Created: `cloud-auth.js`
- ✅ Exports:
  - `getCloudPublicKey()` - Fetch & cache Cloud's JWT public key
  - `validateCloudToken()` - Verify Cloud JWT tokens
  - `generateFortizedToken()` - Create Fortized JWT tokens
  - `generateLinkingToken()` - Create one-time linking codes
  - `verifyCloudTokenMiddleware()` - Express middleware
  - `rateLimitMiddleware()` - Rate limiting (100 req/min per IP, 1000 per user)

**Usage:**
```javascript
const { validateCloudToken, generateFortizedToken } = require('./cloud-auth');

const validation = await validateCloudToken(cloudToken);
if (validation.valid) {
  const fortizedToken = generateFortizedToken(userData);
}
```

### Cloud Endpoints Module
- ✅ Created: `cloud-endpoints.js`
- ✅ Implements 7 endpoints:
  1. `POST /api/auth/cloud-callback` - OAuth return handler
  2. `POST /api/accounts/link-to-cloud` - Create new account
  3. `GET /api/accounts/{cloud_user_id}` - List linked accounts
  4. `POST /api/auth/switch-subaccount` - Switch accounts
  5. `DELETE /api/accounts/{cloud_user_id}/{subaccount_id}` - Unlink account
  6. `GET /api/auth/verify-cloud-token` - Validate token
  7. `GET /api/auth/public-key` - Get Fortized public key

### Server Integration
- ✅ Updated: `server.js`
- ✅ Imported Cloud modules
- ✅ Registered all 7 endpoints
- ✅ Applied rate limiting middleware
- ✅ Added startup logging

### Dependencies
- ✅ Updated: `package.json`
- ✅ Added: `jsonwebtoken` (^9.1.0) for JWT handling

### Configuration
- ✅ Created: `.env.example` with all required env vars

---

## 📝 Configuration Required

Before running, set these environment variables in `.env`:

```env
# Cloud Integration
CLOUD_API_URL=https://cloud.swiftaw.io
CLOUD_SUPABASE_URL=https://eujglvqqhrkyhyuqagse.supabase.co
CLOUD_SUPABASE_ANON=your_cloud_anon_key_here

# Fortized JWT
FORTIZED_JWT_SECRET=your_secret_key_here
FORTIZED_JWT_PUBLIC_KEY=your_public_key_here

# URLs
FORTIZED_URL=https://fortized.com
```

---

## 🧪 Testing the Backend Endpoints

### 1. Test Cloud Callback (OAuth Return)

```bash
curl -X POST http://localhost:3000/api/auth/cloud-callback \
  -H "Content-Type: application/json" \
  -d '{
    "cloud_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "cloud_user_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response (New User):**
```json
{
  "action": "create_or_link",
  "cloud_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "message": "No Fortized accounts found..."
}
```

### 2. Test Link to Cloud (Create New Account)

```bash
curl -X POST http://localhost:3000/api/accounts/link-to-cloud \
  -H "Content-Type: application/json" \
  -d '{
    "cloud_user_id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "gaming_pro",
    "email": "user@example.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "subaccount_id": "sub_1712225400000_abc123",
  "username": "gaming_pro",
  "email": "user@example.com",
  "created_at": "2026-04-04T12:00:00Z",
  "linked_to_cloud": true
}
```

### 3. Test Get Accounts

```bash
curl http://localhost:3000/api/accounts/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer {cloud_jwt_token}"
```

**Response:**
```json
{
  "success": true,
  "cloud_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "accounts": [
    {
      "subaccount_id": "sub_abc123",
      "username": "gaming_pro",
      "email": "user@example.com",
      "created_at": "2026-04-04T12:00:00Z",
      "last_login": "2026-04-04T15:30:00Z",
      "role": "player"
    }
  ]
}
```

### 4. Test Switch Subaccount

```bash
curl -X POST http://localhost:3000/api/auth/switch-subaccount \
  -H "Content-Type: application/json" \
  -d '{
    "cloud_user_id": "550e8400-e29b-41d4-a716-446655440000",
    "subaccount_id": "sub_abc123"
  }'
```

**Response:**
```json
{
  "success": true,
  "fortized_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "subaccount_id": "sub_abc123",
  "username": "gaming_pro",
  "email": "user@example.com",
  "expires_in": 86400
}
```

### 5. Test Verify Cloud Token

```bash
curl "http://localhost:3000/api/auth/verify-cloud-token?token={jwt_token}"
```

**Response:**
```json
{
  "valid": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "iat": 1712225400,
  "exp": 1712311800
}
```

---

## 📦 File Structure

```
Fortized/
├── server.js                           (✅ Updated with Cloud endpoints)
├── cloud-auth.js                       (✅ New - Auth utilities)
├── cloud-endpoints.js                  (✅ New - API endpoint handlers)
├── package.json                        (✅ Updated with jsonwebtoken)
├── .env.example                        (✅ New - Config template)
├── migrations/
│   └── 001_cloud_integration_schema.sql (✅ New - Database schema)
└── CLOUD_INTEGRATION_IMPLEMENTATION.md (✅ New - This file)
```

---

## 🔄 Next Steps: Week 2-3

### Week 2: Frontend Integration
1. **Update Login Page**
   - Add "Sign in with Swiftaw Cloud" button
   - Create callback handler at `/auth/cloud-callback`
   - Implement account picker modal

2. **Create Account Selection UI**
   - Show list of linked Fortized accounts
   - Allow account switching
   - Add disconnect option

3. **Frontend Files to Create**
   - `login/index.html` - Updated login page
   - `auth/cloud-callback.html` - OAuth callback handler
   - `dashboard/account-picker.js` - Account selection UI
   - `assets/cloud-login.css` - Styling

### Week 3: Testing & Deployment
1. **End-to-End Testing**
   - Test full signup → login → play flow
   - Test account switching
   - Test disconnect/unlink

2. **Security Testing**
   - JWT validation
   - Rate limiting
   - Token expiration
   - XSS/CSRF prevention

3. **Deployment**
   - Test in staging
   - Coordinate with Cloud team
   - Deploy to production

---

## 🔐 Security Checklist

- ✅ JWT validation using Cloud's public key
- ✅ Rate limiting (100 req/min per IP)
- ✅ HTTPS enforcement (in production)
- ✅ Bearer token in Authorization header
- ✅ Secure session handling
- ✅ Input validation
- ✅ Error handling (no sensitive data in responses)
- ⏳ CORS configuration (needs refinement)
- ⏳ CSRF protection (with state parameter)
- ⏳ Audit logging

---

## 📊 Key Metrics

After integration:
- **Auth Success Rate:** Target >99%
- **Login Time:** Target <500ms
- **Account Switching:** Target <200ms
- **Rate Limit Hits:** <0.1% (should be minimal)

---

## 🆘 Troubleshooting

### Error: "Invalid token"
- **Cause:** JWT validation failed
- **Solution:** Verify Cloud's public key is cached, check token format

### Error: "Username exists"
- **Cause:** Username already used in Fortized
- **Solution:** Suggest alternative username to user

### Error: "Account not found"
- **Cause:** Subaccount not linked to Cloud user
- **Solution:** Check cloud_account_links table in Supabase

### Slow login
- **Cause:** Fetching Cloud public key on every request
- **Solution:** Public key is cached for 5 minutes, should be fast

---

## 📞 Communication

**Cloud Team Contact:** Through the user liaison  
**Questions?** Check the main Cloud integration guide

---

## ✨ Implementation Notes

### Design Decisions

1. **Separate modules:** `cloud-auth.js` and `cloud-endpoints.js` for maintainability
2. **Supabase integration:** Using existing Supabase instance for user data
3. **JWT caching:** Cloud public key cached 5 minutes for performance
4. **Rate limiting:** In-memory simple implementation (can upgrade to Redis)
5. **Audit trail:** Marking accounts as inactive rather than deleting

### Future Enhancements

- [ ] Redis for distributed rate limiting
- [ ] Audit logging to database
- [ ] 2FA support for Cloud accounts
- [ ] Account recovery/backup codes
- [ ] Device management in Cloud
- [ ] Activity logs

---

**Next Update:** Week 2 Frontend Implementation  
**Last Modified:** April 4, 2026

