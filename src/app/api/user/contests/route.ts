import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'
import { calculateTotalPointsWithSwap } from '@/lib/benchSwapUtils'


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
        user: true,
        matchupsAsUser1: {
          include: {
            user2: {
              include: {
                user: true
              }
            },
            draftPicks: {
              include: {
                player: {
                  include: {
                    stats: true
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
                user: true
              }
            },
            draftPicks: {
              include: {
                player: {
                  include: {
                    stats: true
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
          const mySignupId       = isUser1 ? matchup.user1Id : matchup.user2Id;
          const opponentSignupId = isUser1 ? matchup.user2Id : matchup.user1Id;

          const myPicks  = matchup.draftPicks.filter((pick: any) => pick.pickedByUserId === mySignupId);
          const oppPicks = matchup.draftPicks.filter((pick: any) => pick.pickedByUserId === opponentSignupId);
          myScore       = calculateTotalPointsWithSwap(myPicks as any, signup.contest.iplGameId);
          opponentScore = calculateTotalPointsWithSwap(oppPicks as any, signup.contest.iplGameId);
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
