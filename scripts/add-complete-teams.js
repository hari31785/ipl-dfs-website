const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const iplTeams = [
  {
    name: "Mumbai Indians",
    shortName: "MI", 
    city: "Mumbai",
    color: "#004BA0"
  },
  {
    name: "Chennai Super Kings",
    shortName: "CSK",
    city: "Chennai", 
    color: "#FFFF00"
  },
  {
    name: "Royal Challengers Bangalore",
    shortName: "RCB",
    city: "Bangalore",
    color: "#EC1C24"
  },
  {
    name: "Kolkata Knight Riders", 
    shortName: "KKR",
    city: "Kolkata",
    color: "#3A225D"
  },
  {
    name: "Sunrisers Hyderabad",
    shortName: "SRH", 
    city: "Hyderabad",
    color: "#FF822A"
  },
  {
    name: "Delhi Capitals",
    shortName: "DC",
    city: "Delhi",
    color: "#17479E"
  },
  {
    name: "Punjab Kings",
    shortName: "PBKS",
    city: "Punjab", 
    color: "#ED1A3B"
  },
  {
    name: "Rajasthan Royals",
    shortName: "RR",
    city: "Jaipur",
    color: "#254AA5"
  },
  {
    name: "Lucknow Super Giants",
    shortName: "LSG",
    city: "Lucknow",
    color: "#1C5AA0"
  },
  {
    name: "Gujarat Titans", 
    shortName: "GT",
    city: "Ahmedabad",
    color: "#1B2951"
  }
];

async function addCompleteTeams() {
  try {
    console.log("🏏 Adding all 10 IPL teams...");
    
    for (const team of iplTeams) {
      try {
        const newTeam = await prisma.iPLTeam.create({
          data: team
        });
        console.log(`✅ Added: ${newTeam.name} (${newTeam.shortName})`);
      } catch (error) {
        console.log(`❌ Failed to add ${team.name}: ${error.message}`);
      }
    }

    console.log("🎉 IPL teams setup completed!");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addCompleteTeams();