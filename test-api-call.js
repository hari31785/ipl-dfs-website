const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Simulate what the API does
    const testTournament = await prisma.tournament.findFirst({
      where: { name: { contains: 'Test', mode: 'insensitive' } }
    });
    
    console.log('Test Tournament ID:', testTournament.id);
    
    // Get players for this tournament (simulating the API call)
    const players = await prisma.player.findMany({
      where: {
        tournamentId: testTournament.id
      },
      orderBy: [
        { name: 'asc' }
      ],
      include: {
        iplTeam: {
          select: {
            id: true,
            name: true,
            shortName: true,
            color: true
          }
        }
      }
    });
    
    console.log('\nTotal players returned by API:', players.length);
    console.log('First 5 players:');
    players.slice(0, 5).forEach(p => {
      console.log('  -', p.name, '|', p.iplTeam.shortName, '| Team ID:', p.iplTeamId);
    });
    
    // Check MI v RCB game
    const game = await prisma.iPLGame.findFirst({
      where: {
        tournamentId: testTournament.id,
        title: { contains: 'RCB', mode: 'insensitive' }
      },
      include: { team1: true, team2: true }
    });
    
    console.log('\nMI v RCB Game:');
    console.log('  Team 1 ID:', game.team1.id, '(' + game.team1.shortName + ')');
    console.log('  Team 2 ID:', game.team2.id, '(' + game.team2.shortName + ')');
    
    // Filter like the frontend does
    const teamPlayers = players.filter(player => 
      player.iplTeam.id === game.team1.id || 
      player.iplTeam.id === game.team2.id
    );
    
    console.log('\nFiltered players (like frontend):', teamPlayers.length);
    console.log('Players by team:');
    const miPlayers = teamPlayers.filter(p => p.iplTeam.shortName === 'MI');
    const rcbPlayers = teamPlayers.filter(p => p.iplTeam.shortName === 'RCB');
    console.log('  - MI:', miPlayers.length);
    console.log('  - RCB:', rcbPlayers.length);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
