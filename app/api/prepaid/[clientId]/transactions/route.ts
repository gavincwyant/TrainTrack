import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace } from "@/lib/middleware/tenant"
import { PrepaidService } from "@/lib/services/prepaid"

/**
 * GET /api/prepaid/[clientId]/transactions
 * Get paginated transaction history for a client
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const { clientId } = await params

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Verify client belongs to workspace
    const client = await prisma.user.findUnique({
      where: { id: clientId, workspaceId },
      include: { clientProfile: true },
    })

    if (!client || !client.clientProfile) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Get transactions
    const prepaidService = new PrepaidService()
    const result = await prepaidService.getTransactions(client.clientProfile.id, {
      limit,
      offset,
    })

    return NextResponse.json({
      transactions: result.transactions,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total,
      },
    })
  } catch (error) {
    console.error("Error fetching prepaid transactions:", error)
    return NextResponse.json(
      { error: "Failed to fetch prepaid transactions" },
      { status: 500 }
    )
  }
}
