const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createBackup() {
  console.log('🔄 Creating database backup before schema migration...\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = path.join(__dirname, '..', 'backups');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  
  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  try {
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {}
    };

    // Backup users
    console.log('📦 Backing up users...');
    backup.data.users = await prisma.user.findMany({
      include: {
        contestSignups: true,
        coinTransactions: true
      }
    });
    console.log(`   ✓ ${backup.data.users.length} users backed up`);

    // Backup tournaments
    console.log('📦 Backing up tournaments...');
    backup.data.tournaments = await prisma.tournament.findMany();
    console.log(`   ✓ ${backup.data.tournaments.length} tournaments backed up`);

    // Backup IPL teams
    console.log('📦 Backing up IPL teams...');
    backup.data.iplTeams = await prisma.iPLTeam.findMany();
    console.log(`   ✓ ${backup.data.iplTeams.length} teams backed up`);

    // Backup players
    console.log('📦 Backing up players...');
    backup.data.players = await prisma.player.findMany({
      include: {
        stats: true
      }
    });
    console.log(`   ✓ ${backup.data.players.length} players backed up`);

    // Backup games
    console.log('📦 Backing up IPL games...');
    backup.data.games = await prisma.iPLGame.findMany({
      include: {
        contests: true
      }
    });
    console.log(`   ✓ ${backup.data.games.length} games backed up`);

    // Backup contests
    console.log('📦 Backing up contests...');
    backup.data.contests = await prisma.contest.findMany({
      include: {
        signups: true,
        matchups: true
      }
    });
    console.log(`   ✓ ${backup.data.contests.length} contests backed up`);

    // Backup matchups
    console.log('📦 Backing up matchups...');
    backup.data.matchups = await prisma.headToHeadMatchup.findMany({
      include: {
        draftPicks: true
      }
    });
    console.log(`   ✓ ${backup.data.matchups.length} matchups backed up`);

    // Backup player stats
    console.log('📦 Backing up player stats...');
    backup.data.playerStats = await prisma.playerStat.findMany();
    console.log(`   ✓ ${backup.data.playerStats.length} player stats backed up`);

    // Backup coin transactions
    console.log('📦 Backing up coin transactions...');
    backup.data.coinTransactions = await prisma.coinTransaction.findMany();
    console.log(`   ✓ ${backup.data.coinTransactions.length} coin transactions backed up`);

    // Backup admin coins
    console.log('📦 Backing up admin coins...');
    backup.data.adminCoins = await prisma.adminCoins.findMany();
    console.log(`   ✓ ${backup.data.adminCoins.length} admin coin records backed up`);

    // Backup admins (without passwords for security)
    console.log('📦 Backing up admins...');
    backup.data.admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });
    console.log(`   ✓ ${backup.data.admins.length} admins backed up`);

    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📁 Backup saved to: ${backupFile}`);
    console.log(`📊 Backup size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB\n`);

    // Also create a summary file
    const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.txt`);
    const summary = `
Database Backup Summary
=======================
Timestamp: ${backup.timestamp}
Backup File: backup-${timestamp}.json

Records Backed Up:
- Users: ${backup.data.users.length}
- Tournaments: ${backup.data.tournaments.length}
- IPL Teams: ${backup.data.iplTeams.length}
- Players: ${backup.data.players.length}
- Games: ${backup.data.games.length}
- Contests: ${backup.data.contests.length}
- Matchups: ${backup.data.matchups.length}
- Player Stats: ${backup.data.playerStats.length}
- Coin Transactions: ${backup.data.coinTransactions.length}
- Admin Coins: ${backup.data.adminCoins.length}
- Admins: ${backup.data.admins.length}

Total Records: ${
  backup.data.users.length +
  backup.data.tournaments.length +
  backup.data.iplTeams.length +
  backup.data.players.length +
  backup.data.games.length +
  backup.data.contests.length +
  backup.data.matchups.length +
  backup.data.playerStats.length +
  backup.data.coinTransactions.length +
  backup.data.adminCoins.length +
  backup.data.admins.length
}

This backup was created before migrating to tournament-specific coin vaults.
`;
    
    fs.writeFileSync(summaryFile, summary);
    console.log(`📋 Summary saved to: ${summaryFile}\n`);

    return backupFile;
    
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backup
createBackup()
  .then((backupFile) => {
    console.log('🎉 Backup process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Backup process failed:', error);
    process.exit(1);
  });
