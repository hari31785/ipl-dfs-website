const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMorePlayers() {
  try {
    // Get team IDs first
    const teams = await prisma.iPLTeam.findMany();
    const teamMap = {};
    teams.forEach(team => {
      teamMap[team.shortName] = team.id;
    });

    const newPlayers = [
      // Mumbai Indians (MI) - 15 total players
      { name: "Rohit Sharma", role: "Batsman", jersey: 45, team: "MI" },
      { name: "Suryakumar Yadav", role: "Batsman", jersey: 63, team: "MI" },
      { name: "Tilak Varma", role: "Batsman", jersey: 9, team: "MI" },
      { name: "Ishan Kishan", role: "Wicket-Keeper", jersey: 23, team: "MI" },
      { name: "Dewald Brevis", role: "Batsman", jersey: 50, team: "MI" },
      { name: "Tim David", role: "All-Rounder", jersey: 1, team: "MI" },
      { name: "Kieron Pollard", role: "All-Rounder", jersey: 55, team: "MI" },
      { name: "Cameron Green", role: "All-Rounder", jersey: 77, team: "MI" },
      { name: "Jasprit Bumrah", role: "Bowler", jersey: 93, team: "MI" },
      { name: "Jofra Archer", role: "Bowler", jersey: 22, team: "MI" },
      { name: "Trent Boult", role: "Bowler", jersey: 18, team: "MI" },
      { name: "Kumar Kartikeya", role: "Bowler", jersey: 25, team: "MI" },
      { name: "Piyush Chawla", role: "Bowler", jersey: 12, team: "MI" },
      { name: "Jason Behrendorff", role: "Bowler", jersey: 5, team: "MI" },
      { name: "Arjun Tendulkar", role: "All-Rounder", jersey: 11, team: "MI" },
      
      // Royal Challengers Bangalore (RCB) - 15 total players
      { name: "Virat Kohli", role: "Batsman", jersey: 18, team: "RCB" },
      { name: "Faf du Plessis", role: "Batsman", jersey: 25, team: "RCB" },
      { name: "Glenn Maxwell", role: "All-Rounder", jersey: 32, team: "RCB" },
      { name: "Rajat Patidar", role: "Batsman", jersey: 73, team: "RCB" },
      { name: "Mahipal Lomror", role: "All-Rounder", jersey: 26, team: "RCB" },
      { name: "Dinesh Karthik", role: "Wicket-Keeper", jersey: 12, team: "RCB" },
      { name: "Anuj Rawat", role: "Wicket-Keeper", jersey: 34, team: "RCB" },
      { name: "Wanindu Hasaranga", role: "All-Rounder", jersey: 96, team: "RCB" },
      { name: "Shahbaz Ahmed", role: "All-Rounder", jersey: 10, team: "RCB" },
      { name: "Mohammed Siraj", role: "Bowler", jersey: 13, team: "RCB" },
      { name: "Josh Hazlewood", role: "Bowler", jersey: 8, team: "RCB" },
      { name: "Harshal Patel", role: "Bowler", jersey: 16, team: "RCB" },
      { name: "Akash Deep", role: "Bowler", jersey: 80, team: "RCB" },
      { name: "Karn Sharma", role: "Bowler", jersey: 22, team: "RCB" },
      { name: "David Willey", role: "All-Rounder", jersey: 15, team: "RCB" },
      
      // Kolkata Knight Riders (KKR) - 15 total players
      { name: "Shreyas Iyer", role: "Batsman", jersey: 41, team: "KKR" },
      { name: "Nitish Rana", role: "Batsman", jersey: 27, team: "KKR" },
      { name: "Rinku Singh", role: "Batsman", jersey: 11, team: "KKR" },
      { name: "Rahmanullah Gurbaz", role: "Wicket-Keeper", jersey: 33, team: "KKR" },
      { name: "Phil Salt", role: "Wicket-Keeper", jersey: 38, team: "KKR" },
      { name: "Andre Russell", role: "All-Rounder", jersey: 12, team: "KKR" },
      { name: "Sunil Narine", role: "All-Rounder", jersey: 74, team: "KKR" },
      { name: "Venkatesh Iyer", role: "All-Rounder", jersey: 1, team: "KKR" },
      { name: "Anukul Roy", role: "All-Rounder", jersey: 25, team: "KKR" },
      { name: "Mitchell Starc", role: "Bowler", jersey: 56, team: "KKR" },
      { name: "Varun Chakravarthy", role: "Bowler", jersey: 29, team: "KKR" },
      { name: "Umesh Yadav", role: "Bowler", jersey: 18, team: "KKR" },
      { name: "Harshit Rana", role: "Bowler", jersey: 19, team: "KKR" },
      { name: "Vaibhav Arora", role: "Bowler", jersey: 10, team: "KKR" },
      { name: "Lockie Ferguson", role: "Bowler", jersey: 44, team: "KKR" },
      
      // Chennai Super Kings (CSK) - 15 total players
      { name: "MS Dhoni", role: "Wicket-Keeper", jersey: 7, team: "CSK" },
      { name: "Ruturaj Gaikwad", role: "Batsman", jersey: 31, team: "CSK" },
      { name: "Devon Conway", role: "Wicket-Keeper", jersey: 88, team: "CSK" },
      { name: "Ajinkya Rahane", role: "Batsman", jersey: 27, team: "CSK" },
      { name: "Shivam Dube", role: "All-Rounder", jersey: 55, team: "CSK" },
      { name: "Ravindra Jadeja", role: "All-Rounder", jersey: 8, team: "CSK" },
      { name: "Moeen Ali", role: "All-Rounder", jersey: 18, team: "CSK" },
      { name: "Ben Stokes", role: "All-Rounder", jersey: 24, team: "CSK" },
      { name: "Rachin Ravindra", role: "All-Rounder", jersey: 3, team: "CSK" },
      { name: "Deepak Chahar", role: "Bowler", jersey: 90, team: "CSK" },
      { name: "Tushar Deshpande", role: "Bowler", jersey: 26, team: "CSK" },
      { name: "Maheesh Theekshana", role: "Bowler", jersey: 17, team: "CSK" },
      { name: "Matheesha Pathirana", role: "Bowler", jersey: 93, team: "CSK" },
      { name: "Mukesh Choudhary", role: "Bowler", jersey: 77, team: "CSK" },
      { name: "Mitchell Santner", role: "All-Rounder", jersey: 15, team: "CSK" },
    ];

    console.log('Adding players to teams...');
    
    let addedCount = 0;
    let skippedCount = 0;

    for (const playerData of newPlayers) {
      const teamId = teamMap[playerData.team];
      if (!teamId) {
        console.log(`❌ Team ${playerData.team} not found, skipping ${playerData.name}`);
        skippedCount++;
        continue;
      }

      // Check if player already exists
      const existingPlayer = await prisma.player.findFirst({
        where: {
          name: playerData.name,
          iplTeamId: teamId
        }
      });

      if (existingPlayer) {
        console.log(`⏭️  ${playerData.name} already exists, skipping...`);
        skippedCount++;
        continue;
      }

      await prisma.player.create({
        data: {
          name: playerData.name,
          role: playerData.role,
          jerseyNumber: playerData.jersey,
          iplTeamId: teamId,
          isActive: true
        }
      });

      console.log(`✅ Added ${playerData.name} to ${playerData.team}`);
      addedCount++;
    }

    console.log(`\n🎉 Complete! Added ${addedCount} new players, skipped ${skippedCount} existing players`);

  } catch (error) {
    console.error('❌ Error adding players:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMorePlayers();
