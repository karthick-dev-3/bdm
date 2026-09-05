import crypto from 'crypto';
import { db } from './db.js';

/**
 * Secure password hashing using Node.js built-in scrypt + cryptographic salt
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Constant-time password verification against stored salt:hash
 */
export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

const JWT_SECRET = process.env.SESSION_SECRET || 'bdm_jwt_secret_key_2026_apple_sales_copilot_enterprise';

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) {
    s += '=';
  }
  return Buffer.from(s, 'base64').toString('utf8');
}

/**
 * Generate cryptographically signed HMAC-SHA256 token (JWT format)
 * Works reliably across stateless serverless instances (Vercel Lambdas)
 */
export function createSignedToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${data}.${signature}`;
}

/**
 * Verify HMAC-SHA256 signed token and return payload if valid and unexpired
 */
export function verifySignedToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate a cryptographically secure session token and store in SQLite
 * Uses 7 days default expiration for smooth persistence across page reloads
 */
export function createSession(userId, durationHours = 168) {
  const now = Date.now();
  const expiresAt = now + durationHours * 60 * 60 * 1000;
  const createdAt = new Date(now).toISOString();

  let user = null;
  try {
    user = db.prepare('SELECT id, email, username, name, role, createdAt FROM users WHERE id = ?').get(userId);
  } catch (e) {
    console.warn('[Auth] Error querying user for session creation:', e.message);
  }

  const token = createSignedToken({
    id: user ? user.id : userId,
    email: user ? user.email : '',
    username: user ? user.username : '',
    name: user ? user.name : '',
    role: user ? user.role : 'admin',
    createdAt: user ? user.createdAt : createdAt,
    exp: expiresAt,
    iat: now
  });

  try {
    db.prepare(`
      INSERT INTO sessions (token, userId, expiresAt, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, expiresAt, createdAt);
  } catch (e) {
    // Non-fatal if sessions table insert fails (token is self-verifying)
  }

  return { token, expiresAt };
}

/**
 * Verify session token and return user profile
 * Handles signed tokens (stateless across Vercel lambdas) with revocation check
 */
export function verifySession(token) {
  if (!token) return null;

  // Check if token was explicitly revoked on logout
  try {
    const isRevoked = db.prepare('SELECT 1 FROM revoked_tokens WHERE token = ?').get(token);
    if (isRevoked) return null;
  } catch (e) {
    // Continue if revoked_tokens is not available
  }

  // 1. Try decoding and verifying as cryptographically signed token
  const payload = verifySignedToken(token);
  if (payload) {
    // Check if user still exists in database
    try {
      const user = db.prepare('SELECT id, email, username, name, role, createdAt FROM users WHERE id = ?').get(payload.id);
      if (user) {
        return {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt
        };
      }
    } catch (e) {
      // In case of transient DB read error
    }

    // Return user information verified by signature
    return {
      id: payload.id,
      email: payload.email,
      username: payload.username,
      name: payload.name,
      role: payload.role,
      createdAt: payload.createdAt
    };
  }

  // 2. Legacy fallback for old random hex tokens stored in SQLite sessions table
  try {
    const now = Date.now();
    const row = db.prepare(`
      SELECT s.token, s.expiresAt, u.id, u.email, u.username, u.name, u.role, u.createdAt
      FROM sessions s
      JOIN users u ON s.userId = u.id
      WHERE s.token = ? AND s.expiresAt > ?
    `).get(token, now);

    if (row) {
      return {
        id: row.id,
        email: row.email,
        username: row.username,
        name: row.name,
        role: row.role,
        createdAt: row.createdAt
      };
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Destroy/Invalidate session token on logout
 */
export function destroySession(token) {
  if (!token) return;
  try {
    db.prepare('INSERT OR IGNORE INTO revoked_tokens (token, revokedAt) VALUES (?, ?)').run(token, Date.now());
  } catch (e) {
    // ignore
  }
  try {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  } catch (e) {
    // ignore
  }
}

/**
 * Clean up expired sessions from SQLite
 */
export function purgeExpiredSessions() {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expiresAt <= ?').run(now);
}

/**
 * Check if identifier/IP is currently rate-limited (max 5 failed attempts within 15 minutes)
 */
export function checkRateLimit(identifier, ip = '') {
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  const row = db.prepare(`
    SELECT COUNT(*) as failedCount
    FROM login_attempts
    WHERE (identifier = ? OR ip = ?) AND success = 0 AND timestamp > ?
  `).get(identifier, ip, fifteenMinutesAgo);

  const isBlocked = (row?.failedCount || 0) >= 5;
  return {
    isBlocked,
    remainingAttempts: Math.max(0, 5 - (row?.failedCount || 0))
  };
}

/**
 * Log login attempt for security auditing
 */
export function recordLoginAttempt(identifier, ip = '', success = false) {
  db.prepare(`
    INSERT INTO login_attempts (identifier, ip, success, timestamp)
    VALUES (?, ?, ?, ?)
  `).run(identifier, ip, success ? 1 : 0, Date.now());
}
