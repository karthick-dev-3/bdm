import express from 'express';
import cors from 'cors';
import Papa from 'papaparse';
import { db } from './db.js';
import {
  hashPassword,
  verifyPassword,
  createSession,
  verifySession,
  destroySession,
  checkRateLimit,
  recordLoginAttempt
} from './auth.js';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * Authentication Middleware
 * Strictly guards protected dashboard and data management API routes
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication required. Please log in to access the Admin Dashboard.'
    });
  }

  const token = authHeader.split(' ')[1];
  const user = verifySession(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired admin session. Please log in again.'
    });
  }

  req.user = user;
  req.token = token;
  next();
}

// -------------------------------------------------------------
// 1. Authentication Endpoints
// -------------------------------------------------------------

/**
 * POST /api/auth/login
 * Validates credentials against SQLite users table, logs attempts, enforces rate limits
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, username, email, password } = req.body;
    const loginId = (identifier || username || email || '').trim();
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both username/email and password.'
      });
    }

    // Rate limiting disabled (removed)

    // Lookup user by email or username (case-insensitive)
    const user = db.prepare(`
      SELECT * FROM users
      WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)
    `).get(loginId, loginId);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      recordLoginAttempt(loginId, clientIp, false);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please verify your username/email and password.'
      });
    }

    // Disallow BDM role from admin login
    if (user.role && user.role.toLowerCase() === 'bdm') {
      recordLoginAttempt(loginId, clientIp, false);
      return res.status(403).json({
        success: false,
        error: 'Access denied: BDM users cannot access the admin dashboard.'
      });
    }

    // Successful authentication
    recordLoginAttempt(loginId, clientIp, true);
    const nowIso = new Date().toISOString();
    db.prepare('UPDATE users SET lastLoginAt = ? WHERE id = ?').run(nowIso, user.id);

    const { token, expiresAt } = createSession(user.id, 24);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: nowIso
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current active session profile
 */
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/auth/logout
 * Destroys session token from SQLite database
 */
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    destroySession(token);
  }
  res.json({
    success: true,
    message: 'Session destroyed. Logged out successfully.'
  });
});

// -------------------------------------------------------------
// 2. Core Operational Endpoints
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'SQLite 3 (better-sqlite3)',
    dbFile: 'data/bdm_sales.db',
    tables: ['bdms', 'outlets', 'billing', 'visits', 'audits', 'merges', 'category_csvs', 'users', 'sessions', 'login_attempts']
  });
});

// Visits
app.get('/api/visits', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM visits ORDER BY checkInTimestamp DESC, id DESC').all();
    const mapped = rows.map((r) => ({
      ...r,
      answers: r.answersJson ? JSON.parse(r.answersJson) : {},
      orderBooked: r.orderUnits > 0 ? {
        units: r.orderUnits,
        estimatedValue: r.orderValue,
        deliveryDate: r.deliveryDate,
        paymentCommitment: r.paymentCommitment
      } : undefined
    }));
    res.json({ success: true, visits: mapped, total: mapped.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync/visits', (req, res) => {
  try {
    const incoming = Array.isArray(req.body.visits) ? req.body.visits : req.body ? [req.body] : [];
    const insertOrReplace = db.prepare(`
      INSERT OR REPLACE INTO visits (
        visitId, outletCode, outletName, bdmCode, bdmName,
        visitDate, checkInTime, checkInTimestamp, durationMins,
        purpose, remarks, answersJson, counterCondition,
        orderUnits, orderValue, deliveryDate, paymentCommitment, photoUrl
      ) VALUES (
        @visitId, @outletCode, @outletName, @bdmCode, @bdmName,
        @visitDate, @checkInTime, @checkInTimestamp, @durationMins,
        @purpose, @remarks, @answersJson, @counterCondition,
        @orderUnits, @orderValue, @deliveryDate, @paymentCommitment, @photoUrl
      )
    `);

    const insertMany = db.transaction((visitsList) => {
      let count = 0;
      for (const v of visitsList) {
        if (!v || !v.outletCode) continue;
        const visitId = v.visitId || `${v.outletCode}-${v.checkInTimestamp || v.visitDate || Date.now()}`;
        insertOrReplace.run({
          visitId,
          outletCode: v.outletCode,
          outletName: v.outletName || '',
          bdmCode: v.bdmCode || '',
          bdmName: v.bdmName || '',
          visitDate: v.visitDate || new Date().toISOString().split('T')[0],
          checkInTime: v.checkInTime || '',
          checkInTimestamp: v.checkInTimestamp || Date.now(),
          durationMins: v.durationMins || 0,
          purpose: v.purpose || 'Retail Audit',
          remarks: v.fieldNotes || v.remarks || '',
          answersJson: JSON.stringify(v.answers || {}),
          counterCondition: v.counterCondition || 'open',
          orderUnits: v.orderBooked?.units || 0,
          orderValue: v.orderBooked?.estimatedValue || 0,
          deliveryDate: v.orderBooked?.deliveryDate || '',
          paymentCommitment: v.orderBooked?.paymentCommitment || '',
          photoUrl: v.photoUrl || ''
        });
        count++;
      }
      return count;
    });

    const added = insertMany(incoming);
    const total = db.prepare('SELECT COUNT(*) as count FROM visits').get().count;

    res.json({
      success: true,
      message: `Persisted ${added} visits to SQLite database`,
      added,
      totalStored: total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audits
app.get('/api/audits', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM audits ORDER BY id DESC').all();
    res.json({ success: true, audits: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync/audits', (req, res) => {
  try {
    const incoming = Array.isArray(req.body.audits) ? req.body.audits : req.body ? [req.body] : [];
    const insert = db.prepare(`
      INSERT INTO audits (outletCode, bdmCode, timestamp, operationalStatus, notes)
      VALUES (@outletCode, @bdmCode, @timestamp, @operationalStatus, @notes)
    `);

    const insertMany = db.transaction((auditsList) => {
      let count = 0;
      for (const a of auditsList) {
        if (!a || !a.outletCode) continue;
        insert.run({
          outletCode: a.outletCode,
          bdmCode: a.bdmCode || '',
          timestamp: a.timestamp || new Date().toISOString(),
          operationalStatus: a.operationalStatus || 'Open & Trading',
          notes: a.notes || ''
        });
        count++;
      }
      return count;
    });

    const added = insertMany(incoming);
    res.json({ success: true, added });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate Merges
app.get('/api/outlets/merges', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM merges ORDER BY id DESC').all();
    res.json({ success: true, merges: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/outlets/merge', (req, res) => {
  try {
    const { primaryCode, secondaryCode, mergedBy } = req.body;
    if (!primaryCode || !secondaryCode) {
      return res.status(400).json({ error: 'primaryCode and secondaryCode are required' });
    }

    db.prepare('DELETE FROM merges WHERE secondaryCode = ? OR secondaryCode = ?').run(secondaryCode, primaryCode);
    db.prepare(`
      INSERT INTO merges (primaryCode, secondaryCode, timestamp, mergedBy)
      VALUES (?, ?, ?, ?)
    `).run(primaryCode, secondaryCode, new Date().toISOString(), mergedBy || 'Territory Manager');

    const merges = db.prepare('SELECT * FROM merges').all();
    res.json({ success: true, message: `Merged ${secondaryCode} into ${primaryCode}`, merges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/outlets/unmerge', (req, res) => {
  try {
    const { secondaryCode } = req.body;
    db.prepare('DELETE FROM merges WHERE secondaryCode = ?').run(secondaryCode);
    const merges = db.prepare('SELECT * FROM merges').all();
    res.json({ success: true, message: `Unmerged ${secondaryCode}`, merges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Custom Category CSVs & Metadata in SQLite (Supports Multiple Files per Category)
app.get('/api/db/metadata', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, category, fileName, fileSize, rowCount, uploadedAt, isCustom FROM category_csvs ORDER BY uploadedAt ASC').all();
    const results = {
      bdms: [],
      outlets: [],
      'billing-monthly': [],
      'visit-log': []
    };
    for (const r of rows) {
      if (results[r.category]) {
        results[r.category].push({
          ...r,
          isCustom: Boolean(r.isCustom),
          version: new Date(r.uploadedAt).getTime()
        });
      }
    }
    res.json({ success: true, metadata: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const rows = db.prepare('SELECT id, fileName, csvContent, rowCount FROM category_csvs WHERE category = ? ORDER BY uploadedAt ASC').all(category);
    if (rows.length === 0) {
      return res.json({ success: true, csvContent: null, files: [] });
    }
    if (rows.length === 1) {
      return res.json({ success: true, csvContent: rows[0].csvContent, files: rows });
    }

    // Merge multiple CSV files seamlessly
    let combinedHeaders = [];
    const allRowsMap = new Map();
    let autoIncKey = 0;

    for (const r of rows) {
      const parsed = Papa.parse(r.csvContent, { header: true, skipEmptyLines: true });
      if (parsed.meta.fields && combinedHeaders.length === 0) {
        combinedHeaders = parsed.meta.fields;
      } else if (parsed.meta.fields) {
        for (const f of parsed.meta.fields) {
          if (!combinedHeaders.includes(f)) combinedHeaders.push(f);
        }
      }

      for (const row of parsed.data) {
        let key = '';
        if (category === 'bdms') {
          key = (row['BDM Code'] || row['bdm_code'] || `auto_${++autoIncKey}`).trim();
        } else if (category === 'outlets') {
          key = (row['Outlet Code'] || row['outlet_code'] || `auto_${++autoIncKey}`).trim();
        } else if (category === 'billing-monthly') {
          const oCode = (row['Outlet Code'] || row['outlet_code'] || '').trim();
          const m = (row['Month'] || row['month'] || '').trim();
          key = oCode && m ? `${oCode}_${m}` : `auto_${++autoIncKey}`;
        } else if (category === 'visit-log') {
          const vId = (row['Visit ID'] || row['visit_id'] || row['id'] || '').trim();
          key = vId || `auto_${++autoIncKey}`;
        } else {
          key = `auto_${++autoIncKey}`;
        }
        allRowsMap.set(key, row);
      }
    }

    const mergedData = Array.from(allRowsMap.values());
    const mergedCsv = Papa.unparse({
      fields: combinedHeaders,
      data: mergedData
    });

    res.json({ success: true, csvContent: mergedCsv, files: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View specific uploaded CSV file
app.get('/api/db/file/:id', (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT id, category, fileName, fileSize, rowCount, uploadedAt, isCustom, csvContent FROM category_csvs WHERE id = ?').get(id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    res.json({ success: true, file: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload new CSV file for a category
app.post('/api/db/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const { csvContent, fileName, rowCount } = req.body;
    const fileSize = Buffer.byteLength(csvContent || '', 'utf8');
    const uploadedAt = new Date().toISOString();
    const id = `${category}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    db.prepare(`
      INSERT INTO category_csvs (id, category, csvContent, fileName, fileSize, rowCount, uploadedAt, isCustom)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, category, csvContent, fileName, fileSize, rowCount, uploadedAt);

    res.json({
      success: true,
      metadata: {
        id,
        category,
        fileName,
        fileSize,
        rowCount,
        uploadedAt,
        isCustom: true,
        version: Date.now()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete specific uploaded CSV file by ID
app.delete('/api/db/file/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM category_csvs WHERE id = ?').run(id);
    res.json({ success: true, message: 'File deleted successfully', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all uploaded CSV files for a category (revert category to baseline)
app.delete('/api/db/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    db.prepare('DELETE FROM category_csvs WHERE category = ?').run(category);
    res.json({ success: true, message: `Reverted all ${category} files to baseline CSV` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/reset', (req, res) => {
  try {
    db.prepare('DELETE FROM category_csvs').run();
    db.prepare('DELETE FROM merges').run();
    db.prepare('DELETE FROM audits').run();
    db.prepare('DELETE FROM visits').run();
    res.json({ success: true, message: 'All SQLite tables reset to factory baseline' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
