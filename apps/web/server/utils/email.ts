import nodemailer from 'nodemailer'
import { createError } from 'h3'
import { useRuntimeConfig } from '#imports'

type EmailPayload = {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail(payload: EmailPayload) {
  const config = useRuntimeConfig()
  const smtp = config.smtp

  if (!smtp?.host || !smtp?.user || !smtp?.pass || !smtp?.fromEmail) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SMTP non configurato'
    })
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  })

  const fromName = smtp.fromName ? smtp.fromName.trim() : ''
  const from = fromName ? `"${fromName}" <${smtp.fromEmail}>` : smtp.fromEmail

  await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html
  })
}
