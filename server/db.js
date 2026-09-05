import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'bdm_sales.db');
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
    category TEXT PRIMARY KEY,
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
`);

// Seed default initial user account (bdmadmin / bdm@2026)
export function seedInitialAdminIfEmpty() {
  // Dynamic import to avoid circular dependency
  import('./auth.js').then(({ hashPassword }) => {
    const username = 'bdmadmin';
    const email = 'bdmadmin@bdm.local';
    const defaultPassword = 'bdm@2026';
    const passwordHash = hashPassword(defaultPassword);
    const createdAt = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(username, email);
    if (!existing) {
      db.prepare(`
        INSERT INTO users (email, username, passwordHash, role, name, createdAt)
        VALUES (?, ?, ?, 'admin', 'BDM Administrator', ?)
      `).run(email, username, passwordHash, createdAt);
      console.log('[SQLite] User account seeded: bdmadmin (Password: bdm@2026)');
    } else {
      // Update password hash to ensure bdm@2026 is always active
      db.prepare(`
        UPDATE users SET passwordHash = ? WHERE id = ?
      `).run(passwordHash, existing.id);
    }
  });
}

// Seed SQLite tables from root CSV files if tables are empty
export function seedDatabaseFromCsvsIfEmpty() {
  seedInitialAdminIfEmpty();
  const bdmCount = db.prepare('SELECT COUNT(*) as c FROM bdms').get().c;
  if (bdmCount === 0) {
    const bdmCsvPath = path.resolve(process.cwd(), 'bdms.csv');
    if (fs.existsSync(bdmCsvPath)) {
      const parsed = Papa.parse(fs.readFileSync(bdmCsvPath, 'utf-8'), { header: true, skipEmptyLines: true });
      const insert = db.prepare(`INSERT OR REPLACE INTO bdms (code, name, territory, phone, joinedDate) VALUES (?, ?, ?, ?, ?)`);
      const insertMany = db.transaction((rows) => {
        for (const r of rows) {
          const code = r['BDM Code'] || r['bdm_code'];
          if (!code) continue;
          insert.run(
            code.trim(),
            (r['BDM Name'] || r['bdm_name'] || '').trim(),
            (r['Territory'] || r['territory'] || '').trim(),
            (r['Phone'] || r['phone'] || '').trim(),
            (r['Joined Date'] || r['joined_date'] || '').trim()
          );
        }
      });
      insertMany(parsed.data);
      console.log(`[SQLite] Seeded ${parsed.data.length} BDMs into SQLite table 'bdms'.`);
    }
  }

  const outletCount = db.prepare('SELECT COUNT(*) as c FROM outlets').get().c;
  if (outletCount === 0) {
    const outletsCsvPath = path.resolve(process.cwd(), 'outlets.csv');
    if (fs.existsSync(outletsCsvPath)) {
      const parsed = Papa.parse(fs.readFileSync(outletsCsvPath, 'utf-8'), { header: true, skipEmptyLines: true });
      const insert = db.prepare(`
        INSERT OR REPLACE INTO outlets (code, name, type, town, ownerName, phone, creditDaysRaw, creditDays, latitude, longitude, assignedBdmCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = db.transaction((rows) => {
        for (const r of rows) {
          const code = r['Outlet Code'] || r['outlet_code'];
          if (!code) continue;
          const lat = parseFloat(r['Latitude'] || r['latitude']);
          const lng = parseFloat(r['Longitude'] || r['longitude']);
          insert.run(
            code.trim(),
            (r['Outlet Name'] || r['outlet_name'] || '').trim(),
            (r['Outlet Type'] || r['outlet_type'] || 'General Trade').trim(),
            (r['Town'] || r['town'] || '').trim(),
            (r['Owner Name'] || r['owner_name'] || '').trim(),
            (r['Contact Phone'] || r['phone'] || '').trim(),
            (r['Credit Terms'] || r['credit_terms'] || '').trim(),
            parseInt(r['Credit Days'] || '0', 10) || 0,
            isNaN(lat) ? null : lat,
            isNaN(lng) ? null : lng,
            (r['Assigned BDM'] || r['assigned_bdm'] || '').trim()
          );
        }
      });
      insertMany(parsed.data);
      console.log(`[SQLite] Seeded ${parsed.data.length} Outlets into SQLite table 'outlets'.`);
    }
  }

  const billingCount = db.prepare('SELECT COUNT(*) as c FROM billing').get().c;
  if (billingCount === 0) {
    const billingCsvPath = path.resolve(process.cwd(), 'billing-monthly.csv');
    if (fs.existsSync(billingCsvPath)) {
      const parsed = Papa.parse(fs.readFileSync(billingCsvPath, 'utf-8'), { header: true, skipEmptyLines: true });
      const insert = db.prepare(`
        INSERT OR REPLACE INTO billing (
          outletCode, feb26Units, feb26Val, mar26Units, mar26Val,
          apr26Units, apr26Val, may26Units, may26Val, jun26Units, jun26Val, jul26Units, jul26Val
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = db.transaction((rows) => {
        for (const r of rows) {
          const code = r['Outlet Code'] || r['outlet_code'];
          if (!code) continue;
          insert.run(
            code.trim(),
            parseInt(r['Feb-26 Units'] || '0', 10) || 0,
            parseFloat(r['Feb-26 Value'] || '0') || 0,
            parseInt(r['Mar-26 Units'] || '0', 10) || 0,
            parseFloat(r['Mar-26 Value'] || '0') || 0,
            parseInt(r['Apr-26 Units'] || '0', 10) || 0,
            parseFloat(r['Apr-26 Value'] || '0') || 0,
            parseInt(r['May-26 Units'] || '0', 10) || 0,
            parseFloat(r['May-26 Value'] || '0') || 0,
            parseInt(r['Jun-26 Units'] || '0', 10) || 0,
            parseFloat(r['Jun-26 Value'] || '0') || 0,
            parseInt(r['Jul-26 Units'] || '0', 10) || 0,
            parseFloat(r['Jul-26 Value'] || '0') || 0
          );
        }
      });
      insertMany(parsed.data);
      console.log(`[SQLite] Seeded ${parsed.data.length} Billing rows into SQLite table 'billing'.`);
    }
  }

  const visitCount = db.prepare('SELECT COUNT(*) as c FROM visits').get().c;
  if (visitCount === 0) {
    const visitCsvPath = path.resolve(process.cwd(), 'visit-log.csv');
    if (fs.existsSync(visitCsvPath)) {
      const parsed = Papa.parse(fs.readFileSync(visitCsvPath, 'utf-8'), { header: true, skipEmptyLines: true });
      const insert = db.prepare(`
        INSERT OR REPLACE INTO visits (
          visitId, outletCode, outletName, bdmCode, bdmName,
          visitDate, checkInTime, checkInTimestamp, durationMins,
          purpose, remarks, answersJson, counterCondition, orderUnits, orderValue, photoUrl
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = db.transaction((rows) => {
        for (const r of rows) {
          const vid = r['Visit ID'] || r['visit_id'] || `V_${Math.random()}`;
          const rawDur = parseFloat(r['Duration (mins)'] || r['duration']);
          const dur = isNaN(rawDur) ? null : rawDur;
          insert.run(
            vid.trim(),
            (r['Outlet Code'] || r['outlet_code'] || '').trim(),
            (r['Outlet Name'] || r['outlet_name'] || '').trim(),
            (r['BDM Code'] || r['bdm_code'] || '').trim(),
            (r['BDM Name'] || r['bdm_name'] || '').trim(),
            (r['Visit Date'] || r['visit_date'] || '').trim(),
            (r['Check In'] || r['check_in'] || '').trim(),
            Date.now(),
            dur,
            (r['Purpose'] || r['purpose'] || '').trim(),
            (r['Remarks'] || r['remarks'] || '').trim(),
            '{}',
            'open',
            0,
            0,
            ''
          );
        }
      });
      insertMany(parsed.data);
      console.log(`[SQLite] Seeded ${parsed.data.length} Visits into SQLite table 'visits'.`);
    }
  }
}

seedDatabaseFromCsvsIfEmpty();
console.log(`[SQLite] Database ready at ${dbPath}`);
