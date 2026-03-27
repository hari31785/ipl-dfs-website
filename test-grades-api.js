const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGradesAPI() {
  try {
    // Get first game for testing
    const game = await prisma.iPLGame.findFirst({
      include: {
        tournament: true,
        team1: true,
        team2: true
      }
    });
    
    if (!game) {
      console.log('❌ No games found in database');
      await prisma.$disconnect();
      return;
    }
    
    console.log('✅ Found game for testing:');
    console.log('   Game:', game.title);
    console.log('   ID:', game.id);
    console.log('   Tournament:', game.tournament.name);
    console.log('   Teams:', game.team1.shortName, 'vs', game.team2.shortName);
    
    // Count players in tournament
    const playerCount = await prisma.player.count({
      where: { tournamentId: game.tournamentId }
    });
    
    console.log('   Players in tournament:', playerCount);
    
    // Count player stats for completed games
    const statsCount = await prisma.playerStat.count();
    console.log('   Total player stats records:', statsCount);
    
    // Count completed games
    const completedGamesCount = await prisma.iPLGame.count({
      where: {
        tournamentId: game.tournamentId,
        status: 'COMPLETED'
      }
    });
    
    console.log('   Completed games in tournament:', completedGamesCount);
    
    if (completedGamesCount === 0) {
      console.log('⚠️  Note: No completed games yet, so grades will show "No Data"');
    }
    
    console.log('\n🚀 Grade calculation API is ready to test!');
    console.log('📝 Use this game ID in the draft page:', game.id);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

testGradesAPI();