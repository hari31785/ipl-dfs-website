import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Auto-close expired contests and generate matchups
    const autoCloseResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/contests/auto-close-expired`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (autoCloseResponse.ok) {
      const autoCloseData = await autoCloseResponse.json();
      console.log(`✅ Auto-close check completed: ${autoCloseData.message}`);
    } else {
      console.warn('⚠️ Auto-close check failed, falling back to simple status update');
      // Fallback: simple status update
      const now = new Date();
      await prisma.contest.updateMany({
        where: {
          status: 'SIGNUP_OPEN',
          iplGame: {
            signupDeadline: {
              lte: now
            }
          }
        },
        data: {
          status: 'SIGNUP_CLOSED'
        }
      });
    }

    // Also mark contests as completed if their game has already been played
    const now = new Date();
    await prisma.contest.updateMany({
      where: {
        status: {
          not: 'COMPLETED'
        },
        iplGame: {
          gameDate: {
            lt: now
          }
        }
      },
      data: {
        status: 'COMPLETED'
      }
    });

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
