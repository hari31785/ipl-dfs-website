const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addCompleteRosters() {
  try {
    // Get team IDs first
    const teams = await prisma.iPLTeam.findMany();
    const teamMap = {};
    teams.forEach(team => {
      teamMap[team.shortName] = team.id;
    });

    const completePlayers = [
      // Mumbai Indians (MI)
      { name: "Ishan Kishan", role: "WICKET_KEEPER", jersey: 23, team: "MI" },
      { name: "Tim David", role: "BATSMAN", jersey: 1, team: "MI" },
      { name: "Kieron Pollard", role: "ALL_ROUNDER", jersey: 55, team: "MI" },
      { name: "Trent Boult", role: "BOWLER", jersey: 18, team: "MI" },
      
      // Chennai Super Kings (CSK)
      { name: "Faf du Plessis", role: "BATSMAN", jersey: 9, team: "CSK" },
      { name: "Ambati Rayudu", role: "BATSMAN", jersey: 3, team: "CSK" },
      { name: "Dwayne Bravo", role: "ALL_ROUNDER", jersey: 47, team: "CSK" },
      { name: "Deepak Chahar", role: "BOWLER", jersey: 90, team: "CSK" },
      
      // Royal Challengers Bangalore (RCB)
      { name: "Faf du Plessis", role: "BATSMAN", jersey: 25, team: "RCB" },
      { name: "Dinesh Karthik", role: "WICKET_KEEPER", jersey: 12, team: "RCB" },
      { name: "Wanindu Hasaranga", role: "ALL_ROUNDER", jersey: 96, team: "RCB" },
      { name: "Josh Hazlewood", role: "BOWLER", jersey: 8, team: "RCB" },
      
      // Kolkata Knight Riders (KKR)
      { name: "Shreyas Iyer", role: "BATSMAN", jersey: 41, team: "KKR" },
      { name: "Dinesh Karthik", role: "WICKET_KEEPER", jersey: 1, team: "KKR" },
      { name: "Nitish Rana", role: "BATSMAN", jersey: 27, team: "KKR" },
      { name: "Pat Cummins", role: "BOWLER", jersey: 30, team: "KKR" },
      
      // Delhi Capitals (DC)
      { name: "David Warner", role: "BATSMAN", jersey: 31, team: "DC" },
      { name: "Rovman Powell", role: "ALL_ROUNDER", jersey: 17, team: "DC" },
      { name: "Axar Patel", role: "ALL_ROUNDER", jersey: 20, team: "DC" },
      { name: "Anrich Nortje", role: "BOWLER", jersey: 25, team: "DC" },
      
      // Punjab Kings (PBKS)
      { name: "Mayank Agarwal", role: "BATSMAN", jersey: 12, team: "PBKS" },
      { name: "Jonny Bairstow", role: "WICKET_KEEPER", jersey: 21, team: "PBKS" },
      { name: "Liam Livingstone", role: "ALL_ROUNDER", jersey: 24, team: "PBKS" },
      { name: "Kagiso Rabada", role: "BOWLER", jersey: 25, team: "PBKS" },
      
      // Rajasthan Royals (RR)
      { name: "Jos Buttler", role: "WICKET_KEEPER", jersey: 63, team: "RR" },
      { name: "Sanju Samson", role: "WICKET_KEEPER", jersey: 4, team: "RR" },
      { name: "Shimron Hetmyer", role: "BATSMAN", jersey: 22, team: "RR" },
      { name: "Yuzvendra Chahal", role: "BOWLER", jersey: 3, team: "RR" },
      
      // Sunrisers Hyderabad (SRH)
      { name: "Kane Williamson", role: "BATSMAN", jersey: 2, team: "SRH" },
      { name: "Nicholas Pooran", role: "WICKET_KEEPER", jersey: 27, team: "SRH" },
      { name: "Aiden Markram", role: "ALL_ROUNDER", jersey: 4, team: "SRH" },
      { name: "Bhuvneshwar Kumar", role: "BOWLER", jersey: 15, team: "SRH" },
      
      // Gujarat Titans (GT)
      { name: "Wriddhiman Saha", role: "WICKET_KEEPER", jersey: 27, team: "GT" },
      { name: "Abhinav Manohar", role: "BATSMAN", jersey: 24, team: "GT" },
      { name: "Vijay Shankar", role: "ALL_ROUNDER", jersey: 2, team: "GT" },
      { name: "Lockie Ferguson", role: "BOWLER", jersey: 11, team: "GT" },
      
      // Lucknow Super Giants (LSG)
      { name: "KL Rahul", role: "WICKET_KEEPER", jersey: 1, team: "LSG" },
      { name: "Quinton de Kock", role: "WICKET_KEEPER", jersey: 31, team: "LSG" },
      { name: "Deepak Hooda", role: "ALL_ROUNDER", jersey: 33, team: "LSG" },
      { name: "Dushmantha Chameera", role: "BOWLER", jersey: 29, team: "LSG" }
    ];

    for (const player of completePlayers) {
      const teamId = teamMap[player.team];
      if (teamId) {
        try {
          // Check if player already exists
          const existingPlayer = await prisma.player.findFirst({
            where: {
              name: player.name,
              iplTeamId: teamId
            }
          });

          if (!existingPlayer) {
            await prisma.player.create({
              data: {
                name: player.name,
                role: player.role,
                price: 8.5, // Default price
                jerseyNumber: player.jersey,
                iplTeamId: teamId
              }
            });
            console.log(`✅ Added ${player.name} to ${player.team}`);
          } else {
            console.log(`⚠️  ${player.name} already exists in ${player.team}`);
          }
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`⚠️  Jersey number ${player.jersey} already taken in ${player.team} for ${player.name}`);
          } else {
            console.log(`❌ Failed to add ${player.name}: ${error.message}`);
          }
        }
      }
    }

    console.log("🎉 Complete roster update finished!");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addCompleteRosters();