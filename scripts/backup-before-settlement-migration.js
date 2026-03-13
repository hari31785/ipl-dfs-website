const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupProductionData() {
  console.log('🔄 Starting production data backup...\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = path.join(__dirname, '..', 'backups');
  
  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupFile = path.join(backupDir, `backup-before-settlement-${timestamp}.json`);
  const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.txt`);
  
  try {
    // Fetch all data from all tables
    console.log('📊 Fetching data from all tables...');
    
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        purpose: 'Backup before settlement tracking migration',
        databaseUrl: process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set',
      },
      data: {}
    };

    // Users
    console.log('  → Users...');
    backup.data.users = await prisma.user.findMany({
      include: {
        tournamentBalances: true,
        coinTransactions: true,
      }
    });
    
    // Admins
    console.log('  → Admins...');
    backup.data.admins = await prisma.admin.findMany();
    
    // Tournaments
    console.log('  → Tournaments...');
    backup.data.tournaments = await prisma.tournament.findMany();
    
    // IPL Teams
    console.log('  → IPL Teams...');
    backup.data.iplTeams = await prisma.iPLTeam.findMany();
    
    // Players
    console.log('  → Players...');
    backup.data.players = await prisma.player.findMany();
    
    // Player Stats
    console.log('  → Player Stats...');
    backup.data.playerStats = await prisma.playerStat.findMany();
    
    // IPL Games
    console.log('  → IPL Games...');
    backup.data.iplGames = await prisma.iPLGame.findMany();
    
    // Contests
    console.log('  → Contests...');
    backup.data.contests = await prisma.contest.findMany();
    
    // Contest Signups
    console.log('  → Contest Signups...');
    backup.data.contestSignups = await prisma.contestSignup.findMany();
    
    // Head to Head Matchups
    console.log('  → H2H Matchups...');
    backup.data.h2hMatchups = await prisma.headToHeadMatchup.findMany();
    
    // Draft Picks
    console.log('  → Draft Picks...');
    backup.data.draftPicks = await prisma.draftPick.findMany();
    
    // Teams
    console.log('  → User Teams...');
    backup.data.teams = await prisma.team.findMany();
    
    // Team Players
    console.log('  → Team Players...');
    backup.data.teamPlayers = await prisma.teamPlayer.findMany();
    
    // Contest Entries
    console.log('  → Contest Entries...');
    backup.data.contestEntries = await prisma.contestEntry.findMany();
    
    // Tournament Balances
    console.log('  → Tournament Balances...');
    backup.data.tournamentBalances = await prisma.tournamentBalance.findMany();
    
    // Coin Transactions
    console.log('  → Coin Transactions...');
    backup.data.coinTransactions = await prisma.coinTransaction.findMany();
    
    // Admin Coins
    console.log('  → Admin Coins...');
    backup.data.adminCoins = await prisma.adminCoins.findMany();

    // Write backup to file
    console.log('\n💾 Writing backup to file...');
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup saved to: ${backupFile}`);

    // Create summary
    const summary = `
═══════════════════════════════════════════════════════════
  PRODUCTION DATA BACKUP SUMMARY
  Before Settlement Tracking Migration
═══════════════════════════════════════════════════════════

Backup Date: ${new Date().toLocaleString()}
Backup File: ${path.basename(backupFile)}

───────────────────────────────────────────────────────────
  DATA COUNTS
───────────────────────────────────────────────────────────

Users:                 ${backup.data.users.length}
Admins:                ${backup.data.admins.length}
Tournaments:           ${backup.data.tournaments.length}
IPL Teams:             ${backup.data.iplTeams.length}
Players:               ${backup.data.players.length}
Player Stats:          ${backup.data.playerStats.length}
IPL Games:             ${backup.data.iplGames.length}
Contests:              ${backup.data.contests.length}
Contest Signups:       ${backup.data.contestSignups.length}
H2H Matchups:          ${backup.data.h2hMatchups.length}
Draft Picks:           ${backup.data.draftPicks.length}
User Teams:            ${backup.data.teams.length}
Team Players:          ${backup.data.teamPlayers.length}
Contest Entries:       ${backup.data.contestEntries.length}
Tournament Balances:   ${backup.data.tournamentBalances.length}
Coin Transactions:     ${backup.data.coinTransactions.length}
Admin Coins:           ${backup.data.adminCoins.length}

───────────────────────────────────────────────────────────
  TOURNAMENT BALANCE DETAILS
───────────────────────────────────────────────────────────

${backup.data.tournamentBalances.map((tb, i) => {
  const user = backup.data.users.find(u => u.id === tb.userId);
  const tournament = backup.data.tournaments.find(t => t.id === tb.tournamentId);
  const netBalance = tb.balance; // Starting balance is 0, so current balance IS the net
  const status = netBalance > 0 ? 'WINNING' : netBalance < 0 ? 'LOSING' : 'BREAK EVEN';
  return `${i + 1}. ${user?.name || 'Unknown'} | ${tournament?.name || 'Unknown'} | Balance: ${tb.balance} VCs | Net: ${netBalance > 0 ? '+' : ''}${netBalance} | ${status}`;
}).join('\n')}

───────────────────────────────────────────────────────────
  MIGRATION INFORMATION
───────────────────────────────────────────────────────────

Migration: add_settlement_tracking
New Table: settlements
Purpose: Track VC encashments and refills

Changes:
- Adds Settlement model to schema
- Tracks ENCASH (payouts) and REFILL (deposits)
- Links to TournamentBalance via tournamentBalanceId
- Records admin username, amounts, notes
- Maintains complete audit trail

IMPORTANT: This migration only ADDS a new table.
           Existing data is NOT modified or deleted.

───────────────────────────────────────────────────────────
  BACKUP FILES
───────────────────────────────────────────────────────────

JSON Backup:  ${backupFile}
Summary File: ${summaryFile}

To restore from this backup, use:
  node scripts/restore-data.js ${path.basename(backupFile)}

───────────────────────────────────────────────────────────
  NEXT STEPS
───────────────────────────────────────────────────────────

1. Review this summary
2. Verify backup file exists and is readable
3. Run migration: npx prisma migrate dev --name add_settlement_tracking
4. Test the VC Settlement Management page
5. Keep this backup safe

═══════════════════════════════════════════════════════════
`;

    fs.writeFileSync(summaryFile, summary);
    console.log(`📄 Summary saved to: ${summaryFile}`);
    
    console.log(summary);
    
    console.log('\n✅ BACKUP COMPLETED SUCCESSFULLY!\n');
    console.log('📌 Key Points:');
    console.log('   • All production data backed up');
    console.log('   • Settlement migration only ADDS a new table');
    console.log('   • No existing data will be modified');
    console.log('   • Safe to proceed with migration\n');

  } catch (error) {
    console.error('\n❌ ERROR during backup:', error);
    console.error('\nBackup failed! Do NOT proceed with migration.');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backupProductionData();
