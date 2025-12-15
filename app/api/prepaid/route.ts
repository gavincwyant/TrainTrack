import { NextResponse } from "next/server"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { PrepaidService } from "@/lib/services/prepaid"

/**
 * GET /api/prepaid
 * Get all prepaid clients with their balances for the trainer dashboard
 */
export async function GET() {
  try {
    const workspaceId = await requireWorkspace()
    const trainerId = await requireUserId()

    const prepaidService = new PrepaidService()
    const clients = await prepaidService.getPrepaidClientsSummary(trainerId, workspaceId)

    // Calculate totals
    const totalBalance = clients.reduce((sum, c) => sum + c.currentBalance, 0)
    const totalTarget = clients.reduce((sum, c) => sum + c.targetBalance, 0)
    const clientsNeedingAttention = clients.filter(
      (c) => c.balanceStatus === "low" || c.balanceStatus === "empty"
    ).length

    return NextResponse.json({
      clients,
      totals: {
        totalBalance,
        totalTarget,
        clientCount: clients.length,
        clientsNeedingAttention,
      },
    })
  } catch (error) {
    console.error("Error fetching prepaid clients:", error)

    // Check if it's an auth/middleware redirect
    if (error instanceof Response) {
      return error
    }

    // Return empty data structure on error so UI doesn't break
    return NextResponse.json({
      clients: [],
      totals: {
        totalBalance: 0,
        totalTarget: 0,
        clientCount: 0,
        clientsNeedingAttention: 0,
      },
      error: error instanceof Error ? error.message : "Failed to fetch prepaid clients",
    })
  }
}
