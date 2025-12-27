import sgMail from "@sendgrid/mail"
import { Invoice, InvoiceLineItem } from "@prisma/client"

type InvoiceWithRelations = Invoice & {
  client: {
    id: string
    fullName: string
    email: string
    phone?: string | null
  }
  trainer: {
    id: string
    fullName: string
    email: string
  }
  lineItems: InvoiceLineItem[]
}

export class EmailService {
  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY
    const fromEmail = process.env.SENDGRID_FROM_EMAIL

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is not set')
    }

    if (!apiKey.startsWith('SG.')) {
      throw new Error('Invalid SendGrid API key - must start with "SG."')
    }

    if (!fromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL environment variable is not set')
    }

    sgMail.setApiKey(apiKey)

    const emailHtml = this.buildPasswordResetEmailHtml(resetUrl)
    const emailText = this.buildPasswordResetEmailText(resetUrl)

    const msg = {
      to: email,
      from: {
        email: fromEmail,
        name: 'TrainTrack',
      },
      subject: 'Reset your password',
      text: emailText,
      html: emailHtml,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
      },
    }

    try {
      await sgMail.send(msg)
      console.log(`✅ Password reset email sent to ${email}`)
    } catch (error) {
      console.error(`❌ Failed to send password reset email:`, error)
      throw error
    }
  }

  private buildPasswordResetEmailHtml(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Password Reset</h1>
          </div>

          <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 20px 0;">You requested to reset your password. Click the button below to create a new password:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
            </div>

            <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">Powered by TrainTrack</p>
          </div>
        </body>
      </html>
    `
  }

  private buildPasswordResetEmailText(resetUrl: string): string {
    return `
PASSWORD RESET

You requested to reset your password. Visit the link below to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

---
Powered by TrainTrack
    `.trim()
  }

  /**
   * Send invoice email to client
   */
  async sendInvoiceEmail(invoice: InvoiceWithRelations): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY
    const fromEmail = process.env.SENDGRID_FROM_EMAIL

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is not set')
    }

    if (!apiKey.startsWith('SG.')) {
      throw new Error('Invalid SendGrid API key - must start with "SG."')
    }

    if (!fromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL environment variable is not set')
    }

    sgMail.setApiKey(apiKey)

    const emailHtml = this.buildInvoiceEmailHtml(invoice)
    const emailText = this.buildInvoiceEmailText(invoice)

    const msg = {
      to: invoice.client.email,
      from: {
        email: fromEmail,
        name: invoice.trainer.fullName,
      },
      replyTo: invoice.trainer.email, // Client can reply directly to trainer
      subject: `Invoice #${invoice.id.slice(0, 8)} from ${invoice.trainer.fullName}`,
      text: emailText,
      html: emailHtml,
      // Anti-spam headers
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
      },
    }

    try {
      await sgMail.send(msg)
      console.log(`✅ Invoice email sent to ${invoice.client.email}`)
    } catch (error) {
      console.error(`❌ Failed to send invoice email:`, error)
      throw error
    }
  }

  private buildInvoiceEmailHtml(invoice: InvoiceWithRelations): string {
    const lineItemsHtml = invoice.lineItems
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${item.total.toFixed(2)}</td>
        </tr>
      `
      )
      .join("")

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice from ${invoice.trainer.fullName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Invoice</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">From ${invoice.trainer.fullName}</p>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <p style="margin: 0; font-size: 12px; color: #6b7280;">BILL TO</p>
                <p style="margin: 5px 0; font-weight: 600;">${invoice.client.fullName}</p>
                <p style="margin: 0; font-size: 14px; color: #6b7280;">${invoice.client.email}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-size: 12px; color: #6b7280;">INVOICE DATE</p>
                <p style="margin: 5px 0;">${this.formatDate(invoice.createdAt)}</p>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">DUE DATE</p>
                <p style="margin: 5px 0; font-weight: 600; color: #dc2626;">${this.formatDate(invoice.dueDate)}</p>
              </div>
            </div>
          </div>

          <div style="border: 1px solid #e5e7eb; border-top: none;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">DESCRIPTION</th>
                  <th style="padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">QTY</th>
                  <th style="padding: 12px 8px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">RATE</th>
                  <th style="padding: 12px 8px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 16px 8px; text-align: right; font-weight: 600; font-size: 16px;">TOTAL DUE</td>
                  <td style="padding: 16px 8px; text-align: right; font-weight: 700; font-size: 18px; color: #3b82f6;">$${invoice.amount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          ${invoice.notes ? `
          <div style="margin-top: 20px; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Note:</strong> ${invoice.notes}</p>
          </div>
          ` : ''}

          <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Questions about this invoice?</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Reply to this email to contact ${invoice.trainer.fullName}</p>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">Powered by TrainTrack</p>
          </div>
        </body>
      </html>
    `
  }

  private buildInvoiceEmailText(invoice: InvoiceWithRelations): string {
    const lineItemsText = invoice.lineItems
      .map((item) => `${item.description} (x${item.quantity}) - $${item.total.toFixed(2)}`)
      .join("\n")

    return `
INVOICE FROM ${invoice.trainer.fullName.toUpperCase()}

Bill To: ${invoice.client.fullName}
Email: ${invoice.client.email}

Invoice Date: ${this.formatDate(invoice.createdAt)}
Due Date: ${this.formatDate(invoice.dueDate)}

---

LINE ITEMS:
${lineItemsText}

---

TOTAL DUE: $${invoice.amount.toFixed(2)}

${invoice.notes ? `\nNote: ${invoice.notes}` : ''}

Questions? Reply to this email to contact ${invoice.trainer.fullName}.

---
Powered by TrainTrack
    `.trim()
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  /**
   * Send contact form submission email
   */
  async sendContactFormEmail(name: string, email: string, message: string): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY
    const fromEmail = process.env.SENDGRID_FROM_EMAIL
    const contactEmail = process.env.CONTACT_EMAIL || fromEmail

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is not set')
    }

    if (!apiKey.startsWith('SG.')) {
      throw new Error('Invalid SendGrid API key - must start with "SG."')
    }

    if (!fromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL environment variable is not set')
    }

    sgMail.setApiKey(apiKey)

    const emailHtml = this.buildContactFormEmailHtml(name, email, message)
    const emailText = this.buildContactFormEmailText(name, email, message)

    const msg = {
      to: contactEmail,
      from: {
        email: fromEmail,
        name: 'TrainTrack Contact Form',
      },
      replyTo: email,
      subject: `New inquiry from ${name}`,
      text: emailText,
      html: emailHtml,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
      },
    }

    try {
      await sgMail.send(msg)
      console.log(`✅ Contact form email sent for ${name} (${email})`)
    } catch (error) {
      console.error(`❌ Failed to send contact form email:`, error)
      throw error
    }
  }

  private buildContactFormEmailHtml(name: string, email: string, message: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Contact Form Submission</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">New Inquiry</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">From ${name}</p>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <div style="margin-bottom: 20px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">FROM</p>
              <p style="margin: 5px 0; font-weight: 600;">${name}</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">${email}</p>
            </div>

            <div style="margin-top: 20px; padding: 16px; background-color: white; border: 1px solid #e5e7eb; border-radius: 6px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; margin-bottom: 8px;">MESSAGE</p>
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">Reply directly to this email to respond to ${name}</p>
          </div>
        </body>
      </html>
    `
  }

  private buildContactFormEmailText(name: string, email: string, message: string): string {
    return `
NEW INQUIRY FROM ${name.toUpperCase()}

From: ${name}
Email: ${email}

---

MESSAGE:
${message}

---

Reply directly to this email to respond to ${name}.
    `.trim()
  }
}
