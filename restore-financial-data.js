const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const backup = JSON.parse(fs.readFileSync('backups/batch_backup_2026-05-09T19-47-05-829Z.json'));
  const data = backup.data;

  // Restore tournament balances
  console.log('💰 Restoring tournament balances...');
  await prisma.tournamentBalance.deleteMany({});
  for (const tb of data.tournamentBalances) {
    await prisma.tournamentBalance.create({
      data: {
        id: tb.id,
        userId: tb.userId,
        tournamentId: tb.tournamentId,
        balance: tb.balance,
      }
    });
  }
  console.log(`   ✓ ${data.tournamentBalances.length} tournament balances restored`);

  // Restore coin transactions
  console.log('🪙 Restoring coin transactions...');
  await prisma.coinTransaction.deleteMany({});
  for (const tx of data.coinTransactions) {
    await prisma.coinTransaction.create({
      data: {
        id: tx.id,
        userId: tx.userId,
        tournamentId: tx.tournamentId,
        amount: tx.amount,
        balance: tx.balance,
        type: tx.type,
        description: tx.description,
        matchupId: tx.matchupId || null,
        contestId: tx.contestId || null,
        adminFee: tx.adminFee || 0,
        captainBonusApplied: false,
        captainBonusCoins: 0,
        createdAt: new Date(tx.createdAt),
      }
    });
  }
  console.log(`   ✓ ${data.coinTransactions.length} coin transactions restored`);

  // Restore settlements
  console.log('🏦 Restoring settlements...');
  for (const s of data.settlements) {
    // Find the tournamentBalance for this user+tournament
    const tb = await prisma.tournamentBalance.findFirst({
      where: { userId: s.userId, tournamentId: s.tournamentId }
    });
    if (!tb) { console.log(`   ⚠️ No tournamentBalance for settlement ${s.id} — skipping`); continue; }
    await prisma.settlement.create({
      data: {
        id: s.id,
        tournamentBalanceId: tb.id,
        userId: s.userId,
        tournamentId: s.tournamentId,
        amount: s.amount,
        type: s.type,
        adminUsername: s.adminUsername,
        balanceBefore: s.balanceBefore,
        balanceAfter: s.balanceAfter,
        notes: s.notes || null,
        createdAt: new Date(s.createdAt),
      }
    });
  }
  console.log(`   ✓ ${data.settlements.length} settlements restored`);

  // Restore admin coins total
  const totalAdminFee = data.coinTransactions.reduce((sum, tx) => sum + (tx.adminFee || 0), 0);
  const existing = await prisma.adminCoins.findFirst();
  if (existing) {
    await prisma.adminCoins.update({ where: { id: existing.id }, data: { totalCoins: totalAdminFee } });
  } else {
    await prisma.adminCoins.create({ data: { totalCoins: totalAdminFee } });
  }
  console.log(`💼 Admin coins restored: ${totalAdminFee} coins (VC${(totalAdminFee/100).toFixed(2)})`);

  console.log('\n✅ Financial data fully restored!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
