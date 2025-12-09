import { NextResponse } from "next/server"
import { requireSystemAdmin } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    await requireSystemAdmin()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const order = searchParams.get("order") || "desc"

    const trainers = await prisma.user.findMany({
      where: {
        role: "TRAINER",
        ...(search && {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } }
          ]
        })
      },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                clientProfiles: true,
                pendingClientProfiles: true
              }
            }
          }
        }
      },
      orderBy: sortBy === "fullName"
        ? { fullName: order as "asc" | "desc" }
        : { createdAt: order as "asc" | "desc" }
    })

    return NextResponse.json({ trainers })
  } catch (error) {
    console.error("Admin trainers list error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch trainers" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
