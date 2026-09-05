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

/**
 * Generate a cryptographically secure session token and store in SQLite
 */
export function createSession(userId, durationHours = 24) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + durationHours * 60 * 60 * 1000;
  const createdAt = new Date(now).toISOString();

  db.prepare(`
    INSERT INTO sessions (token, userId, expiresAt, createdAt)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, expiresAt, createdAt);

  return { token, expiresAt };
}

/**
 * Verify session token and return user profile
 */
export function verifySession(token) {
  if (!token) return null;
  const now = Date.now();
  const row = db.prepare(`
    SELECT s.token, s.expiresAt, u.id, u.email, u.username, u.name, u.role, u.createdAt
    FROM sessions s
    JOIN users u ON s.userId = u.id
    WHERE s.token = ? AND s.expiresAt > ?
  `).get(token, now);

  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt
  };
}

/**
 * Destroy/Invalidate session token on logout
 */
export function destroySession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
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
