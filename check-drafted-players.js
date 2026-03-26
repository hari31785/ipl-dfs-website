const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const game = await prisma.iPLGame.findFirst({
      where: {
        title: { contains: 'MI v RCB', mode: 'insensitive' }
      },
      include: {
        tournament: true
      }
    });
    
    if (!game) {
      console.log('Game not found');
      return;
    }
    
    console.log('Game:', game.title);
    console.log('Game ID:', game.id);
    console.log('Tournament:', game.tournament.name);
    
    // Check for contests related to this game
    const contests = await prisma.contest.findMany({
      where: {
        iplGameId: game.id
      }
    });
    
    console.log('\nContests for this game:', contests.length);
    
    if (contests.length === 0) {
      console.log('\n⚠️  No contests found for this game!');
      console.log('This is why no drafted players exist.');
      console.log('\nThe stats page is filtering to only show drafted players.');
      console.log('However, it should show ALL players if draftedPlayerIds.size === 0');
      await prisma.$disconnect();
      return;
    }
    
    // Get teams (draft picks) for these contests
    const teams = await prisma.team.findMany({
      where: {
        contestId: { in: contests.map(c => c.id) }
      },
      include: {
        teamPlayers: {
          include: {
            player: {
              include: {
                iplTeam: true
              }
            }
          }
        }
      }
    });
    
    console.log('Teams created:', teams.length);
    
    const allDraftedPlayerIds = new Set();
    teams.forEach(team => {
      team.teamPlayers.forEach(tp => {
        allDraftedPlayerIds.add(tp.playerId);
      });
    });
    
    console.log('Unique drafted players:', allDraftedPlayerIds.size);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
