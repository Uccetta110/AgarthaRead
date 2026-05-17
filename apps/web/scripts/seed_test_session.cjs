const { config } = require('dotenv')
const { resolve } = require('path')
const fs = require('fs')
const crypto = require('crypto')
const mysql = require('mysql2/promise')

// Load .env.local from apps/web
config({ path: resolve(process.cwd(), '.env.local') })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set in .env.local')
  process.exit(1)
}

function formatMysqlDate(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

(async () => {
  const pool = mysql.createPool({ uri: DATABASE_URL, waitForConnections: true, connectionLimit: 5 })
  const conn = await pool.getConnection()
  try {
    // Prefer existing test user, otherwise create one
    const [rows] = await conn.query('SELECT id FROM users WHERE username = ? LIMIT 1', ['test_integration'])
    let userId
    if (rows && rows.length > 0) {
      userId = rows[0].id
      console.log('Found existing user id', userId)
    } else {
      const [res] = await conn.query('INSERT INTO users (email, username, full_name, country_code, birth_date, role) VALUES (?,?,?,?,?,?)', [
        'test_integration@example.com',
        'test_integration',
        'Test Integration',
        'IT',
        '2000-01-01',
        'user'
      ])
      userId = res.insertId
      console.log('Created user id', userId)
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await conn.query('INSERT INTO user_sessions (user_id, session_token, ip, user_agent, device_label, expires_at) VALUES (?,?,?,?,?,?)', [
      userId,
      token,
      '127.0.0.1',
      'seed-script',
      'test',
      formatMysqlDate(expires)
    ])

    const envPath = resolve(process.cwd(), '.env.local')
    const line = `TEST_SESSION_TOKEN=${token}\nTEST_SESSION_USER=${userId}\n`
    fs.appendFileSync(envPath, line)
    console.log('Wrote test token to', envPath)
    console.log('Token:', token)
    console.log('User ID:', userId)
  } catch (err) {
    console.error(err)
    process.exitCode = 1
  } finally {
    try { await conn.release() } catch (e) {}
    try { await pool.end() } catch (e) {}
  }
})()
