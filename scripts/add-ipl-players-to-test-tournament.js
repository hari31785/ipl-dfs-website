const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addIPLPlayersToTestTournament() {
  try {
    console.log('Starting to add IPL players to Test Tournament...\n');

    // Find tournaments
    const iplTournament = await prisma.tournament.findFirst({
      where: { 
        name: { contains: 'IPL', mode: 'insensitive' },
        NOT: { name: { contains: 'Test', mode: 'insensitive' } }
      }
    });
    
    const testTournament = await prisma.tournament.findFirst({
      where: { name: { contains: 'Test', mode: 'insensitive' } }
    });

    if (!iplTournament) {
      console.log('IPL Tournament not found');
      return;
    }

    if (!testTournament) {
      console.log('Test Tournament not found');
      return;
    }

    console.log(`IPL Tournament: ${iplTournament.name} (ID: ${iplTournament.id})`);
    console.log(`Test Tournament: ${testTournament.name} (ID: ${testTournament.id})\n`);

    // Find MI and RCB teams
    const teams = await prisma.iPLTeam.findMany({
      where: {
        shortName: { in: ['MI', 'RCB'] }
      }
    });

    if (teams.length === 0) {
      console.log('MI or RCB teams not found');
      return;
    }

    console.log('Teams found:');
    teams.forEach(team => console.log(`  - ${team.name} (${team.shortName})`));
    console.log('');

    const teamIds = teams.map(t => t.id);

    // Get all players from IPL tournament for MI and RCB
    const iplPlayers = await prisma.player.findMany({
      where: {
        tournamentId: iplTournament.id,
        iplTeamId: { in: teamIds },
        isActive: true
      },
      include: {
        iplTeam: true
      }
    });

    console.log(`Found ${iplPlayers.length} players in IPL Tournament for MI and RCB\n`);

    if (iplPlayers.length === 0) {
      console.log('No players found to copy');
      return;
    }

    // Check which players already exist in Test Tournament
    const existingTestPlayers = await prisma.player.findMany({
      where: {
        tournamentId: testTournament.id,
        iplTeamId: { in: teamIds }
      }
    });

    const existingPlayerKeys = new Set(
      existingTestPlayers.map(p => `${p.name}-${p.iplTeamId}`)
    );

    console.log(`${existingTestPlayers.length} players already exist in Test Tournament\n`);

    // Add players that don't exist yet
    let addedCount = 0;
    let skippedCount = 0;

    for (const player of iplPlayers) {
      const playerKey = `${player.name}-${player.iplTeamId}`;
      
      if (existingPlayerKeys.has(playerKey)) {
        console.log(`⏭️  Skipping ${player.name} (${player.iplTeam.shortName}) - already exists`);
        skippedCount++;
        continue;
      }

      try {
        await prisma.player.create({
          data: {
            name: player.name,
            role: player.role,
            iplTeamId: player.iplTeamId,
            tournamentId: testTournament.id,
            isActive: true,
            jerseyNumber: player.jerseyNumber
          }
        });
        console.log(`✅ Added ${player.name} (${player.iplTeam.shortName}) - ${player.role}`);
        addedCount++;
      } catch (error) {
        console.log(`❌ Error adding ${player.name}: ${error.message}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Summary:`);
    console.log(`  ✅ Added: ${addedCount} players`);
    console.log(`  ⏭️  Skipped: ${skippedCount} players (already existed)`);
    console.log(`  📊 Total IPL players: ${iplPlayers.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verify final count
    const finalTestPlayers = await prisma.player.findMany({
      where: {
        tournamentId: testTournament.id,
        iplTeamId: { in: teamIds },
        isActive: true
      },
      include: {
        iplTeam: true
      }
    });

    console.log(`Test Tournament now has ${finalTestPlayers.length} active players for MI and RCB:`);
    
    const miPlayers = finalTestPlayers.filter(p => p.iplTeam.shortName === 'MI');
    const rcbPlayers = finalTestPlayers.filter(p => p.iplTeam.shortName === 'RCB');
    
    console.log(`  - MI: ${miPlayers.length} players`);
    console.log(`  - RCB: ${rcbPlayers.length} players`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addIPLPlayersToTestTournament();
