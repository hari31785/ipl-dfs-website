import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const now = new Date()
    
    // 1. Find contests that are past due and not completed
    const pastDueContests = await prisma.contest.findMany({
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
      include: {
        signups: {
          include: {
            matchupsAsUser1: true,
            matchupsAsUser2: true
          }
        },
        iplGame: {
          include: {
            team1: true,
            team2: true
          }
        }
      }
    })

    let completedContests = 0
    let cleanedUpSignups = 0

    for (const contest of pastDueContests) {
      console.log(`Processing past due contest: ${contest.contestType} for ${contest.iplGame.team1.shortName} vs ${contest.iplGame.team2.shortName}`)
      
      // 2. Find signups without matchups
      const signupsWithoutMatchups = contest.signups.filter(signup => 
        signup.matchupsAsUser1.length === 0 && signup.matchupsAsUser2.length === 0
      )
      
      if (signupsWithoutMatchups.length > 0) {
        console.log(`Found ${signupsWithoutMatchups.length} signups without matchups`)
        
        // 3. Remove signups that don't have matchups
        await prisma.contestSignup.deleteMany({
          where: {
            id: {
              in: signupsWithoutMatchups.map(s => s.id)
            }
          }
        })
        
        cleanedUpSignups += signupsWithoutMatchups.length
      }
      
      // 4. Update contest totalSignups count
      const remainingSignups = await prisma.contestSignup.count({
        where: {
          contestId: contest.id
        }
      })
      
      // 5. Mark contest as completed
      await prisma.contest.update({
        where: {
          id: contest.id
        },
        data: {
          status: 'COMPLETED',
          totalSignups: remainingSignups
        }
      })
      
      completedContests++
    }

    return NextResponse.json({
      success: true,
      completedContests,
      cleanedUpSignups,
      message: `Completed ${completedContests} past due contests and cleaned up ${cleanedUpSignups} unmatched signups`
    })

  } catch (error) {
    console.error('Error in contest cleanup:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup contests' },
      { status: 500 }
    )
  }
}