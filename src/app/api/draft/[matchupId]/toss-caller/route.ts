import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchupId: string }> }
) {
  try {
    const { matchupId } = await params

    // Fetch the matchup
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        user1: {
          include: { user: true }
        },
        user2: {
          include: { user: true }
        }
      }
    })

    if (!matchup) {
      return NextResponse.json(
        { error: 'Matchup not found' },
        { status: 404 }
      )
    }

    // If firstPickUser is already set, toss has been done
    if (matchup.firstPickUser) {
      return NextResponse.json(
        { error: 'Toss already completed' },
        { status: 400 }
      )
    }

    // Deterministically select the caller based on matchup ID
    // This ensures both users get the same caller without storing it
    // Use the matchup ID hash to determine who calls
    const hashCode = matchupId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    
    // Use the hash to pick user1 or user2
    const callingUserId = Math.abs(hashCode) % 2 === 0 
      ? matchup.user1.user.id 
      : matchup.user2.user.id

    return NextResponse.json({
      callingUserId,
      callingUserName: callingUserId === matchup.user1.user.id 
        ? matchup.user1.user.name 
        : matchup.user2.user.name
    })
  } catch (error) {
    console.error('Error fetching toss caller:', error)
    return NextResponse.json(
      { error: 'Failed to fetch toss caller' },
      { status: 500 }
    )
  }
}
