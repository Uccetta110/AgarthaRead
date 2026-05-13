import crypto from 'node:crypto'

export function generateOtp(length = 6) {
  const max = 10 ** length
  const code = crypto.randomInt(0, max)
  return String(code).padStart(length, '0')
}

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex')
}

export function hashValue(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}