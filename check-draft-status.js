const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const game = await prisma.iPLGame.findFirst({
      where: {
        title: { contains: 'MI v RCB', mode: 'insensitive' }
      }
    });
    
    console.log('Game:', game.title, '| ID:', game.id);
    
    // Get contests
    const contests = await prisma.contest.findMany({
      where: { iplGameId: game.id },
      select: { id: true, contestType: true }
    });
    
    console.log('\nContests:', contests.length);
    contests.forEach(c => console.log('  -', c.contestType, '| ID:', c.id));
    
    if (contests.length === 0) {
      console.log('\n⚠️  No contests found!');
      console.log('The draftedPlayerIds will be empty.');
      console.log('According to the code, if draftedPlayerIds.size === 0, it should show ALL players.');
      await prisma.$disconnect();
      return;
    }
    
    const contestIds = contests.map(c => c.id);
    
    // Get matchups
    const matchups = await prisma.headToHeadMatchup.findMany({
      where: { contestId: { in: contestIds } },
      select: { id: true }
    });
    
    console.log('\nMatchups:', matchups.length);
    
    if (matchups.length === 0) {
      console.log('No matchups found - draftedPlayerIds will be empty');
      console.log('Should show ALL players according to the code.');
      await prisma.$disconnect();
      return;
    }
    
    const matchupIds = matchups.map(m => m.id);
    
    // Get draft picks
    const draftPicks = await prisma.draftPick.findMany({
      where: { matchupId: { in: matchupIds } },
      select: { playerId: true },
      distinct: ['playerId']
    });
    
    console.log('\nDraft Picks (unique players):', draftPicks.length);
    
    if (draftPicks.length > 0) {
      console.log('\n✅ Drafted players exist!');
      console.log('The stats page will only show these', draftPicks.length, 'players');
    } else {
      console.log('\n⚠️  No draft picks found!');
      console.log('draftedPlayerIds will be empty - should show ALL players');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
