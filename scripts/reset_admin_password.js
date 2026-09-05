// scripts/reset_admin_password.js
import { db } from '../server/db.js';
import { hashPassword } from '../server/auth.js';

const newPassword = 'admin123!'; // choose a password you know
const username = 'bdmadmin';

const passwordHash = hashPassword(newPassword);
const result = db.prepare('UPDATE users SET passwordHash = ? WHERE LOWER(username) = ?').run(passwordHash, username.toLowerCase());
console.log(`Updated password for ${username}. Rows affected: ${result.changes}`);
