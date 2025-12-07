import { NextResponse } from "next/server"
import { InvoiceService } from "@/lib/services/invoice"

export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🚀 Starting monthly invoice generation cron job")

    const invoiceService = new InvoiceService()
    await invoiceService.processMonthlyInvoices()

    console.log("✅ Monthly invoice generation completed")

    return NextResponse.json({
      success: true,
      message: "Monthly invoices processed",
    })
  } catch (error) {
    console.error("❌ Cron invoice generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate invoices" },
      { status: 500 }
    )
  }
}
