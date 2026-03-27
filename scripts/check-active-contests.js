const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Finding all ACTIVE status contests...\n');
  
  const activeContests = await prisma.contest.findMany({
    where: {
      status: 'ACTIVE'
    },
    include: {
      iplGame: true,
      _count: {
        select: {
          matchups: true
        }
      },
      matchups: {
        include: {
          _count: {
            select: {
              draftPicks: true
            }
          }
        }
      }
    }
  });
  
  console.log(`Found ${activeContests.length} contests with ACTIVE status\n`);
  
  for (const contest of activeContests) {
    console.log(`\n📊 Contest: ${contest.contestType} - ${contest.coinValue} coins`);
    console.log(`   Game: ${contest.iplGame.title}`);
    console.log(`   Contest ID: ${contest.id}`);
    console.log(`   Status: ${contest.status}`);
    console.log(`   Matchups: ${contest._count.matchups}`);
    
    contest.matchups.forEach((matchup, index) => {
      console.log(`   Matchup ${index + 1}: ${matchup.status}, ${matchup._count.draftPicks}/14 picks`);
    });
  }
  
  console.log('\n\n💡 Options:');
  console.log('1. Leave as ACTIVE (legacy but functional)');
  console.log('2. Convert ACTIVE -> LIVE (standardize to new status)');
  console.log('\nRecommendation: Leave existing ACTIVE contests as-is.');
  console.log('The fix applied ensures new drafts won\'t auto-transition to ACTIVE.');
  console.log('Admin should click "End Contest" for ACTIVE contests when ready.\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
