const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyCalculation() {
  try {
    const matchupId = 'cmmjuv5v3000d966rv4xvk9hv';
    
    const matchup = await prisma.headToHeadMatchup.findUnique({
      where: { id: matchupId },
      include: {
        contest: true,
        user1: { include: { user: true } },
        user2: { include: { user: true } }
      }
    });

    console.log('\n=== MATCHUP SCORES ===');
    console.log(`User 1 (${matchup.user1.user.name}): ${matchup.user1Score} points`);
    console.log(`User 2 (${matchup.user2.user.name}): ${matchup.user2Score} points`);
    console.log(`Score Difference: ${Math.abs(matchup.user1Score - matchup.user2Score)}`);
    console.log(`Coin Value: ${matchup.contest.coinValue}`);

    const scoreDiff = Math.abs(matchup.user1Score - matchup.user2Score);
    const grossWinnings = scoreDiff * matchup.contest.coinValue;
    const adminFee = Math.floor(grossWinnings * 0.1);
    const netWinnings = grossWinnings - adminFee;

    console.log('\n=== EXPECTED CALCULATION ===');
    console.log(`Gross Winnings: ${scoreDiff} × ${matchup.contest.coinValue} = ${grossWinnings}`);
    console.log(`Admin Fee (10%): ${adminFee}`);
    console.log(`Net Winnings: ${grossWinnings} - ${adminFee} = ${netWinnings}`);
    console.log(`Loser Amount: -${scoreDiff * matchup.contest.coinValue}`);

    // Get actual transactions
    const transactions = await prisma.coinTransaction.findMany({
      where: {
        matchupId: matchupId
      },
      include: {
        user: true
      }
    });

    console.log('\n=== ACTUAL TRANSACTIONS ===');
    for (const tx of transactions) {
      console.log(`${tx.user.name}: ${tx.type} ${tx.amount} coins (Admin Fee: ${tx.adminFee})`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCalculation();
