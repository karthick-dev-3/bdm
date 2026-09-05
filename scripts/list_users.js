// scripts/list_users.js
import { db } from '../server/db.js';

const rows = db.prepare('SELECT id, username, email, role FROM users').all();
console.log('Users:', rows);
