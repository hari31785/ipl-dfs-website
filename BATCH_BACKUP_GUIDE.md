# Batch Backup System

Automated database backup system for IPL DFS application.

## Features

- ✅ Backs up ALL database tables (14 tables)
- ✅ Creates detailed summary reports
- ✅ Automatically cleans up old backups (keeps last 10)
- ✅ Generates timestamped log files
- ✅ Color-coded console output
- ✅ Can be scheduled with cron
- ✅ Safe error handling

## Quick Start

### Option 1: Using Node.js Script (Recommended)

```bash
node scripts/batch-backup.js
```

### Option 2: Using Shell Script (With Logging)

```bash
./scripts/batch-backup.sh
```

### Option 3: Using npm Script

Add to your `package.json`:

```json
{
  "scripts": {
    "backup": "node scripts/batch-backup.js",
    "backup:sh": "./scripts/batch-backup.sh"
  }
}
```

Then run:
```bash
npm run backup
```

## Backup Files

All backups are stored in the `backups/` directory:

- **`batch_backup_[timestamp].json`** - Complete database backup
- **`batch_backup_summary_[timestamp].txt`** - Human-readable summary
- **`logs/backup_[timestamp].log`** - Execution log (shell script only)

## What Gets Backed Up

The batch backup includes all data from these tables:

1. Users
2. IPL Teams
3. Tournaments
4. Players
5. Games
6. Contests
7. Contest Signups
8. Head-to-Head Matchups
9. Draft Picks
10. Player Stats
11. Tournament Balances
12. Coin Transactions
13. Settlements
14. Messages

## Automated Scheduling

### Using Cron (macOS/Linux)

Edit your crontab:
```bash
crontab -e
```

Add one of these schedules:

```bash
# Daily at 2 AM
0 2 * * * cd /path/to/ipl-dfs-website && ./scripts/batch-backup.sh

# Every 6 hours
0 */6 * * * cd /path/to/ipl-dfs-website && node scripts/batch-backup.js

# Weekly on Sunday at 3 AM
0 3 * * 0 cd /path/to/ipl-dfs-website && ./scripts/batch-backup.sh
```

### Using macOS Launch Agent

Create a file at `~/Library/LaunchAgents/com.ipldfs.backup.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ipldfs.backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/ipl-dfs-website/scripts/batch-backup.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/ipldfs-backup.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ipldfs-backup.err</string>
</dict>
</plist>
```

Load the agent:
```bash
launchctl load ~/Library/LaunchAgents/com.ipldfs.backup.plist
```

## Restoration

To restore from a backup (future feature):

```bash
node scripts/restore-backup.js backups/batch_backup_[timestamp].json
```

## Backup Retention

- **Default**: Keeps last 10 backups
- **Automatic Cleanup**: Old backups are automatically deleted
- **Customization**: Edit `keepCount` in `batch-backup.js`

## Monitoring

Check recent backups:
```bash
ls -lht backups/batch_backup_*.json | head -5
```

View latest backup summary:
```bash
cat backups/batch_backup_summary_*.txt | tail -50
```

Check logs:
```bash
ls -lht backups/logs/ | head -5
```

## Troubleshooting

### Permission Denied
```bash
chmod +x scripts/batch-backup.sh
```

### Database Connection Issues
- Ensure `.env.local` has correct `DATABASE_URL`
- Check if database server is running
- Verify network connectivity

### Disk Space
Monitor available space:
```bash
df -h backups/
```

Clean old backups manually if needed:
```bash
rm backups/batch_backup_2026-01-*.json
```

## Best Practices

1. **Schedule Regular Backups**: Daily or before major changes
2. **Keep Off-site Copies**: Store critical backups externally
3. **Test Restoration**: Periodically verify backups work
4. **Monitor Logs**: Check for errors regularly
5. **Disk Space**: Ensure adequate storage available

## Example Output

```
🔄 Starting batch backup process...
⏰ Timestamp: 3/16/2026, 7:49:48 PM
────────────────────────────────────────────────────────────
📦 Backing up users... ✓ 10 records
📦 Backing up teams... ✓ 10 records
📦 Backing up tournaments... ✓ 2 records
📦 Backing up players... ✓ 246 records
...
────────────────────────────────────────────────────────────
✅ BACKUP COMPLETED SUCCESSFULLY
────────────────────────────────────────────────────────────
📄 Backup File: batch_backup_2026-03-16T23-49-48-763Z.json
📋 Summary File: batch_backup_summary_2026-03-16T23-49-48-763Z.txt
📊 Total Records: 289
📦 File Size: 111.25 KB
⏱️  Duration: 1.23s
────────────────────────────────────────────────────────────
```

## Support

For issues or questions, contact the development team or check the project documentation.
