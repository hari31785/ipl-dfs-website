const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createSettlementsTable() {
  console.log('🔄 Creating settlements table...\n');
  
  try {
    // Create table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS settlements (
        id TEXT PRIMARY KEY,
        "tournamentBalanceId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "tournamentId" TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('ENCASH', 'REFILL')),
        amount INTEGER NOT NULL CHECK (amount > 0),
        "balanceBefore" INTEGER NOT NULL,
        "balanceAfter" INTEGER NOT NULL,
        "adminUsername" TEXT NOT NULL,
        notes TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        
        CONSTRAINT fk_tournament_balance
          FOREIGN KEY ("tournamentBalanceId")
          REFERENCES tournament_balances(id)
          ON DELETE CASCADE
      )
    `;
    console.log('✅ Settlements table created');
    
    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_settlements_user_tournament 
        ON settlements("userId", "tournamentId")
    `;
    console.log('✅ Index 1 created: user+tournament');
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_settlements_tournament 
        ON settlements("tournamentId")
    `;
    console.log('✅ Index 2 created: tournament');
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_settlements_created_at 
        ON settlements("createdAt" DESC)
    `;
    console.log('✅ Index 3 created: createdAt');
    
    console.log('\n📊 Table Details:');
    console.log('   • Table: settlements');
    console.log('   • Columns: id, tournamentBalanceId, userId, tournamentId, type, amount, balanceBefore, balanceAfter, adminUsername, notes, createdAt');
    console.log('   • Indexes: user+tournament, tournament, createdAt');
    console.log('   • Foreign Key: References tournament_balances\n');
    
    // Test the table
    const testQuery = await prisma.$queryRaw`SELECT COUNT(*) as count FROM settlements`;
    console.log('✅ Table verification successful:', testQuery);
    console.log('\n🎉 Ready to use VC Settlement Management!\n');
    
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log('✅ Settlements table already exists!');
    } else {
      console.error('❌ Error creating settlements table:', error);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createSettlementsTable();
