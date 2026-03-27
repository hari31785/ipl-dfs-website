const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * This script recalculates user stats (totalWins, totalMatches, winPercentage)
 * based on their actual remaining coin transactions.
 * 
 * Use case: When tournaments/contests are deleted without properly updating user stats,
 * this script will clean up the orphaned stats.
 */

(async () => {
  try {
    console.log('🔍 Starting cleanup of orphaned user stats...\n');

    // Get all users
    const users = await prisma.user.findMany({
      include: {
        coinTransactions: {
          where: {
            OR: [
              { type: 'WIN' },
              { type: 'LOSS' }
            ]
          }
        }
      }
    });

    console.log(`Found ${users.length} users to check\n`);

    let usersUpdated = 0;
    let usersSkipped = 0;

    for (const user of users) {
      // Calculate correct stats from remaining transactions
      const wins = user.coinTransactions.filter(tx => tx.type === 'WIN').length;
      const losses = user.coinTransactions.filter(tx => tx.type === 'LOSS').length;
      const totalMatches = wins + losses;
      const winPercentage = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

      // Check if stats need updating
      const needsUpdate = 
        user.totalWins !== wins ||
        user.totalMatches !== totalMatches ||
        Math.abs(user.winPercentage - winPercentage) > 0.01;

      if (needsUpdate) {
        console.log(`📝 Updating ${user.username}:`);
        console.log(`   Old: ${user.totalWins}W / ${user.totalMatches}M (${user.winPercentage.toFixed(2)}%)`);
        console.log(`   New: ${wins}W / ${totalMatches}M (${winPercentage.toFixed(2)}%)`);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            totalWins: wins,
            totalMatches: totalMatches,
            winPercentage: winPercentage
          }
        });

        usersUpdated++;
      } else {
        usersSkipped++;
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Users updated: ${usersUpdated}`);
    console.log(`   Users skipped (already correct): ${usersSkipped}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
