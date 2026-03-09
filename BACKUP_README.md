# Database Backup and Recovery

## Available Scripts

### 1. Full Database Backup (SQL)
```bash
./scripts/backup-db.sh
```
- Creates a complete PostgreSQL backup using pg_dump
- Includes schema and all data
- Creates both backup file and restore script
- Stores in `./backups/` directory

### 2. JSON Data Backup
```bash
node scripts/backup-data.js
```
- Creates a JSON backup of all application data
- Useful for data migration between environments
- Human-readable format
- Includes statistics

### 3. Safe Database Reset
```bash
./scripts/safe-reset.sh
```
- **Always creates backup before reset**
- Resets database with new schema
- Restores essential data (admin, teams, sample tournament)
- Interactive prompts to prevent accidents

## Recovery Process

### From SQL Backup
```bash
# Automatically generated restore script
./backups/restore_TIMESTAMP.sh
```

### From JSON Backup
Use the admin interface to re-import data or create a custom restore script.

## Best Practices

1. **Always backup before destructive operations**
2. **Test backups regularly**
3. **Store backups in multiple locations for production**
4. **Use the safe-reset script instead of direct prisma commands**

## Important Notes

- SQL backups require `pg_dump` and `pg_restore` to be installed
- Backups include sensitive data (passwords, etc.) - store securely
- For production, consider automated daily backups