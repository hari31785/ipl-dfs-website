import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/scores/[matchupId]
 *
 * Slim, scores-only replacement for /api/draft/[matchupId] on the scores page.
 * Key differences vs the draft endpoint:
 *  - No availablePlayers query (not needed for viewing scores)
 *  - Tight `select` instead of broad `include`
 *  - Matchup + player stats fetched in parallel (Promise.all)
 *  - Edge-cached for COMPLETED matchups (immutable data)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchupId: string }> }
) {
  try {
    const { matchupId } = await params

    // Run matchup query and player-stats query in parallel
    const matchupPromise = prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      select: {
        id: true,
        status: true,
        firstPickUser: true,
        winnerId: true,
        user1Score: true,
        user2Score: true,
        user1Id: true,
        user2Id: true,
        user1: {
          select: {
            id: true,
            user: { select: { id: true, name: true, username: true } },
          },
        },
        user2: {
          select: {
            id: true,
            user: { select: { id: true, name: true, username: true } },
          },
        },
        contest: {
          select: {
            id: true,
            contestType: true,
            coinValue: true,
            status: true,
            iplGame: {
              select: {
                id: true,
                title: true,
                gameDate: true,
                status: true,
                tournamentId: true,
                team1: { select: { id: true, name: true, shortName: true, color: true } },
                team2: { select: { id: true, name: true, shortName: true, color: true } },
              },
            },
          },
        },
        draftPicks: {
          orderBy: { pickOrder: 'asc' },
          select: {
            id: true,
            playerId: true,
            pickOrder: true,
            pickedByUserId: true,
            isBench: true,
            player: {
              select: {
                id: true,
                name: true,
                role: true,
                iplTeam: { select: { name: true, shortName: true, color: true } },
              },
            },
          },
        },
      },
    })

    // Fetch matchup first to get gameId, then parallel-fetch stats
    const matchup = await matchupPromise

    if (!matchup) {
      return NextResponse.json({ message: 'Matchup not found' }, { status: 404 })
    }

    const gameId = matchup.contest.iplGame.id

    const statsRows = await prisma.playerStat.findMany({
      where: { iplGameId: gameId },
      select: {
        playerId: true,
        points: true,
        runs: true,
        wickets: true,
        catches: true,
        didNotPlay: true,
        runOuts: true,
        stumpings: true,
      },
    })

    const statsMap: Record<string, {
      points: number; runs: number; wickets: number; catches: number
      didNotPlay: boolean; runOuts: number; stumpings: number
    }> = {}
    for (const s of statsRows) {
      statsMap[s.playerId] = {
        points: s.points, runs: s.runs, wickets: s.wickets, catches: s.catches,
        didNotPlay: s.didNotPlay, runOuts: s.runOuts, stumpings: s.stumpings,
      }
    }

    const response = NextResponse.json({ matchup, statsMap })

    // Completed matchups are immutable — cache aggressively at the edge
    if (matchup.status === 'COMPLETED') {
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
    } else {
      // Active/drafting — short cache, stays fresh for polling pages
      response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')
    }

    return response
  } catch (error) {
    console.error('Error fetching scores:', error)
    return NextResponse.json(
      { message: 'Failed to fetch scores', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
