const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const matchup = await prisma.headToHeadMatchup.findFirst({
    where: {
      id: 'cmn6tlaod000i6ixlvh59ls9t'
    },
    include: {
      contest: {
        include: {
          iplGame: {
            include: {
              tournament: true
            }
          }
        }
      },
      draftPicks: {
        include: {
          player: {
            include: {
              tournament: true,
              iplTeam: true
            }
          }
        },
        take: 5
      }
    }
  });
  
  console.log('Matchup Contest Game Tournament:', matchup.contest.iplGame.tournament.name);
  console.log('Game Tournament ID:', matchup.contest.iplGame.tournamentId);
  console.log('\nDrafted Players:');
  matchup.draftPicks.forEach(pick => {
    console.log(`  - ${pick.player.name} (${pick.player.iplTeam.shortName})`);
    console.log(`    Tournament: ${pick.player.tournament.name}`);
    console.log(`    Player ID: ${pick.playerId}`);
    console.log('');
  });
  
  // Check what players were available for this game's tournament
  const gameId = matchup.contest.iplGame.id;
  const tournamentId = matchup.contest.iplGame.tournamentId;
  const team1Id = matchup.contest.iplGame.team1Id;
  const team2Id = matchup.contest.iplGame.team2Id;
  
  const availablePlayers = await prisma.player.findMany({
    where: {
      tournamentId: tournamentId,
      iplTeamId: { in: [team1Id, team2Id] },
      isActive: true
    },
    include: {
      tournament: true,
      iplTeam: true
    },
    take: 3
  });
  
  console.log('\nPlayers available for this game (Test Tournament):');
  availablePlayers.forEach(player => {
    console.log(`  - ${player.name} (${player.iplTeam.shortName}) - ID: ${player.id}`);
  });
  
  await prisma.$disconnect();
})();
