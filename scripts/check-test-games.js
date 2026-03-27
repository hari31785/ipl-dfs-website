const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGames() {
  try {
    console.log('Checking all games in Test Tournament...\n');

    const games = await prisma.iPLGame.findMany({
      where: {
        tournament: {
          name: 'Test Tournament'
        }
      },
      include: {
        team1: true,
        team2: true,
        tournament: true
      }
    });

    console.log(`Found ${games.length} games:\n`);

    games.forEach((game, index) => {
      console.log(`${index + 1}. ${game.title}`);
      console.log(`   ID: ${game.id}`);
      console.log(`   Teams: ${game.team1.shortName} vs ${game.team2.shortName}`);
      console.log(`   Date: ${game.gameDate}`);
      console.log(`   Status: ${game.status}\n`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGames();
