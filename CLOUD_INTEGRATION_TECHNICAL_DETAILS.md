# Fortized × Swiftaw Cloud - Technical Details & Code Reference

**For:** Swiftaw Cloud Team  
**From:** Fortized Team  
**Date:** April 4, 2026  
**Purpose:** Show Cloud team the exact implementation details so they can verify compatibility and integration points

---

## 1. Login Flow & UI

### Login Page Button
**Location:** `/login/index.html`

```html
<!-- Fortized Login Page Header -->
<div class="auth-header">
  <h1>Sign in to <em>Fortized</em></h1>
  <p>Access your fortress, claims, and gameplay data</p>
</div>

<!-- Cloud Sign In Button -->
<button id="cloudSignInBtn" class="cloud-btn">
  <img src="https://swiftaw.com/Cloud%20logo.png" alt="Swiftaw Cloud" />
  Sign in with Swiftaw Cloud
</button>

<!-- OR Divider -->
<div class="divider">OR</div>

<!-- Traditional Fortized Login (preserved for legacy users) -->
<div class="field">
  <label>Username</label>
  <input type="text" placeholder="Your username" />
</div>
<div class="field">
  <label>Password</label>
  <input type="password" placeholder="Your password" />
</div>
<button class="primary-btn">Sign In</button>
```

### JavaScript: Opening Cloud Auth
```javascript
const cloudSignInBtn = document.getElementById('cloudSignInBtn');

cloudSignInBtn.addEventListener('click', () => {
  // Generate CSRF state
  const state = generateRandomString(32);
  sessionStorage.setItem('oauth_state', state);

  // Open Cloud auth in new popup
  const CLOUD_AUTH_URL = 'https://swiftaw.com/cloud/auth/link?product=fortized&redirect_uri=https://fortized.com/auth/cloud-callback&state=' + state;
  
  const popup = window.open(
    CLOUD_AUTH_URL,
    'CloudAuth',
    'width=600,height=700,resizable=no,toolbar=no,menubar=no'
  );

  // Listen for Cloud callback via postMessage
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    
    if (event.data.type === 'cloud_login_complete') {
      // User authenticated with Cloud
      // postMessage from callback handler includes the session token
      localStorage.setItem('fortized_token', event.data.fortized_token);
      window.location.href = '/app';
    }
  });
});

function generateRandomString(length) {
  return Math.random().toString(36).substring(2, 2 + length);
}
```

### Expected Flow:
1. User clicks "Sign in with Swiftaw Cloud"
2. New popup opens to Cloud auth URL with state parameter
3. **If already logged into Cloud:** Auto-closes popup, redirects to Fortized
4. **If not logged into Cloud:** Cloud login form appears in popup
5. User completes Cloud auth
6. Callback redirects back to `/auth/cloud-callback?code=...&state=...&cloud_user_id=...&cloud_username=...`
7. Fortized receives session token and redirects to `/app`

---

## 2. Signup Flow & UI

### Step 1: Cloud Connection (Initial Display)
**Location:** `/signup/index.html` - Step 1

```html
<div class="auth-card">
  <div class="auth-header">
    <h1>Create your <em>Fortized</em> account</h1>
    <p>Join thousands of players and start your fortress</p>
  </div>

  <!-- STEP 1: Cloud Connection -->
  <div id="step1" class="form-step active">
    <h2>Step 1: Connect Your Swiftaw Cloud Account</h2>
    
    <div class="cloud-connection-info">
      <p>Your login data is stored securely with Swiftaw Cloud. Connect or create a Cloud account to continue.</p>
    </div>

    <button id="connectCloudBtn" class="cloud-btn">
      <img src="https://swiftaw.com/Cloud%20logo.png" alt="Swiftaw Cloud" />
      Connect Swiftaw Cloud Account
    </button>

    <!-- Connection Status -->
    <div id="connectionStatus" class="status-box">
      <div class="status-label">Waiting for Cloud connection...</div>
    </div>
  </div>
</div>
```

### Step 1: JavaScript Handler
```javascript
const CLOUD_AUTH_URL = 'https://swiftaw.com/cloud/auth/link?product=fortized&redirect_uri=https://fortized.com/auth/cloud-callback&state=';

let cloudData = null;

// Check for URL parameters when page loads (callback from Cloud)
function checkCloudData() {
  const params = new URLSearchParams(window.location.search);
  const cloudUsername = params.get('cloud_username');
  const cloudUserId = params.get('cloud_user_id');

  if (cloudUsername && cloudUserId) {
    // User returned from Cloud callback
    cloudData = { username: cloudUsername, userId: cloudUserId };
    showStep2();
    
    // Clean up URL bar (remove parameters)
    window.history.replaceState({}, document.title, '/signup');
  }
}

// Open Cloud auth in new popup
document.getElementById('connectCloudBtn').addEventListener('click', () => {
  const state = generateRandomString(32);
  sessionStorage.setItem('oauth_state', state);

  const popup = window.open(
    CLOUD_AUTH_URL + state,
    'CloudAuth',
    'width=600,height=700,resizable=no,toolbar=no,menubar=no'
  );
});

// Listen for data from Cloud callback window (postMessage)
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;

  if (event.data.type === 'cloud_auth_complete') {
    // Cloud callback sent user data back
    cloudData = {
      username: event.data.cloudUsername,
      userId: event.data.cloudUserId
    };
    showStep2();
  }
});

window.addEventListener('load', checkCloudData);
```

### Step 1: Expected Connection Status
```
After user connects Cloud account, displays:

✓ Cloud Account Connected
Username: JohnDoe
```

### Step 2: Profile Details
**Location:** `/signup/index.html` - Step 2

```html
<!-- STEP 2: Profile Details -->
<div id="step2" class="form-step hidden">
  <h2>Step 2: Complete Your Profile</h2>

  <!-- Display Name (auto-filled from Cloud username, but editable) -->
  <div class="field">
    <label>Display Name</label>
    <input 
      type="text" 
      id="displayName" 
      placeholder="How people will see you"
      maxlength="32"
    />
    <span class="char-count">0/32</span>
  </div>

  <!-- Date of Birth (age validation: 13-150 years old) -->
  <div class="field">
    <label>Date of Birth</label>
    <input 
      type="date" 
      id="dateOfBirth"
      required
    />
    <span class="error-msg" id="ageError"></span>
  </div>

  <!-- About Me (auto-filled with template but editable) -->
  <div class="field">
    <label>About Me</label>
    <textarea 
      id="aboutMe" 
      placeholder="Tell us about yourself"
      maxlength="200"
    ></textarea>
    <span class="char-count">0/200</span>
  </div>

  <!-- Profile Picture Upload -->
  <div class="field">
    <label>Profile Picture (Optional)</label>
    <input 
      type="file" 
      id="pfpInput" 
      accept="image/*"
    />
    <div id="pfpPreview" class="pfp-preview hidden">
      <img id="previewImg" />
    </div>
  </div>

  <!-- Create Account Button -->
  <button id="signupBtn" class="primary-btn">Create Account</button>
</div>
```

### Step 2: JavaScript Logic
```javascript
function showStep2() {
  // Hide Step 1, show Step 2
  document.getElementById('step1').classList.add('hidden');
  document.getElementById('step2').classList.remove('hidden');

  // Auto-fill display name from Cloud username
  document.getElementById('displayName').value = cloudData.username;

  // Auto-fill about me with template
  document.getElementById('aboutMe').value = 
    `Hi! I am ${cloudData.username}, welcome to my profile!`;

  // Update connection status display
  const status = document.getElementById('connectionStatus');
  status.classList.add('connected');
  status.innerHTML = `
    <div class="status-label">✓ Cloud Account Connected</div>
    <div class="status-info">Username: <strong>${cloudData.username}</strong></div>
  `;
}

// Age Validation (13-150 years old, birth year 1870 or later)
document.getElementById('dateOfBirth').addEventListener('change', (e) => {
  const dob = new Date(e.target.value);
  const today = new Date();
  
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  const birthYear = dob.getFullYear();
  const ageError = document.getElementById('ageError');

  if (age < 13) {
    ageError.textContent = 'You must be at least 13 years old';
    e.target.classList.add('error');
  } else if (age > 150 || birthYear < 1870) {
    ageError.textContent = 'Please enter a valid date of birth';
    e.target.classList.add('error');
  } else {
    ageError.textContent = '';
    e.target.classList.remove('error');
  }
});

// Account Creation
document.getElementById('signupBtn').addEventListener('click', async () => {
  const displayName = document.getElementById('displayName').value.trim();
  const dob = document.getElementById('dateOfBirth').value;
  const aboutMe = document.getElementById('aboutMe').value.trim();

  if (!displayName || !dob) {
    alert('Please fill in all required fields');
    return;
  }

  // Send to /api/auth/cloud-callback with Cloud data + profile details
  const response = await fetch('/api/auth/cloud-callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: sessionStorage.getItem('auth_code'),
      state: sessionStorage.getItem('oauth_state'),
      cloud_user_id: cloudData.userId,
      cloud_username: cloudData.username,
      display_name: displayName,
      date_of_birth: dob,
      about_me: aboutMe,
      profile_picture: null // File upload handled separately
    })
  });

  const result = await response.json();
  if (result.status === 'success' || result.status === 'new_account') {
    localStorage.setItem('fortized_token', result.session_token);
    window.location.href = '/app';
  }
});
```

---

## 3. Cloud Callback Handler

### Callback Handler Code
**Location:** `/auth/cloud-callback.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>Connecting to Fortized...</title>
</head>
<body>
  <script>
    (async function() {
      // Extract parameters from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const cloudUserId = params.get('cloud_user_id');
      const cloudUsername = params.get('cloud_username');

      console.log('Cloud callback received:', {
        code: code ? code.substring(0, 10) + '...' : 'missing',
        state: state ? state.substring(0, 10) + '...' : 'missing',
        cloudUserId: cloudUserId || 'missing',
        cloudUsername: cloudUsername || 'missing'
      });

      if (!code || !state || !cloudUserId || !cloudUsername) {
        console.error('Missing required parameters from Cloud');
        alert('Authentication failed: Missing parameters');
        window.close();
        return;
      }

      // Determine if this is signup or login flow
      const isSignupFlow = document.referrer.includes('/signup');

      if (isSignupFlow) {
        // === SIGNUP FLOW ===
        // Send data back to signup window via postMessage
        if (window.opener) {
          window.opener.postMessage({
            type: 'cloud_auth_complete',
            code: code,
            state: state,
            cloudUserId: cloudUserId,
            cloudUsername: cloudUsername
          }, window.location.origin);
          
          window.close();
          return;
        }
      } else {
        // === LOGIN FLOW ===
        // Make request to backend to get session token
        try {
          const response = await fetch('/api/auth/cloud-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: code,
              state: state,
              cloud_user_id: cloudUserId,
              cloud_username: cloudUsername
            })
          });

          const result = await response.json();

          if (result.status === 'success') {
            // Save token and redirect
            localStorage.setItem('fortized_token', result.session_token);
            window.location.href = '/app';
          } else if (result.status === 'error') {
            alert('Login failed: ' + (result.message || 'Unknown error'));
            window.close();
          }
        } catch (error) {
          console.error('Callback error:', error);
          alert('An error occurred during authentication');
          window.close();
        }
      }
    })();
  </script>
  <p>Authenticating with Fortized... please wait.</p>
</body>
</html>
```

### Expected Behavior:
```
1. Cloud redirects to: 
   https://fortized.com/auth/cloud-callback?code=XYZ&state=ABC&cloud_user_id=UUID&cloud_username=john_doe

2. Handler parses all 4 parameters

3. If from signup:
   - Sends postMessage to parent window (signup form) with user data
   - Closes popup
   
4. If from login:
   - POSTs to /api/auth/cloud-callback with all parameters
   - Receives Fortized session_token
   - Redirects to /app
```

---

## 4. Backend Cloud Callback Endpoint

### POST /api/auth/cloud-callback

**Request Body:**
```json
{
  "code": "AUTH_CODE_FROM_CLOUD",
  "state": "CSRF_STATE_FOR_VALIDATION",
  "cloud_user_id": "uuid-12345",
  "cloud_username": "john_doe"
}
```

**Expected Response (New Account):**
```json
{
  "status": "new_account",
  "fortized_user_id": "fortized-user-123",
  "cloud_user_id": "uuid-12345",
  "session_token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Account created successfully"
}
```

**Expected Response (Existing Account):**
```json
{
  "status": "success",
  "fortized_user_id": "fortized-user-456",
  "cloud_user_id": "uuid-12345",
  "session_token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Logged in successfully"
}
```

**Expected Response (Error):**
```json
{
  "status": "error",
  "message": "Invalid state parameter",
  "code": "INVALID_STATE"
}
```

### Endpoint Code (Backend)
```javascript
// cloud-endpoints.js

app.post('/api/auth/cloud-callback', async (req, res) => {
  const { code, state, cloud_user_id, cloud_username } = req.body;

  // 1. Validate state (CSRF protection)
  if (!validateState(state)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid or expired state parameter',
      code: 'INVALID_STATE'
    });
  }

  // 2. Check if Cloud user already linked to Fortized account
  const existingLink = await db.query(
    'SELECT user_id FROM cloud_account_links WHERE cloud_user_id = ?',
    [cloud_user_id]
  );

  if (existingLink.length > 0) {
    // User already has Fortized account linked to this Cloud account
    const userId = existingLink[0].user_id;
    const token = generateFortizedToken(userId);
    
    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [userId]);

    return res.json({
      status: 'success',
      fortized_user_id: userId,
      cloud_user_id: cloud_user_id,
      session_token: token,
      message: 'Logged in successfully'
    });
  }

  // 3. Create new Fortized account for this Cloud user
  const newUserId = generateUniqueId();
  
  await db.query(
    `INSERT INTO users (id, cloud_user_id, username, display_name, is_linked_to_cloud, last_login)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [newUserId, cloud_user_id, cloud_username, cloud_username, true]
  );

  // 4. Create account link
  await db.query(
    'INSERT INTO cloud_account_links (cloud_user_id, user_id) VALUES (?, ?)',
    [cloud_user_id, newUserId]
  );

  // 5. Generate session token
  const token = generateFortizedToken(newUserId);

  return res.json({
    status: 'new_account',
    fortized_user_id: newUserId,
    cloud_user_id: cloud_user_id,
    session_token: token,
    message: 'Account created successfully'
  });
});
```

---

## 5. Error Cases & Messages

### Error Scenarios:

**1. Invalid State Parameter**
```
Browser Alert: "Authentication failed: Invalid state parameter"
API Response: 429 Too Many Requests
```

**2. Missing Cloud Parameters**
```
Browser Console: "Missing required parameters from Cloud"
User sees: "Authentication failed: Missing parameters"
Window closes
```

**3. Cloud Service Down**
```
Network Error: Unable to reach /api/auth/cloud-callback
Browser Alert: "An error occurred during authentication"
```

**4. Age Validation Failed (Signup)**
```
Input Error: "You must be at least 13 years old"
Form shows validation error, disables submit button
```

**5. Username Already Taken (on display name)**
```
Real-time validation via API call
Error message: "Display name already in use"
```

---

## 6. Data Flow Diagrams

### Login Flow
```
User clicks "Sign in with Swiftaw Cloud"
    ↓
Fortized generates state, opens Cloud auth popup
    ↓
Cloud: Login form or auto-detect session
    ↓
User authenticates with Cloud (or skips if session exists)
    ↓
Cloud redirects to: /auth/cloud-callback?code=X&state=X&cloud_user_id=X&cloud_username=X
    ↓
Callback handler POSTs to /api/auth/cloud-callback
    ↓
Backend: Check if cloud_user_id exists in cloud_account_links
    ↓
If exists: Return session_token
If new: Create Fortized account, return session_token
    ↓
Browser redirects to /app
```

### Signup Flow
```
User clicks "Create Fortized Account" → lands on /signup
    ↓
Step 1: Click "Connect Swiftaw Cloud Account"
    ↓
Same as login flow (opens Cloud popup)
    ↓
Cloud redirects to /auth/cloud-callback?code=X&state=X&cloud_user_id=X&cloud_username=X
    ↓
Callback detects referrer includes /signup
    ↓
Sends postMessage to signup window with user data
    ↓
Closes popup window
    ↓
Signup form receives data via postMessage
    ↓
Step 2: Shows profile form (name auto-filled from Cloud)
    ↓
User fills: Display Name, Date of Birth, About Me, Profile Pic
    ↓
Step 2 form POSTs to /api/auth/cloud-callback with ALL data
    ↓
Backend creates Fortized account with profile data
    ↓
Returns session_token
    ↓
Browser redirects to /app
```

---

## 7. Integration Checkpoints

**What Cloud Team Needs to Verify:**

- [ ] OAuth URL accepts `product=fortized&redirect_uri=...&state=` parameters
- [ ] Cloud returns `code`, `state`, `cloud_user_id`, `cloud_username` in redirect URL
- [ ] Cloud logo available at `https://swiftaw.com/Cloud%20logo.png`
- [ ] Callback works from both signup (popup) and login (popup) flows
- [ ] If user already logged into Cloud, popup auto-closes and redirects immediately
- [ ] If user not logged into Cloud, shows Cloud login form in popup

**What Fortized Team Needs to Verify:**

- [ ] `/api/auth/cloud-callback` endpoint receives and processes parameters correctly
- [ ] Session tokens are generated and stored properly
- [ ] Redirect to `/app` works after authentication
- [ ] Multiple signup/login flows don't cause state conflicts
- [ ] URL parameters are cleaned from browser history after auth

---

**Status:** Ready for joint testing  
**Questions?** Contact Fortized Team or Cloud Team leads
