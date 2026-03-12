const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncTournamentBalances() {
  try {
    console.log('Syncing tournament balances from coin transactions...\n');

    const user = await prisma.user.findUnique({
      where: { username: 'gunnerhari' }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User:', user.name, '(', user.username, ')');
    console.log('Global coins:', user.coins);

    // Get all tournaments this user has transactions in
    const transactions = await prisma.coinTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      include: {
        tournament: true
      }
    });

    console.log('\nTotal transactions:', transactions.length);

    // Group by tournament
    const tournamentBalances = {};
    
    for (const txn of transactions) {
      if (!tournamentBalances[txn.tournamentId]) {
        tournamentBalances[txn.tournamentId] = {
          name: txn.tournament.name,
          balance: 1000, // Starting balance
          transactions: []
        };
      }
      
      tournamentBalances[txn.tournamentId].balance += txn.amount;
      tournamentBalances[txn.tournamentId].transactions.push(txn);
    }

    console.log('\nCalculated tournament balances:');
    for (const [tournamentId, data] of Object.entries(tournamentBalances)) {
      console.log('  Tournament:', data.name);
      console.log('    Calculated balance:', data.balance);
      console.log('    Transactions:', data.transactions.length);

      // Update tournament balance
      await prisma.tournamentBalance.upsert({
        where: {
          userId_tournamentId: {
            userId: user.id,
            tournamentId: tournamentId
          }
        },
        update: {
          balance: data.balance
        },
        create: {
          userId: user.id,
          tournamentId: tournamentId,
          balance: data.balance
        }
      });
      console.log('    ✓ Updated in database');
    }

    console.log('\n✅ Sync complete!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncTournamentBalances();
