const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🏏 Finding GT v RR game in Test Tournament...\n');

  // Find the Test Tournament
  const tournament = await prisma.tournament.findFirst({
    where: {
      name: {
        contains: 'Test',
        mode: 'insensitive'
      }
    }
  });

  if (!tournament) {
    console.log('❌ Test Tournament not found');
    await prisma.$disconnect();
    return;
  }

  console.log(`✅ Found tournament: ${tournament.name} (ID: ${tournament.id})`);

  // Find GT v RR games
  const games = await prisma.iPLGame.findMany({
    where: {
      tournamentId: tournament.id,
      OR: [
        { title: { contains: 'GT v RR', mode: 'insensitive' } },
        { title: { contains: 'RR v GT', mode: 'insensitive' } },
        { title: { contains: 'GT', mode: 'insensitive' } }
      ]
    },
    include: {
      team1: true,
      team2: true
    }
  });

  if (games.length === 0) {
    console.log('❌ No GT v RR games found in Test Tournament');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n✅ Found ${games.length} game(s):\n`);
  games.forEach(game => {
    console.log(`   - ${game.title} (ID: ${game.id})`);
  });

  // Process each game
  for (const game of games) {
    console.log(`\n🎯 Processing: ${game.title}`);
    
    // Get all players from both teams
    const team1Players = await prisma.player.findMany({
      where: { iplTeamId: game.team1.id }
    });

    const team2Players = await prisma.player.findMany({
      where: { iplTeamId: game.team2.id }
    });

    const allPlayers = [...team1Players, ...team2Players];
    console.log(`   📊 Total players: ${allPlayers.length} (Team1: ${team1Players.length}, Team2: ${team2Players.length})`);

    let created = 0;
    let updated = 0;

    for (const player of allPlayers) {
      // Generate random stats based on role
      let runs = 0;
      let wickets = 0;
      let catches = 0;
      let runOuts = 0;
      let stumpings = 0;

      switch (player.role) {
        case 'BATSMAN':
        case 'WICKETKEEPER':
          runs = Math.floor(Math.random() * 80); // 0-79 runs
          catches = Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : 2) : 0; // 30% chance of catch
          if (player.role === 'WICKETKEEPER' && Math.random() < 0.2) {
            stumpings = 1; // 20% chance of stumping
          }
          break;
        
        case 'BOWLER':
          runs = Math.floor(Math.random() * 20); // 0-19 runs
          wickets = Math.floor(Math.random() * 5); // 0-4 wickets
          catches = Math.random() < 0.2 ? 1 : 0; // 20% chance of catch
          break;
        
        case 'ALLROUNDER':
          runs = Math.floor(Math.random() * 50); // 0-49 runs
          wickets = Math.floor(Math.random() * 3); // 0-2 wickets
          catches = Math.random() < 0.3 ? 1 : 0; // 30% chance of catch
          break;
      }

      // Calculate points
      const points = (runs * 1) + (wickets * 20) + (catches * 5) + (runOuts * 5) + (stumpings * 5);

      // Check if stat already exists
      const existingStat = await prisma.playerStat.findFirst({
        where: {
          playerId: player.id,
          iplGameId: game.id
        }
      });

      if (existingStat) {
        // Update existing stat
        await prisma.playerStat.update({
          where: {
            id: existingStat.id
          },
          data: {
            runs,
            wickets,
            catches,
            runOuts,
            stumpings,
            points
          }
        });
        updated++;
      } else {
        // Create new stat
        await prisma.playerStat.create({
          data: {
            playerId: player.id,
            iplGameId: game.id,
            runs,
            wickets,
            catches,
            runOuts,
            stumpings,
            points
          }
        });
        created++;
      }
    }

    console.log(`   ✅ Stats for ${game.title}:`);
    console.log(`      Created: ${created} stats`);
    console.log(`      Updated: ${updated} stats`);
  }

  console.log('\n✨ Done!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
