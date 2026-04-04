# Fortized × Cloud Auth - Sprint Implementation Plan

**Sprint Goal:** Implement Cloud authentication backend and update frontend signup flow  
**Duration:** 1 Sprint (Week of April 7-11, 2026)  
**Team:** Fortized Developers  
**Status:** Ready to Start  
**Test Credentials:** staw / Elstart125  

---

## Sprint Overview

### What We're Building
- Updated Cloud auth flow (3-step signup/login)
- Backend endpoints for account creation and linking
- Frontend profile form with age validation
- Cloud account callback handler

### Key Changes from Original Design
- **Fortized** creates the subaccount (Cloud just authenticates)
- Display name comes from **Fortized Step 2** (not Cloud)
- Use **authorization codes** (not JWT validation)
- **Phase 2 only:** Subaccount switching UI

### Success Criteria
- ✅ Signup flow: Cloud → Fortized profile → Account created
- ✅ Login flow: Cloud → Auto-redirect to `/app`
- ✅ Age validation: 13-150 years old
- ✅ Error handling: All Cloud errors handled properly
- ✅ E2E tests: Signup + Login with test account working
- ✅ Database: Schema verified, indexes created

---

## Task Breakdown by Component

### Component 1: Backend Endpoints

**Task 1.1: Create `/api/auth/create-fortized-account`** (HIGH PRIORITY)
```
Description: Create new Fortized account from Cloud user + profile data
Difficulty: Medium
Time: 2-3 hours
Dependencies: Database schema in place

What it does:
  - Accept: cloudUserId, cloudUsername, cloudEmail, displayName, dateOfBirth, aboutMe
  - Validate: Age (13-150), required fields, no duplicates
  - Create: User in users table
  - Link: Entry in cloud_account_links table
  - Generate: session_token (JWT, 24h expiry)
  - Return: { status, session_token, subaccount_id }

File: server.js or routes/auth.js
Tests: See testing section

Example call:
POST /api/auth/create-fortized-account
{
  "cloudUserId": "uuid-123",
  "cloudUsername": "staw",
  "cloudEmail": "staw@example.com",
  "displayName": "staw",
  "dateOfBirth": "2000-01-15",
  "aboutMe": "Hi! I am staw, welcome to my profile!"
}
```

**Task 1.2: Update `/api/auth/cloud-callback`** (HIGH PRIORITY)
```
Description: Handle OAuth callback from Cloud, create/fetch Fortized session
Difficulty: Medium
Time: 2-3 hours
Dependencies: cloud_account_links schema

What it does:
  - Accept: code, state, cloud_user_id, cloud_username
  - Validate: state parameter (CSRF check)
  - Check: Is Cloud user already linked to Fortized?
  - If new: Ask for Step 2 (display_name, DOB, aboutMe)
  - If existing: Generate session_token immediately
  - Return: session_token or redirect to profile form

File: server.js or routes/auth.js
Tests: See testing section

Example call:
POST /api/auth/cloud-callback
{
  "code": "auth_code_123",
  "state": "csrf_state_abc",
  "cloud_user_id": "uuid-456",
  "cloud_username": "staw"
}
```

**Task 1.3: Add Rate Limiting** (MEDIUM PRIORITY)
```
Description: Prevent brute force attacks on auth endpoints
Difficulty: Easy
Time: 30 minutes
Dependencies: None

Implementation:
  - Rate limit: 100 requests/minute per IP
  - Return: 429 Too Many Requests when exceeded
  - Apply to: /api/auth/cloud-callback, /api/auth/create-fortized-account

Library: express-rate-limit or similar
```

**Task 1.4: Error Handling & Logging** (MEDIUM PRIORITY)
```
Description: Return proper error messages matching Cloud's format
Difficulty: Easy
Time: 1 hour
Dependencies: All endpoints

Errors to handle:
  - missing_parameters: 400
  - csrf_validation_failed: 400
  - age_validation_failed: 400
  - account_exists: 409
  - internal_server_error: 500

File: utils/error-handler.js or middleware
```

---

### Component 2: Frontend - Signup Form

**Task 2.1: Implement Step 2 Form** (HIGH PRIORITY)
```
Description: Profile form with display_name, DOB, aboutMe
Difficulty: Easy
Time: 1 hour
File: /signup/index.html

Fields:
  ✓ Display Name (text input, auto-filled from cloudUsername, editable)
  ✓ Date of Birth (date input, validate 13-150 years)
  ✓ About Me (textarea, auto-filled with template, optional)
  ✓ Create Account button

Code location:
  - Lines 126-149: Form HTML
  - Lines 220-237: Auto-fill logic
  - Lines 240-300: Form submission & validation
```

**Task 2.2: Age Validation Logic** (MEDIUM PRIORITY)
```
Description: Validate that user is 13-150 years old
Difficulty: Easy
Time: 30 minutes

Logic:
  1. Calculate age from date_of_birth
  2. Check: 13 ≤ age ≤ 150
  3. Check: birth_year ≥ 1870
  4. Show error if invalid
  5. Block form submission if invalid

Tests:
  - Age 12 (should fail)
  - Age 13 (should pass)
  - Age 100 (should pass)
  - Age 150 (should pass)
  - Age 151 (should fail)
  - Birth year 1869 (should fail)
```

**Task 2.3: Cloud Logo Styling** (LOW PRIORITY)
```
Description: Add #ffa43b stroke around Cloud logo
Difficulty: Easy
Time: 15 minutes
File: /signup/index.html and /login/index.html

CSS:
.cloud-logo {
  filter: drop-shadow(0 0 0 1.5px #ffa43b);
  height: 16px;
  width: auto;
}
```

**Task 2.4: Error Message Display** (MEDIUM PRIORITY)
```
Description: Show user-friendly error messages in signup form
Difficulty: Easy
Time: 30 minutes

Messages to implement:
  - "Age must be 13 or older" (if age < 13)
  - "Please enter a valid date" (if date invalid)
  - "This Cloud account already linked" (if 409 error)
  - "An error occurred. Please try again." (generic)
```

---

### Component 3: Cloud Callback Handler

**Task 3.1: Update `/auth/cloud-callback.html`** (HIGH PRIORITY)
```
Description: Handle OAuth redirect from Cloud, route to signup or login
Difficulty: Medium
Time: 1 hour
File: /auth/cloud-callback.html

Steps:
  1. Parse URL params: code, state, cloud_user_id, cloud_username
  2. Validate state (CSRF)
  3. Detect flow type (signup vs login)
  4. If signup: postMessage to parent window with cloud data
  5. If login: POST to /api/auth/cloud-callback for session token
  6. Handle errors from Cloud

Tests:
  - Test with valid params
  - Test with missing params
  - Test with invalid state
  - Test postMessage to parent
```

---

### Component 4: Database

**Task 4.1: Verify Schema** (HIGH PRIORITY)
```
Description: Ensure database tables match requirements
Difficulty: Easy
Time: 30 minutes

Check:
  ✓ users table has: cloud_user_id, display_name, date_of_birth, about_me, is_linked_to_cloud, last_login
  ✓ cloud_account_links table exists with all columns
  ✓ Indexes created for performance

Run migrations:
  - 001_cloud_integration_schema.sql
  - 002_remove_auth_columns.sql (if needed)
```

**Task 4.2: Add Indexes** (MEDIUM PRIORITY)
```
Description: Add database indexes for query performance
Difficulty: Easy
Time: 15 minutes

Indexes to create:
  CREATE INDEX idx_users_cloud_user_id ON users(cloud_user_id);
  CREATE INDEX idx_cloud_links_cloud_user ON cloud_account_links(cloud_user_id);
  CREATE INDEX idx_cloud_links_subaccount ON cloud_account_links(subaccount_id);
```

---

### Component 5: Testing

**Task 5.1: Unit Tests** (MEDIUM PRIORITY)
```
Description: Test individual functions
Difficulty: Medium
Time: 2 hours
Files: tests/auth.test.js

Test cases:
  ✓ Age validation (12, 13, 100, 150, 151 years)
  ✓ State parameter validation
  ✓ Date parsing
  ✓ Error responses (all types)
  ✓ Age edge cases (leap years, year boundaries)

Tools: Jest, Mocha, or Vitest
```

**Task 5.2: Integration Tests** (MEDIUM PRIORITY)
```
Description: Test API endpoints
Difficulty: Medium
Time: 2 hours
Files: tests/integration/auth.test.js

Test cases:
  ✓ Create account (valid data)
  ✓ Create account (missing fields)
  ✓ Create account (age too young)
  ✓ Create account (duplicate)
  ✓ Cloud callback (valid)
  ✓ Cloud callback (invalid state)

Tools: Supertest, axios
```

**Task 5.3: E2E Tests** (HIGH PRIORITY)
```
Description: Test full signup/login flows
Difficulty: Hard
Time: 3-4 hours
Tools: Cypress, Playwright, or Selenium

Scenarios:
  1. New signup:
     - Click "Connect Cloud"
     - Auth with test account (staw / Elstart125)
     - Fill profile (display_name, DOB, about_me)
     - Click "Create Account"
     - Verify redirected to /app
     - Check user in database

  2. Login:
     - Click "Sign in with Cloud"
     - Auth with same test account
     - Verify redirected to /app

  3. Error cases:
     - Try signup with age < 13
     - Try signup with same Cloud user (duplicate)
     - Missing parameters in callback

Test account: staw / Elstart125 / theelicoter@gmail.com
```

**Task 5.4: Manual Testing Checklist** (MEDIUM PRIORITY)
```
Description: Manual QA before deployment
Difficulty: Easy
Time: 1 hour

Checklist:
  ✓ Sign up with test Cloud account
  ✓ Verify display_name auto-filled
  ✓ Edit display_name
  ✓ Change about_me
  ✓ Submit form and create account
  ✓ Check user in database
  ✓ Log out
  ✓ Log back in with Cloud
  ✓ Verify session token works
  ✓ Access /app without error
  ✓ Try age < 13 (should fail)
  ✓ Try duplicate Cloud account (should fail)
  ✓ Check error messages display correctly
```

---

## Sprint Schedule

### Day 1 (Monday)
- [ ] Task 1.1: Create `/api/auth/create-fortized-account` (2-3 hrs)
- [ ] Task 4.1: Verify database schema (30 min)
- [ ] Task 1.2: Update `/api/auth/cloud-callback` (2-3 hrs)

### Day 2 (Tuesday)
- [ ] Task 2.1: Implement Step 2 form (1 hr)
- [ ] Task 2.2: Age validation logic (30 min)
- [ ] Task 3.1: Update cloud-callback.html (1 hr)
- [ ] Task 1.3: Add rate limiting (30 min)
- [ ] Task 1.4: Error handling (1 hr)

### Day 3 (Wednesday)
- [ ] Task 5.1: Unit tests (2 hrs)
- [ ] Task 5.2: Integration tests (2 hrs)
- [ ] Task 2.3: Cloud logo styling (15 min)
- [ ] Task 2.4: Error messages (30 min)

### Day 4 (Thursday)
- [ ] Task 5.3: E2E tests (3-4 hrs)
- [ ] Task 4.2: Add indexes (15 min)
- [ ] Bug fixes from testing

### Day 5 (Friday)
- [ ] Task 5.4: Manual testing (1 hr)
- [ ] Final bug fixes
- [ ] Code review
- [ ] Deployment preparation

---

## Test Credentials

**Use this account for all testing:**

```
Cloud Account:
  Username: staw
  Password: Elstart125
  Email: theelicoter@gmail.com

Notes:
  - Pre-verified account
  - No email confirmation needed
  - Test multiple times (signup, login, logout, re-login)
  - Account persists across test sessions
```

---

## Acceptance Criteria

### For Each Task

1. **Code Quality**
   - ✅ All code follows project style guide
   - ✅ No console errors or warnings
   - ✅ Proper error handling
   - ✅ Comments on complex logic

2. **Testing**
   - ✅ Unit tests passing (100% critical path)
   - ✅ Integration tests passing
   - ✅ E2E tests passing
   - ✅ Manual testing checklist complete

3. **Documentation**
   - ✅ Inline code comments
   - ✅ API endpoint documentation
   - ✅ Error codes documented

### For Sprint

- ✅ All HIGH PRIORITY tasks completed
- ✅ All tests passing
- ✅ E2E signup and login working
- ✅ Cloud team sign-off ready
- ✅ Ready to deploy to staging

---

## Risk Mitigation

### Potential Issues

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Age validation edge cases | High | Test thoroughly, include leap years |
| State parameter validation | High | Unit test CSRF logic extensively |
| Database schema mismatch | High | Verify schema before starting |
| Integration with Cloud | Medium | Use test credentials, coordinate with Cloud team |
| Error message misalignment | Low | Follow Cloud's error format exactly |

### Contingency

- If Cloud API unavailable: Use mock responses in tests
- If database schema missing: Create migration scripts
- If age validation complex: Start with basic validation, iterate

---

## Success Metrics

**By end of sprint:**
- [ ] All backend endpoints tested and working
- [ ] Signup flow: Cloud → Profile → Account created (100% success rate with test account)
- [ ] Login flow: Cloud → App redirect (100% success rate)
- [ ] Error handling: All error cases handled gracefully
- [ ] E2E tests: All passing
- [ ] Manual QA: All scenarios passing

---

## Git Branch & Deployment

**Feature Branch:** `claude/migrate-auth-swiftaw-xgYQr`

**Deployment checklist:**
- [ ] All tests passing
- [ ] Code review approved
- [ ] Cloud team verified integration
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Rate limiting configured
- [ ] Error logging set up

---

## Post-Sprint

**Phase 2 (Next Sprint):**
- Subaccount switching UI
- Account disconnection
- Link existing accounts to Cloud
- Advanced security features

---

## Questions & Escalations

**If you encounter:**
- Cloud API issues → Contact Cloud team liaison
- Database schema issues → Check migrations in /migrations/
- Ambiguous requirements → Reference CLOUD_TEAM_ANSWERS_IMPLEMENTATION_GUIDE.md
- Integration questions → Reference CLOUD_INTEGRATION_TECHNICAL_DETAILS.md

**Sprint Master/Lead:** [Your name]  
**Cloud Team Lead:** [Contact]  
**DevOps Lead:** [Contact]  

---

**Sprint Start Date:** April 7, 2026  
**Sprint End Date:** April 11, 2026  
**Status:** 🟢 Ready to Kickoff  

**Good luck team! 🚀**
