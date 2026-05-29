import 'dotenv/config'
import { getDb } from '../client'
import { users, managerPermissions } from '../schema'
import { eq } from 'drizzle-orm'

async function setUserRole(db: ReturnType<typeof getDb>, email: string, role: 'admin' | 'manager') {
  const row = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0]
  if (!row) {
    console.log(`User with email ${email} not found. Skipping ${role} seeding.`)
    return null
  }

  await db.update(users).set({ role }).where(eq(users.id, row.id))
  console.log(`Set user id=${row.id} (${email}) to role=${role}`)
  return row.id
}

async function seedManagerPermissions(db: ReturnType<typeof getDb>, userId: number, codes: string[]) {
  await db.delete(managerPermissions).where(eq(managerPermissions.userId, userId))

  if (!codes.length) return

  for (const c of codes) {
    await db.insert(managerPermissions).values({ userId, permissionCode: c, grantedBy: null })
  }
  console.log(`Assigned permissions ${codes.join(', ')} to user id=${userId}`)
}

async function run() {
  const db = getDb()

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const managerEmail = process.env.SEED_MANAGER_EMAIL

  await db.transaction(async (tx) => {
    if (adminEmail) {
      await setUserRole(tx, adminEmail, 'admin')
    }

    if (managerEmail) {
      const managerUserId = await setUserRole(tx, managerEmail, 'manager')
      if (managerUserId) {
        const codes = ['VU', 'MU', 'EU', 'AA', 'MI', 'EI', 'EC']
        await seedManagerPermissions(tx, managerUserId, codes)
      }
    }
  })

  console.log('Seeding completed')
}

run().catch((err) => {
  console.error('Seeding failed', err)
  process.exit(1)
})
