const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSimplePlayers() {
  try {
    // Get first two teams
    const teams = await prisma.iPLTeam.findMany({ take: 2 });
    
    if (teams.length < 2) {
      console.log('❌ Need at least 2 teams');
      return;
    }

    // Simple players for both teams
    const players = [
      // Team 1 (CSK) players
      { name: "MS Dhoni", role: "WICKET_KEEPER", teamId: teams[0].id, jersey: 7 },
      { name: "Ruturaj Gaikwad", role: "BATSMAN", teamId: teams[0].id, jersey: 31 },
      { name: "Ravindra Jadeja", role: "ALL_ROUNDER", teamId: teams[0].id, jersey: 8 },
      { name: "Deepak Chahar", role: "BOWLER", teamId: teams[0].id, jersey: 90 },
      { name: "Ambati Rayudu", role: "BATSMAN", teamId: teams[0].id, jersey: 3 },
      
      // Team 2 (DC) players 
      { name: "Rishabh Pant", role: "WICKET_KEEPER", teamId: teams[1].id, jersey: 17 },
      { name: "Prithvi Shaw", role: "BATSMAN", teamId: teams[1].id, jersey: 41 },
      { name: "Axar Patel", role: "ALL_ROUNDER", teamId: teams[1].id, jersey: 20 },
      { name: "Kagiso Rabada", role: "BOWLER", teamId: teams[1].id, jersey: 25 },
      { name: "Shikhar Dhawan", role: "BATSMAN", teamId: teams[1].id, jersey: 25 }
    ];

    for (const player of players) {
      try {
        const newPlayer = await prisma.player.create({
          data: {
            name: player.name,
            role: player.role,
            iplTeamId: player.teamId,
            jerseyNumber: player.jersey,
            isActive: true
          }
        });
        console.log(`✅ Added: ${newPlayer.name} (${player.role})`);
      } catch (error) {
        console.log(`❌ Failed to add ${player.name}: ${error.message}`);
      }
    }

    console.log("🎉 Simple players added successfully!");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addSimplePlayers();