import mysql from 'mysql2/promise'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('DATABASE_URL non impostata')
  process.exit(1)
}

const pool = mysql.createPool(databaseUrl)

try {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const sql = `
      INSERT INTO users (email, username, password_hash, full_name, role, country_code, birth_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        full_name = VALUES(full_name),
        role = VALUES(role),
        country_code = VALUES(country_code),
        birth_date = VALUES(birth_date)
    `

    const params = [
      'herobrinesonoio@gmail.com',
      'the_admin',
      '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      'Amministratore Sistema',
      'admin',
      'IT',
      '2007-01-23',
    ]

    await conn.execute(sql, params)
    await conn.commit()
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }

  console.log('Seed admin completato')
} catch (error) {
  console.error('Errore seed admin:', error)
  process.exitCode = 1
} finally {
  await pool.end()
}
