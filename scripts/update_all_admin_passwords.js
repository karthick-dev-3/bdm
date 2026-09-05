// scripts/update_all_admin_passwords.js
import { db } from '../server/db.js';
import { hashPassword } from '../server/auth.js';

const newPassword = 'bdm@2026'; // known password for admin accounts
const usernames = ['bdmadmin', 'admin']; // admin usernames to update

const passwordHash = hashPassword(newPassword);
usernames.forEach((uname) => {
  const result = db.prepare('UPDATE users SET passwordHash = ? WHERE LOWER(username) = ?').run(passwordHash, uname.toLowerCase());
  console.log(`Updated password for ${uname}. Rows affected: ${result.changes}`);
});
