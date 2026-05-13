import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../db/client'
import { users } from '../../../../db/schema'
import { requireSessionUser } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const db = getDb()

  const secret = new OTPAuth.Secret()
  const secretBase32 = secret.base32
  const totp = new OTPAuth.TOTP({
    issuer: 'AgarthaRead',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret
  })

  const otpauthUrl = totp.toString()
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

  await db
    .update(users)
    .set({ totpSecret: secretBase32 })
    .where(eq(users.id, user.id))

  return {
    ok: true,
    otpauthUrl,
    qrCodeDataUrl,
    secret: secretBase32
  }
})
