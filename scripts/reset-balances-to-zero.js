const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetBalancesToZero() {
  console.log('🔄 Resetting all tournament balances to 0 VCs...\n');
  
  try {
    // Get current balances
    const balances = await prisma.tournamentBalance.findMany({
      include: {
        user: {
          select: { name: true, username: true }
        },
        tournament: {
          select: { name: true }
        }
      }
    });

    console.log(`Found ${balances.length} tournament balances to update:\n`);
    
    balances.forEach((balance, i) => {
      console.log(`${i + 1}. ${balance.user.name} (${balance.tournament.name}): ${balance.balance} VCs → 0 VCs`);
    });

    // Update all balances to 0
    const result = await prisma.tournamentBalance.updateMany({
      data: {
        balance: 0
      }
    });

    console.log(`\n✅ Updated ${result.count} tournament balances to 0 VCs`);
    console.log('\n📊 New Balance System:');
    console.log('   • Starting balance: 0 VCs');
    console.log('   • Positive balance: User is winning');
    console.log('   • Negative balance: User is losing');
    console.log('   • Zero balance: Break even\n');

  } catch (error) {
    console.error('❌ Error resetting balances:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetBalancesToZero();
