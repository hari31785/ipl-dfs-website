import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateTotalPointsWithSwap } from '@/lib/benchSwapUtils'

// GET /api/user/dashboard - Returns user profile + active contests in one round-trip.
// Replaces two separate mount fetches (/api/user + /api/user/contests?excludeCompleted=true)
// so the dashboard client only fires one request on load instead of two.
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Both queries run in parallel — same DB connection, two statements
    const [user, activeSignups] = await Promise.all([
      prisma.user.findFirst({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          phone: true,
          totalWins: true,
          totalMatches: true,
          winPercentage: true,
          coins: true,
          createdAt: true,
          securityQuestion1: true,
          securityQuestion2: true,
          securityQuestion3: true,
        },
      }),
      prisma.contestSignup.findMany({
        where: { userId, contest: { status: { not: 'COMPLETED' } } },
        orderBy: { signupAt: 'desc' },
        select: {
          id: true,
          contest: {
            select: {
              id: true,
              status: true,
              coinValue: true,
              contestType: true,
              iplGame: {
                select: {
                  id: true,
                  title: true,
                  gameDate: true,
                  signupDeadline: true,
                  status: true,
                  team1: { select: { shortName: true, name: true, color: true } },
                  team2: { select: { shortName: true, name: true, color: true } },
                  tournament: { select: { id: true, name: true } },
                },
              },
            },
          },
          matchupsAsUser1: {
            select: {
              id: true,
              status: true,
              winnerId: true,
              user1Id: true,
              user2Id: true,
              firstPickUser: true,
              user1Score: true,
              user2Score: true,
              _count: { select: { draftPicks: true } },
              user2: { select: { user: { select: { username: true } } } },
            },
          },
          matchupsAsUser2: {
            select: {
              id: true,
              status: true,
              winnerId: true,
              user1Id: true,
              user2Id: true,
              firstPickUser: true,
              user1Score: true,
              user2Score: true,
              _count: { select: { draftPicks: true } },
              user1: { select: { user: { select: { username: true } } } },
            },
          },
        },
      }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Collect all matchup IDs and game IDs for LIVE contests so we can compute live scores
    const liveMatchupIds: string[] = []
    const liveGameIds: string[] = []
    for (const signup of activeSignups) {
      if (signup.contest.status !== 'LIVE') continue
      for (const m of [...signup.matchupsAsUser1, ...signup.matchupsAsUser2]) {
        liveMatchupIds.push(m.id)
      }
      liveGameIds.push(signup.contest.iplGame.id)
    }

    // Fetch draft picks + player stats for LIVE matchups in parallel
    const [livePicksRows, liveStatsRows] = liveMatchupIds.length > 0
      ? await Promise.all([
          prisma.draftPick.findMany({
            where: { matchupId: { in: liveMatchupIds } },
            select: {
              id: true,
              matchupId: true,
              playerId: true,
              pickOrder: true,
              pickedByUserId: true,
              isBench: true,
              player: { select: { id: true, name: true } },
            },
          }),
          prisma.playerStat.findMany({
            where: { iplGameId: { in: [...new Set(liveGameIds)] } },
            select: { playerId: true, iplGameId: true, points: true, didNotPlay: true },
          }),
        ])
      : [[], []]

    // Build lookup: matchupId -> picks[], playerId -> stat
    const picksByMatchup = new Map<string, typeof livePicksRows>()
    for (const pick of livePicksRows) {
      const arr = picksByMatchup.get(pick.matchupId) ?? []
      arr.push(pick)
      picksByMatchup.set(pick.matchupId, arr)
    }
    const statByPlayer = new Map<string, { points: number; didNotPlay: boolean; iplGameId: string }>()
    for (const s of liveStatsRows) {
      statByPlayer.set(s.playerId, { points: s.points, didNotPlay: s.didNotPlay, iplGameId: s.iplGameId })
    }

    // Compute live score for one side of a matchup
    const computeScore = (matchupId: string, signupId: string, gameId: string): number | null => {
      const picks = picksByMatchup.get(matchupId)
      if (!picks || picks.length === 0) return null
      const myPicks = picks.filter(p => p.pickedByUserId === signupId)
      if (myPicks.length === 0) return null
      const picksWithStats = myPicks.map(p => ({
        ...p,
        player: {
          ...p.player,
          stats: statByPlayer.has(p.playerId)
            ? [{ ...statByPlayer.get(p.playerId)!, iplGameId: gameId }]
            : [],
        },
      }))
      return calculateTotalPointsWithSwap(picksWithStats, gameId)
    }

    // Fan-out matchups (same logic as user/contests route)
    const contests = activeSignups.flatMap((signup: any) => {
      const allMatchups = [...signup.matchupsAsUser1, ...signup.matchupsAsUser2]
      if (allMatchups.length === 0) return [{ ...signup, matchup: null }]
      return allMatchups.map((matchup: any) => {
        const isUser1 = signup.matchupsAsUser1.some((m: any) => m.id === matchup.id)
        let effectiveWinnerId = matchup.winnerId ?? null
        if (!effectiveWinnerId && matchup.status === 'COMPLETED') {
          const u1 = matchup.user1Score as number | null
          const u2 = matchup.user2Score as number | null
          if (u1 != null && u2 != null) {
            if (u1 > u2) effectiveWinnerId = matchup.user1Id
            else if (u2 > u1) effectiveWinnerId = matchup.user2Id
          }
        }

        // For LIVE contests compute live scores; fall back to stored scores for COMPLETED
        const isLive = signup.contest.status === 'LIVE'
        const gameId = signup.contest.iplGame.id
        const mySignupId = isUser1 ? matchup.user1Id : matchup.user2Id
        const oppSignupId = isUser1 ? matchup.user2Id : matchup.user1Id
        const myScore = isLive
          ? computeScore(matchup.id, mySignupId, gameId)
          : (isUser1 ? matchup.user1Score : matchup.user2Score)
        const opponentScore = isLive
          ? computeScore(matchup.id, oppSignupId, gameId)
          : (isUser1 ? matchup.user2Score : matchup.user1Score)

        return {
          ...signup,
          matchup: {
            id: matchup.id,
            status: matchup.status,
            winnerId: effectiveWinnerId,
            draftPicksCount: matchup._count?.draftPicks ?? 0,
            user1Id: matchup.user1Id,
            user2Id: matchup.user2Id,
            firstPickUser: matchup.firstPickUser,
            draftPicks: [],
            opponentUsername: isUser1
              ? matchup.user2?.user?.username
              : matchup.user1?.user?.username,
            myScore,
            opponentScore,
          },
        }
      })
    })

    contests.sort((a: any, b: any) =>
      new Date(b.contest?.iplGame?.gameDate ?? 0).getTime() -
      new Date(a.contest?.iplGame?.gameDate ?? 0).getTime()
    )

    return NextResponse.json({ user, contests })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
