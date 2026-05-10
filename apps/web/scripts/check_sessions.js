#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const args = process.argv.slice(2);
const identifier = args[0] || 'the_admin';
const envPath = path.resolve(process.cwd(), '.env.local');
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^DATABASE_URL=(.+)$/m);
  if (match) dbUrl = match[1].trim();
}
if (!dbUrl) {
  console.error('DATABASE_URL non trovata (.env.local o env vuoto)');
  process.exit(1);
}

let url;
try {
  url = new URL(dbUrl);
} catch (e) {
  console.error('DATABASE_URL non valida:', dbUrl);
  process.exit(2);
}

const user = decodeURIComponent(url.username || '');
const password = decodeURIComponent(url.password || '');
const host = url.hostname || '127.0.0.1';
const port = url.port || '3306';
const database = (url.pathname || '').replace(/^\//, '') || '';

(async () => {
  const pool = mysql.createPool({ host, port, user, password, database, waitForConnections: true, connectionLimit: 5 });
  try {
    const [rowsUsers] = await pool.query('SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1', [identifier, identifier]);
    if (!rowsUsers || rowsUsers.length === 0) {
      console.log('User non trovato:', identifier);
      process.exit(0);
    }
    const userRow = rowsUsers[0];
    console.log('User trovato:', userRow);
    const [sessions] = await pool.query('SELECT id, session_token, ip, user_agent, device_label, expires_at, created_at FROM user_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [userRow.id]);
    console.log('Sessioni trovate:', sessions.length);
    console.log(JSON.stringify(sessions, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Errore query DB:', err);
    process.exit(3);
  } finally {
    await pool.end();
  }
})();
