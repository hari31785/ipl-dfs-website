import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Check if this is for coin vault (show all active tournaments)
    const { searchParams } = new URL(request.url);
    const forCoinVault = searchParams.get('forCoinVault') === 'true';

    const tournaments = await prisma.tournament.findMany({
      where: forCoinVault ? {
        // For coin vault, show all active tournaments
        isActive: true,
        status: 'ACTIVE'
      } : {
        // For dashboard, show tournaments with open signups
        isActive: true,
        status: {
          in: ['ACTIVE', 'UPCOMING']
        },
        games: {
          some: {
            // Include games that either:
            // 1. Meet standard criteria (upcoming, future date)
            // 2. Have reopened contests (SIGNUP_OPEN status)
            OR: [
              {
                // Standard criteria - upcoming games
                status: {
                  in: ['UPCOMING', 'SIGNUP_OPEN']
                },
                gameDate: {
                  gt: new Date()
                },
                contests: {
                  some: {
                    status: 'SIGNUP_OPEN'
                  }
                }
              },
              {
                // Reopened contests - regardless of game status/date
                contests: {
                  some: {
                    status: 'SIGNUP_OPEN'
                  }
                }
              }
            ]
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      },
      include: forCoinVault ? {
        // For coin vault, no need to include games
        _count: {
          select: {
            games: true
          }
        }
      } : {
        games: {
          where: {
            // Include games that either:
            // 1. Meet standard criteria (upcoming, future date) 
            // 2. Have reopened contests (SIGNUP_OPEN status)
            OR: [
              {
                // Standard criteria
                status: {
                  in: ['UPCOMING', 'SIGNUP_OPEN']
                },
                gameDate: {
                  gt: new Date()
                },
                contests: {
                  some: {
                    status: 'SIGNUP_OPEN'
                  }
                }
              },
              {
                // Reopened contests - show regardless of game status/date
                contests: {
                  some: {
                    status: 'SIGNUP_OPEN'
                  }
                }
              }
            ]
          },
          orderBy: {
            gameDate: 'desc'
          },
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
              where: {
                status: 'SIGNUP_OPEN'
              },
              select: {
                id: true,
                contestType: true,
                coinValue: true,
                maxParticipants: true,
                totalSignups: true,
                status: true,
                _count: {
                  select: {
                    signups: true
                  }
                }
              }
            }
          }
        }
      }
    })

    return NextResponse.json(tournaments)
  } catch (error) {
    console.error("Error fetching tournaments:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
  }
}
