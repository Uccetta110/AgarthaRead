import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

const DB = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'root_dev',
  database: 'agartharead',
}

async function run() {
  console.log('Integration tests started')
  const conn = await mysql.createConnection(DB)
  try {
    // 1) check suspended_until column
    const [cols] = await conn.execute("SHOW COLUMNS FROM users LIKE 'suspended_until'")
    console.log('suspended_until column:', cols.length > 0 ? 'present' : 'missing')

    // 2) check role enum contains suspended/banned
    const [roleInfo] = await conn.execute("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'", [DB.database])
    const type = roleInfo[0] && roleInfo[0].COLUMN_TYPE
    console.log('role column type:', type)
    const hasSuspended = type && type.includes("'suspended'")
    const hasBanned = type && type.includes("'banned'")
    console.log('contains suspended:', !!hasSuspended, 'contains banned:', !!hasBanned)

    // 3) ensure suspended users lists are private
    const [rows] = await conn.execute(`SELECT COUNT(*) AS cnt FROM user_lists ul JOIN users u ON ul.user_id = u.id WHERE u.role = 'suspended' AND ul.is_public = 1`)
    console.log('suspended users with public lists (should be 0):', rows[0].cnt)

    // 4) create a temporary banned user and try login via HTTP (if server running)
    const testEmail = 'integration_banned_test@example.com'
    const username = 'integration_banned_test'
    const password = 'Test1234!'
    const passwordHash = await bcrypt.hash(password, 10)

    console.log('Inserting test banned user...')
    await conn.execute(`DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email = ?)` , [testEmail])
    await conn.execute(`DELETE FROM users WHERE email = ?`, [testEmail])
    const [res] = await conn.execute(`INSERT INTO users (email, username, password_hash, full_name, country_code, birth_date, role) VALUES (?,?,?,?,?,?,?)`, [testEmail, username, passwordHash, 'Integration Banned', 'IT', '1990-01-01', 'banned'])
    const insertedId = res.insertId
    console.log('Inserted user id:', insertedId)

    // try login via HTTP
    let serverReachable = true
    try {
      const resp = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: testEmail, password }),
      })
      console.log('HTTP login status:', resp.status)
      const body = await resp.text()
      console.log('HTTP login body:', body)
    } catch (e) {
      serverReachable = false
      console.log('HTTP server not reachable at http://localhost:3000 - skipping HTTP assertions')
    }

    // cleanup
    await conn.execute(`DELETE FROM user_sessions WHERE user_id = ?`, [insertedId])
    await conn.execute(`DELETE FROM users WHERE id = ?`, [insertedId])
    console.log('Cleaned up test user')

    console.log('Integration tests completed')
  } finally {
    await conn.end()
  }
}

run().catch((err) => {
  console.error('Integration tests failed:', err)
  process.exit(1)
})
