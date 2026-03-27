const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * This script removes orphaned player stats that reference games that no longer exist.
 * This happens when games/tournaments are deleted without properly cleaning up related stats.
 */

(async () => {
  try {
    console.log('🔍 Finding orphaned player stats...\n');

    // Get all player stats
    const allStats = await prisma.playerStat.findMany();
    console.log(`Total player stats: ${allStats.length}`);

    // Check which ones have valid games
    const orphanedStats = [];
    for (const stat of allStats) {
      const game = await prisma.iPLGame.findUnique({
        where: { id: stat.iplGameId }
      });
      if (!game) {
        orphanedStats.push(stat);
      }
    }

    console.log(`Orphaned stats (game deleted): ${orphanedStats.length}\n`);

    if (orphanedStats.length === 0) {
      console.log('✅ No orphaned stats found. Database is clean!');
      await prisma.$disconnect();
      return;
    }

    // Display orphaned stats details
    console.log('⚠️  Orphaned Player Stats Found:');
    console.log('═══════════════════════════════════════');
    
    const statsByGame = {};
    orphanedStats.forEach(stat => {
      if (!statsByGame[stat.iplGameId]) {
        statsByGame[stat.iplGameId] = [];
      }
      statsByGame[stat.iplGameId].push(stat);
    });

    Object.entries(statsByGame).forEach(([gameId, stats]) => {
      console.log(`\nGame ID: ${gameId} (DELETED)`);
      console.log(`  Stats Count: ${stats.length}`);
      console.log(`  Stat IDs: ${stats.map(s => s.id).slice(0, 3).join(', ')}${stats.length > 3 ? '...' : ''}`);
    });

    console.log('\n═══════════════════════════════════════');
    console.log(`\n🗑️  Deleting ${orphanedStats.length} orphaned player stats...`);

    // Delete orphaned stats
    const result = await prisma.playerStat.deleteMany({
      where: {
        id: {
          in: orphanedStats.map(s => s.id)
        }
      }
    });

    console.log(`✅ Deleted ${result.count} orphaned player stats`);
    console.log('\n🎉 Cleanup complete!');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
