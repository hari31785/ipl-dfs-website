import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'


// Get user's contest signups
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      )
    }

    const signups = await prisma.contestSignup.findMany({
      where: {
        userId: userId
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
            user2: {
              include: {
                user: { select: { id: true, name: true, username: true } }
              }
            },
            draftPicks: {
              select: {
                id: true,
                pickOrder: true,
                pickedByUserId: true,
                isBench: true,
                playerId: true,
                player: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                    iplTeam: { select: { shortName: true, color: true } }
                  }
                }
              }
            }
          }
        },
        matchupsAsUser2: {
          include: {
            user1: {
              include: {
                user: { select: { id: true, name: true, username: true } }
              }
            },
            draftPicks: {
              select: {
                id: true,
                pickOrder: true,
                pickedByUserId: true,
                isBench: true,
                playerId: true,
                player: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                    iplTeam: { select: { shortName: true, color: true } }
                  }
                }
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
      if (allMatchups.length === 0) return [{ ...signup, matchup: null }];

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
            draftPicksCount: matchup.draftPicks.length,
            user1Id: matchup.user1Id,
            user2Id: matchup.user2Id,
            firstPickUser: matchup.firstPickUser,
            draftPicks: matchup.draftPicks,
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
