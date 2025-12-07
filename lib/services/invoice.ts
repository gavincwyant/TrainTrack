import { prisma } from "@/lib/db"
import { EmailService } from "./email"
import { Prisma } from "@prisma/client"

export class InvoiceService {
  private emailService: EmailService

  constructor() {
    this.emailService = new EmailService()
  }

  /**
   * Generate invoice for a single completed appointment (per-session billing)
   */
  async generatePerSessionInvoice(appointmentId: string): Promise<void> {
    console.log(`📄 Generating per-session invoice for appointment: ${appointmentId}`)

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: {
          include: {
            clientProfile: true,
          },
        },
        trainer: true,
      },
    })

    if (!appointment) {
      console.log(`❌ Appointment not found: ${appointmentId}`)
      return
    }

    if (appointment.status !== "COMPLETED") {
      console.log(`⏭️ Appointment not completed, skipping invoice`)
      return
    }

    const clientProfile = appointment.client.clientProfile
    if (!clientProfile) {
      console.log(`❌ Client profile not found for client: ${appointment.client.id}`)
      return
    }

    // Check if auto-invoicing is enabled for this client
    if (!clientProfile.autoInvoiceEnabled) {
      console.log(`⏭️ Auto-invoicing disabled for client: ${appointment.client.fullName}`)
      return
    }

    // Check billing frequency
    if (clientProfile.billingFrequency !== "PER_SESSION") {
      console.log(`⏭️ Client has MONTHLY billing, skipping per-session invoice`)
      return
    }

    // Check if invoice already exists for this appointment
    const existingInvoice = await prisma.invoiceLineItem.findFirst({
      where: { appointmentId },
      include: { invoice: true },
    })

    if (existingInvoice) {
      console.log(`⏭️ Invoice already exists for appointment: ${appointmentId}`)
      return
    }

    // Get trainer settings for due date default
    const trainerSettings = await prisma.trainerSettings.findUnique({
      where: { trainerId: appointment.trainerId },
    })

    const dueDays = trainerSettings?.defaultInvoiceDueDays || 30
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + dueDays)

    // Create invoice
    const sessionRate = clientProfile.sessionRate
    const invoice = await prisma.invoice.create({
      data: {
        workspaceId: appointment.workspaceId,
        trainerId: appointment.trainerId,
        clientId: appointment.clientId,
        amount: sessionRate,
        dueDate,
        status: "SENT", // Automatically mark as SENT since we're emailing it
        lineItems: {
          create: {
            appointmentId: appointment.id,
            description: `Training session on ${new Date(appointment.startTime).toLocaleDateString()}`,
            quantity: 1,
            unitPrice: sessionRate,
            total: sessionRate,
          },
        },
      },
      include: {
        client: true,
        trainer: true,
        lineItems: true,
      },
    })

    console.log(`✅ Created invoice: ${invoice.id}`)

    // Send email
    try {
      await this.emailService.sendInvoiceEmail(invoice)
      console.log(`✅ Invoice email sent successfully`)
    } catch (error) {
      console.error(`❌ Failed to send invoice email:`, error)
      // Mark invoice as DRAFT if email fails
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "DRAFT" },
      })
    }
  }

  /**
   * Generate monthly invoice for a client
   */
  async generateMonthlyInvoice(clientId: string, trainerId: string): Promise<void> {
    console.log(`📄 Generating monthly invoice for client: ${clientId}`)

    const client = await prisma.user.findUnique({
      where: { id: clientId },
      include: {
        clientProfile: true,
      },
    })

    if (!client || !client.clientProfile) {
      console.log(`❌ Client or profile not found: ${clientId}`)
      return
    }

    // Check if auto-invoicing is enabled for this client
    if (!client.clientProfile.autoInvoiceEnabled) {
      console.log(`⏭️ Auto-invoicing disabled for client: ${client.fullName}`)
      return
    }

    // Check billing frequency
    if (client.clientProfile.billingFrequency !== "MONTHLY") {
      console.log(`⏭️ Client has PER_SESSION billing, skipping monthly invoice`)
      return
    }

    // Calculate date range (previous month)
    const now = new Date()
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    console.log(`📅 Billing period: ${firstDayLastMonth.toISOString()} to ${lastDayLastMonth.toISOString()}`)

    // Get completed appointments in the billing period
    const appointments = await prisma.appointment.findMany({
      where: {
        clientId,
        trainerId,
        status: "COMPLETED",
        startTime: {
          gte: firstDayLastMonth,
          lte: lastDayLastMonth,
        },
      },
      orderBy: {
        startTime: "asc",
      },
    })

    if (appointments.length === 0) {
      console.log(`⏭️ No completed appointments in billing period`)
      return
    }

    console.log(`📊 Found ${appointments.length} completed appointments`)

    // Check if invoice already exists for this period
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        clientId,
        trainerId,
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1), // This month
        },
      },
    })

    if (existingInvoice) {
      console.log(`⏭️ Monthly invoice already exists for this period`)
      return
    }

    // Get trainer settings
    const trainerSettings = await prisma.trainerSettings.findUnique({
      where: { trainerId },
    })

    const dueDays = trainerSettings?.defaultInvoiceDueDays || 30
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + dueDays)

    // Calculate total
    const sessionRate = client.clientProfile.sessionRate
    const totalAmount = new Prisma.Decimal(sessionRate).mul(appointments.length)

    // Create invoice with line items
    const invoice = await prisma.invoice.create({
      data: {
        workspaceId: client.workspaceId!,
        trainerId,
        clientId,
        amount: totalAmount,
        dueDate,
        status: "SENT",
        notes: `Monthly invoice for ${firstDayLastMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
        lineItems: {
          create: appointments.map((apt) => ({
            appointmentId: apt.id,
            description: `Training session on ${new Date(apt.startTime).toLocaleDateString()}`,
            quantity: 1,
            unitPrice: sessionRate,
            total: sessionRate,
          })),
        },
      },
      include: {
        client: true,
        trainer: true,
        lineItems: true,
      },
    })

    console.log(`✅ Created monthly invoice: ${invoice.id} ($${totalAmount})`)

    // Send email
    try {
      await this.emailService.sendInvoiceEmail(invoice)
      console.log(`✅ Invoice email sent successfully`)
    } catch (error) {
      console.error(`❌ Failed to send invoice email:`, error)
      // Mark invoice as DRAFT if email fails
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "DRAFT" },
      })
    }
  }

  /**
   * Process all monthly invoices for trainers whose invoice day is today
   */
  async processMonthlyInvoices(): Promise<void> {
    const today = new Date().getDate() // 1-31

    console.log(`🗓️ Processing monthly invoices for day: ${today}`)

    // Find all trainers whose monthly invoice day is today
    const trainersToInvoice = await prisma.trainerSettings.findMany({
      where: {
        autoInvoicingEnabled: true,
        monthlyInvoiceDay: today,
      },
      include: {
        trainer: true,
      },
    })

    console.log(`👥 Found ${trainersToInvoice.length} trainers to process`)

    for (const settings of trainersToInvoice) {
      console.log(`\n🏋️ Processing trainer: ${settings.trainer.fullName}`)

      // Get all clients with MONTHLY billing for this trainer
      const monthlyClients = await prisma.user.findMany({
        where: {
          workspaceId: settings.workspaceId,
          role: "CLIENT",
          clientProfile: {
            billingFrequency: "MONTHLY",
            autoInvoiceEnabled: true,
          },
        },
      })

      console.log(`📋 Found ${monthlyClients.length} monthly billing clients`)

      for (const client of monthlyClients) {
        try {
          await this.generateMonthlyInvoice(client.id, settings.trainerId)
        } catch (error) {
          console.error(`❌ Failed to generate invoice for client ${client.fullName}:`, error)
          // Continue processing other clients even if one fails
        }
      }
    }
  }
}
