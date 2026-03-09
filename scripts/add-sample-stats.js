const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSampleStats() {
  try {
    // Get the sample game
    const game = await prisma.iPLGame.findFirst({
      include: {
        team1: true,
        team2: true
      }
    });

    if (!game) {
      console.log('❌ No games found. Please create a game first.');
      return;
    }

    console.log(`🏏 Adding sample stats for: ${game.title}`);

    // Get players from both teams
    const players = await prisma.player.findMany({
      where: {
        OR: [
          { iplTeamId: game.team1Id },
          { iplTeamId: game.team2Id }
        ]
      },
      include: {
        iplTeam: true
      }
    });

    if (players.length === 0) {
      console.log('❌ No players found for these teams.');
      return;
    }

    // Sample stats for a few players
    const sampleStats = [
      {
        playerId: players[0]?.id,
        runs: 45,
        wickets: 0,
        catches: 2,
        runOuts: 0,
        stumpings: 0
      },
      {
        playerId: players[1]?.id,
        runs: 23,
        wickets: 3,
        catches: 1,
        runOuts: 0,
        stumpings: 0
      },
      {
        playerId: players[2]?.id,
        runs: 67,
        wickets: 0,
        catches: 1,
        runOuts: 1,
        stumpings: 0
      },
      {
        playerId: players[3]?.id,
        runs: 15,
        wickets: 2,
        catches: 0,
        runOuts: 0,
        stumpings: 0
      },
      {
        playerId: players[4]?.id,
        runs: 12,
        wickets: 0,
        catches: 3,
        runOuts: 0,
        stumpings: 2
      }
    ];

    for (let i = 0; i < Math.min(sampleStats.length, players.length); i++) {
      const stat = sampleStats[i];
      if (!stat.playerId) continue;

      const points = (stat.runs * 1) + (stat.wickets * 20) + ((stat.catches + stat.runOuts + stat.stumpings) * 5);
      
      const playerStat = await prisma.playerStat.create({
        data: {
          iplGameId: game.id,
          playerId: stat.playerId,
          runs: stat.runs,
          wickets: stat.wickets,
          catches: stat.catches,
          runOuts: stat.runOuts,
          stumpings: stat.stumpings,
          points: points
        },
        include: {
          player: {
            include: {
              iplTeam: true
            }
          }
        }
      });

      console.log(`✅ Added stats for ${playerStat.player.name}: ${points} points`);
    }

    console.log("🎉 Sample player statistics created successfully!");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleStats();