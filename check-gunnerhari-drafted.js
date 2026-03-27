const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: 'gunnerhari' }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User ID:', user.id);
    console.log('Username:', user.username);
    console.log('\n--- Contest Signups ---');
    
    const signups = await prisma.contestSignup.findMany({
      where: { userId: user.id },
      include: {
        contest: {
          include: {
            iplGame: true
          }
        },
        matchupsAsUser1: {
          include: {
            _count: {
              select: { draftPicks: true }
            }
          }
        },
        matchupsAsUser2: {
          include: {
            _count: {
              select: { draftPicks: true }
            }
          }
        }
      }
    });
    
    console.log(`\nTotal signups: ${signups.length}\n`);
    
    for (const signup of signups) {
      const matchup = signup.matchupsAsUser1[0] || signup.matchupsAsUser2[0];
      console.log('Contest:', signup.contest.iplGame.title);
      console.log('  Contest Status:', signup.contest.status);
      console.log('  Contest ID:', signup.contest.id);
      if (matchup) {
        console.log('  Matchup Status:', matchup.status);
        console.log('  Matchup ID:', matchup.id);
        console.log('  Draft Picks Count:', matchup._count?.draftPicks || 0);
        
        // Check if it matches drafted criteria
        const isDrafted = signup.contest.status === 'DRAFTING' && matchup._count?.draftPicks === 14;
        console.log('  Should appear in DRAFTED tab?', isDrafted);
      } else {
        console.log('  Matchup: None');
      }
      console.log('');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
