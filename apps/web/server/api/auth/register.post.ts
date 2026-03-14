import bcrypt from 'bcryptjs'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string, username: string, password: string, fullName: string }>(event)
  // valida input...
  const hash = await bcrypt.hash(body.password, 10)
  const db = getDb()
  await db.insert(users).values({
    email: body.email,
    username: body.username,
    passwordHash: hash,
    fullName: body.fullName,
    countryCode: 'IT',
    birthDate: new Date('2000-01-01')
  })
  return { ok: true }
})