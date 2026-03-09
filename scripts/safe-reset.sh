#!/bin/bash

# Safe Database Reset Script
# Creates backup before resetting, then applies new schema

echo "⚠️  SAFE DATABASE RESET"
echo "This will:"
echo "1. Create a backup of current database"
echo "2. Reset the database"
echo "3. Apply new Prisma schema"
echo ""

read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled"
    exit 1
fi

# Step 1: Create backup
echo "📦 Step 1: Creating backup..."
./scripts/backup-db.sh

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Backup failed. Aborting reset."
    exit 1
fi

echo ""
echo "⚠️  FINAL WARNING: About to reset database!"
read -p "Continue with reset? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Reset cancelled"
    exit 1
fi

# Step 2: Reset database
echo "🔄 Step 2: Resetting database..."
npx prisma db push --force-reset

if [ $? -eq 0 ]; then
    echo "✅ Database reset completed successfully"
    
    # Step 3: Restore basic data
    echo "🏗️  Step 3: Restoring essential data..."
    echo "Creating admin user..."
    node scripts/create-admin.js
    
    echo "Creating IPL teams..."
    node scripts/create-ipl-teams.js
    
    echo "Creating sample tournament..."
    node scripts/create-sample-tournament.js
    
    echo ""
    echo "✅ Safe reset completed!"
    echo "📊 Admin credentials: admin / admin123"
    echo "🏏 Teams and basic tournament restored"
    echo ""
    echo "💡 If you need to restore your full data, check the backup files in ./backups/"
else
    echo "❌ ERROR: Database reset failed"
    exit 1
fi