import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { format } from "date-fns"

type ExportPeriod = "month" | "year"

export async function GET(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const trainerId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") || "month") as ExportPeriod
    const yearParam = searchParams.get("year")
    const monthParam = searchParams.get("month")

    // Calculate date range based on period
    const { startDate, endDate, filename } = calculateDateRange(
      period,
      yearParam,
      monthParam
    )

    // Fetch PAID invoices only (actual revenue received)
    // Use paidAt if available, otherwise fall back to createdAt for older invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        trainerId,
        workspaceId,
        status: "PAID",
        OR: [
          {
            paidAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            paidAt: null,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      include: {
        client: {
          select: {
            fullName: true,
            email: true,
          },
        },
        lineItems: {
          select: {
            description: true,
            total: true,
          },
        },
      },
      orderBy: {
        paidAt: "asc",
      },
    })

    console.log(`Found ${invoices.length} paid invoices for export`, {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      trainerId,
      workspaceId,
    })

    // If no invoices found, return a CSV with a helpful message
    if (invoices.length === 0) {
      const csv = generateEmptyCSV(period, startDate)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    // Generate CSV content
    const csv = generateCSV(invoices)

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("CSV export error:", error)
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    )
  }
}

function calculateDateRange(
  period: ExportPeriod,
  yearParam: string | null,
  monthParam: string | null
) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  let startDate: Date
  let endDate: Date
  let filename: string

  if (period === "month") {
    // Export specific month or current month
    const year = yearParam ? parseInt(yearParam) : currentYear
    const month = monthParam ? parseInt(monthParam) - 1 : currentMonth

    startDate = new Date(year, month, 1)
    endDate = new Date(year, month + 1, 0, 23, 59, 59, 999)

    const monthName = format(startDate, "MMMM-yyyy")
    filename = `payments-${monthName}.csv`
  } else {
    // Export calendar year
    const year = yearParam ? parseInt(yearParam) : currentYear

    startDate = new Date(year, 0, 1)
    endDate = new Date(year, 11, 31, 23, 59, 59, 999)

    filename = `payments-${year}.csv`
  }

  return { startDate, endDate, filename }
}

function generateCSV(
  invoices: Array<{
    id: string
    amount: { toString: () => string }
    paidAt: Date | null
    createdAt: Date
    paymentMethod: string | null
    notes: string | null
    client: {
      fullName: string
      email: string
    }
    lineItems: Array<{
      description: string
      total: { toString: () => string }
    }>
  }>
): string {
  // CSV Headers
  const headers = [
    "Payment Date",
    "Client Name",
    "Client Email",
    "Amount",
    "Payment Method",
    "Invoice ID",
    "Services/Items",
    "Notes",
  ]

  // CSV Rows
  const rows = invoices.map((invoice) => {
    // Use paidAt if available, otherwise use createdAt for older invoices
    const paymentDate = invoice.paidAt
      ? format(invoice.paidAt, "yyyy-MM-dd")
      : format(invoice.createdAt, "yyyy-MM-dd")

    const services = invoice.lineItems
      .map((item) => `${item.description} ($${item.total.toString()})`)
      .join("; ")

    const notes = invoice.notes
      ? invoice.notes.replace(/"/g, '""').replace(/\n/g, " ")
      : ""

    return [
      paymentDate,
      escapeCSV(invoice.client.fullName),
      escapeCSV(invoice.client.email),
      `$${invoice.amount.toString()}`,
      invoice.paymentMethod || "N/A",
      invoice.id,
      escapeCSV(services),
      escapeCSV(notes),
    ]
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n")

  return csvContent
}

function generateEmptyCSV(
  period: ExportPeriod,
  startDate: Date
): string {
  const headers = [
    "Payment Date",
    "Client Name",
    "Client Email",
    "Amount",
    "Payment Method",
    "Invoice ID",
    "Services/Items",
    "Notes",
  ]

  const periodText =
    period === "month"
      ? `${format(startDate, "MMMM yyyy")}`
      : `${format(startDate, "yyyy")}`

  const message = `No paid invoices found for ${periodText}`

  return [headers.join(","), `"${message}",,,,,,,`].join("\n")
}

function escapeCSV(value: string): string {
  // Escape double quotes and wrap in quotes if contains comma, newline, or quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
