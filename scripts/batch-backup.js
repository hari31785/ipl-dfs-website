const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function batchBackup() {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Starting batch backup process...');
    console.log('⏰ Timestamp:', new Date().toLocaleString());
    console.log('─'.repeat(60));
    
    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {}
    };

    // Define all tables to backup
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
      { name: 'tournamentBalances', model: 'tournamentBalance' },
      { name: 'coinTransactions', model: 'coinTransaction' },
      { name: 'settlements', model: 'settlement' },
      { name: 'messages', model: 'message' }
    ];

    // Backup each table
    for (const table of tables) {
      process.stdout.write(`📦 Backing up ${table.name}...`);
      backup.data[table.name] = await prisma[table.model].findMany();
      console.log(` ✓ ${backup.data[table.name].length} records`);
    }

    // Ensure backup directory exists
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `batch_backup_${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFilename);

    // Write backup file
    console.log('─'.repeat(60));
    process.stdout.write('💾 Writing backup file...');
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    const fileSize = (fs.statSync(backupPath).size / 1024).toFixed(2);
    console.log(` ✓ ${fileSize} KB`);

    // Generate summary
    const stats = {};
    let totalRecords = 0;
    for (const [key, records] of Object.entries(backup.data)) {
      stats[key] = records.length;
      totalRecords += records.length;
    }

    // Create summary file
    const summaryFilename = `batch_backup_summary_${timestamp}.txt`;
    const summaryPath = path.join(backupDir, summaryFilename);
    
    const summaryContent = `
${'='.repeat(65)}
BATCH BACKUP SUMMARY
${'='.repeat(65)}

Backup Created: ${new Date().toLocaleString()}
Backup File: ${backupFilename}
File Size: ${fileSize} KB
Total Records: ${totalRecords}

${'─'.repeat(65)}
TABLE DETAILS:
${'─'.repeat(65)}

${Object.entries(stats)
  .map(([table, count]) => `  ${table.padEnd(25)} ${String(count).padStart(6)} records`)
  .join('\n')}

${'─'.repeat(65)}
BACKUP STATUS: ✅ SUCCESS
${'─'.repeat(65)}

Duration: ${((Date.now() - startTime) / 1000).toFixed(2)} seconds

Notes:
- Backup includes ALL tables and relationships
- Data is stored in JSON format for easy restoration
- Backup can be restored using the restore script
- Keep multiple backups for safety

${'='.repeat(65)}
`;

    fs.writeFileSync(summaryPath, summaryContent);

    // Display summary
    console.log('─'.repeat(60));
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY');
    console.log('─'.repeat(60));
    console.log(`📄 Backup File: ${backupFilename}`);
    console.log(`📋 Summary File: ${summaryFilename}`);
    console.log(`📊 Total Records: ${totalRecords}`);
    console.log(`📦 File Size: ${fileSize} KB`);
    console.log(`⏱️  Duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    console.log('─'.repeat(60));

    // Cleanup old backups (optional - keep last 10)
    cleanupOldBackups(backupDir);

    return {
      success: true,
      backupPath,
      summaryPath,
      stats,
      fileSize: `${fileSize} KB`,
      duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
    };

  } catch (error) {
    console.error('─'.repeat(60));
    console.error('❌ BACKUP FAILED');
    console.error('─'.repeat(60));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function cleanupOldBackups(backupDir, keepCount = 10) {
  try {
    console.log('🧹 Cleaning up old backups...');
    
    // Get all backup files
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('batch_backup_') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Keep only the most recent backups
    if (files.length > keepCount) {
      const toDelete = files.slice(keepCount);
      console.log(`   Removing ${toDelete.length} old backup(s)...`);
      
      toDelete.forEach(file => {
        fs.unlinkSync(file.path);
        // Also delete corresponding summary file
        const summaryFile = file.name.replace('batch_backup_', 'batch_backup_summary_').replace('.json', '.txt');
        const summaryPath = path.join(backupDir, summaryFile);
        if (fs.existsSync(summaryPath)) {
          fs.unlinkSync(summaryPath);
        }
        console.log(`   ✓ Deleted: ${file.name}`);
      });
    } else {
      console.log(`   ✓ Keeping all ${files.length} backup(s) (limit: ${keepCount})`);
    }
  } catch (error) {
    console.error('   ⚠️  Cleanup warning:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  console.log('\n');
  batchBackup()
    .then(result => {
      console.log('\n✅ Batch backup process completed\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Batch backup process failed\n');
      process.exit(1);
    });
}

module.exports = { batchBackup };
