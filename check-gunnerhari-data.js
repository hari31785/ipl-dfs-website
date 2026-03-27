const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findFirst({
      where: { username: { equals: 'gunnerhari', mode: 'insensitive' } }
    });
    
    if (!user) {
      console.log('User not found');
      await prisma.$disconnect();
      return;
    }
    
    console.log('User:', user.username, '(ID:', user.id + ')');
    
    const signups = await prisma.contestSignup.findMany({
      where: { userId: user.id },
      include: {
        contest: {
          include: {
            iplGame: {
              include: {
                team1: true,
                team2: true,
                tournament: true
              }
            }
          }
        },
        matchupsAsUser1: {
          include: {
            draftPicks: true,
            user1: { include: { user: true } },
            user2: { include: { user: true } }
          }
        },
        matchupsAsUser2: {
          include: {
            draftPicks: true,
            user1: { include: { user: true } },
            user2: { include: { user: true } }
          }
        }
      }
    });
    
    console.log('\nTotal signups:', signups.length);
    
    signups.forEach(signup => {
      const matchup = signup.matchupsAsUser1[0] || signup.matchupsAsUser2[0];
      console.log('\n=== Contest ===');
      console.log('Game:', signup.contest.iplGame.title);
      console.log('Contest Status:', signup.contest.status);
      console.log('Has Matchup:', !!matchup);
      if (matchup) {
        console.log('Matchup Status:', matchup.status);
        console.log('Draft Picks Count:', matchup.draftPicks.length);
        console.log('User1:', matchup.user1.user.username);
        console.log('User2:', matchup.user2.user.username);
        console.log('Should show in Drafted?', signup.contest.status === 'DRAFTING' && matchup.draftPicks.length === 14);
      }
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
