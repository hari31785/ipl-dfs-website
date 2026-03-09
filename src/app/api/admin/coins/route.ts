import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Get or create admin coins record
    let adminCoins = await prisma.adminCoins.findFirst()
    
    if (!adminCoins) {
      adminCoins = await prisma.adminCoins.create({
        data: {
          totalCoins: 0,
        },
      })
    }

    return NextResponse.json({
      totalCoins: adminCoins.totalCoins,
    })
  } catch (error) {
    console.error("Error fetching admin coins:", error)
    return NextResponse.json(
      { error: "Failed to fetch admin coins" },
      { status: 500 }
    )
  }
}
