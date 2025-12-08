import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { DateRange, getStartDate, groupByDatePeriod, fillMissingDates } from "@/lib/utils/analytics"
import { Appointment, Invoice } from "@prisma/client"

type AppointmentWithClient = Appointment & {
  client: {
    id: string
    fullName: string
  }
}

type InvoiceWithClient = Invoice & {
  client: {
    id: string
    fullName: string
  }
}

export async function GET(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const trainerId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const range = (searchParams.get("range") || "month") as DateRange

    // Calculate date boundaries
    const now = new Date()
    const startDate = getStartDate(range, now)

    // Fetch appointments data
    const appointments = await prisma.appointment.findMany({
      where: {
        trainerId,
        workspaceId,
        createdAt: { gte: startDate },
      },
      include: {
        client: {
          select: { id: true, fullName: true }
        }
      },
    })

    // Fetch invoices data
    const invoices = await prisma.invoice.findMany({
      where: {
        trainerId,
        workspaceId,
        createdAt: { gte: startDate },
      },
      include: {
        client: {
          select: { id: true, fullName: true }
        }
      },
    })

    // Calculate session metrics
    const sessionMetrics = calculateSessionMetrics(appointments)

    // Calculate invoice/revenue metrics
    const invoiceMetrics = calculateInvoiceMetrics(invoices)

    // Calculate trends (grouped by day/week/month depending on range)
    const sessionTrends = calculateSessionTrends(appointments, range, startDate, now)
    const revenueTrends = calculateRevenueTrends(invoices, range, startDate, now)

    // Calculate per-client metrics
    const clientMetrics = calculateClientMetrics(appointments, invoices)

    return NextResponse.json({
      sessionMetrics,
      invoiceMetrics,
      sessionTrends,
      revenueTrends,
      clientMetrics,
      range,
    })

  } catch (error) {
    console.error("Analytics API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}

function calculateSessionMetrics(appointments: AppointmentWithClient[]) {
  const total = appointments.length
  const completed = appointments.filter(a => a.status === "COMPLETED").length
  const cancelled = appointments.filter(a => a.status === "CANCELLED").length
  const scheduled = appointments.filter(a => a.status === "SCHEDULED").length

  return {
    total,
    completed,
    cancelled,
    scheduled,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
    cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
  }
}

function calculateInvoiceMetrics(invoices: InvoiceWithClient[]) {
  const draft = invoices.filter(i => i.status === "DRAFT")
  const sent = invoices.filter(i => i.status === "SENT")
  const paid = invoices.filter(i => i.status === "PAID")
  const overdue = invoices.filter(i => i.status === "OVERDUE")

  const totalRevenue = paid.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const pendingRevenue = sent.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const overdueAmount = overdue.reduce((sum, inv) => sum + Number(inv.amount), 0)

  return {
    totalInvoices: invoices.length,
    draft: { count: draft.length },
    sent: { count: sent.length, amount: pendingRevenue },
    paid: { count: paid.length, amount: totalRevenue },
    overdue: { count: overdue.length, amount: overdueAmount },
    totalRevenue,
    pendingRevenue,
    overdueAmount,
  }
}

function calculateSessionTrends(
  appointments: AppointmentWithClient[],
  range: DateRange,
  startDate: Date,
  endDate: Date
) {
  // Group appointments by date
  const grouped = groupByDatePeriod(appointments, range)

  // Count by status for each date
  const trendData: Record<string, { completed: number, cancelled: number, total: number }> = {}

  Object.keys(grouped).forEach((date) => {
    const appts = grouped[date]
    trendData[date] = {
      completed: appts.filter(a => a.status === "COMPLETED").length,
      cancelled: appts.filter(a => a.status === "CANCELLED").length,
      total: appts.length,
    }
  })

  // Fill in missing dates with zeros
  return fillMissingDates(trendData, range, startDate, endDate).map(item => ({
    date: item.date,
    completed: item.completed || 0,
    cancelled: item.cancelled || 0,
    total: item.total || 0,
  }))
}

function calculateRevenueTrends(
  invoices: InvoiceWithClient[],
  range: DateRange,
  startDate: Date,
  endDate: Date
) {
  // Filter for PAID invoices only
  const paidInvoices = invoices.filter(i => i.status === "PAID")

  // Group by date
  const grouped = groupByDatePeriod(paidInvoices, range)

  // Sum revenue for each date
  const revenueData: Record<string, { revenue: number }> = {}

  Object.keys(grouped).forEach((date) => {
    const invs = grouped[date]
    revenueData[date] = {
      revenue: invs.reduce((sum, inv) => sum + Number(inv.amount), 0),
    }
  })

  // Fill in missing dates with zeros
  return fillMissingDates(revenueData, range, startDate, endDate).map(item => ({
    date: item.date,
    revenue: item.revenue || 0,
  }))
}

function calculateClientMetrics(
  appointments: AppointmentWithClient[],
  invoices: InvoiceWithClient[]
) {
  // Group invoices by client (PAID only for revenue)
  const paidInvoices = invoices.filter(i => i.status === "PAID")
  const revenueByClient: Record<string, { name: string, revenue: number }> = {}

  paidInvoices.forEach((inv) => {
    const clientId = inv.client.id
    if (!revenueByClient[clientId]) {
      revenueByClient[clientId] = {
        name: inv.client.fullName,
        revenue: 0,
      }
    }
    revenueByClient[clientId].revenue += Number(inv.amount)
  })

  // Group appointments by client (COMPLETED only)
  const completedAppointments = appointments.filter(a => a.status === "COMPLETED")
  const sessionsByClient: Record<string, { name: string, sessions: number }> = {}

  completedAppointments.forEach((apt) => {
    const clientId = apt.client.id
    if (!sessionsByClient[clientId]) {
      sessionsByClient[clientId] = {
        name: apt.client.fullName,
        sessions: 0,
      }
    }
    sessionsByClient[clientId].sessions += 1
  })

  // Sort and return top clients
  const topByRevenue = Object.values(revenueByClient)
    .sort((a, b) => b.revenue - a.revenue)

  const topBySessions = Object.values(sessionsByClient)
    .sort((a, b) => b.sessions - a.sessions)

  return {
    topByRevenue,
    topBySessions,
  }
}
