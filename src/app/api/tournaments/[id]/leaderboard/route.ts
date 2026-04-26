import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const revalidate = 86400; // 24 hours — invalidated on-demand when a contest ends

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Fetch transactions and settlements in parallel.
    // Transactions filter directly via nested relation — no pre-fetch of contestIds needed.
    // Settlements filter by tournamentId directly — also independent.
    // Users are batch-fetched separately to avoid joining on every transaction row.
    const [transactions, settlements] = await Promise.all([
      prisma.coinTransaction.findMany({
        where: {
          contest: {
            status: 'COMPLETED',
            iplGame: { tournamentId: id },
          },
        },
        select: {
          userId: true,
          amount: true,
          type: true,
          contestId: true,
          // No user join here — batched separately below
        },
      }),
      prisma.settlement.findMany({
        where: { tournamentId: id },
        select: { userId: true, type: true, amount: true },
      }),
    ])

    // Batch-fetch user records for the unique set of user IDs in transactions
    const uniqueUserIds = [...new Set(transactions.map(t => t.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true, name: true, username: true, totalWins: true, totalMatches: true },
    })
    const usersById = new Map(users.map(u => [u.id, u]))

    // Aggregate stats by user
    const userStatsMap = new Map<string, {
      userId: string
      name: string
      username: string
      totalWins: number
      totalMatches: number
      totalVCWon: number
      totalVCLost: number
      encashedVC: number
      refilledVC: number
      netVC: number
      totalCoinsWon: number
      totalCoinsLost: number
      encashedCoins: number
      refilledCoins: number
      netCoins: number
      totalPointsWon: number
      totalPointsLost: number
      netPoints: number
      contestsPlayed: number
      biggestSingleWin: number
      biggestSingleLoss: number
    }>()

    // Also track unique contestIds per user to derive contestsPlayed — no extra DB query needed
    const userContestSets = new Map<string, Set<string>>()

    transactions.forEach(transaction => {
      const u = usersById.get(transaction.userId)
      if (!u) return
      const existing = userStatsMap.get(transaction.userId) || {
        userId: u.id,
        name: u.name,
        username: u.username,
        totalWins: u.totalWins,
        totalMatches: u.totalMatches,
        totalVCWon: 0,
        totalVCLost: 0,
        encashedVC: 0,
        refilledVC: 0,
        netVC: 0,
        totalCoinsWon: 0,
        totalCoinsLost: 0,
        encashedCoins: 0,
        refilledCoins: 0,
        netCoins: 0,
        totalPointsWon: 0,
        totalPointsLost: 0,
        netPoints: 0,
        contestsPlayed: 0,
        biggestSingleWin: 0,
        biggestSingleLoss: 0,
      }

      // Track unique contests for this user
      if (transaction.contestId) {
        if (!userContestSets.has(transaction.userId)) userContestSets.set(transaction.userId, new Set())
        userContestSets.get(transaction.userId)!.add(transaction.contestId)
      }

      const vcAmount = transaction.amount / 100
      const coinAmount = transaction.amount

      if (transaction.type === 'WIN') {
        existing.totalVCWon += vcAmount
        existing.totalCoinsWon += coinAmount
        existing.totalPointsWon += vcAmount
        if (vcAmount > existing.biggestSingleWin) existing.biggestSingleWin = vcAmount
      } else if (transaction.type === 'LOSS') {
        existing.totalVCLost += Math.abs(vcAmount)
        existing.totalCoinsLost += Math.abs(coinAmount)
        existing.totalPointsLost += Math.abs(vcAmount)
        if (Math.abs(vcAmount) > existing.biggestSingleLoss) existing.biggestSingleLoss = Math.abs(vcAmount)
      }

      existing.netVC = existing.totalVCWon - existing.totalVCLost
      existing.netCoins = existing.totalCoinsWon - existing.totalCoinsLost
      existing.netPoints = existing.totalPointsWon - existing.totalPointsLost

      userStatsMap.set(transaction.userId, existing)
    })

    // Derive contestsPlayed from the transaction data already in memory
    userContestSets.forEach((contestSet, userId) => {
      const stats = userStatsMap.get(userId)
      if (stats) stats.contestsPlayed = contestSet.size
    })

    // Overlay settlements onto user stats
    for (const s of settlements) {
      const existing = userStatsMap.get(s.userId)
      if (!existing) continue
      if (s.type === 'ENCASH') {
        existing.encashedVC += s.amount / 100
        existing.encashedCoins += s.amount
      } else if (s.type === 'REFILL') {
        existing.refilledVC += s.amount / 100
        existing.refilledCoins += s.amount
      }
      // Adjust net to account for settlements:
      // netVC = won - lost - encashed (taken out) + refilled (topped up)
      existing.netVC = existing.totalVCWon - existing.totalVCLost - existing.encashedVC + existing.refilledVC
      existing.netCoins = existing.totalCoinsWon - existing.totalCoinsLost - existing.encashedCoins + existing.refilledCoins
    }

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
