const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetFirstPickForToss() {
  try {
    console.log('Finding matchups that need firstPickUser reset...');
    
    // Find all DRAFTING matchups with firstPickUser set
    const matchupsToReset = await prisma.headToHeadMatchup.findMany({
      where: {
        status: 'DRAFTING',
        NOT: {
          firstPickUser: null
        }
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
        },
        contest: {
          include: {
            iplGame: true
          }
        }
      }
    });

    console.log(`Found ${matchupsToReset.length} matchups to reset`);

    if (matchupsToReset.length === 0) {
      console.log('No matchups need to be reset. All drafting matchups either already have null firstPickUser or are in a different status.');
      return;
    }

    // Display matchups that will be reset
    console.log('\nMatchups to reset:');
    matchupsToReset.forEach(matchup => {
      console.log(`- ${matchup.contest.iplGame.homeTeam} vs ${matchup.contest.iplGame.awayTeam}`);
      console.log(`  ${matchup.user1.user.username} vs ${matchup.user2.user.username}`);
      console.log(`  Current firstPickUser: ${matchup.firstPickUser}`);
    });

    // Reset firstPickUser to null
    const result = await prisma.headToHeadMatchup.updateMany({
      where: {
        status: 'DRAFTING',
        NOT: {
          firstPickUser: null
        }
      },
      data: {
        firstPickUser: null
      }
    });

    console.log(`\n✅ Successfully reset firstPickUser for ${result.count} matchups`);
    console.log('These matchups will now trigger the coin toss when users enter the draft.');

  } catch (error) {
    console.error('Error resetting firstPickUser:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetFirstPickForToss();
