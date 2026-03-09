#!/bin/bash

# Database Backup Script
# Creates a full backup of the current database

echo "🗄️  Creating database backup..."

# Set backup directory and filename with timestamp
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

# Extract connection details from DATABASE_URL
# Format: postgresql://username:password@host:port/database
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)"
if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ ERROR: Could not parse DATABASE_URL"
    exit 1
fi

echo "📡 Connecting to database: $DB_NAME@$DB_HOST:$DB_PORT"

# Create backup using pg_dump
PGPASSWORD="$DB_PASS" pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --no-password \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=custom \
    --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    echo "📊 Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
    
    # Create a restore script
    RESTORE_SCRIPT="$BACKUP_DIR/restore_$TIMESTAMP.sh"
    cat > "$RESTORE_SCRIPT" << EOF
#!/bin/bash
# Restore script for backup created on $(date)
echo "🔄 Restoring database from backup: $BACKUP_FILE"

if [ -z "\$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

# Extract connection details
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)"
if [[ \$DATABASE_URL =~ \$DB_URL_REGEX ]]; then
    DB_USER="\${BASH_REMATCH[1]}"
    DB_PASS="\${BASH_REMATCH[2]}"
    DB_HOST="\${BASH_REMATCH[3]}"
    DB_PORT="\${BASH_REMATCH[4]}"
    DB_NAME="\${BASH_REMATCH[5]}"
else
    echo "❌ ERROR: Could not parse DATABASE_URL"
    exit 1
fi

PGPASSWORD="\$DB_PASS" pg_restore \
    --host="\$DB_HOST" \
    --port="\$DB_PORT" \
    --username="\$DB_USER" \
    --dbname="\$DB_NAME" \
    --no-password \
    --verbose \
    --clean \
    --if-exists \
    --create \
    "$BACKUP_FILE"

if [ \$? -eq 0 ]; then
    echo "✅ Database restored successfully!"
    echo "🔧 Running Prisma generate to update client..."
    npx prisma generate
else
    echo "❌ ERROR: Failed to restore database"
    exit 1
fi
EOF

    chmod +x "$RESTORE_SCRIPT"
    echo "📜 Restore script created: $RESTORE_SCRIPT"
    
    # List recent backups
    echo ""
    echo "📚 Recent backups:"
    ls -la "$BACKUP_DIR"/*.sql 2>/dev/null | tail -5
    
else
    echo "❌ ERROR: Failed to create backup"
    exit 1
fi

echo ""
echo "💡 To restore this backup later, run:"
echo "   $RESTORE_SCRIPT"