# Fortized Response to Cloud Team Questions

**Date:** April 4, 2026  
**To:** Swiftaw Cloud Team  
**From:** Fortized Team  
**Re:** Integration Questions & Code Review  

---

## Overview

Thank you for the detailed response! We're aligned on the display_name issue. Below are the exact code snippets and schema details you requested, plus our answers to your two critical questions.

---

## 1. Display Name Issue ✅ AGREED

You're correct — display_name should come from **Fortized Step 2**, not Cloud. 

Our implementation already does this:
- Cloud provides: `cloud_user_id`, `cloud_username`
- Fortized Step 2 collects: `display_name` (auto-filled with `cloud_username` but user can edit)

No changes needed on either side.

---

## 2. Two Critical Questions

### Question 1: Who Creates the Fortized Subaccount?

**Cloud Team's Option A:** Cloud creates the subaccount during auth redirect  
**Cloud Team's Option B:** Fortized creates it after receiving the code  
**Cloud Team's Option C:** Fortized creates it in Step 2 when user submits the form

**OUR RECOMMENDATION:** Option C (Fortized creates in Step 2)

**Why:**
- Fortized needs to collect `display_name`, `date_of_birth`, `about_me` before creating the account
- At Step 2 submission, Fortized has ALL required data
- Cloud doesn't need to know about subaccount creation (Fortized-internal concern)
- Cleaner separation: Cloud handles auth, Fortized handles account creation

**Proposed Flow:**
```
1. User clicks "Connect Cloud Account" (Step 1)
2. Cloud auth happens → Returns: code, state, cloud_user_id, cloud_username
3. User fills profile in Step 2 (display_name, DOB, about_me)
4. User clicks "Create Account"
5. Fortized POSTs all data to /api/auth/create-fortized-account
6. Fortized creates subaccount in database
7. Returns session token → User logged in
```

**If you prefer Option A or B, let us know and we'll adjust.**

---

### Question 2: Subaccounts Table Schema

**What you asked for:**
```sql
id, cloud_user_id, product_id, username, display_name, created_at, is_active
```

**What we currently have:**
```sql
cloud_account_links table:
  id, cloud_user_id, fortized_user_id, subaccount_id, username, email, linked_at, linked_by, is_active, created_at
```

**Schema Difference Analysis:**

| Field | Your Schema | Our Schema | Difference |
|-------|-------------|-----------|------------|
| `id` | ✅ | ✅ `id` | Same |
| `cloud_user_id` | ✅ | ✅ `cloud_user_id` | Same |
| `product_id` | ✅ | ❌ (not present) | You have it, we use fixed "fortized" |
| `username` | ✅ | ✅ `username` | Same |
| `display_name` | ✅ | ❌ (in users table) | We separate: display_name → users table |
| `created_at` | ✅ | ✅ `created_at` | Same |
| `is_active` | ✅ | ✅ `is_active` | Same |

**Our Current Structure (Better for Multi-Product):**
```
Users Table:
  - id (primary key)
  - username (unique)
  - display_name
  - date_of_birth
  - about_me
  - cloud_user_id (links to Cloud)
  - is_linked_to_cloud (boolean)
  - last_login (timestamp)

Cloud Account Links Table (Maps Cloud → Fortized):
  - id
  - cloud_user_id (from Cloud)
  - fortized_user_id (references users.id)
  - subaccount_id (unique Fortized subaccount identifier)
  - username
  - email
  - linked_at
  - linked_by ('cloud', 'manual', 'auto')
  - is_active
  - created_at
```

**Our Recommendation:**
Keep our structure because:
1. **Extensibility:** `display_name` in users table allows per-product customization later
2. **Normalization:** Separate concerns (auth users vs. product accounts)
3. **Multi-tenant:** Same Cloud user can have different display_names per Fortized account
4. **Audit:** `linked_by` tracks how account was created/linked

**If you need product_id in cloud_account_links, we can add it as:**
```sql
ALTER TABLE cloud_account_links ADD COLUMN product_id VARCHAR(50) DEFAULT 'fortized';
```

---

## 3. Code You Requested

### A) Step 2 Form Code (with display_name field)

**File:** `/signup/index.html` (lines 126-149)

```html
<!-- Step 2: Profile Details -->
<div class="form-section" id="step2">
  <div class="field">
    <label class="field-label">Display Name</label>
    <input 
      type="text" 
      id="displayName" 
      class="field-input" 
      placeholder="How others will see you"
    >
    <div class="field-hint">Auto-filled with your Cloud username, but you can change it.</div>
  </div>

  <div class="field">
    <label class="field-label">Date of Birth</label>
    <input 
      type="date" 
      id="dateOfBirth" 
      class="field-input"
    >
    <div class="field-hint">Required to comply with age restrictions</div>
  </div>

  <div class="field">
    <label class="field-label">About Me</label>
    <textarea 
      id="aboutMe" 
      class="field-input" 
      style="min-height:70px;resize:vertical;font-family:var(--font-body);" 
      placeholder="Tell us about yourself..."
    ></textarea>
    <div class="field-hint">Share what makes you unique (optional)</div>
  </div>

  <button class="btn-primary" id="createBtn" onclick="createAccount()">
    <span>Create Fortized Account</span>
  </button>
</div>
```

**Key Points:**
- `displayName` is auto-filled from `cloudData.username` (line 235 of signup.js)
- User can edit it before submission
- No email field (already handled by Cloud)
- Age validation happens in createAccount() function

### B) Backend Endpoint Code: `/api/auth/create-fortized-account`

**File:** `/api/auth/create-fortized-account` (or add to `cloud-endpoints.js`)

```javascript
// POST /api/auth/create-fortized-account
// Purpose: Create new Fortized account with Cloud user data + profile details
// This is called AFTER user completes Step 2 signup form

async function handleCreateFortizedAccount(req, res, db) {
  try {
    const {
      cloudUsername,
      cloudEmail,
      cloudUserId,      // NEW: from Cloud auth
      displayName,      // FROM Step 2 form
      dateOfBirth,      // FROM Step 2 form
      aboutMe           // FROM Step 2 form
    } = req.body;

    // ─────────────────────────────────────────────────────────────
    // 1. VALIDATION
    // ─────────────────────────────────────────────────────────────

    if (!cloudUserId || !cloudUsername || !displayName || !dateOfBirth) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
        required: ['cloudUserId', 'cloudUsername', 'displayName', 'dateOfBirth']
      });
    }

    // Validate age (13-150 years old, birth year 1870+)
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 13 || age > 150 || dob.getFullYear() < 1870) {
      return res.status(400).json({
        status: 'error',
        message: 'Age validation failed',
        details: 'Must be 13-150 years old with birth year 1870 or later'
      });
    }

    // Check if Cloud user already has a Fortized account
    const { data: existingLink, error: queryError } = await db
      .from('cloud_account_links')
      .select('id, fortized_user_id')
      .eq('cloud_user_id', cloudUserId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (existingLink) {
      return res.status(409).json({
        status: 'error',
        message: 'This Cloud account already has a Fortized account',
        action: 'login',
        suggestion: 'Use "Sign in with Swiftaw Cloud" instead'
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. CREATE FORTIZED USER ACCOUNT
    // ─────────────────────────────────────────────────────────────

    const newUserId = generateUUID();
    const subaccountId = generateSubaccountId(); // e.g., "sub_123abc..."

    const { data: newUser, error: createUserError } = await db
      .from('users')
      .insert({
        id: newUserId,
        cloud_user_id: cloudUserId,
        username: cloudUsername,  // From Cloud
        display_name: displayName, // FROM STEP 2 (user can modify)
        date_of_birth: dateOfBirth, // FROM STEP 2
        about_me: aboutMe || '', // FROM STEP 2 (optional)
        is_linked_to_cloud: true,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      })
      .select()
      .single();

    if (createUserError) {
      console.error('[Create Account] User creation error:', createUserError);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create user account',
        error: createUserError.message
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CREATE ACCOUNT LINK IN cloud_account_links
    // ─────────────────────────────────────────────────────────────

    const { data: linkData, error: linkError } = await db
      .from('cloud_account_links')
      .insert({
        cloud_user_id: cloudUserId,
        fortized_user_id: newUserId,
        subaccount_id: subaccountId,
        username: cloudUsername,
        email: cloudEmail || null,
        linked_by: 'cloud',  // Created during Cloud signup
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (linkError) {
      console.error('[Create Account] Link creation error:', linkError);
      // Rollback user creation
      await db.from('users').delete().eq('id', newUserId);
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to link Cloud account',
        error: linkError.message
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. GENERATE SESSION TOKEN & RETURN
    // ─────────────────────────────────────────────────────────────

    const sessionToken = generateFortizedToken(newUser);

    return res.status(201).json({
      status: 'success',
      message: 'Fortized account created successfully',
      fortized_user_id: newUserId,
      cloud_user_id: cloudUserId,
      subaccount_id: subaccountId,
      username: cloudUsername,
      display_name: displayName,
      session_token: sessionToken,
      expires_in: 86400 // 24 hours
    });

  } catch (error) {
    console.error('[Create Account] Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating your account',
      error: error.message
    });
  }
}

// Helper functions
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
        v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateSubaccountId() {
  return `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function generateFortizedToken(user) {
  // JWT token generation (use your token library)
  return JWT.sign({
    sub: user.id,
    cloud_user_id: user.cloud_user_id,
    username: user.username,
    display_name: user.display_name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  }, process.env.FORTIZED_TOKEN_SECRET);
}
```

### C) Database Schema

**Current Users Table:**
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  cloud_user_id UUID UNIQUE REFERENCES cloud_users(id),
  username VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  date_of_birth DATE,
  about_me TEXT,
  is_linked_to_cloud BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Current Cloud Account Links Table:**
```sql
CREATE TABLE cloud_account_links (
  id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  cloud_user_id UUID NOT NULL,
  fortized_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subaccount_id UUID NOT NULL UNIQUE,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  linked_by VARCHAR(50) DEFAULT 'cloud',  -- 'cloud', 'manual', 'auto'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure uniqueness
  UNIQUE(cloud_user_id, subaccount_id),
  UNIQUE(subaccount_id)
);
```

**To add product_id (if needed):**
```sql
ALTER TABLE cloud_account_links 
ADD COLUMN product_id VARCHAR(50) DEFAULT 'fortized';

CREATE INDEX idx_product_cloud_user 
ON cloud_account_links(product_id, cloud_user_id);
```

---

## 4. Signup Flow End-to-End (Updated)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Connect Cloud Account (in NEW TAB)                  │
├─────────────────────────────────────────────────────────────┤
│ 1. User clicks "Connect Swiftaw Cloud Account"              │
│ 2. Fortized opens: https://swiftaw.com/cloud/auth/link?... │
│ 3. Cloud: User logs in (or uses existing session)           │
│ 4. Cloud redirects to: /auth/cloud-callback?code=X&state... │
│ 5. Callback handler sends postMessage back to signup window │
│ 6. Popup closes                                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Fill Fortized Profile (in ORIGINAL WINDOW)          │
├─────────────────────────────────────────────────────────────┤
│ 1. Signup form shows Step 2                                 │
│ 2. Display Name: auto-filled with cloudUsername (editable)  │
│ 3. Date of Birth: user enters (validated: 13-150 years)    │
│ 4. About Me: auto-filled template (editable)               │
│ 5. User clicks "Create Fortized Account"                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Backend Creates Account & Links to Cloud            │
├─────────────────────────────────────────────────────────────┤
│ POST /api/auth/create-fortized-account                      │
│ {                                                            │
│   cloudUserId: "uuid-from-cloud",                           │
│   cloudUsername: "from-cloud",                              │
│   displayName: "user-edited-value",                         │
│   dateOfBirth: "2000-01-15",                                │
│   aboutMe: "optional text"                                  │
│ }                                                            │
│                                                              │
│ Fortized Backend:                                            │
│ 1. Validate age                                              │
│ 2. Create user in users table                               │
│ 3. Create link in cloud_account_links                       │
│ 4. Generate session token                                   │
│ 5. Return session_token                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Success: User logged in and redirected to /app              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Integration Points to Verify

**Cloud Team needs to provide/verify:**
- [ ] OAuth URL format and parameters (we have this correct)
- [ ] Callback includes all 4 params: `code`, `state`, `cloud_user_id`, `cloud_username`
- [ ] Cloud logo URL works: `https://swiftaw.com/Cloud%20logo.png`
- [ ] Error responses from Cloud auth (invalid creds, etc.)
- [ ] Rate limiting on Cloud's end (we implement on Fortized's end)

**Fortized needs to implement/test:**
- [ ] POST endpoint `/api/auth/create-fortized-account`
- [ ] Database schema with product_id if needed
- [ ] Age validation in backend
- [ ] Session token generation & validation
- [ ] Error handling for duplicate accounts
- [ ] Callback handler integration

---

## 6. Questions for Cloud Team

1. **Account Creation Timing:** Do you prefer we create the account in Step 2 (after Fortized collects profile data), or would you prefer Cloud create a placeholder during auth?

2. **Product ID:** Should we add `product_id` to cloud_account_links? If yes, what format/values should it use?

3. **Email Field:** Cloud provides `cloud_email` in the callback — should Fortized also store this in the users table or only in cloud_account_links?

4. **Token Format:** Should Fortized validate the `code` parameter with Cloud's backend, or is `cloud_user_id` + `cloud_username` sufficient for security?

5. **Subaccount Switching:** Do you have an API for Cloud to query Fortized subaccounts for a given Cloud user? Or should that only happen on Fortized's end?

---

## Next Steps

1. **Cloud Team:** Review this code and schema, answer the 6 questions above
2. **Fortized Team:** Implement the `/api/auth/create-fortized-account` endpoint with the code above
3. **Both Teams:** Set up test environment and run signup flow end-to-end
4. **Testing:** Handle error cases, test with multiple subaccounts per Cloud user

---

**Status:** Ready for schema alignment and endpoint implementation  
**Branch:** `claude/migrate-auth-swiftaw-xgYQr`  
**Questions?** Let's hop on a sync to align on the architecture

---

*Last Updated: April 4, 2026*
