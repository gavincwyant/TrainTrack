import { http, HttpResponse } from 'msw'

// Track sent emails for testing
let sentEmails: Array<{
  to: string
  from?: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}> = []

/**
 * MSW handlers for SendGrid API
 */
export const sendgridHandlers = [
  // Send email endpoint
  http.post('https://api.sendgrid.com/v3/mail/send', async ({ request }) => {
    const body = (await request.json()) as any

    // Extract email data
    const emailData = {
      to: body.personalizations?.[0]?.to?.[0]?.email || 'unknown@example.com',
      from: body.from?.email,
      subject: body.subject || '',
      html: body.content?.find((c: any) => c.type === 'text/html')?.value || '',
      text: body.content?.find((c: any) => c.type === 'text/plain')?.value,
      replyTo: body.reply_to?.email,
    }

    sentEmails.push(emailData)

    // Return successful response (202 Accepted)
    return HttpResponse.json(
      { message: 'success' },
      { status: 202 }
    )
  }),
]

/**
 * Get all emails sent during tests
 */
export function getSentEmails() {
  return sentEmails
}

/**
 * Clear sent emails history
 */
export function clearSentEmails() {
  sentEmails = []
}

/**
 * Find sent email by recipient
 */
export function findEmailByRecipient(email: string) {
  return sentEmails.find((e) => e.to === email)
}

/**
 * Find sent emails by subject (partial match)
 */
export function findEmailsBySubject(subject: string) {
  return sentEmails.filter((e) => e.subject.includes(subject))
}
