import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Get all contests for this tournament
    const contests = await prisma.contest.findMany({
      where: {
        iplGame: {
          tournamentId: id,
        },
        status: 'COMPLETED', // Only count completed contests
      },
      select: {
        id: true,
      },
    })

    const contestIds = contests.map(c => c.id)

    // Get all coin transactions for these contests
    const transactions = await prisma.coinTransaction.findMany({
      where: {
        contestId: {
          in: contestIds,
        },
      },
      select: {
        userId: true,
        amount: true,
        type: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            totalWins: true,
            totalMatches: true,
          },
        },
      },
    })

    // Aggregate stats by user
    const userStatsMap = new Map<string, {
      userId: string
      name: string
      username: string
      totalWins: number
      totalMatches: number
      totalVCWon: number
      totalVCLost: number
      netVC: number
      totalCoinsWon: number
      totalCoinsLost: number
      netCoins: number
      totalPointsWon: number
      totalPointsLost: number
      netPoints: number
      contestsPlayed: number
    }>()

    // Track contests per user
    const userContestCounts = new Map<string, Set<string>>()

    transactions.forEach(transaction => {
      const existing = userStatsMap.get(transaction.userId) || {
        userId: transaction.user.id,
        name: transaction.user.name,
        username: transaction.user.username,
        totalWins: transaction.user.totalWins,
        totalMatches: transaction.user.totalMatches,
        totalVCWon: 0,
        totalVCLost: 0,
        netVC: 0,
        totalCoinsWon: 0,
        totalCoinsLost: 0,
        netCoins: 0,
        totalPointsWon: 0,
        totalPointsLost: 0,
        netPoints: 0,
        contestsPlayed: 0,
      }

      const vcAmount = transaction.amount / 100
      const coinAmount = transaction.amount

      if (transaction.type === 'WIN') {
        existing.totalVCWon += vcAmount
        existing.totalCoinsWon += coinAmount
        existing.totalPointsWon += vcAmount // VC directly represents points
      } else if (transaction.type === 'LOSS') {
        existing.totalVCLost += Math.abs(vcAmount)
        existing.totalCoinsLost += Math.abs(coinAmount)
        existing.totalPointsLost += Math.abs(vcAmount) // VC directly represents points
      }

      existing.netVC = existing.totalVCWon - existing.totalVCLost
      existing.netCoins = existing.totalCoinsWon - existing.totalCoinsLost
      existing.netPoints = existing.totalPointsWon - existing.totalPointsLost

      userStatsMap.set(transaction.userId, existing)
    })

    // Count contests per user
    const contestSignups = await prisma.contestSignup.findMany({
      where: {
        contestId: {
          in: contestIds,
        },
      },
      select: {
        userId: true,
        contestId: true,
      },
    })

    contestSignups.forEach(signup => {
      if (!userContestCounts.has(signup.userId)) {
        userContestCounts.set(signup.userId, new Set())
      }
      userContestCounts.get(signup.userId)!.add(signup.contestId)
    })

    // Update contests played count
    userContestCounts.forEach((contestSet, userId) => {
      const stats = userStatsMap.get(userId)
      if (stats) {
        stats.contestsPlayed = contestSet.size
      }
    })

    // Convert to array and sort by net VC (descending)
    const leaderboard = Array.from(userStatsMap.values())
      .sort((a, b) => b.netVC - a.netVC)
      .map((user, index) => ({
        rank: index + 1,
        ...user,
      }))

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error("Error fetching tournament leaderboard:", error)
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    )
  }
}
