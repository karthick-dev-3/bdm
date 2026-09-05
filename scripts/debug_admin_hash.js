// scripts/debug_admin_hash.js
import { db } from '../server/db.js';

const row = db.prepare('SELECT username, passwordHash FROM users WHERE LOWER(username) = ?').get('bdmadmin');
console.log('bdmadmin passwordHash:', row.passwordHash);
