const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkStats() {
  try {
    // The game ID from the matchup
    const gameId = 'cmmju4b5g0001966rqw4y2agg';
    
    console.log(`\n=== Checking stats for game: ${gameId} ===\n`);
    
    const stats = await prisma.playerStat.findMany({
      where: {
        iplGameId: gameId
      },
      include: {
        player: {
          include: {
            iplTeam: true
          }
        }
      }
    });

    console.log(`Found ${stats.length} player stats entries\n`);

    if (stats.length > 0) {
      for (const stat of stats) {
        console.log(`${stat.player.name} (${stat.player.iplTeam.shortName})`);
        console.log(`  Runs: ${stat.runs}, Wickets: ${stat.wickets}, Catches: ${stat.catches}`);
        console.log(`  Run Outs: ${stat.runOuts}, Stumpings: ${stat.stumpings}`);
        console.log(`  DNP: ${stat.didNotPlay}, Points: ${stat.points}`);
        console.log('');
      }
    } else {
      console.log('No stats found for this game!');
      
      // Check all games to find where stats might be
      console.log('\n=== Checking all DC vs GT games ===\n');
      const games = await prisma.iPLGame.findMany({
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
          team2: true
        }
      });

      for (const game of games) {
        const statsCount = await prisma.playerStat.count({
          where: { iplGameId: game.id }
        });
        console.log(`Game ID: ${game.id}`);
        console.log(`  ${game.team1.shortName} vs ${game.team2.shortName}`);
        console.log(`  Title: ${game.title}`);
        console.log(`  Stats Count: ${statsCount}`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStats();
