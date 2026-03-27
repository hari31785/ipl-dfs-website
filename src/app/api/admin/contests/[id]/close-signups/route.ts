import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';


// POST /api/admin/contests/[id]/close-signups
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contest = await prisma.contest.findUnique({
      where: { id },

      include: {
        _count: {
          select: {
            signups: true
          }
        }
      }
    });

    if (!contest) {
      return NextResponse.json(
        { message: 'Contest not found' },
        { status: 404 }
      );
    }

    if (contest.status !== 'SIGNUP_OPEN') {
      return NextResponse.json(
        { message: 'Contest signups are not currently open' },
        { status: 400 }
      );
    }

    if (contest._count.signups < 1) {
      return NextResponse.json(
        { message: 'At least 1 signup required to close signups (Admin will be added to make it 2)' },
        { status: 400 }
      );
    }

    // Handle odd number of signups (including 1) by adding Admin user
    if (contest._count.signups % 2 !== 0) {
      console.log(`⚠️ Odd number of signups (${contest._count.signups}). Adding Admin user...`);
      
      // Find or create Admin user (same username as admin login)
      let adminUser = await prisma.user.findUnique({
        where: { username: 'admin' }
      });

      if (!adminUser) {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        adminUser = await prisma.user.create({
          data: {
            username: 'admin',
            name: 'Admin',
            email: 'admin@ipldfs.com',
            password: hashedPassword,
            coins: 1000000, // Give admin plenty of coins
          }
        });
        console.log('✅ Created Admin user for contest participation');
      }

      // Check if Admin is already signed up
      const existingSignup = await prisma.contestSignup.findUnique({
        where: {
          contestId_userId: {
            contestId: contest.id,
            userId: adminUser.id
          }
        }
      });

      if (!existingSignup) {
        // Add Admin to contest signups
        await prisma.contestSignup.create({
          data: {
            contestId: contest.id,
            userId: adminUser.id
          }
        });
        console.log(`✅ Added Admin user to contest ${contest.id}. New signup count: ${contest._count.signups + 1}`);
      }
    }

    const updatedContest = await prisma.contest.update({
      where: { id },
      data: { status: 'SIGNUP_CLOSED' },
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true
          }
        },
        signups: {
          include: {
            user: true
          }
        },
        _count: {
          select: {
            signups: true,
            matchups: true
          }
        }
      }
    });

    console.log(`✅ Closed signups for contest ${contest.id} with ${updatedContest._count.signups} participants`);

    // Automatically generate matchups (only if none exist)
    const signups = updatedContest.signups;
    
    if (signups.length >= 2 && signups.length % 2 === 0) {
      // Check if matchups already exist
      if (updatedContest._count.matchups > 0) {
        console.log(`⚠️ Matchups already exist (${updatedContest._count.matchups}). Skipping generation.`);
        
        // Just update status to DRAFT_PHASE
        await prisma.contest.update({
          where: { id: updatedContest.id },
          data: { status: 'DRAFT_PHASE' }
        });
        
        return NextResponse.json({
          message: `Signups closed successfully. Existing ${updatedContest._count.matchups} matchups preserved.`,
          contest: updatedContest,
          matchupsGenerated: 0
        });
      }
      
      console.log('🎲 Auto-generating matchups...');
      
      // Shuffle signups randomly
      const shuffledSignups = [...signups].sort(() => Math.random() - 0.5);
      
      // Create head-to-head matchups
      const matchups = [];
      for (let i = 0; i < shuffledSignups.length; i += 2) {
        const user1 = shuffledSignups[i];
        const user2 = shuffledSignups[i + 1];
        
        const matchup = await prisma.headToHeadMatchup.create({
          data: {
            contestId: updatedContest.id,
            user1Id: user1.id,
            user2Id: user2.id,
            firstPickUser: null,
            status: 'WAITING_DRAFT'
          },
          include: {
            user1: {
              include: {
                user: true
              }
            },
            user2: {
              include: {
                user: true
              }
            }
          }
        });
        
        matchups.push(matchup);
      }

      // Update contest status to DRAFT_PHASE
      await prisma.contest.update({
        where: { id: updatedContest.id },
        data: { status: 'DRAFT_PHASE' }
      });

      console.log(`✅ Generated ${matchups.length} head-to-head matchups for contest ${updatedContest.id}`);

      return NextResponse.json({
        message: `Signups closed and ${matchups.length} matchups generated successfully`,
        contest: updatedContest,
        matchupsGenerated: matchups.length
      });
    }

    return NextResponse.json({
      message: 'Signups closed successfully',
      contest: updatedContest
    });

  } catch (error) {
    console.error('Error closing signups:', error);
    return NextResponse.json(
      { message: 'Failed to close signups' },
      { status: 500 }
    );
  }
}
