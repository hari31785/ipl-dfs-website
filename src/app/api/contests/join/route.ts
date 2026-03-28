import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'


export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { contestId, userId } = body

    if (!contestId || !userId) {
      return NextResponse.json(
        { message: "Contest ID and User ID are required" },
        { status: 400 }
      )
    }

    // Check if user already signed up for this contest
    const existingSignup = await prisma.contestSignup.findFirst({
      where: {
        contestId,
        userId
      }
    })

    if (existingSignup) {
      return NextResponse.json(
        { message: "You have already joined this contest" },
        { status: 400 }
      )
    }

    // Get contest details to check if it's still open
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        iplGame: true
      }
    })

    if (!contest) {
      return NextResponse.json(
        { message: "Contest not found" },
        { status: 404 }
      )
    }

    if (contest.status !== 'SIGNUP_OPEN') {
      return NextResponse.json(
        { message: "This contest is no longer open for signups" },
        { status: 400 }
      )
    }

    // Check if signup deadline has passed
    if (new Date() > new Date(contest.iplGame.signupDeadline)) {
      return NextResponse.json(
        { message: "Signup deadline has passed" },
        { status: 400 }
      )
    }

    // Check if contest is full
    if (contest.totalSignups >= contest.maxParticipants) {
      return NextResponse.json(
        { message: "This contest is full" },
        { status: 400 }
      )
    }

    // Create the contest signup
    const signup = await prisma.contestSignup.create({
      data: {
        contestId,
        userId
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
        }
      }
    })

    // Update contest total signups
    await prisma.contest.update({
      where: { id: contestId },
      data: {
        totalSignups: {
          increment: 1
        }
      }
    })

    return NextResponse.json({
      message: "Successfully joined contest! You'll receive a matchup once signups close.",
      signup
    }, { status: 201 })

  } catch (error) {
    console.error("Error joining contest:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
  }
}
