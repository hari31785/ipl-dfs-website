const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Creates a complete backup of all database data
 * Includes: users, teams, tournaments, players, games, contests, signups, 
 * matchups, draft picks, player stats, coin transactions, tournament balances, admin coins
 */
async function createFullBackup() {
  try {
    console.log('🔄 Starting full database backup...\n');
    
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      description: 'Complete database backup including all tables',
      data: {}
    };

    // Backup all entities
    const tables = [
      { name: 'users', model: 'user' },
      { name: 'teams', model: 'iPLTeam' },
      { name: 'tournaments', model: 'tournament' },
      { name: 'players', model: 'player' },
      { name: 'games', model: 'iPLGame' },
      { name: 'contests', model: 'contest' },
      { name: 'signups', model: 'contestSignup' },
      { name: 'matchups', model: 'headToHeadMatchup' },
      { name: 'draftPicks', model: 'draftPick' },
      { name: 'playerStats', model: 'playerStat' },
      { name: 'coinTransactions', model: 'coinTransaction' },
      { name: 'tournamentBalances', model: 'tournamentBalance' },
      { name: 'adminCoins', model: 'adminCoins' }
    ];

    const stats = {};

    for (const table of tables) {
      process.stdout.write(`📦 Backing up ${table.name}...`);
      backup.data[table.name] = await prisma[table.model].findMany();
      stats[table.name] = backup.data[table.name].length;
      console.log(` ✓ (${stats[table.name]} records)`);
    }

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) + 'Z';
    const filename = path.join(backupDir, `full_backup_${timestamp}.json`);
    const summaryFilename = path.join(backupDir, `full_backup_summary_${timestamp}.txt`);
    
    // Write backup file
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
    
    // Write summary file
    const summary = [
      '═══════════════════════════════════════',
      '      FULL DATABASE BACKUP SUMMARY      ',
      '═══════════════════════════════════════',
      '',
      `Date: ${new Date().toLocaleString()}`,
      `Timestamp: ${backup.timestamp}`,
      `Version: ${backup.version}`,
      '',
      '───────────────────────────────────────',
      '               STATISTICS               ',
      '───────────────────────────────────────',
      ''
    ];
    
    let totalRecords = 0;
    Object.entries(stats).forEach(([key, count]) => {
      summary.push(`${key.padEnd(25)}: ${count.toString().padStart(6)} records`);
      totalRecords += count;
    });
    
    summary.push('');
    summary.push('───────────────────────────────────────');
    summary.push(`TOTAL RECORDS           : ${totalRecords.toString().padStart(6)}`);
    summary.push('───────────────────────────────────────');
    summary.push('');
    summary.push('FILES:');
    summary.push(`  Data    : ${path.basename(filename)}`);
    summary.push(`  Summary : ${path.basename(summaryFilename)}`);
    summary.push('');
    summary.push('═══════════════════════════════════════');
    
    fs.writeFileSync(summaryFilename, summary.join('\n'));
    
    // Display summary
    console.log('');
    console.log(summary.join('\n'));
    console.log('');
    console.log('✅ Full backup created successfully!');
    console.log(`📄 Backup file: ${filename}`);
    console.log(`📄 Summary file: ${summaryFilename}`);
    
    return { filename, summaryFilename, stats, totalRecords };

  } catch (error) {
    console.error('❌ Error creating backup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createFullBackup()
    .then(() => {
      console.log('\n🎉 Backup process completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Backup process failed:', error);
      process.exit(1);
    });
}

module.exports = { createFullBackup };
