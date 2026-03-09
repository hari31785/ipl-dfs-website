import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Get user's current coin balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true, name: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Get all coin transactions with contest and game details
    const transactions = await prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50, // Last 50 transactions
      include: {
        contest: {
          include: {
            iplGame: {
              include: {
                team1: true,
                team2: true,
              },
            },
          },
        },
      },
    })

    // Manually fetch matchup details for transactions that have matchupId
    const enrichedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        let matchupDetails = null
        
        if (transaction.matchupId) {
          try {
            matchupDetails = await prisma.headToHeadMatchup.findUnique({
              where: { id: transaction.matchupId },
              include: {
                user1: {
                  include: {
                    user: {
                      select: { name: true, username: true }
                    }
                  }
                },
                user2: {
                  include: {
                    user: {
                      select: { name: true, username: true }
                    }
                  }
                }
              }
            })
          } catch (error) {
            console.error('Error fetching matchup details:', error)
          }
        }

        return {
          ...transaction,
          matchup: matchupDetails
        }
      })
    )

    return NextResponse.json({
      balance: user.coins,
      transactions: enrichedTransactions,
    })
  } catch (error) {
    console.error("Error fetching coin data:", error)
    return NextResponse.json(
      { error: "Failed to fetch coin data" },
      { status: 500 }
    )
  }
}
