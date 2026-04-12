import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const tournamentId = searchParams.get("tournamentId")

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    if (!tournamentId) {
      return NextResponse.json(
        { error: "Tournament ID is required" },
        { status: 400 }
      )
    }

    // Get user's tournament-specific balance
    const tournamentBalance = await prisma.tournamentBalance.findUnique({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId
        }
      }
    })

    if (!tournamentBalance) {
      // Create initial balance if it doesn't exist
      const newBalance = await prisma.tournamentBalance.create({
        data: {
          userId,
          tournamentId,
          balance: 0 // Starting balance
        }
      })
      
      return NextResponse.json({
        balance: newBalance.balance,
        transactions: [],
      })
    }

    // Get all coin transactions for this tournament
    const transactions = await prisma.coinTransaction.findMany({
      where: { 
        userId,
        tournamentId
      },
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
        tournament: {
          select: {
            id: true,
            name: true
          }
        }
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
      balance: tournamentBalance.balance,
      transactions: enrichedTransactions,
      settlements: await prisma.settlement.findMany({
        where: { userId, tournamentId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
          adminUsername: true,
          notes: true,
          createdAt: true,
        },
      }),
    })
  } catch (error) {
    console.error("Error fetching coin data:", error)
    return NextResponse.json(
      { error: "Failed to fetch coin data" },
      { status: 500 }
    )
  }
}
