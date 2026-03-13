const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetAllBalances() {
  try {
    // Get current balances
    const balances = await prisma.tournamentBalance.findMany({
      include: {
        user: { select: { username: true } },
        tournament: { select: { name: true } }
      }
    });

    console.log('📊 Current Tournament Balances:\n');
    balances.forEach(b => {
      console.log(`   ${b.user.username} in ${b.tournament.name}: ${b.balance} VCs`);
    });

    // Reset all to 0
    const result = await prisma.tournamentBalance.updateMany({
      data: { balance: 0 }
    });

    console.log(`\n✅ Reset ${result.count} tournament balances to 0 VCs`);
    console.log('🎯 All users now start at 0 VC in every tournament');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAllBalances();
