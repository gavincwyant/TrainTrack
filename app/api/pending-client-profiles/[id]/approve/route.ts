import { NextResponse } from "next/server"
import { z } from "zod"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"
import { ClientDeduplicationService } from "@/lib/services/client-deduplication"
import { PrismaClient } from "@prisma/client"

const approveProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  billingFrequency: z.enum(["PER_SESSION", "MONTHLY"]),
  sessionRate: z.number(),
  groupSessionRate: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  autoInvoiceEnabled: z.boolean().optional().default(true),
})

/**
 * POST /api/pending-client-profiles/[id]/approve
 *
 * Approve pending profile and create actual client
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const trainerId = await requireUserId()
    const { id } = await params

    const body = await request.json()
    const data = approveProfileSchema.parse(body)

    // Get pending profile
    const profile = await prisma.pendingClientProfile.findUnique({
      where: { id },
    })

    if (!profile) {
      return NextResponse.json(
        { error: "Pending profile not found" },
        { status: 404 }
      )
    }

    if (profile.workspaceId !== workspaceId || profile.trainerId !== trainerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (profile.status !== "pending") {
      return NextResponse.json(
        { error: "Profile already processed" },
        { status: 400 }
      )
    }

    // Use reviewed values or fall back to extracted values
    const finalName = data.fullName || profile.reviewedName || profile.extractedName
    const finalEmail = data.email || profile.reviewedEmail || profile.extractedEmail
    const finalPhone = data.phone || profile.reviewedPhone || profile.extractedPhone

    // Validate email if provided
    if (finalEmail) {
      const deduplicationService = new ClientDeduplicationService()
      const emailInUse = await deduplicationService.isEmailInUse(
        workspaceId,
        finalEmail
      )

      if (emailInUse) {
        // Mark as duplicate
        await prisma.pendingClientProfile.update({
          where: { id },
          data: { status: "duplicate" },
        })

        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        )
      }
    }

    // Create client and profile in transaction
    const result = await prisma.$transaction(
      async (
        tx: Omit<
          PrismaClient,
          "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
        >
      ) => {
        // Create user (manual mode - no login access)
        const client = await tx.user.create({
          data: {
            email: finalEmail || `${finalName.replace(/\s+/g, "").toLowerCase()}@placeholder.local`,
            passwordHash: "", // Empty password - cannot log in
            fullName: finalName,
            phone: finalPhone,
            role: "CLIENT",
            workspaceId,
          },
        })

        // Create client profile
        const clientProfile = await tx.clientProfile.create({
          data: {
            userId: client.id,
            workspaceId,
            billingFrequency: data.billingFrequency,
            sessionRate: data.sessionRate,
            groupSessionRate: data.groupSessionRate ?? null,
            notes: data.notes || null,
            autoInvoiceEnabled: data.autoInvoiceEnabled ?? true,
          },
        })

        // Update pending profile status
        await tx.pendingClientProfile.update({
          where: { id },
          data: {
            status: "approved",
            createdClientId: client.id,
          },
        })

        // Find all pending appointments for this client profile's events
        const pendingAppointments = await tx.pendingAppointment.findMany({
          where: {
            workspaceId,
            trainerId,
            externalEventId: { in: profile.sourceEventIds },
            status: "pending",
          },
        })

        console.log(`📋 Found ${pendingAppointments.length} pending appointments for source events`)

        // Find all blocked times (calendar event mappings with blockedTimeId) for this client's events
        const blockedTimeMappings = await tx.calendarEventMapping.findMany({
          where: {
            workspaceId,
            externalEventId: { in: profile.sourceEventIds },
            blockedTimeId: { not: null },
          },
          include: {
            blockedTime: true,
          },
        })

        console.log(`🚫 Found ${blockedTimeMappings.length} blocked time mappings for source events`)

        // Convert pending appointments and blocked times to actual appointments
        const appointments = []

        // 1. Convert pending appointments
        for (const pending of pendingAppointments) {
          console.log(`✅ Converting pending appointment: ${pending.externalEventTitle} (${pending.externalEventId})`)

          const appointment = await tx.appointment.create({
            data: {
              workspaceId,
              trainerId,
              clientId: client.id,
              startTime: pending.startTime,
              endTime: pending.endTime,
              status: "SCHEDULED",
            },
          })

          // Update or create calendar mapping
          const existingMapping = await tx.calendarEventMapping.findUnique({
            where: {
              provider_externalEventId: {
                provider: "google",
                externalEventId: pending.externalEventId,
              },
            },
          })

          if (existingMapping) {
            // Update existing mapping
            await tx.calendarEventMapping.update({
              where: { id: existingMapping.id },
              data: {
                appointmentId: appointment.id,
                blockedTimeId: null,
                lastSyncedAt: new Date(),
              },
            })
          } else {
            // Create new mapping
            await tx.calendarEventMapping.create({
              data: {
                workspaceId,
                appointmentId: appointment.id,
                provider: "google",
                externalEventId: pending.externalEventId,
                externalCalendarId: "primary",
                syncDirection: "inbound",
              },
            })
          }

          // Update pending appointment status
          await tx.pendingAppointment.update({
            where: { id: pending.id },
            data: {
              status: "converted",
              createdAppointmentId: appointment.id,
            },
          })

          appointments.push(appointment)
        }

        // 2. Convert blocked times to appointments
        for (const mapping of blockedTimeMappings) {
          if (!mapping.blockedTime) {
            console.log(`⚠️ Mapping ${mapping.id} has no blocked time, skipping`)
            continue
          }

          // Check if this mapping still exists and hasn't been updated already
          // (might have been updated in the pending appointments loop)
          const currentMapping = await tx.calendarEventMapping.findUnique({
            where: { id: mapping.id },
          })

          if (!currentMapping) {
            console.log(`⚠️ Mapping ${mapping.id} no longer exists, skipping`)
            continue
          }

          if (currentMapping.appointmentId) {
            console.log(`⚠️ Mapping ${mapping.id} already has an appointment, skipping`)
            continue
          }

          console.log(`🔄 Converting blocked time to appointment: ${mapping.blockedTime.reason} (${mapping.externalEventId})`)

          // Create appointment from blocked time
          const appointment = await tx.appointment.create({
            data: {
              workspaceId,
              trainerId,
              clientId: client.id,
              startTime: mapping.blockedTime.startTime,
              endTime: mapping.blockedTime.endTime,
              status: "SCHEDULED",
            },
          })

          console.log(`✅ Created appointment ${appointment.id} from blocked time ${mapping.blockedTime.id}`)

          // IMPORTANT: Update mapping BEFORE deleting blocked time
          // (deleting blocked time will CASCADE delete the mapping due to foreign key constraint)
          await tx.calendarEventMapping.update({
            where: { id: mapping.id },
            data: {
              appointmentId: appointment.id,
              blockedTimeId: null,
              lastSyncedAt: new Date(),
            },
          })

          console.log(`📝 Updated calendar mapping to point to appointment`)

          // Now safe to delete the blocked time (won't CASCADE delete mapping since blockedTimeId is null)
          await tx.blockedTime.delete({
            where: { id: mapping.blockedTime.id },
          })

          console.log(`🗑️ Deleted blocked time ${mapping.blockedTime.id}`)

          appointments.push(appointment)
        }

        console.log(`✅ Converted ${appointments.length} total events to appointments (${pendingAppointments.length} pending + ${blockedTimeMappings.length} blocked times)`)

        return { client, clientProfile, appointments }
      }
    )

    console.log(`✅ Approved pending profile "${finalName}" → Created client ${result.client.id} with ${result.appointments.length} appointments`)

    return NextResponse.json({
      success: true,
      client: result.client,
      clientProfile: result.clientProfile,
      appointmentsCreated: result.appointments.length,
    })
  } catch (error) {
    console.error("Approve pending profile error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to approve pending profile" },
      { status: 500 }
    )
  }
}
