const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function completeDCGTContests() {
  try {
    console.log('Finding DC vs GT contests...');
    
    // Find the DC vs GT game
    const game = await prisma.iPLGame.findFirst({
      where: {
        OR: [
          { 
            AND: [
              { team1: { shortName: 'DC' } },
              { team2: { shortName: 'GT' } }
            ]
          },
          {
            AND: [
              { team1: { shortName: 'GT' } },
              { team2: { shortName: 'DC' } }
            ]
          }
        ]
      },
      include: {
        team1: true,
        team2: true,
        contests: true
      }
    });

    if (!game) {
      console.log('No DC vs GT game found');
      return;
    }

    console.log(`Found game: ${game.team1.shortName} vs ${game.team2.shortName}`);
    console.log(`Game date: ${game.gameDate}`);
    console.log(`Contests found: ${game.contests.length}`);

    // Update all contests for this game to COMPLETED
    const updateResult = await prisma.contest.updateMany({
      where: {
        iplGameId: game.id,
        status: {
          not: 'COMPLETED'
        }
      },
      data: {
        status: 'COMPLETED'
      }
    });

    console.log(`Updated ${updateResult.count} contests to COMPLETED status`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completeDCGTContests();