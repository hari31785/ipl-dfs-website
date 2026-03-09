const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const iplTeams = [
  {
    name: "Mumbai Indians",
    shortName: "MI",
    city: "Mumbai",
    color: "#004BA0",
  },
  {
    name: "Chennai Super Kings",
    shortName: "CSK",
    city: "Chennai",
    color: "#FFFF3C",
  },
  {
    name: "Royal Challengers Bangalore",
    shortName: "RCB",
    city: "Bangalore",
    color: "#EC1C24",
  },
  {
    name: "Kolkata Knight Riders",
    shortName: "KKR",
    city: "Kolkata",
    color: "#3A225D",
  },
  {
    name: "Delhi Capitals",
    shortName: "DC",
    city: "Delhi",
    color: "#004C93",
  },
  {
    name: "Punjab Kings",
    shortName: "PBKS",
    city: "Punjab",
    color: "#ED1B24",
  },
  {
    name: "Rajasthan Royals",
    shortName: "RR",
    city: "Rajasthan",
    color: "#FFC0CB",
  },
  {
    name: "Sunrisers Hyderabad",
    shortName: "SRH",
    city: "Hyderabad",
    color: "#FF822A",
  },
  {
    name: "Gujarat Titans",
    shortName: "GT",
    city: "Gujarat",
    color: "#1C2A40",
  },
  {
    name: "Lucknow Super Giants",
    shortName: "LSG",
    city: "Lucknow",
    color: "#1C4394",
  },
];

async function main() {
  console.log('Seeding IPL teams...');
  
  for (const team of iplTeams) {
    const existingTeam = await prisma.iPLTeam.findUnique({
      where: { shortName: team.shortName }
    });
    
    if (!existingTeam) {
      await prisma.iPLTeam.create({
        data: team
      });
      console.log(`✓ Created team: ${team.name}`);
    } else {
      console.log(`- Team already exists: ${team.name}`);
    }
  }
  
  console.log('\n✅ IPL teams seeded successfully!');
  
  const count = await prisma.iPLTeam.count();
  console.log(`Total teams in database: ${count}`);
}

main()
  .catch((e) => {
    console.error('Error seeding teams:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
