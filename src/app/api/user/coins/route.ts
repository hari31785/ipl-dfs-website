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

    // Fetch transactions and settlements in parallel — both independent of each other
    const [transactions, settlements] = await Promise.all([
      prisma.coinTransaction.findMany({
        where: { userId, tournamentId },
        orderBy: { createdAt: "desc" },
        take: 50,
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
      }),
      prisma.settlement.findMany({
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
    ])

    // Batch-fetch all referenced matchups in a single query instead of N individual lookups
    const matchupIds = [...new Set(transactions.map(t => t.matchupId).filter(Boolean))] as string[]
    const matchupsById = new Map<string, any>()
    if (matchupIds.length > 0) {
      const matchups = await prisma.headToHeadMatchup.findMany({
        where: { id: { in: matchupIds } },
        include: {
          user1: { include: { user: { select: { name: true, username: true } } } },
          user2: { include: { user: { select: { name: true, username: true } } } },
        },
      })
      matchups.forEach(m => matchupsById.set(m.id, m))
    }

    const enrichedTransactions = transactions.map(t => ({
      ...t,
      matchup: t.matchupId ? (matchupsById.get(t.matchupId) ?? null) : null,
    }))

    return NextResponse.json({
      balance: tournamentBalance.balance,
      transactions: enrichedTransactions,
      settlements,
    })
  } catch (error) {
    console.error("Error fetching coin data:", error)
    return NextResponse.json(
      { error: "Failed to fetch coin data" },
      { status: 500 }
    )
  }
}
