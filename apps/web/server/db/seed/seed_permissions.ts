import 'dotenv/config'
import { getDb } from '../client'
import { users, managerPermissions } from '../schema'
import { eq } from 'drizzle-orm'

async function run() {
  const db = getDb()

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const managerEmail = process.env.SEED_MANAGER_EMAIL

  if (adminEmail) {
    const row = (await db.select().from(users).where(eq(users.email, adminEmail)).limit(1))[0]
    if (!row) {
      console.log(`Admin user with email ${adminEmail} not found. Skipping admin seeding.`)
    } else {
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, row.id))
      console.log(`Set user id=${row.id} (${adminEmail}) to role=admin`)
    }
  }

  if (managerEmail) {
    const row = (await db.select().from(users).where(eq(users.email, managerEmail)).limit(1))[0]
    if (!row) {
      console.log(`Manager user with email ${managerEmail} not found. Skipping manager seeding.`)
    } else {
      await db.update(users).set({ role: 'manager' }).where(eq(users.id, row.id))
      console.log(`Set user id=${row.id} (${managerEmail}) to role=manager`)

      const codes = ['VU','MU','EU','AA','MI','EI','EC']
      // remove existing
      await db.delete(managerPermissions).where(eq(managerPermissions.userId, row.id))
      for (const c of codes) {
        await db.insert(managerPermissions).values({ userId: row.id, permissionCode: c, grantedBy: null })
      }
      console.log(`Assigned permissions ${codes.join(', ')} to user id=${row.id}`)
    }
  }

  console.log('Seeding completed')
}

run().catch((err) => {
  console.error('Seeding failed', err)
  process.exit(1)
})
