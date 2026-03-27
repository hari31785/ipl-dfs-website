const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findFirst({
      where: { username: { equals: 'gunnerhari', mode: 'insensitive' } },
      include: {
        coinTransactions: {
          include: {
            contest: {
              include: {
                iplGame: {
                  include: {
                    tournament: true
                  }
                }
              }
            },
            tournament: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('User not found');
      await prisma.$disconnect();
      return;
    }
    
    console.log('=== USER STATS ===');
    console.log('Username:', user.username);
    console.log('Total Matches:', user.totalMatches);
    console.log('Total Wins:', user.totalWins);
    console.log('Win Percentage:', user.winPercentage.toFixed(2) + '%');
    console.log('Current Coins:', user.coins);
    
    console.log('\n=== COIN TRANSACTIONS ===');
    console.log('Total Transactions:', user.coinTransactions.length);
    
    if (user.coinTransactions.length > 0) {
      user.coinTransactions.forEach((tx, index) => {
        console.log(`\n--- Transaction ${index + 1} ---`);
        console.log('Type:', tx.type);
        console.log('Amount:', tx.amount);
        console.log('Date:', tx.createdAt.toISOString());
        console.log('Description:', tx.description);
        console.log('Contest ID:', tx.contestId);
        console.log('Contest exists:', !!tx.contest);
        if (tx.contest) {
          console.log('Game:', tx.contest.iplGame.title);
          console.log('Tournament:', tx.contest.iplGame.tournament.name);
        }
        console.log('Tournament ID:', tx.tournamentId);
        console.log('Tournament exists:', !!tx.tournament);
      });
    }
    
    // Check for orphaned transactions (no contest)
    const orphanedTx = user.coinTransactions.filter(tx => !tx.contest);
    if (orphanedTx.length > 0) {
      console.log('\n⚠️  ORPHANED TRANSACTIONS (contest deleted but transaction remains):');
      orphanedTx.forEach(tx => {
        console.log('- Transaction ID:', tx.id, 'Type:', tx.type, 'Amount:', tx.amount);
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
