import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';
import crypto from 'crypto';

const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'bdm_sales.db');
if (isVercel) {
  const bundledDb = path.resolve(process.cwd(), 'data', 'bdm_sales.db');
  if (fs.existsSync(bundledDb) && !fs.existsSync(dbPath)) {
    try {
      fs.copyFileSync(bundledDb, dbPath);
    } catch (e) {
      console.warn('[SQLite] Notice: Copying bundled DB to /tmp:', e);
    }
  }
}

export const db = new Database(dbPath);

// Enable WAL mode for high performance
db.pragma('journal_mode = WAL');

// Initialize SQL Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS bdms (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    territory TEXT NOT NULL,
    phone TEXT,
    joinedDate TEXT
  );

  CREATE TABLE IF NOT EXISTS outlets (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    town TEXT,
    ownerName TEXT,
    phone TEXT,
    creditDaysRaw TEXT,
    creditDays INTEGER DEFAULT 0,
    latitude REAL,
    longitude REAL,
    assignedBdmCode TEXT,
    FOREIGN KEY(assignedBdmCode) REFERENCES bdms(code)
  );

  CREATE TABLE IF NOT EXISTS billing (
    outletCode TEXT PRIMARY KEY,
    feb26Units INTEGER DEFAULT 0,
    feb26Val REAL DEFAULT 0,
    mar26Units INTEGER DEFAULT 0,
    mar26Val REAL DEFAULT 0,
    apr26Units INTEGER DEFAULT 0,
    apr26Val REAL DEFAULT 0,
    may26Units INTEGER DEFAULT 0,
    may26Val REAL DEFAULT 0,
    jun26Units INTEGER DEFAULT 0,
    jun26Val REAL DEFAULT 0,
    jul26Units INTEGER DEFAULT 0,
    jul26Val REAL DEFAULT 0,
    FOREIGN KEY(outletCode) REFERENCES outlets(code)
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitId TEXT UNIQUE,
    outletCode TEXT NOT NULL,
    outletName TEXT,
    bdmCode TEXT NOT NULL,
    bdmName TEXT,
    visitDate TEXT NOT NULL,
    checkInTime TEXT,
    checkInTimestamp INTEGER,
    durationMins INTEGER,
    purpose TEXT,
    remarks TEXT,
    answersJson TEXT,
    counterCondition TEXT,
    orderUnits INTEGER DEFAULT 0,
    orderValue REAL DEFAULT 0,
    deliveryDate TEXT,
    paymentCommitment TEXT,
    photoUrl TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    outletCode TEXT NOT NULL,
    bdmCode TEXT,
    timestamp TEXT NOT NULL,
    operationalStatus TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS merges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    primaryCode TEXT NOT NULL,
    secondaryCode TEXT UNIQUE NOT NULL,
    timestamp TEXT NOT NULL,
    mergedBy TEXT
  );

  CREATE TABLE IF NOT EXISTS category_csvs (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    csvContent TEXT NOT NULL,
    fileName TEXT NOT NULL,
    fileSize INTEGER NOT NULL,
    rowCount INTEGER NOT NULL,
    uploadedAt TEXT NOT NULL,
    isCustom INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    name TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    lastLoginAt TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId INTEGER NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    ip TEXT,
    success INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS revoked_tokens (
    token TEXT PRIMARY KEY,
    revokedAt INTEGER NOT NULL
  );
`);

// Migrate category_csvs if it still uses legacy single-category PK schema
try {
  const tableInfo = db.pragma('table_info(category_csvs)');
  if (tableInfo.length > 0 && !tableInfo.some((c) => c.name === 'id')) {
    db.exec(`
      ALTER TABLE category_csvs RENAME TO old_category_csvs;
      CREATE TABLE category_csvs (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        csvContent TEXT NOT NULL,
        fileName TEXT NOT NULL,
        fileSize INTEGER NOT NULL,
        rowCount INTEGER NOT NULL,
        uploadedAt TEXT NOT NULL,
        isCustom INTEGER DEFAULT 1
      );
      INSERT INTO category_csvs (id, category, csvContent, fileName, fileSize, rowCount, uploadedAt, isCustom)
        SELECT category AS id, category, csvContent, fileName, fileSize, rowCount, uploadedAt, isCustom FROM old_category_csvs;
      DROP TABLE old_category_csvs;
    `);
    console.log('[SQLite] Migrated category_csvs table to multi-file schema.');
  }
} catch (e) {
  console.warn('[SQLite] Migration check for category_csvs:', e.message);
}

function hashPasswordInternal(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPasswordInternal(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// Seed default admin user (synchronous for reliable serverless cold starts)
export function seedInitialAdminIfEmpty() {
  const username = 'bdmadmin';
  const email = 'bdmadmin@bdm.local';
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'bdm@2026';
  const passwordHash = hashPasswordInternal(defaultPassword);
  const createdAt = new Date().toISOString();

  const existing = db.prepare('SELECT id, passwordHash FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(username, email);
  if (!existing) {
    db.prepare(`
      INSERT INTO users (email, username, passwordHash, role, name, createdAt)
      VALUES (?, ?, ?, 'admin', 'BDM Administrator', ?)
    `).run(email, username, passwordHash, createdAt);
    console.log('[SQLite] User account seeded: bdmadmin');
  } else if (!verifyPasswordInternal(defaultPassword, existing.passwordHash)) {
    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(passwordHash, existing.id);
    console.log('[SQLite] Synchronized bdmadmin credentials with default/configured password');
  }
}

// Seed only the initial administrator account (zero CSVs stored by default)
seedInitialAdminIfEmpty();
console.log(`[SQLite] Database ready at ${dbPath}`);

