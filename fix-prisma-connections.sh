#!/bin/bash

# Script to fix Prisma connection issues by using singleton pattern

echo "Fixing Prisma connection issues..."

# Remove all prisma.$disconnect() calls from API routes
echo "Removing prisma.\$disconnect() calls..."
find src/app/api -type f -name "*.ts" -exec sed -i '' '/await prisma\.\$disconnect()/d' {} \;
find src/app/api -type f -name "*.ts" -exec sed -i '' '/prisma\.\$disconnect()/d' {} \;

echo "✅ Removed all $disconnect() calls from API routes"
echo "✅ Using singleton Prisma client will manage connections automatically"
echo ""
echo "Note: Scripts in /scripts folder still use new PrismaClient() which is fine for one-time executions"
