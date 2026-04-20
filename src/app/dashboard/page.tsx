import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import DashboardClient from './DashboardClient'

// Cache tournament data server-side for 1 hour.
// Available Contests is the first tab users see — pre-loading it here means
// the data is baked into the initial HTML and renders without any client waterfall.
const getCachedDashboardTournaments = unstable_cache(
  async () => {
    const [tournaments, leaderboardTournaments] = await Promise.all([
      prisma.tournament.findMany({
        where: {
          isActive: true,
          status: { in: ['ACTIVE', 'UPCOMING'] },
          games: {
            some: {
              OR: [
                {
                  status: { in: ['UPCOMING', 'SIGNUP_OPEN'] },
                  gameDate: { gt: new Date() },
                  contests: { some: { status: 'SIGNUP_OPEN' } },
                },
                {
                  contests: { some: { status: 'SIGNUP_OPEN' } },
                },
              ],
            },
          },
        },
        orderBy: { startDate: 'asc' },
        include: {
          games: {
            where: {
              OR: [
                {
                  status: { in: ['UPCOMING', 'SIGNUP_OPEN'] },
                  gameDate: { gt: new Date() },
                  contests: { some: { status: 'SIGNUP_OPEN' } },
                },
                {
                  contests: { some: { status: 'SIGNUP_OPEN' } },
                },
              ],
            },
            orderBy: { gameDate: 'desc' },
            select: {
              id: true,
              team1Id: true,
              team2Id: true,
              gameDate: true,
              signupDeadline: true,
              status: true,
              team1: true,
              team2: true,
              contests: {
                where: { status: 'SIGNUP_OPEN' },
                select: {
                  id: true,
                  contestType: true,
                  coinValue: true,
                  maxParticipants: true,
                  totalSignups: true,
                  status: true,
                  _count: { select: { signups: true } },
                },
              },
            },
          },
        },
      }),
      prisma.tournament.findMany({
        where: { isActive: true, status: { in: ['ACTIVE', 'UPCOMING'] } },
        orderBy: { startDate: 'desc' },
        select: { id: true, name: true, status: true },
      }),
    ])

    return {
      tournaments,
      leaderboardTournamentId: leaderboardTournaments[0]?.id ?? null,
    }
  },
  ['dashboard-tournaments'],
  { revalidate: 3600 } // 1 hour
)

export default async function DashboardPage() {
  const { tournaments: initialTournaments, leaderboardTournamentId } =
    await getCachedDashboardTournaments()

  return (
    <DashboardClient
      initialTournaments={initialTournaments as any}
      initialLeaderboardTournamentId={leaderboardTournamentId}
    />
  )
}
