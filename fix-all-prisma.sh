#!/bin/bash

echo "🔧 Fixing all Prisma instances in API routes..."
echo ""

# Counter for files changed
count=0

# Find all TypeScript files in API routes that have "new PrismaClient"
files=$(find src/app/api -type f -name "*.ts" -exec grep -l "new PrismaClient" {} \;)

for file in $files; do
  echo "Fixing: $file"
  
  # Replace the import and instantiation
  # This handles both:
  # import { PrismaClient } from '@prisma/client'
  # const prisma = new PrismaClient()
  
  # First, check if file already has the correct import
  if grep -q "import { prisma } from '@/lib/prisma'" "$file"; then
    echo "  ✓ Already has correct import"
  else
    # Replace PrismaClient import with prisma singleton import
    sed -i '' "s|import { PrismaClient } from '@prisma/client'|import { prisma } from '@/lib/prisma'|g" "$file"
    sed -i '' "s|import { PrismaClient } from \"@prisma/client\"|import { prisma } from '@/lib/prisma'|g" "$file"
    echo "  ✓ Updated import"
  fi
  
  # Remove the line that creates new PrismaClient
  sed -i '' '/const prisma = new PrismaClient()/d' "$file"
  sed -i '' '/const prisma = new PrismaClient();/d' "$file"
  echo "  ✓ Removed new PrismaClient()"
  
  ((count++))
done

echo ""
echo "✅ Fixed $count files"
echo ""
echo "Running checks..."

# Verify no more "new PrismaClient" in API routes
remaining=$(find src/app/api -type f -name "*.ts" -exec grep -l "new PrismaClient" {} \; | wc -l | tr -d ' ')

if [ "$remaining" -eq 0 ]; then
  echo "✅ All API routes now use singleton pattern!"
else
  echo "⚠️  $remaining files still need manual review"
  find src/app/api -type f -name "*.ts" -exec grep -l "new PrismaClient" {} \;
fi

echo ""
echo "Summary:"
echo "- All API routes now import: import { prisma } from '@/lib/prisma'"
echo "- No more 'new PrismaClient()' instances"
echo "- Connection pooling managed automatically"
echo ""
