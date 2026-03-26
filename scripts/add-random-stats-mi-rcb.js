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
    console.log('Adding random stats for MI v RCB game...\n');

    const gameId = 'cmn6t9rta0001si8p8h5bc5ci'; // MI v RCB
    const tournamentId = 'cmmo4k4pu0000doi8i4fb6sw9'; // Test Tournament

    // Get MI and RCB team IDs
    const teams = await prisma.iPLTeam.findMany({
      where: { shortName: { in: ['MI', 'RCB'] } }
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
    let skipped = 0;

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
      let catches = 1; // Everyone gets 1 catch

      // Assign stats based on role
      if (player.role === 'BATSMAN' || player.role === 'WICKET_KEEPER') {
        runs = randomInt(30, 60);
      } else if (player.role === 'BOWLER') {
        runs = randomInt(5, 15); // Bowlers can score some runs
        wickets = randomInt(1, 3);
      } else if (player.role === 'ALL_ROUNDER') {
        runs = randomInt(20, 45);
        wickets = randomInt(1, 2);
      }

      const points = calculatePoints(runs, wickets, catches, 0, 0);

      if (existingStat) {
        // Update existing stat
        await prisma.playerStat.update({
          where: { id: existingStat.id },
          data: {
            runs,
            wickets,
            catches,
            runOuts: 0,
            stumpings: 0,
            didNotPlay: false,
            points
          }
        });
        console.log(`✏️  Updated ${player.name} (${player.iplTeam.shortName}) - ${player.role}: ${runs} runs, ${wickets} wickets, ${catches} catch = ${points} pts`);
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
            runOuts: 0,
            stumpings: 0,
            didNotPlay: false,
            points
          }
        });
        console.log(`✅ Created ${player.name} (${player.iplTeam.shortName}) - ${player.role}: ${runs} runs, ${wickets} wickets, ${catches} catch = ${points} pts`);
        created++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Summary:`);
    console.log(`  ✅ Created: ${created} stats`);
    console.log(`  ✏️  Updated: ${updated} stats`);
    console.log(`  📊 Total: ${created + updated} players`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRandomStats();
