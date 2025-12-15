import { prisma } from "@/lib/db"
import { EmailService } from "./email"
import { Prisma, ClientProfile, TrainerSettings, Appointment } from "@prisma/client"
import { format } from "date-fns"

type GroupSessionMatchingLogic = "EXACT_MATCH" | "START_MATCH" | "END_MATCH" | "ANY_OVERLAP"

export interface PrepaidDeductionResult {
  success: boolean
  newBalance: Prisma.Decimal
  amountDeducted: Prisma.Decimal
  shouldGenerateInvoice: boolean
  shouldSwitchToPerSession: boolean
}

export interface PrepaidClientSummary {
  client: {
    id: string
    fullName: string
    email: string
  }
  currentBalance: number
  targetBalance: number
  sessionsConsumedSinceLastCredit: number
  lastTransactionDate: Date | null
  balanceStatus: "healthy" | "low" | "empty"
}

export interface VoidAndSwitchResult {
  success: boolean
  error?: string
  creditAmount: number
  newBillingFrequency?: "PER_SESSION" | "MONTHLY"
}

export class PrepaidService {
  private emailService: EmailService

  constructor() {
    this.emailService = new EmailService()
  }

  /**
   * Check if an appointment is part of a group session
   */
  private async getGroupSessionInfo(
    appointment: Appointment,
    matchingLogic: GroupSessionMatchingLogic
  ): Promise<{ isGroupSession: boolean; participantCount: number }> {
    let overlapCondition: Prisma.AppointmentWhereInput

    switch (matchingLogic) {
      case "START_MATCH":
        overlapCondition = { startTime: appointment.startTime }
        break
      case "END_MATCH":
        overlapCondition = { endTime: appointment.endTime }
        break
      case "ANY_OVERLAP":
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
        id: { not: appointment.id },
        ...overlapCondition,
      },
    })

    const participantCount = overlappingAppointments.length + 1
    return {
      isGroupSession: participantCount > 1,
      participantCount,
    }
  }

  /**
   * Determine the session rate for billing
   */
  private getSessionRate(
    clientProfile: ClientProfile,
    trainerSettings: TrainerSettings | null,
    isGroupSession: boolean
  ): Prisma.Decimal {
    if (isGroupSession) {
      if (clientProfile.groupSessionRate) {
        return new Prisma.Decimal(clientProfile.groupSessionRate)
      }
      if (trainerSettings?.defaultGroupSessionRate) {
        return new Prisma.Decimal(trainerSettings.defaultGroupSessionRate)
      }
    }
    return new Prisma.Decimal(clientProfile.sessionRate)
  }

  /**
   * Get the cost of the next scheduled session for a client
   */
  private async getNextScheduledSessionCost(
    clientId: string,
    trainerId: string,
    clientProfile: ClientProfile,
    trainerSettings: TrainerSettings | null
  ): Promise<Prisma.Decimal | null> {
    const nextAppointment = await prisma.appointment.findFirst({
      where: {
        clientId,
        trainerId,
        status: "SCHEDULED",
        startTime: { gt: new Date() },
      },
      orderBy: { startTime: "asc" },
    })

    if (!nextAppointment) {
      return null
    }

    const matchingLogic = (trainerSettings?.groupSessionMatchingLogic || "EXACT_MATCH") as GroupSessionMatchingLogic
    const { isGroupSession } = await this.getGroupSessionInfo(nextAppointment, matchingLogic)
    return this.getSessionRate(clientProfile, trainerSettings, isGroupSession)
  }

  /**
   * Deduct session cost from prepaid balance when appointment completes
   */
  async deductSession(appointmentId: string): Promise<PrepaidDeductionResult> {
    console.log(`💳 Processing prepaid deduction for appointment: ${appointmentId}`)

    // Check for existing deduction (idempotency)
    const existingDeduction = await prisma.prepaidTransaction.findFirst({
      where: {
        appointmentId: appointmentId,
        type: "DEDUCTION",
      },
    })

    if (existingDeduction) {
      console.log(`⏭️ Deduction already exists for appointment ${appointmentId}, returning existing transaction`)
      return {
        success: true,
        newBalance: existingDeduction.balanceAfter,
        amountDeducted: existingDeduction.amount,
        shouldGenerateInvoice: false,
        shouldSwitchToPerSession: false,
      }
    }

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

    if (!appointment || !appointment.client.clientProfile) {
      console.log(`❌ Appointment or client profile not found`)
      return {
        success: false,
        newBalance: new Prisma.Decimal(0),
        amountDeducted: new Prisma.Decimal(0),
        shouldGenerateInvoice: false,
        shouldSwitchToPerSession: false,
      }
    }

    const clientProfileId = appointment.client.clientProfile.id

    // Get trainer settings for rate calculation
    const trainerSettings = await prisma.trainerSettings.findUnique({
      where: { trainerId: appointment.trainerId },
    })

    const matchingLogic = (trainerSettings?.groupSessionMatchingLogic || "EXACT_MATCH") as GroupSessionMatchingLogic
    const { isGroupSession } = await this.getGroupSessionInfo(appointment, matchingLogic)
    const sessionRate = this.getSessionRate(appointment.client.clientProfile, trainerSettings, isGroupSession)
    const sessionType = isGroupSession ? "Group training session" : "Training session"

    // Use serializable transaction to prevent race conditions
    // This ensures the balance read and update happen atomically
    const result = await prisma.$transaction(async (tx) => {
      // Read the current balance INSIDE the transaction to get a consistent view
      const freshClientProfile = await tx.clientProfile.findUnique({
        where: { id: clientProfileId },
      })

      if (!freshClientProfile) {
        return {
          success: false,
          newBalance: new Prisma.Decimal(0),
          amountDeducted: new Prisma.Decimal(0),
          shouldGenerateInvoice: false,
          shouldSwitchToPerSession: false,
        }
      }

      const currentBalance = freshClientProfile.prepaidBalance || new Prisma.Decimal(0)

      console.log(`📊 Session type: ${isGroupSession ? "GROUP" : "INDIVIDUAL"}, Rate: $${sessionRate}, Current Balance: $${currentBalance}`)

      // Check if balance is 0 - stay on PREPAID but flag for invoice generation
      if (currentBalance.equals(new Prisma.Decimal(0))) {
        console.log(`⚠️ Prepaid balance is $0, staying on PREPAID and flagging for invoice`)
        return {
          success: false,
          newBalance: new Prisma.Decimal(0),
          amountDeducted: new Prisma.Decimal(0),
          shouldGenerateInvoice: true, // Changed: Generate invoice instead of switching
          shouldSwitchToPerSession: false,
        }
      }

      // Deduct from balance (deduct whatever is available if not enough)
      const amountToDeduct = currentBalance.lt(sessionRate) ? currentBalance : sessionRate
      const newBalance = currentBalance.sub(amountToDeduct)

      // Update client profile balance
      await tx.clientProfile.update({
        where: { id: clientProfileId },
        data: { prepaidBalance: newBalance },
      })

      // Create transaction record
      await tx.prepaidTransaction.create({
        data: {
          clientProfileId: clientProfileId,
          type: "DEDUCTION",
          amount: amountToDeduct,
          balanceAfter: newBalance,
          appointmentId: appointment.id,
          description: `${sessionType} on ${format(appointment.startTime, "MMM d, yyyy")}`,
        },
      })

      console.log(`✅ Deducted $${amountToDeduct}, New Balance: $${newBalance}`)

      return {
        success: true,
        newBalance,
        amountDeducted: amountToDeduct,
        shouldGenerateInvoice: false, // Will be set below
        shouldSwitchToPerSession: false,
      }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })

    // If the transaction didn't succeed, return the result (may still need invoice if balance was $0)
    if (!result.success) {
      return result
    }

    // Check if we need to generate an invoice
    // Trigger invoice if:
    // 1. Balance is now $0 (needs replenishment)
    // 2. Balance is below target balance (needs top-up)
    // 3. Balance is less than next session cost (can't cover next session)
    const targetBalance = appointment.client.clientProfile.prepaidTargetBalance
    const nextSessionCost = await this.getNextScheduledSessionCost(
      appointment.clientId,
      appointment.trainerId,
      appointment.client.clientProfile,
      trainerSettings
    )

    let shouldGenerateInvoice = false

    // Generate invoice ONLY when:
    // 1. Balance is $0, OR
    // 2. Balance is less than session rate (can't afford next session)
    if (result.newBalance.equals(new Prisma.Decimal(0))) {
      console.log(`⚠️ Balance is $0, invoice needed for replenishment`)
      shouldGenerateInvoice = true
    } else if (result.newBalance.lt(sessionRate)) {
      console.log(`⚠️ Balance ($${result.newBalance}) is less than session rate ($${sessionRate}), invoice needed`)
      shouldGenerateInvoice = true
    } else {
      console.log(`✅ Balance ($${result.newBalance}) can cover next session ($${sessionRate}), no invoice needed yet`)
    }

    return {
      success: true,
      newBalance: result.newBalance,
      amountDeducted: result.amountDeducted,
      shouldGenerateInvoice,
      shouldSwitchToPerSession: false,
    }
  }

  /**
   * Check balance for a PREPAID client and generate invoice if needed.
   * Called when a new appointment is scheduled.
   * Idempotent - won't create duplicate invoices.
   */
  async checkBalanceAndGenerateInvoiceIfNeeded(
    clientId: string,
    trainerId: string
  ): Promise<{ invoiceGenerated: boolean; invoiceId?: string }> {
    console.log(`🔍 Checking prepaid balance for client: ${clientId}`)

    const client = await prisma.user.findUnique({
      where: { id: clientId },
      include: { clientProfile: true },
    })

    if (!client?.clientProfile) {
      console.log(`⏭️ Client profile not found, skipping balance check`)
      return { invoiceGenerated: false }
    }

    const clientProfile = client.clientProfile

    // Only check for PREPAID clients
    if (clientProfile.billingFrequency !== "PREPAID") {
      console.log(`⏭️ Client is not on PREPAID billing, skipping`)
      return { invoiceGenerated: false }
    }

    const currentBalance = clientProfile.prepaidBalance || new Prisma.Decimal(0)
    const sessionRate = clientProfile.sessionRate || new Prisma.Decimal(0)

    // Check if invoice is needed:
    // 1. Balance is $0
    // 2. Balance is less than the session rate (can't afford next session)
    if (currentBalance.equals(new Prisma.Decimal(0))) {
      console.log(`⚠️ Prepaid balance is $0, generating invoice`)
    } else if (currentBalance.lt(sessionRate)) {
      console.log(`⚠️ Balance ($${currentBalance}) is less than session rate ($${sessionRate}), generating invoice`)
    } else {
      console.log(`✅ Balance ($${currentBalance}) can cover next session ($${sessionRate}), no invoice needed`)
      return { invoiceGenerated: false }
    }

    // Generate top-up invoice (this is idempotent - won't create duplicates)
    const result = await this.generateTopUpInvoice(clientId, trainerId)

    if (result) {
      return { invoiceGenerated: true, invoiceId: result.invoiceId }
    }

    return { invoiceGenerated: false }
  }

  /**
   * Add credit to a client's prepaid balance
   */
  async addCredit(
    clientId: string,
    amount: number,
    notes?: string
  ): Promise<{ newBalance: Prisma.Decimal; transaction: { id: string } }> {
    // Validate positive amount
    if (amount <= 0) {
      throw new Error("Credit amount must be positive")
    }

    console.log(`💰 Adding $${amount} credit for client: ${clientId}`)

    const client = await prisma.user.findUnique({
      where: { id: clientId },
      include: { clientProfile: true },
    })

    if (!client || !client.clientProfile) {
      throw new Error("Client profile not found")
    }

    const clientProfile = client.clientProfile
    const creditAmount = new Prisma.Decimal(amount)
    const currentBalance = clientProfile.prepaidBalance || new Prisma.Decimal(0)
    const newBalance = currentBalance.add(creditAmount)

    // Update balance and create transaction
    const result = await prisma.$transaction(async (tx) => {
      // If client was not on PREPAID billing, switch them
      const updateData: Prisma.ClientProfileUpdateInput = {
        prepaidBalance: newBalance,
      }

      if (clientProfile.billingFrequency !== "PREPAID") {
        updateData.billingFrequency = "PREPAID"
        console.log(`🔄 Switching client to PREPAID billing`)
      }

      await tx.clientProfile.update({
        where: { id: clientProfile.id },
        data: updateData,
      })

      // Create transaction record
      const transaction = await tx.prepaidTransaction.create({
        data: {
          clientProfileId: clientProfile.id,
          type: "CREDIT",
          amount: creditAmount,
          balanceAfter: newBalance,
          description: notes || "Prepaid credit added",
        },
      })

      return { transaction }
    })

    console.log(`✅ Added $${amount} credit, New Balance: $${newBalance}`)

    return {
      newBalance,
      transaction: { id: result.transaction.id },
    }
  }

  /**
   * Generate a top-up invoice for a prepaid client
   */
  async generateTopUpInvoice(clientId: string, trainerId: string): Promise<{ invoiceId: string } | null> {
    console.log(`📄 Generating prepaid top-up invoice for client: ${clientId}`)

    const client = await prisma.user.findUnique({
      where: { id: clientId },
      include: { clientProfile: true },
    })

    if (!client || !client.clientProfile) {
      console.log(`❌ Client profile not found`)
      return null
    }

    const clientProfile = client.clientProfile

    // Fix 5: Validate client is on PREPAID billing
    if (clientProfile.billingFrequency !== "PREPAID") {
      console.log(`⚠️ Client ${clientId} is not on PREPAID billing - skipping top-up invoice`)
      return null
    }

    // Fix 4: Check for existing pending top-up invoice (max 1 per client)
    const existingPendingInvoice = await prisma.invoice.findFirst({
      where: {
        clientId,
        isPrepaidTopUp: true,
        status: { in: ["SENT", "DRAFT"] },
      },
    })

    if (existingPendingInvoice) {
      console.log(`⚠️ Client ${clientId} already has pending top-up invoice ${existingPendingInvoice.id}`)
      return { invoiceId: existingPendingInvoice.id }
    }

    const currentBalance = clientProfile.prepaidBalance || new Prisma.Decimal(0)
    const targetBalance = clientProfile.prepaidTargetBalance

    if (!targetBalance) {
      console.log(`⚠️ No target balance set for client`)
      return null
    }

    // targetBalance is already a Prisma.Decimal from database
    const amountNeeded = targetBalance.sub(currentBalance)

    if (amountNeeded.lte(new Prisma.Decimal(0))) {
      console.log(`⏭️ Balance is at or above target, no invoice needed`)
      return null
    }

    // Get all deductions since last credit
    const lastCredit = await prisma.prepaidTransaction.findFirst({
      where: {
        clientProfileId: clientProfile.id,
        type: "CREDIT",
      },
      orderBy: { createdAt: "desc" },
    })

    const deductions = await prisma.prepaidTransaction.findMany({
      where: {
        clientProfileId: clientProfile.id,
        type: "DEDUCTION",
        ...(lastCredit ? { createdAt: { gt: lastCredit.createdAt } } : {}),
      },
      include: { appointment: true },
      orderBy: { createdAt: "asc" },
    })

    // Get trainer settings for due date
    const trainerSettings = await prisma.trainerSettings.findUnique({
      where: { trainerId },
    })

    const dueDays = trainerSettings?.defaultInvoiceDueDays || 30
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + dueDays)

    // Create line items from deductions
    const lineItems = deductions.map((d) => ({
      appointmentId: d.appointmentId,
      description: d.description,
      quantity: 1,
      unitPrice: d.amount,
      total: d.amount,
    }))

    // If no deductions, create a simple top-up line item
    if (lineItems.length === 0) {
      lineItems.push({
        appointmentId: null,
        description: `Prepaid balance top-up`,
        quantity: 1,
        unitPrice: amountNeeded,
        total: amountNeeded,
      })
    }

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        workspaceId: client.workspaceId!,
        trainerId,
        clientId,
        amount: amountNeeded,
        dueDate,
        status: "SENT",
        isPrepaidTopUp: true,
        notes: `Prepaid balance replenishment to $${targetBalance}. Current balance: $${currentBalance}`,
        lineItems: {
          create: lineItems,
        },
      },
      include: {
        client: true,
        trainer: true,
        lineItems: true,
      },
    })

    console.log(`✅ Created prepaid top-up invoice: ${invoice.id} ($${amountNeeded})`)

    // Send email
    try {
      await this.emailService.sendInvoiceEmail(invoice)
      console.log(`✅ Invoice email sent successfully`)
    } catch (error) {
      console.error(`❌ Failed to send invoice email:`, error)
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "DRAFT" },
      })
    }

    return { invoiceId: invoice.id }
  }

  /**
   * Switch a client from PREPAID to PER_SESSION billing
   */
  async switchToPerSession(clientProfileId: string): Promise<void> {
    console.log(`🔄 Switching client to PER_SESSION billing: ${clientProfileId}`)

    await prisma.clientProfile.update({
      where: { id: clientProfileId },
      data: { billingFrequency: "PER_SESSION" },
    })

    console.log(`✅ Client switched to PER_SESSION billing`)
  }

  /**
   * Void a prepaid top-up invoice and switch client to a new billing mode.
   * The remaining prepaid balance becomes a credit that auto-applies to future invoices.
   */
  async voidInvoiceAndSwitchBilling(
    invoiceId: string,
    newBillingFrequency: "PER_SESSION" | "MONTHLY"
  ): Promise<VoidAndSwitchResult> {
    console.log(`🔄 Voiding prepaid invoice and switching billing: ${invoiceId} -> ${newBillingFrequency}`)

    // Fix 3: Move all validation inside a serializable transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Fetch the invoice with client profile INSIDE the transaction
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          client: {
            include: {
              clientProfile: true,
            },
          },
        },
      })

      if (!invoice) {
        return {
          success: false,
          error: "Invoice not found",
          creditAmount: 0,
        }
      }

      // Verify this is a prepaid top-up invoice (use flag instead of string matching)
      // Support both isPrepaidTopUp flag and legacy notes check for backward compatibility
      const isPrepaidTopUp = invoice.isPrepaidTopUp || invoice.notes?.includes("Prepaid balance replenishment")
      if (!isPrepaidTopUp) {
        return {
          success: false,
          error: "This invoice is not a prepaid top-up invoice",
          creditAmount: 0,
        }
      }

      // Verify invoice is voidable (not already PAID or CANCELLED)
      if (invoice.status === "PAID") {
        return {
          success: false,
          error: "Cannot void a paid invoice",
          creditAmount: 0,
        }
      }

      if (invoice.status === "CANCELLED") {
        return {
          success: false,
          error: "Invoice is already cancelled",
          creditAmount: 0,
        }
      }

      const clientProfile = invoice.client.clientProfile
      if (!clientProfile) {
        return {
          success: false,
          error: "Client profile not found",
          creditAmount: 0,
        }
      }

      const currentBalance = clientProfile.prepaidBalance || new Prisma.Decimal(0)
      const creditAmount = Number(currentBalance)

      // 1. Cancel the invoice
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "CANCELLED" },
      })

      // 2. Update client's billing frequency (keep prepaidBalance as credit)
      await tx.clientProfile.update({
        where: { id: clientProfile.id },
        data: { billingFrequency: newBillingFrequency },
      })

      // 3. Create a transaction record documenting the credit retention
      if (creditAmount > 0) {
        await tx.prepaidTransaction.create({
          data: {
            clientProfileId: clientProfile.id,
            type: "CREDIT",
            amount: new Prisma.Decimal(0), // No new money added, just documenting
            balanceAfter: currentBalance,
            description: `Credit retained ($${creditAmount}) - switching to ${newBillingFrequency} billing`,
          },
        })
      }

      return {
        success: true,
        creditAmount,
        newBillingFrequency,
      }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })

    if (result.success) {
      console.log(`✅ Voided invoice ${invoiceId}, switched to ${newBillingFrequency}, retained $${result.creditAmount} credit`)
    }

    return result
  }

  /**
   * Get transaction history for a client
   */
  async getTransactions(
    clientProfileId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    transactions: Array<{
      id: string
      type: string
      amount: string
      balanceAfter: string
      description: string
      createdAt: Date
      appointment?: { id: string; startTime: Date } | null
    }>
    total: number
  }> {
    const limit = options?.limit || 50
    const offset = options?.offset || 0

    const [transactions, total] = await Promise.all([
      prisma.prepaidTransaction.findMany({
        where: { clientProfileId },
        include: {
          appointment: {
            select: { id: true, startTime: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.prepaidTransaction.count({
        where: { clientProfileId },
      }),
    ])

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
        balanceAfter: t.balanceAfter.toString(),
        description: t.description,
        createdAt: t.createdAt,
        appointment: t.appointment,
      })),
      total,
    }
  }

  /**
   * Get all prepaid clients summary for a trainer
   */
  async getPrepaidClientsSummary(
    trainerId: string,
    workspaceId: string
  ): Promise<PrepaidClientSummary[]> {
    const prepaidClients = await prisma.user.findMany({
      where: {
        workspaceId,
        role: "CLIENT",
        clientProfile: {
          billingFrequency: "PREPAID",
        },
      },
      include: {
        clientProfile: {
          include: {
            prepaidTransactions: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { fullName: "asc" },
    })

    const summaries: PrepaidClientSummary[] = await Promise.all(
      prepaidClients.map(async (client) => {
        const profile = client.clientProfile!
        const currentBalance = Number(profile.prepaidBalance || 0)
        const targetBalance = Number(profile.prepaidTargetBalance || 0)

        // Get last credit to count sessions since
        const lastCredit = await prisma.prepaidTransaction.findFirst({
          where: {
            clientProfileId: profile.id,
            type: "CREDIT",
          },
          orderBy: { createdAt: "desc" },
        })

        const sessionsConsumed = await prisma.prepaidTransaction.count({
          where: {
            clientProfileId: profile.id,
            type: "DEDUCTION",
            ...(lastCredit ? { createdAt: { gt: lastCredit.createdAt } } : {}),
          },
        })

        // Determine balance status
        let balanceStatus: "healthy" | "low" | "empty" = "healthy"
        if (currentBalance === 0) {
          balanceStatus = "empty"
        } else if (targetBalance > 0 && currentBalance < targetBalance * 0.25) {
          balanceStatus = "low"
        }

        const lastTransaction = profile.prepaidTransactions[0]

        return {
          client: {
            id: client.id,
            fullName: client.fullName,
            email: client.email,
          },
          currentBalance,
          targetBalance,
          sessionsConsumedSinceLastCredit: sessionsConsumed,
          lastTransactionDate: lastTransaction?.createdAt || null,
          balanceStatus,
        }
      })
    )

    return summaries
  }
}
