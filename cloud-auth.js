// ════════════════════════════════════════════════════════════════════════════
// FORTIZED × SWIFTAW CLOUD INTEGRATION
// Cloud Authentication Utilities & Middleware
// ════════════════════════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configuration
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://cloud.swiftaw.io';
const FORTIZED_URL = process.env.FORTIZED_URL || 'https://fortized.com';
const JWT_SECRET = process.env.FORTIZED_JWT_SECRET || 'fortized-jwt-secret-key-change-in-production';

// Cache for Cloud's public key (refresh every 5 minutes)
let cachedCloudPublicKey = null;
let publicKeyCacheTime = 0;
const PUBLIC_KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ──────────────────────────────────────────────────────────────────────────
// 1. FETCH CLOUD'S PUBLIC KEY (for JWT validation)
// ──────────────────────────────────────────────────────────────────────────

async function getCloudPublicKey() {
  const now = Date.now();

  // Return cached key if still valid
  if (cachedCloudPublicKey && (now - publicKeyCacheTime) < PUBLIC_KEY_CACHE_TTL) {
    return cachedCloudPublicKey;
  }

  try {
    const response = await fetch(`${CLOUD_API_URL}/api/auth/public-key`);
    if (!response.ok) {
      throw new Error(`Cloud API error: ${response.status}`);
    }

    const data = await response.json();
    cachedCloudPublicKey = data.key;
    publicKeyCacheTime = now;

    console.log('[Cloud Auth] Public key fetched and cached');
    return cachedCloudPublicKey;
  } catch (error) {
    console.error('[Cloud Auth] Failed to fetch public key:', error.message);
    throw error;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 2. VALIDATE CLOUD JWT TOKEN
// ──────────────────────────────────────────────────────────────────────────

async function validateCloudToken(token) {
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const publicKey = await getCloudPublicKey();
    const decoded = jwt.verify(token, publicKey, { algorithms: ['HS256'] });

    return {
      valid: true,
      cloudUserId: decoded.sub || decoded.cloud_user_id || decoded.user_id,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (error) {
    console.error('[Cloud Auth] Token validation failed:', error.message);
    return {
      valid: false,
      error: error.message,
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 3. GENERATE FORTIZED JWT TOKEN
// ──────────────────────────────────────────────────────────────────────────

function generateFortizedToken(userData) {
  const payload = {
    sub: userData.fortized_user_id || userData.id,
    username: userData.username,
    email: userData.email,
    subaccountId: userData.subaccount_id,
    cloudUserId: userData.cloud_user_id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

// ──────────────────────────────────────────────────────────────────────────
// 4. GENERATE ONE-TIME LINKING TOKEN (for existing users)
// ──────────────────────────────────────────────────────────────────────────

function generateLinkingToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ──────────────────────────────────────────────────────────────────────────
// 5. MIDDLEWARE: VERIFY CLOUD TOKEN IN REQUEST
// ──────────────────────────────────────────────────────────────────────────

async function verifyCloudTokenMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'missing_token',
      message: 'Authorization header with Bearer token required',
    });
  }

  const token = authHeader.substring(7);
  const validation = await validateCloudToken(token);

  if (!validation.valid) {
    return res.status(401).json({
      error: 'invalid_token',
      message: validation.error,
    });
  }

  // Attach validated Cloud user ID to request
  req.cloudUserId = validation.cloudUserId;
  req.cloudEmail = validation.email;

  next();
}

// ──────────────────────────────────────────────────────────────────────────
// 6. EXTRACT TOKEN FROM REQUEST
// ──────────────────────────────────────────────────────────────────────────

function extractCloudToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// ──────────────────────────────────────────────────────────────────────────
// 7. RATE LIMITING HELPER
// ──────────────────────────────────────────────────────────────────────────

const rateLimitStore = new Map();

function checkRateLimit(key, limit = 1000, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }

  let requests = rateLimitStore.get(key);
  requests = requests.filter(time => time > windowStart);

  if (requests.length >= limit) {
    return false; // Rate limited
  }

  requests.push(now);
  rateLimitStore.set(key, requests);

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      const filtered = v.filter(time => time > windowStart);
      if (filtered.length === 0) {
        rateLimitStore.delete(k);
      } else {
        rateLimitStore.set(k, filtered);
      }
    }
  }

  return true;
}

// ──────────────────────────────────────────────────────────────────────────
// 8. MIDDLEWARE: RATE LIMITING
// ──────────────────────────────────────────────────────────────────────────

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const cloudUserId = req.cloudUserId;

  // Different limits for authenticated vs unauthenticated
  const limit = cloudUserId ? 1000 : 100;
  const key = cloudUserId || ip;

  if (!checkRateLimit(key, limit)) {
    return res.status(429).json({
      error: 'rate_limited',
      message: 'Too many requests. Please try again later.',
      retryAfter: 60,
    });
  }

  res.set('X-RateLimit-Limit', limit);
  res.set('X-RateLimit-Remaining', limit); // Simplified; could track actual
  next();
}

// ──────────────────────────────────────────────────────────────────────────
// EXPORTS
// ──────────────────────────────────────────────────────────────────────────

module.exports = {
  getCloudPublicKey,
  validateCloudToken,
  generateFortizedToken,
  generateLinkingToken,
  verifyCloudTokenMiddleware,
  extractCloudToken,
  checkRateLimit,
  rateLimitMiddleware,
  CLOUD_API_URL,
  FORTIZED_URL,
};
