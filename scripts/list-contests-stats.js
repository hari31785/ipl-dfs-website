const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listContestsAndGames() {
  try {
    const contests = await prisma.contest.findMany({
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true
          }
        },
        _count: {
          select: {
            matchups: true,
            signups: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log('\n=== RECENT CONTESTS ===\n');
    for (const contest of contests) {
      console.log(`Contest ID: ${contest.id}`);
      console.log(`  Game: ${contest.iplGame.team1.shortName} vs ${contest.iplGame.team2.shortName}`);
      console.log(`  Game ID: ${contest.iplGameId}`);
      console.log(`  Status: ${contest.status}`);
      console.log(`  Coin Value: ${contest.coinValue}`);
      console.log(`  Matchups: ${contest._count.matchups}`);
      console.log(`  Signups: ${contest._count.signups}`);
      
      // Check if stats exist for this game
      const statsCount = await prisma.playerStats.count({
        where: {
          iplGameId: contest.iplGameId
        }
      });
      console.log(`  Player Stats: ${statsCount}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listContestsAndGames();
