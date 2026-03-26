const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const testTournament = await prisma.tournament.findFirst({
      where: { name: { contains: 'Test', mode: 'insensitive' } }
    });
    
    if (!testTournament) {
      console.log('Test Tournament not found');
      await prisma.$disconnect();
      return;
    }
    
    console.log('Test Tournament:', testTournament.name, '(ID:', testTournament.id + ')');
    
    // Find MI v RCB game
    const game = await prisma.iPLGame.findFirst({
      where: {
        tournamentId: testTournament.id,
        title: { contains: 'RCB', mode: 'insensitive' }
      },
      include: { team1: true, team2: true }
    });
    
    if (!game) {
      console.log('MI v RCB game not found');
      await prisma.$disconnect();
      return;
    }
    
    console.log('\nMI v RCB Game:');
    console.log('  Title:', game.title);
    console.log('  ID:', game.id);
    console.log('  Team 1:', game.team1.name, '(' + game.team1.shortName + ')', 'ID:', game.team1.id);
    console.log('  Team 2:', game.team2.name, '(' + game.team2.shortName + ')', 'ID:', game.team2.id);
    
    // Check players for these two teams in the Test Tournament
    const players = await prisma.player.findMany({
      where: {
        tournamentId: testTournament.id,
        iplTeamId: { in: [game.team1.id, game.team2.id] },
        isActive: true
      },
      include: { iplTeam: true }
    });
    
    console.log('\nPlayers for these teams in Test Tournament:', players.length);
    
    const team1Players = players.filter(p => p.iplTeamId === game.team1.id);
    const team2Players = players.filter(p => p.iplTeamId === game.team2.id);
    
    console.log('  -', game.team1.shortName + ':', team1Players.length, 'players');
    console.log('  -', game.team2.shortName + ':', team2Players.length, 'players');
    
    if (team1Players.length > 0) {
      console.log('\n' + game.team1.shortName + ' Players:');
      team1Players.slice(0, 5).forEach(p => console.log('    -', p.name, '(' + p.role + ')'));
      if (team1Players.length > 5) console.log('    ... and', team1Players.length - 5, 'more');
    }
    
    if (team2Players.length > 0) {
      console.log('\n' + game.team2.shortName + ' Players:');
      team2Players.slice(0, 5).forEach(p => console.log('    -', p.name, '(' + p.role + ')'));
      if (team2Players.length > 5) console.log('    ... and', team2Players.length - 5, 'more');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
