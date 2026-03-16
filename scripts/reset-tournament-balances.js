const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Reset Tournament Balances Migration
 * 
 * This script resets all tournament balances from 1000 to 0 coins.
 * 
 * IMPORTANT: Only run this script when:
 * 1. No contests have been played yet (coinTransactions = 0)
 * 2. You want to reset all users to 0 starting balance
 * 
 * This is a one-time migration after changing the starting balance
 * from 1000 to 0 coins.
 */

async function resetTournamentBalances() {
  console.log('═'.repeat(65));
  console.log('TOURNAMENT BALANCE RESET MIGRATION');
  console.log('═'.repeat(65));
  console.log('');
  console.log('⚠️  WARNING: This will reset all tournament balances to 0');
  console.log('');
  
  try {
    // Safety check: Ensure no coin transactions exist
    const txnCount = await prisma.coinTransaction.count();
    
    if (txnCount > 0) {
      console.log('❌ ABORTED: Found existing coin transactions');
      console.log('');
      console.log(`   ${txnCount} transaction(s) found in the database.`);
      console.log('   This migration should only run when NO contests have been played.');
      console.log('   Resetting balances would lose contest history.');
      console.log('');
      console.log('═'.repeat(65));
      await prisma.$disconnect();
      process.exit(1);
    }
    
    console.log('✓ Safety check passed: No coin transactions found');
    console.log('');
    
    // Get all tournament balances
    const allBalances = await prisma.tournamentBalance.findMany({
      include: {
        user: { select: { username: true } },
        tournament: { select: { name: true } }
      }
    });
    
    console.log(`Found ${allBalances.length} tournament balance(s) in database`);
    
    // Filter balances that need reset
    const balancesToReset = allBalances.filter(b => b.balance !== 0);
    
    if (balancesToReset.length === 0) {
      console.log('');
      console.log('✓ All balances are already 0. No changes needed.');
      console.log('');
      console.log('═'.repeat(65));
      await prisma.$disconnect();
      return;
    }
    
    console.log(`${balancesToReset.length} balance(s) need to be reset to 0`);
    console.log('');
    console.log('Resetting balances:');
    console.log('─'.repeat(65));
    
    let resetCount = 0;
    
    // Reset each balance
    for (const balance of balancesToReset) {
      await prisma.tournamentBalance.update({
        where: { id: balance.id },
        data: { balance: 0 }
      });
      
      console.log(`  ✓ ${balance.user.username.padEnd(25)} ${balance.tournament.name.padEnd(20)} ${balance.balance} → 0`);
      resetCount++;
    }
    
    console.log('─'.repeat(65));
    console.log('');
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('');
    console.log(`   Reset ${resetCount} tournament balance(s) to 0 coins`);
    console.log(`   ${allBalances.length - resetCount} balance(s) were already at 0`);
    console.log('');
    
    // Verify final state
    const verification = await prisma.tournamentBalance.findMany();
    const zeroBalances = verification.filter(b => b.balance === 0).length;
    const nonZeroBalances = verification.filter(b => b.balance !== 0).length;
    
    console.log('Final Verification:');
    console.log(`   Balances at 0:  ${zeroBalances}`);
    console.log(`   Balances > 0:   ${nonZeroBalances}`);
    
    if (nonZeroBalances > 0) {
      console.log('');
      console.log('⚠️  WARNING: Some balances are still not 0');
    }
    
    console.log('');
    console.log('═'.repeat(65));
    
  } catch (error) {
    console.error('');
    console.error('❌ ERROR during migration:');
    console.error('');
    console.error(error);
    console.error('');
    console.error('═'.repeat(65));
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  resetTournamentBalances()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed');
      process.exit(1);
    });
}

module.exports = { resetTournamentBalances };
