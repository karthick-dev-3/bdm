// scripts/update_admin_password.js
import { db } from '../server/db.js';
import { hashPassword } from '../server/auth.js';

const newPassword = 'bdm@2026'; // desired admin password
const username = 'bdmadmin'; // admin username

const passwordHash = hashPassword(newPassword);
const result = db.prepare('UPDATE users SET passwordHash = ? WHERE LOWER(username) = ?').run(passwordHash, username.toLowerCase());
console.log(`Admin password updated. Rows affected: ${result.changes}`);
