import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { signupId } = await request.json()

    if (!signupId) {
      return NextResponse.json(
        { error: "Signup ID is required" },
        { status: 400 }
      )
    }

    // Get the signup to find the contest
    const signup = await prisma.contestSignup.findUnique({
      where: { id: signupId },
      include: {
        contest: {
          include: {
            iplGame: {
              select: { signupDeadline: true }
            }
          }
        },
      },
    })

    if (!signup) {
      return NextResponse.json(
        { error: "Contest signup not found" },
        { status: 404 }
      )
    }

    // Block leaving after the signup deadline
    if (new Date() > new Date(signup.contest.iplGame.signupDeadline)) {
      return NextResponse.json(
        { error: "Cannot leave after the signup deadline has passed" },
        { status: 400 }
      )
    }

    // Delete the signup
    await prisma.contestSignup.delete({
      where: { id: signupId },
    })

    // Decrement the contest's totalSignups
    await prisma.contest.update({
      where: { id: signup.contestId },
      data: {
        totalSignups: {
          decrement: 1,
        },
      },
    })

    return NextResponse.json({
      message: "Successfully left the contest",
    })
  } catch (error) {
    console.error("Error leaving contest:", error)
    return NextResponse.json(
      { error: "Failed to leave contest" },
      { status: 500 }
    )
  }
}
