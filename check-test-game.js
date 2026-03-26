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
    
    // Find games in Test Tournament
    const games = await prisma.iPLGame.findMany({
      where: { tournamentId: testTournament.id },
      include: { team1: true, team2: true }
    });
    
    console.log('\nGames in Test Tournament:', games.length);
    games.forEach(game => {
      console.log('  -', game.title, '|', game.team1.shortName, 'vs', game.team2.shortName, '| ID:', game.id, '| Date:', game.date);
    });
    
    // Check MI and RCB teams
    const teams = await prisma.iPLTeam.findMany({
      where: { shortName: { in: ['MI', 'RCB'] } }
    });
    
    console.log('\nMI and RCB Teams:');
    teams.forEach(t => console.log('  -', t.name, '(', t.shortName, ') ID:', t.id));
    
    // Check players for these teams in Test Tournament
    if (teams.length > 0) {
      const teamIds = teams.map(t => t.id);
      const players = await prisma.player.findMany({
        where: {
          tournamentId: testTournament.id,
          iplTeamId: { in: teamIds }
        },
        include: { iplTeam: true }
      });
      
      console.log('\nPlayers in Test Tournament for MI and RCB:', players.length);
      const miPlayers = players.filter(p => p.iplTeam.shortName === 'MI');
      const rcbPlayers = players.filter(p => p.iplTeam.shortName === 'RCB');
      console.log('  - MI:', miPlayers.length, 'players');
      console.log('  - RCB:', rcbPlayers.length, 'players');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
