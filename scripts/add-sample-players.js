const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSamplePlayers() {
  try {
    // Get team IDs first
    const teams = await prisma.iPLTeam.findMany();
    const teamMap = {};
    teams.forEach(team => {
      teamMap[team.shortName] = team.id;
    });

    const samplePlayers = [
      // Chennai Super Kings
      { name: "Ravindra Jadeja", role: "ALL_ROUNDER", price: 10.0, jersey: 8, team: "CSK" },
      { name: "Ruturaj Gaikwad", role: "BATSMAN", price: 9.0, jersey: 31, team: "CSK" },
      
      // Mumbai Indians  
      { name: "Rohit Sharma", role: "BATSMAN", price: 11.0, jersey: 45, team: "MI" },
      { name: "Suryakumar Yadav", role: "BATSMAN", price: 10.0, jersey: 63, team: "MI" },
      
      // Royal Challengers Bangalore
      { name: "Glenn Maxwell", role: "ALL_ROUNDER", price: 10.5, jersey: 32, team: "RCB" },
      { name: "Mohammed Siraj", role: "BOWLER", price: 8.5, jersey: 13, team: "RCB" },
      
      // Kolkata Knight Riders
      { name: "Andre Russell", role: "ALL_ROUNDER", price: 11.0, jersey: 12, team: "KKR" },
      { name: "Sunil Narine", role: "BOWLER", price: 9.5, jersey: 74, team: "KKR" },
      
      // Delhi Capitals
      { name: "Rishabh Pant", role: "WICKET_KEEPER", price: 11.5, jersey: 17, team: "DC" },
      { name: "Prithvi Shaw", role: "BATSMAN", price: 8.0, jersey: 99, team: "DC" }
    ];

    for (const player of samplePlayers) {
      const teamId = teamMap[player.team];
      if (teamId) {
        try {
          await prisma.player.create({
            data: {
              name: player.name,
              role: player.role,
              price: player.price,
              jerseyNumber: player.jersey,
              iplTeamId: teamId
            }
          });
          console.log(`✅ Added ${player.name} to ${player.team}`);
        } catch (error) {
          console.log(`❌ Failed to add ${player.name}: ${error.message}`);
        }
      }
    }

    console.log("🎉 Sample players added successfully!");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addSamplePlayers();