const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculatePoints(runs, wickets, catches, runOuts, stumpings) {
  return (runs * 1) + (wickets * 20) + ((catches + runOuts + stumpings) * 5);
}

async function addRandomStats() {
  try {
    console.log('Finding PBKS v DC games in Test Tournament...\n');

    // Find all games between PBKS and DC
    const games = await prisma.iPLGame.findMany({
      where: {
        OR: [
          { title: { contains: 'PK v DC' } },
          { title: { contains: 'DC v PK' } }
        ],
        tournament: {
          name: 'Test Tournament'
        }
      },
      include: {
        team1: true,
        team2: true,
        tournament: true
      }
    });

    if (games.length === 0) {
      console.log('❌ Could not find PBKS v DC games in Test Tournament');
      return;
    }

    console.log(`✅ Found ${games.length} game(s):\n`);
    games.forEach(game => {
      console.log(`   - ${game.title} (ID: ${game.id})`);
    });
    console.log('');

    // Process each game
    for (const game of games) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing: ${game.title}`);
      console.log(`${'='.repeat(60)}\n`);

    const gameId = game.id;
    const tournamentId = game.tournamentId;

    // Get PBKS and DC team IDs
    const teams = await prisma.iPLTeam.findMany({
      where: { shortName: { in: ['PBKS', 'DC'] } }
    });

    const teamIds = teams.map(t => t.id);

    // Get all players for these teams in Test Tournament
    const players = await prisma.player.findMany({
      where: {
        tournamentId: tournamentId,
        iplTeamId: { in: teamIds },
        isActive: true
      },
      include: {
        iplTeam: true
      }
    });

    console.log(`Found ${players.length} players\n`);

    let created = 0;
    let updated = 0;

    for (const player of players) {
      // Check if stats already exist
      const existingStat = await prisma.playerStat.findFirst({
        where: {
          playerId: player.id,
          iplGameId: gameId
        }
      });

      let runs = 0;
      let wickets = 0;
      let catches = randomInt(0, 2); // Random catches 0-2
      let runOuts = randomInt(0, 1); // Random run outs 0-1
      let stumpings = 0;

      // Assign stats based on role
      if (player.role === 'BATSMAN') {
        runs = randomInt(25, 70);
      } else if (player.role === 'WICKET_KEEPER') {
        runs = randomInt(20, 55);
        stumpings = randomInt(0, 1);
      } else if (player.role === 'BOWLER') {
        runs = randomInt(3, 18);
        wickets = randomInt(0, 4);
      } else if (player.role === 'ALL_ROUNDER') {
        runs = randomInt(15, 50);
        wickets = randomInt(0, 3);
      }

      const points = calculatePoints(runs, wickets, catches, runOuts, stumpings);

      if (existingStat) {
        // Update existing stat
        await prisma.playerStat.update({
          where: { id: existingStat.id },
          data: {
            runs,
            wickets,
            catches,
            runOuts,
            stumpings,
            didNotPlay: false,
            points
          }
        });
        console.log(`✏️  Updated ${player.name} (${player.iplTeam.shortName}) - ${player.role}: ${runs}R, ${wickets}W, ${catches}C = ${points} pts`);
        updated++;
      } else {
        // Create new stat
        await prisma.playerStat.create({
          data: {
            playerId: player.id,
            iplGameId: gameId,
            runs,
            wickets,
            catches,
            runOuts,
            stumpings,
            didNotPlay: false,
            points
          }
        });
        console.log(`✅ Created ${player.name} (${player.iplTeam.shortName}) - ${player.role}: ${runs}R, ${wickets}W, ${catches}C = ${points} pts`);
        created++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Summary for ${game.title}:`);
    console.log(`  ✅ Created: ${created} stats`);
    console.log(`  ✏️  Updated: ${updated} stats`);
    console.log(`  📊 Total: ${created + updated} players`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    console.log('\n🎉 All games processed successfully!\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRandomStats();
