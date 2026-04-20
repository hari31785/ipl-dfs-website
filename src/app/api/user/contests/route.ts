import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'


// Get user's contest signups
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const completedOnly = searchParams.get('completed') === 'true'
    const excludeCompleted = searchParams.get('excludeCompleted') === 'true'

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      )
    }

    // Fast slim path for the leaderboard contest-history modal.
    // Uses a tight select (no tournament, no signup user, no unused matchup fields)
    // and adds a short-lived edge cache since completed history doesn't change.
    if (completedOnly) {
      const slimSignups = await prisma.contestSignup.findMany({
        where: { userId, contest: { status: 'COMPLETED' } },
        orderBy: { signupAt: 'desc' },
        select: {
          id: true,
          contest: {
            select: {
              coinValue: true,
              iplGame: {
                select: {
                  id: true,
                  gameDate: true,
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
              user1Score: true,
              user2Score: true,
              _count: { select: { draftPicks: true } },
              user1: { select: { user: { select: { username: true } } } },
            },
          },
        },
      })

      const slimResult = slimSignups.flatMap(signup => {
        const allMatchups = [...signup.matchupsAsUser1, ...signup.matchupsAsUser2]
        if (allMatchups.length === 0) return []

        return allMatchups.map(matchup => {
          const isUser1 = signup.matchupsAsUser1.some(m => m.id === matchup.id)
          const u1Score = matchup.user1Score as number | null | undefined
          const u2Score = matchup.user2Score as number | null | undefined

          let effectiveWinnerId = matchup.winnerId ?? null
          if (!effectiveWinnerId && matchup.status === 'COMPLETED') {
            if (u1Score != null && u2Score != null) {
              if (u1Score > u2Score) effectiveWinnerId = matchup.user1Id
              else if (u2Score > u1Score) effectiveWinnerId = matchup.user2Id
            }
          }

          return {
            id: signup.id,
            contest: signup.contest,
            matchup: {
              id: matchup.id,
              status: matchup.status,
              winnerId: effectiveWinnerId,
              draftPicksCount: matchup._count?.draftPicks ?? 0,
              user1Id: matchup.user1Id,
              user2Id: matchup.user2Id,
              draftPicks: [],
              opponentUsername: isUser1
                ? (matchup as any).user2?.user?.username
                : (matchup as any).user1?.user?.username,
              myScore: isUser1 ? u1Score : u2Score,
              opponentScore: isUser1 ? u2Score : u1Score,
            },
          }
        })
      })

      slimResult.sort((a, b) =>
        new Date(b.contest?.iplGame?.gameDate ?? 0).getTime() -
        new Date(a.contest?.iplGame?.gameDate ?? 0).getTime()
      )

      const slimResponse = NextResponse.json(slimResult)
      // Completed contest history is immutable — cache at the edge for 60s,
      // serve stale for up to 5 min while revalidating in background
      slimResponse.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
      return slimResponse
    }

    // Fast slim path for dashboard mount (excludeCompleted=true).
    // Uses tight select and a short-lived edge cache — the URL includes userId
    // so each user gets their own cache entry at the CDN.
    if (excludeCompleted) {
      const activeSignups = await prisma.contestSignup.findMany({
        where: { userId, contest: { status: { not: 'COMPLETED' } } },
        orderBy: { signupAt: 'desc' },
        select: {
          id: true,
          contest: {
            select: {
              id: true,
              status: true,
              coinValue: true,
              iplGame: {
                select: {
                  id: true,
                  gameDate: true,
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
      })

      const activeResult = activeSignups.flatMap((signup: any) => {
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
              myScore: isUser1 ? matchup.user1Score : matchup.user2Score,
              opponentScore: isUser1 ? matchup.user2Score : matchup.user1Score,
            },
          }
        })
      })

      activeResult.sort((a: any, b: any) =>
        new Date(b.contest?.iplGame?.gameDate ?? 0).getTime() -
        new Date(a.contest?.iplGame?.gameDate ?? 0).getTime()
      )

      const activeRes = NextResponse.json(activeResult)
      // Per-user cache — 15s at edge is enough to avoid duplicate mounts;
      // stale-while-revalidate serves instant repeat navigations
      activeRes.headers.set('Cache-Control', 'private, s-maxage=15, stale-while-revalidate=60')
      return activeRes
    }

    const signups = await prisma.contestSignup.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        signupAt: 'desc'
      },
      include: {
        contest: {
          include: {
            iplGame: {
              include: {
                team1: true,
                team2: true,
                tournament: true
              }
            }
          }
        },
        user: { select: { id: true, name: true, username: true } },
        matchupsAsUser1: {
          include: {
            _count: { select: { draftPicks: true } },
            user2: {
              include: {
                user: { select: { id: true, name: true, username: true } }
              }
            }
          }
        },
        matchupsAsUser2: {
          include: {
            _count: { select: { draftPicks: true } },
            user1: {
              include: {
                user: { select: { id: true, name: true, username: true } }
              }
            }
          }
        }
      }
    })

    // Add matchup info to each signup.
    // Fan-out: one entry per matchup so a user with multiple manual matchups
    // in the same contest sees all of them (e.g. admin-created pairs).
    const signupsWithMatchup = (signups as any[]).flatMap(signup => {
      const allMatchups = [...signup.matchupsAsUser1, ...signup.matchupsAsUser2];

      // No matchup yet → emit one entry with matchup: null (shows in Upcoming)
      // Skip if completedOnly — we only want settled matchups
      if (allMatchups.length === 0) return completedOnly ? [] : [{ ...signup, matchup: null }];

      return allMatchups.map(matchup => {
        const isUser1 = signup.matchupsAsUser1.some((m: any) => m.id === matchup.id);

        // Calculate scores if matchup exists and draft is complete
        let myScore: number | undefined;
        let opponentScore: number | undefined;

        if (matchup.status === 'COMPLETED') {
          // Use stored scores from DB — no need to re-compute from stats
          myScore       = isUser1 ? (matchup as any).user1Score : (matchup as any).user2Score;
          opponentScore = isUser1 ? (matchup as any).user2Score : (matchup as any).user1Score;
        }

        // Derive winnerId from stored DB scores for legacy records
        // (settled before winnerId column was being written — user1Score/user2Score are always correct)
        let effectiveWinnerId = matchup.winnerId ?? null;
        if (!effectiveWinnerId && matchup.status === 'COMPLETED') {
          const u1Score = (matchup as any).user1Score as number | null | undefined;
          const u2Score = (matchup as any).user2Score as number | null | undefined;
          if (u1Score != null && u2Score != null) {
            if (u1Score > u2Score) effectiveWinnerId = matchup.user1Id;
            else if (u2Score > u1Score) effectiveWinnerId = matchup.user2Id;
            // equal → stays null (genuine tie)
          }
        }

        return {
          ...signup,
          matchup: {
            id: matchup.id,
            status: matchup.status,
            winnerId: effectiveWinnerId,
            draftPicksCount: (matchup as any)._count?.draftPicks ?? 0,
            user1Id: matchup.user1Id,
            user2Id: matchup.user2Id,
            firstPickUser: matchup.firstPickUser,
            draftPicks: [],
            opponent:         isUser1 ? (matchup as any).user2?.user : (matchup as any).user1?.user,
            opponentUsername: isUser1 ? (matchup as any).user2?.user?.username : (matchup as any).user1?.user?.username,
            myScore,
            opponentScore,
          },
        };
      });
    });

    // Sort by game date descending (most recent first) after fan-out.
    // The flatMap over matchups can break the original signupAt order,
    // so we re-sort explicitly here.
    signupsWithMatchup.sort((a: any, b: any) => {
      const dateA = new Date(a.contest?.iplGame?.gameDate ?? 0).getTime();
      const dateB = new Date(b.contest?.iplGame?.gameDate ?? 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json(signupsWithMatchup)
  } catch (error) {
    console.error("Error fetching user contests:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
  }
}
