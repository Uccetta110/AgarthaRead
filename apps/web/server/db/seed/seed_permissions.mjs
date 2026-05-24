import mysql from 'mysql2/promise'

const databaseUrl = process.env.DATABASE_URL
const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim()
const managerEmail = process.env.SEED_MANAGER_EMAIL?.trim()
const managerPermissionCodes = (process.env.SEED_MANAGER_PERMISSION_CODES || 'VU,MU,EU,AA,MI,EI,EC')
  .split(',')
  .map((code) => code.trim())
  .filter(Boolean)

if (!databaseUrl) {
  console.error('DATABASE_URL non impostata')
  process.exit(1)
}

const pool = mysql.createPool(databaseUrl)

async function setUserRole(email, role) {
  if (!email) return null

  const [rows] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email])
  if (!rows.length) {
    console.log(`User with email ${email} not found. Skipping ${role} seeding.`)
    return null
  }

  const userId = rows[0].id
  await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId])
  console.log(`Set user id=${userId} (${email}) to role=${role}`)
  return userId
}

async function seedManagerPermissions(userId, codes) {
  await pool.execute('DELETE FROM manager_permissions WHERE user_id = ?', [userId])

  if (!codes.length) return

  const values = codes.map((code) => [userId, code, null])
  await pool.query(
    'INSERT INTO manager_permissions (user_id, permission_code, granted_by) VALUES ?',
    [values],
  )
  console.log(`Assigned permissions ${codes.join(', ')} to user id=${userId}`)
}

try {
  if (adminEmail) {
    await setUserRole(adminEmail, 'admin')
  }

  if (managerEmail) {
    const managerUserId = await setUserRole(managerEmail, 'manager')
    if (managerUserId) {
      await seedManagerPermissions(managerUserId, managerPermissionCodes)
    }
  }

  console.log('Seeding completed')
} catch (error) {
  console.error('Seeding failed', error)
  process.exitCode = 1
} finally {
  await pool.end()
}
