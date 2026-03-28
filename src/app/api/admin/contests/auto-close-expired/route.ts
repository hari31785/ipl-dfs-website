import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// POST /api/admin/contests/auto-close-expired - Automatically close expired signups and generate matchups
export async function POST(request: NextRequest) {
  try {
    const now = new Date();
    console.log(`🕐 Auto-close check running at: ${now.toISOString()}`);

    // Find all contests with expired signup deadlines that are still open
    const expiredContests = await prisma.contest.findMany({
      where: {
        status: 'SIGNUP_OPEN',
        iplGame: {
          signupDeadline: {
            lte: now
          }
        }
      },
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true,
            tournament: true
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

    if (expiredContests.length === 0) {
      console.log('✅ No expired contests found');
      return NextResponse.json({
        message: 'No expired contests found',
        processed: 0
      });
    }

    console.log(`📋 Found ${expiredContests.length} expired contest(s) to process`);
    
    const results = [];

    for (const contest of expiredContests) {
      try {
        console.log(`\n🎯 Processing contest ${contest.id} (${contest.contestType}, ${contest._count.signups} signups)`);
        
        // First, update contest status to SIGNUP_CLOSED
        const updatedContest = await prisma.contest.update({
          where: { id: contest.id },
          data: { status: 'SIGNUP_CLOSED' },
          include: {
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

        let matchupsGenerated = 0;
        
        // Handle different scenarios for matchup generation
        const signups = updatedContest.signups;
        
        if (signups.length === 0) {
          console.log(`⚠️ Contest ${contest.id}: No signups, no matchups to generate`);
          results.push({
            contestId: contest.id,
            contestType: contest.contestType,
            status: 'closed',
            signups: signups.length,
            matchupsGenerated: 0,
            message: 'No signups - contest closed'
          });
          continue;
        }

        if (signups.length === 1) {
          console.log(`⚠️ Contest ${contest.id}: Only 1 signup, adding admin user...`);
          
          // Create or get admin user
          let adminUser = await prisma.user.findUnique({
            where: { username: 'admin' }
          });

          if (!adminUser) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            adminUser = await prisma.user.create({
              data: {
                username: 'admin',
                name: 'Admin',
                email: 'admin@ipldfs.com',
                password: hashedPassword,
                coins: 1000000,
              }
            });
            console.log('✅ Created Admin user for matchup generation');
          }

          // Check if Admin is already signed up
          const existingAdminSignup = await prisma.contestSignup.findUnique({
            where: {
              contestId_userId: {
                contestId: contest.id,
                userId: adminUser.id
              }
            }
          });

          if (!existingAdminSignup) {
            await prisma.contestSignup.create({
              data: {
                contestId: contest.id,
                userId: adminUser.id
              }
            });
            console.log('✅ Added Admin user to contest signups');
          }

          // Re-fetch signups after adding admin
          const updatedSignups = await prisma.contestSignup.findMany({
            where: { contestId: contest.id },
            include: { user: true }
          });

          // Now create the matchup
          if (updatedSignups.length === 2) {
            const matchup = await prisma.headToHeadMatchup.create({
              data: {
                contestId: contest.id,
                user1Id: updatedSignups[0].id,
                user2Id: updatedSignups[1].id,
                firstPickUser: null,
                status: 'WAITING_DRAFT'
              }
            });
            matchupsGenerated = 1;
            console.log(`✅ Created matchup for contest ${contest.id} with admin user`);
          }
        }
        
        else if (signups.length >= 2 && signups.length % 2 === 0) {
          // Even number of signups - generate matchups normally
          console.log(`🎲 Generating matchups for ${signups.length} signups...`);
          
          // Shuffle signups randomly
          const shuffledSignups = [...signups].sort(() => Math.random() - 0.5);
          
          // Create head-to-head matchups
          for (let i = 0; i < shuffledSignups.length; i += 2) {
            const user1 = shuffledSignups[i];
            const user2 = shuffledSignups[i + 1];
            
            await prisma.headToHeadMatchup.create({
              data: {
                contestId: contest.id,
                user1Id: user1.id,
                user2Id: user2.id,
                firstPickUser: null,
                status: 'WAITING_DRAFT'
              }
            });
            matchupsGenerated++;
          }
          console.log(`✅ Generated ${matchupsGenerated} matchups for contest ${contest.id}`);
        }
        
        else {
          // Odd number of signups > 1 - add admin user
          console.log(`⚠️ Contest ${contest.id}: Odd number of signups (${signups.length}), adding admin user...`);
          
          // Create or get admin user (same logic as above)
          let adminUser = await prisma.user.findUnique({
            where: { username: 'admin' }
          });

          if (!adminUser) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            adminUser = await prisma.user.create({
              data: {
                username: 'admin',
                name: 'Admin',
                email: 'admin@ipldfs.com',
                password: hashedPassword,
                coins: 1000000,
              }
            });
            console.log('✅ Created Admin user for odd signup balancing');
          }

          // Add admin if not already signed up
          const existingAdminSignup = await prisma.contestSignup.findUnique({
            where: {
              contestId_userId: {
                contestId: contest.id,
                userId: adminUser.id
              }
            }
          });

          if (!existingAdminSignup) {
            await prisma.contestSignup.create({
              data: {
                contestId: contest.id,
                userId: adminUser.id
              }
            });
            console.log('✅ Added Admin user to balance odd signups');
          }

          // Re-fetch and create matchups
          const finalSignups = await prisma.contestSignup.findMany({
            where: { contestId: contest.id },
            include: { user: true }
          });

          const shuffledSignups = [...finalSignups].sort(() => Math.random() - 0.5);
          
          for (let i = 0; i < shuffledSignups.length; i += 2) {
            const user1 = shuffledSignups[i];
            const user2 = shuffledSignups[i + 1];
            
            await prisma.headToHeadMatchup.create({
              data: {
                contestId: contest.id,
                user1Id: user1.id,
                user2Id: user2.id,
                firstPickUser: null,
                status: 'WAITING_DRAFT'
              }
            });
            matchupsGenerated++;
          }
          console.log(`✅ Generated ${matchupsGenerated} matchups for contest ${contest.id} (after adding admin)`);
        }

        // Update contest status to DRAFT_PHASE if matchups were created
        if (matchupsGenerated > 0) {
          await prisma.contest.update({
            where: { id: contest.id },
            data: { status: 'DRAFT_PHASE' }
          });
          console.log(`✅ Updated contest ${contest.id} status to DRAFT_PHASE`);
        }

        results.push({
          contestId: contest.id,
          contestType: contest.contestType,
          status: matchupsGenerated > 0 ? 'draft_phase' : 'closed',
          signups: signups.length,
          matchupsGenerated,
          message: `Processed successfully - ${matchupsGenerated} matchups created`
        });

      } catch (error) {
        console.error(`❌ Error processing contest ${contest.id}:`, error);
        results.push({
          contestId: contest.id,
          contestType: contest.contestType,
          status: 'error',
          signups: contest._count.signups,
          matchupsGenerated: 0,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    console.log(`\n✅ Auto-close completed. Processed ${results.length} contests`);
    
    return NextResponse.json({
      message: `Auto-close completed. Processed ${results.length} contests`,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('❌ Auto-close error:', error);
    return NextResponse.json(
      { message: 'Failed to auto-close expired contests', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}