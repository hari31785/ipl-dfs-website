const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find Test Tournament
    const testTournament = await prisma.tournament.findFirst({
      where: { name: { contains: 'Test', mode: 'insensitive' } }
    });
    
    if (!testTournament) {
      console.log('No Test Tournament found');
      await prisma.$disconnect();
      return;
    }
    
    console.log('Test Tournament:', testTournament.name, '(ID:', testTournament.id + ')');
    
    // Find MI v RCB game
    const game = await prisma.iPLGame.findFirst({
      where: {
        tournamentId: testTournament.id,
        title: { contains: 'MI', mode: 'insensitive' }
      },
      include: {
        team1: true,
        team2: true
      }
    });
    
    if (!game) {
      console.log('No MI v RCB game found in Test Tournament');
      await prisma.$disconnect();
      return;
    }
    
    console.log('\nGame:', game.title);
    console.log('Team 1:', game.team1.name, '(ID:', game.team1.id + ')');
    console.log('Team 2:', game.team2.name, '(ID:', game.team2.id + ')');
    
    // Check for players in Test Tournament for these teams
    const players = await prisma.player.findMany({
      where: {
        tournamentId: testTournament.id,
        iplTeamId: { in: [game.team1.id, game.team2.id] },
        isActive: true
      },
      include: {
        iplTeam: true
      }
    });
    
    console.log('\nPlayers found for Test Tournament (MI/RCB):', players.length);
    if (players.length > 0) {
      console.log('\nSample players:');
      players.slice(0, 10).forEach(p => {
        console.log('  -', p.name, '(' + p.iplTeam.shortName + ')', 'Role:', p.role);
      });
    } else {
      console.log('\n❌ NO PLAYERS EXIST for Test Tournament with MI/RCB teams');
      console.log('Need to create players for this tournament-team combination');
      
      // Check if any players exist for other tournaments with same teams
      const otherPlayers = await prisma.player.findMany({
        where: {
          iplTeamId: { in: [game.team1.id, game.team2.id] },
          isActive: true
        },
        include: {
          iplTeam: true,
          tournament: true
        },
        take: 5
      });
      
      if (otherPlayers.length > 0) {
        console.log('\n✓ Found', otherPlayers.length, 'players for MI/RCB in OTHER tournaments:');
        otherPlayers.forEach(p => {
          console.log('  -', p.name, '(' + p.iplTeam.shortName + ')', 'Tournament:', p.tournament.name);
        });
        console.log('\nYou can copy these players to Test Tournament or create new ones.');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
