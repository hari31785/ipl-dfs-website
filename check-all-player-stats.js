const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Checking all player stats in database...\n');

    // Get all player stats
    const allStats = await prisma.playerStat.findMany({
      include: {
        player: {
          include: {
            iplTeam: true
          }
        }
      }
    });

    console.log(`📊 Total player stats: ${allStats.length}\n`);

    if (allStats.length === 0) {
      console.log('No player stats found in database');
      await prisma.$disconnect();
      return;
    }

    // Get game details for each stat
    const gameCache = new Map();
    for (const stat of allStats) {
      if (!gameCache.has(stat.iplGameId)) {
        const game = await prisma.iPLGame.findUnique({
          where: { id: stat.iplGameId },
          include: {
            tournament: true,
            team1: true,
            team2: true
          }
        });
        gameCache.set(stat.iplGameId, game);
      }
    }

    // Group by game
    const statsByGame = {};
    allStats.forEach(stat => {
      const gameKey = stat.iplGameId;
      if (!statsByGame[gameKey]) {
        statsByGame[gameKey] = {
          game: gameCache.get(gameKey),
          stats: []
        };
      }
      statsByGame[gameKey].stats.push(stat);
    });

    console.log('═══════════════════════════════════════');
    console.log('PLAYER STATS BY GAME:');
    console.log('═══════════════════════════════════════\n');

    Object.entries(statsByGame).forEach(([gameId, { game, stats }]) => {
      if (!game) {
        console.log(`⚠️  ORPHANED STATS - Game ID: ${gameId}`);
        console.log(`   Game: DELETED/NOT FOUND`);
        console.log(`   Stats Count: ${stats.length} orphaned player stats\n`);
        console.log(`   Sample players:`);
        stats.slice(0, 5).forEach(stat => {
          console.log(`     - ${stat.player.name} (${stat.player.iplTeam.shortName}): ${stat.points.toFixed(1)} pts`);
        });
        if (stats.length > 5) {
          console.log(`     ... and ${stats.length - 5} more players`);
        }
        console.log('');
        return;
      }

      console.log(`Game: ${game.title}`);
      console.log(`  Tournament: ${game.tournament.name}`);
      console.log(`  Teams: ${game.team1.shortName} vs ${game.team2.shortName}`);
      console.log(`  Status: ${game.status}`);
      console.log(`  Date: ${new Date(game.gameDate).toLocaleString()}`);
      console.log(`  Stats Count: ${stats.length} players\n`);

      if (stats.length > 0) {
        console.log(`  Sample players:`);
        stats.slice(0, 5).forEach(stat => {
          console.log(`    - ${stat.player.name} (${stat.player.iplTeam.shortName}): ${stat.points.toFixed(1)} pts`);
        });
        if (stats.length > 5) {
          console.log(`    ... and ${stats.length - 5} more players`);
        }
        console.log('');
      }
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
