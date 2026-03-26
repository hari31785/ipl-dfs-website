const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function recalculateWinPercentages() {
  try {
    console.log('Starting win percentage recalculation...\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        totalWins: true,
        totalMatches: true,
        winPercentage: true
      }
    });

    console.log(`Found ${users.length} users\n`);

    let updatedCount = 0;

    for (const user of users) {
      // Calculate correct win percentage
      const correctWinPercentage = user.totalMatches > 0 
        ? (user.totalWins / user.totalMatches) * 100 
        : 0;

      // Check if it needs updating (allow for small floating point differences)
      if (Math.abs(user.winPercentage - correctWinPercentage) > 0.01) {
        console.log(`Updating ${user.username} (${user.name}):`);
        console.log(`  Wins: ${user.totalWins}, Matches: ${user.totalMatches}`);
        console.log(`  Old Win %: ${user.winPercentage.toFixed(2)}%`);
        console.log(`  New Win %: ${correctWinPercentage.toFixed(2)}%\n`);

        await prisma.user.update({
          where: { id: user.id },
          data: { winPercentage: correctWinPercentage }
        });

        updatedCount++;
      }
    }

    console.log(`\n✅ Recalculation complete!`);
    console.log(`Updated ${updatedCount} user(s)`);
    console.log(`${users.length - updatedCount} user(s) already had correct win percentage`);

  } catch (error) {
    console.error('Error recalculating win percentages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateWinPercentages();
