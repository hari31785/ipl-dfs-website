const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateDraftPicks() {
  try {
    console.log('Starting migration of draft picks from IPL 2026 to Test Tournament...\n');

    // Get all matchups for MI v RCB game (Test Tournament)
    const contests = await prisma.contest.findMany({
      where: {
        iplGame: {
          title: { contains: 'MI v RCB', mode: 'insensitive' },
          tournamentId: 'cmmo4k4pu0000doi8i4fb6sw9' // Test Tournament
        }
      },
      include: {
        matchups: {
          include: {
            draftPicks: {
              include: {
                player: {
                  include: {
                    iplTeam: true,
                    tournament: true
                  }
                }
              }
            }
          }
        }
      }
    });

    let totalMigrated = 0;
    
    for (const contest of contests) {
      console.log(`Contest: ${contest.contestType} (${contest.id})`);
      
      for (const matchup of contest.matchups) {
        console.log(`  Matchup: ${matchup.id}`);
        
        for (const pick of matchup.draftPicks) {
          // Skip if already Test Tournament
          if (pick.player.tournamentId === 'cmmo4k4pu0000doi8i4fb6sw9') {
            console.log(`    ✓ ${pick.player.name} already Test Tournament`);
            continue;
          }
          
          // Find the matching player in Test Tournament
          const testPlayer = await prisma.player.findFirst({
            where: {
              name: pick.player.name,
              iplTeamId: pick.player.iplTeamId,
              tournamentId: 'cmmo4k4pu0000doi8i4fb6sw9',
              isActive: true
            }
          });
          
          if (!testPlayer) {
            console.log(`    ❌ No Test Tournament player found for ${pick.player.name} (${pick.player.iplTeam.shortName})`);
            continue;
          }
          
          // Update the draft pick to point to Test Tournament player
          await prisma.draftPick.update({
            where: { id: pick.id },
            data: { playerId: testPlayer.id }
          });
          
          console.log(`    ✅ Migrated ${pick.player.name} (${pick.player.iplTeam.shortName}): ${pick.playerId} -> ${testPlayer.id}`);
          totalMigrated++;
        }
      }
    }
    
    console.log(`\n✅ Migration complete! Migrated ${totalMigrated} draft picks.`);
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateDraftPicks();
