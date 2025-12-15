import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { format } from "date-fns"
import * as XLSX from "xlsx"

type ExportPeriod = "month" | "year" | "all" | "custom"
type ExportFormat = "csv" | "xlsx"

export async function GET(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const trainerId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") || "month") as ExportPeriod
    const exportFormat = (searchParams.get("format") || "csv") as ExportFormat
    const yearParam = searchParams.get("year")
    const monthParam = searchParams.get("month")
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const clientIdParam = searchParams.get("clientId")

    // Calculate date range based on period
    const { startDate, endDate, periodLabel } = calculateDateRange(
      period,
      yearParam,
      monthParam,
      startDateParam,
      endDateParam
    )

    // Build where clause
    const whereClause: Record<string, unknown> = {
      workspaceId,
      trainerId,
    }

    // Add date filter if not "all"
    if (period !== "all") {
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    // Add client filter if specified
    if (clientIdParam) {
      whereClause.appointment = {
        clientId: clientIdParam,
      }
    }

    // Fetch workout sessions
    const sessions = await prisma.workoutSession.findMany({
      where: whereClause,
      include: {
        appointment: {
          include: {
            client: {
              select: {
                fullName: true,
                email: true,
              },
            },
            trainer: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    })

    const filename = `workout-history-${periodLabel}.${exportFormat}`

    if (exportFormat === "xlsx") {
      const buffer = generateXLSX(sessions)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    } else {
      const csv = generateCSV(sessions)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }
  } catch (error) {
    console.error("Workout export error:", error)
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    )
  }
}

function calculateDateRange(
  period: ExportPeriod,
  yearParam: string | null,
  monthParam: string | null,
  startDateParam: string | null,
  endDateParam: string | null
) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  let startDate: Date
  let endDate: Date
  let periodLabel: string

  switch (period) {
    case "month": {
      const year = yearParam ? parseInt(yearParam) : currentYear
      const month = monthParam ? parseInt(monthParam) - 1 : currentMonth
      startDate = new Date(year, month, 1)
      endDate = new Date(year, month + 1, 0, 23, 59, 59, 999)
      periodLabel = format(startDate, "MMMM-yyyy")
      break
    }
    case "year": {
      const year = yearParam ? parseInt(yearParam) : currentYear
      startDate = new Date(year, 0, 1)
      endDate = new Date(year, 11, 31, 23, 59, 59, 999)
      periodLabel = `${year}`
      break
    }
    case "custom": {
      startDate = startDateParam ? new Date(startDateParam) : new Date(currentYear, 0, 1)
      endDate = endDateParam ? new Date(endDateParam + "T23:59:59.999") : now
      periodLabel = `${format(startDate, "yyyy-MM-dd")}_to_${format(endDate, "yyyy-MM-dd")}`
      break
    }
    case "all":
    default: {
      startDate = new Date(2000, 0, 1) // Far past date
      endDate = now
      periodLabel = "all-time"
      break
    }
  }

  return { startDate, endDate, periodLabel }
}

type SessionWithRelations = {
  id: string
  date: Date
  notes: string | null
  exercises: unknown
  customMetrics: unknown
  appointment: {
    client: {
      fullName: string
      email: string
    }
    trainer: {
      fullName: string
    }
  }
}

function generateCSV(sessions: SessionWithRelations[]): string {
  const headers = [
    "Date",
    "Client Name",
    "Client Email",
    "Trainer Name",
    "Session Notes",
    "Exercise Name",
    "Sets",
    "Reps",
    "Weight (lbs)",
    "Exercise Notes",
    "Custom Metrics",
  ]

  const rows: string[][] = []

  sessions.forEach((session) => {
    const baseInfo = [
      format(new Date(session.date), "yyyy-MM-dd"),
      escapeCSV(session.appointment.client.fullName),
      session.appointment.client.email,
      escapeCSV(session.appointment.trainer.fullName),
      session.notes ? escapeCSV(session.notes) : "",
    ]

    const exercises = session.exercises as Array<{
      name: string
      sets: number
      reps: number
      weight?: number
      notes?: string
    }> | null

    const metrics = session.customMetrics as Record<string, string | number | boolean> | null
    const metricsStr = metrics
      ? Object.entries(metrics)
          .map(([key, value]) => `${key}: ${value}`)
          .join("; ")
      : ""

    if (exercises && exercises.length > 0) {
      exercises.forEach((exercise) => {
        rows.push([
          ...baseInfo,
          escapeCSV(exercise.name),
          String(exercise.sets),
          String(exercise.reps),
          exercise.weight ? String(exercise.weight) : "",
          exercise.notes ? escapeCSV(exercise.notes) : "",
          escapeCSV(metricsStr),
        ])
      })
    } else {
      rows.push([...baseInfo, "", "", "", "", "", escapeCSV(metricsStr)])
    }
  })

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
}

function generateXLSX(sessions: SessionWithRelations[]): Buffer {
  const data: Array<Record<string, string | number>> = []

  sessions.forEach((session) => {
    const exercises = session.exercises as Array<{
      name: string
      sets: number
      reps: number
      weight?: number
      notes?: string
    }> | null

    const metrics = session.customMetrics as Record<string, string | number | boolean> | null
    const metricsStr = metrics
      ? Object.entries(metrics)
          .map(([key, value]) => `${key}: ${value}`)
          .join("; ")
      : ""

    if (exercises && exercises.length > 0) {
      exercises.forEach((exercise) => {
        data.push({
          Date: format(new Date(session.date), "yyyy-MM-dd"),
          "Client Name": session.appointment.client.fullName,
          "Client Email": session.appointment.client.email,
          "Trainer Name": session.appointment.trainer.fullName,
          "Session Notes": session.notes || "",
          "Exercise Name": exercise.name,
          Sets: exercise.sets,
          Reps: exercise.reps,
          "Weight (lbs)": exercise.weight || "",
          "Exercise Notes": exercise.notes || "",
          "Custom Metrics": metricsStr,
        })
      })
    } else {
      data.push({
        Date: format(new Date(session.date), "yyyy-MM-dd"),
        "Client Name": session.appointment.client.fullName,
        "Client Email": session.appointment.client.email,
        "Trainer Name": session.appointment.trainer.fullName,
        "Session Notes": session.notes || "",
        "Exercise Name": "",
        Sets: "",
        Reps: "",
        "Weight (lbs)": "",
        "Exercise Notes": "",
        "Custom Metrics": metricsStr,
      })
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Workout History")

  // Auto-size columns
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 20 }, // Client Name
    { wch: 25 }, // Client Email
    { wch: 20 }, // Trainer Name
    { wch: 30 }, // Session Notes
    { wch: 20 }, // Exercise Name
    { wch: 6 },  // Sets
    { wch: 6 },  // Reps
    { wch: 12 }, // Weight
    { wch: 25 }, // Exercise Notes
    { wch: 40 }, // Custom Metrics
  ]
  worksheet["!cols"] = colWidths

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }))
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
