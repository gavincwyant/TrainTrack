import { prisma } from "@/lib/db"
import { EmailService } from "./email"
import { Prisma, ClientProfile, TrainerSettings, Appointment } from "@prisma/client"

type GroupSessionMatchingLogic = "EXACT_MATCH" | "START_MATCH" | "END_MATCH" | "ANY_OVERLAP"

export class InvoiceService {
  private emailService: EmailService

  constructor() {
    this.emailService = new EmailService()
  }

  /**
   * Check if an appointment is part of a group session based on the trainer's matching logic
   * Returns whether it's a group session and the count of participants
   */
  private async getGroupSessionInfo(
    appointment: Appointment,
    matchingLogic: GroupSessionMatchingLogic
  ): Promise<{ isGroupSession: boolean; participantCount: number }> {
    // Build the overlap condition based on matching logic
    let overlapCondition: Prisma.AppointmentWhereInput

    switch (matchingLogic) {
      case "START_MATCH":
        overlapCondition = { startTime: appointment.startTime }
        break
      case "END_MATCH":
        overlapCondition = { endTime: appointment.endTime }
        break
      case "ANY_OVERLAP":
        // Any overlap: appointment A overlaps with B if A.start < B.end AND A.end > B.start
        overlapCondition = {
          AND: [
            { startTime: { lt: appointment.endTime } },
            { endTime: { gt: appointment.startTime } },
          ],
        }
        break
      case "EXACT_MATCH":
      default:
        overlapCondition = {
          startTime: appointment.startTime,
          endTime: appointment.endTime,
        }
    }

    const overlappingAppointments = await prisma.appointment.findMany({
      where: {
        trainerId: appointment.trainerId,
        workspaceId: appointment.workspaceId,
        status: { in: ["SCHEDULED", "COMPLETED"] },
        id: { not: appointment.id }, // Exclude the current appointment
        ...overlapCondition,
      },
    })

    // +1 to include the current appointment in the count
    const participantCount = overlappingAppointments.length + 1
    return {
      isGroupSession: participantCount > 1,
      participantCount,
    }
  }

  /**
   * Determine the session rate for billing based on whether it's a group session
   * Fallback chain: client group rate → trainer default group rate → client individual rate
   */
  private getSessionRate(
    clientProfile: ClientProfile,
    trainerSettings: TrainerSettings | null,
    isGroupSession: boolean
  ): Prisma.Decimal {
    if (isGroupSession) {
      // Try client's group rate first
      if (clientProfile.groupSessionRate) {
        return new Prisma.Decimal(clientProfile.groupSessionRate)
      }
      // Try trainer's default group rate
      if (trainerSettings?.defaultGroupSessionRate) {
        return new Prisma.Decimal(trainerSettings.defaultGroupSessionRate)
      }
    }
    // Fall back to individual session rate
    return new Prisma.Decimal(clientProfile.sessionRate)
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

    // Get trainer settings for due date default and group session matching logic
    const trainerSettings = await prisma.trainerSettings.findUnique({
      where: { trainerId: appointment.trainerId },
    })

    const dueDays = trainerSettings?.defaultInvoiceDueDays || 30
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + dueDays)

    // Check if this is a group session
    const matchingLogic = (trainerSettings?.groupSessionMatchingLogic || "EXACT_MATCH") as GroupSessionMatchingLogic
    const { isGroupSession } = await this.getGroupSessionInfo(appointment, matchingLogic)

    // Determine the appropriate rate
    const sessionRate = this.getSessionRate(clientProfile, trainerSettings, isGroupSession)
    const sessionType = isGroupSession ? "Group training session" : "Training session"

    console.log(`📊 Session type: ${isGroupSession ? "GROUP" : "INDIVIDUAL"}, Rate: $${sessionRate}`)

    // Create invoice
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
            description: `${sessionType} on ${new Date(appointment.startTime).toLocaleDateString()}`,
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

    // Determine group session status and rate for each appointment
    const matchingLogic = (trainerSettings?.groupSessionMatchingLogic || "EXACT_MATCH") as GroupSessionMatchingLogic

    const lineItemsData = await Promise.all(
      appointments.map(async (apt) => {
        const { isGroupSession } = await this.getGroupSessionInfo(apt, matchingLogic)
        const rate = this.getSessionRate(client.clientProfile!, trainerSettings, isGroupSession)
        const sessionType = isGroupSession ? "Group training session" : "Training session"

        return {
          appointmentId: apt.id,
          description: `${sessionType} on ${new Date(apt.startTime).toLocaleDateString()}`,
          quantity: 1,
          unitPrice: rate,
          total: rate,
          isGroupSession,
        }
      })
    )

    // Calculate total from individual line items (since rates may vary)
    const totalAmount = lineItemsData.reduce(
      (sum, item) => sum.add(item.total),
      new Prisma.Decimal(0)
    )

    const groupCount = lineItemsData.filter(item => item.isGroupSession).length
    const individualCount = lineItemsData.length - groupCount
    console.log(`📊 Sessions: ${groupCount} group, ${individualCount} individual, Total: $${totalAmount}`)

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
          create: lineItemsData.map(({ appointmentId, description, quantity, unitPrice, total }) => ({
            appointmentId,
            description,
            quantity,
            unitPrice,
            total,
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
