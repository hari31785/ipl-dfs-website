import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import ScoresClient from './ScoresClient'

// No module-level revalidate — live matches need fresh data every request.
// Completed matchups are cached per-matchupId via unstable_cache below.

const MATCHUP_SELECT = {
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
    orderBy: { pickOrder: 'asc' as const },
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
} as const

async function fetchMatchup(matchupId: string) {
  return prisma.headToHeadMatchup.findUnique({
    where: { id: matchupId },
    select: MATCHUP_SELECT,
  })
}

async function fetchStats(gameId: string) {
  const rows = await prisma.playerStat.findMany({
    where: { iplGameId: gameId },
    select: {
      playerId: true, points: true, runs: true, wickets: true,
      catches: true, didNotPlay: true, runOuts: true, stumpings: true,
    },
  })
  const map: Record<string, {
    points: number; runs: number; wickets: number; catches: number;
    didNotPlay: boolean; runOuts: number; stumpings: number;
  }> = {}
  for (const s of rows) {
    map[s.playerId] = {
      points: s.points, runs: s.runs, wickets: s.wickets, catches: s.catches,
      didNotPlay: s.didNotPlay, runOuts: s.runOuts, stumpings: s.stumpings,
    }
  }
  return map
}

export default async function ScoresPage({ params }: { params: Promise<{ matchupId: string }> }) {
  const { matchupId } = await params

  // Always fetch matchup fresh — it's a tiny indexed query and we need
  // the status to decide whether to cache stats
  const matchup = await fetchMatchup(matchupId)
  if (!matchup) notFound()

  const gameId = matchup.contest.iplGame.id
  const isCompleted = matchup.status === 'COMPLETED'

  // COMPLETED matchups: cache stats for 1 hour at the server layer.
  // Tag allows instant invalidation when admin pushes new stats.
  // LIVE/ACTIVE/DRAFTING: always fresh — scores are changing.
  const statsMap = isCompleted
    ? await unstable_cache(
        () => fetchStats(gameId),
        [`scores-stats-${gameId}`],
        { revalidate: 3600, tags: [`scores-game-${gameId}`] }
      )()
    : await fetchStats(gameId)

  return (
    <ScoresClient
      initialMatchup={matchup as any}
      initialStatsMap={statsMap}
      matchupId={matchupId}
    />
  )
}
