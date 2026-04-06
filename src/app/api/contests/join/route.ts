import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

const MAX_ENTRIES_PER_USER = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contestId, userId } = body

    if (!contestId || !userId) {
      return NextResponse.json(
        { message: "Contest ID and User ID are required" },
        { status: 400 }
      )
    }

    // Count existing entries for this user in this contest
    const existingEntries = await prisma.contestSignup.findMany({
      where: { contestId, userId },
      orderBy: { entryNumber: 'asc' }
    })

    if (existingEntries.length >= MAX_ENTRIES_PER_USER) {
      return NextResponse.json(
        { message: `You can enter a maximum of ${MAX_ENTRIES_PER_USER} times per contest` },
        { status: 400 }
      )
    }

    const entryNumber = existingEntries.length + 1;

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
        userId,
        entryNumber
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

    const isReEntry = entryNumber > 1;
    return NextResponse.json({
      message: isReEntry
        ? `Entry #${entryNumber} added! You now have ${entryNumber} entries in this contest.`
        : "Successfully joined contest! You'll receive a matchup once signups close.",
      signup,
      entryNumber
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
