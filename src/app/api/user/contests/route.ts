import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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

    // Add matchup info to each signup
    const signupsWithMatchup = signups.map(signup => {
      const matchup = signup.matchupsAsUser1[0] || signup.matchupsAsUser2[0] || null;
      
      // Calculate scores if matchup exists and draft is complete
      let myScore: number | undefined;
      let opponentScore: number | undefined;
      
      if (matchup && matchup.status === 'COMPLETED') {
        const isUser1 = !!signup.matchupsAsUser1[0];
        const mySignupId = isUser1 ? matchup.user1Id : matchup.user2Id;
        const opponentSignupId = isUser1 ? matchup.user2Id : matchup.user1Id;
        
        // Calculate my score
        myScore = matchup.draftPicks
          .filter(pick => pick.pickedByUserId === mySignupId)
          .reduce((sum, pick) => {
            const playerStats = pick.player.stats.filter(
              stat => stat.iplGameId === signup.contest.iplGameId
            );
            const points = playerStats.length > 0 ? playerStats[0].points : 0;
            return sum + points;
          }, 0);
        
        // Calculate opponent score
        opponentScore = matchup.draftPicks
          .filter(pick => pick.pickedByUserId === opponentSignupId)
          .reduce((sum, pick) => {
            const playerStats = pick.player.stats.filter(
              stat => stat.iplGameId === signup.contest.iplGameId
            );
            const points = playerStats.length > 0 ? playerStats[0].points : 0;
            return sum + points;
          }, 0);
      }
      
      return {
        ...signup,
        matchup: matchup ? {
          id: matchup.id,
          status: matchup.status,
          opponent: signup.matchupsAsUser1[0] ? matchup.user2.user : matchup.user1.user,
          myScore,
          opponentScore
        } : null
      };
    });

    return NextResponse.json(signupsWithMatchup)
  } catch (error) {
    console.error("Error fetching user contests:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
