const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Checking for IPL 2026 player stats...\n');

    // Get the IPL 2026 tournament
    const tournament = await prisma.tournament.findFirst({
      where: {
        name: {
          contains: '2026',
          mode: 'insensitive'
        }
      }
    });

    if (!tournament) {
      console.log('❌ No IPL 2026 tournament found');
      await prisma.$disconnect();
      return;
    }

    console.log('✓ Found tournament:', tournament.name);
    console.log('  ID:', tournament.id);
    console.log('  Status:', tournament.status);
    console.log('');

    // Get games for this tournament
    const games = await prisma.iPLGame.findMany({
      where: {
        tournamentId: tournament.id
      },
      include: {
        team1: true,
        team2: true
      }
    });

    console.log(`📅 Found ${games.length} games:\n`);
    
    for (const game of games) {
      console.log(`Game: ${game.title}`);
      console.log(`  ID: ${game.id}`);
      console.log(`  Teams: ${game.team1.shortName} vs ${game.team2.shortName}`);
      console.log(`  Status: ${game.status}`);
      console.log(`  Date: ${new Date(game.gameDate).toLocaleString()}`);
      
      // Check for player stats for this game
      const stats = await prisma.playerStat.findMany({
        where: {
          iplGameId: game.id
        },
        include: {
          player: {
            include: {
              iplTeam: true
            }
          }
        }
      });

      console.log(`  Player Stats: ${stats.length} players\n`);
      
      if (stats.length > 0) {
        console.log(`  Sample stats:`);
        stats.slice(0, 5).forEach(stat => {
          console.log(`    - ${stat.player.name} (${stat.player.iplTeam.shortName}): ${stat.points.toFixed(1)} pts`);
          console.log(`      Runs: ${stat.runs}, Wickets: ${stat.wickets}, Catches: ${stat.catches}`);
        });
        if (stats.length > 5) {
          console.log(`    ... and ${stats.length - 5} more players`);
        }
        console.log('');
      }
    }

    // Overall stats summary
    const totalStats = await prisma.playerStat.count({
      where: {
        iplGame: {
          tournamentId: tournament.id
        }
      }
    });

    console.log('═══════════════════════════════════════');
    console.log(`TOTAL PLAYER STATS for IPL 2026: ${totalStats}`);
    console.log('═══════════════════════════════════════');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
