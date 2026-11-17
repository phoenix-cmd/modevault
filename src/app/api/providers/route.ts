import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(_request: NextRequest) {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        plans: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ data: providers })
  } catch (error) {
    console.error("Providers error:", error)
    return NextResponse.json(
      { data: null, error: "Failed to fetch providers" },
      { status: 500 }
    )
  }
}
