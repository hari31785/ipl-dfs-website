const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const iplTeams = [
  {
    name: "Mumbai Indians (MI)",
    shortName: "MI",
    city: "Mumbai",
    color: "#004BA0"
  },
  {
    name: "Chennai Super Kings (CSK)",
    shortName: "CSK", 
    city: "Chennai",
    color: "#FFD700"
  },
  {
    name: "Royal Challengers Bangalore (RCB)",
    shortName: "RCB",
    city: "Bangalore", 
    color: "#D82131"
  },
  {
    name: "Kolkata Knight Riders (KKR)",
    shortName: "KKR",
    city: "Kolkata",
    color: "#8A2BE2"
  },
  {
    name: "Delhi Capitals (DC)",
    shortName: "DC",
    city: "Delhi",
    color: "#282968"
  },
  {
    name: "Punjab Kings (PBKS)",
    shortName: "PBKS",
    city: "Mohali",
    color: "#DD1C25"
  },
  {
    name: "Rajasthan Royals (RR)",
    shortName: "RR", 
    city: "Jaipur",
    color: "#FF69B4"
  },
  {
    name: "Sunrisers Hyderabad (SRH)",
    shortName: "SRH",
    city: "Hyderabad",
    color: "#FF822A"
  },
  {
    name: "Gujarat Titans (GT)",
    shortName: "GT",
    city: "Ahmedabad", 
    color: "#1F4788"
  },
  {
    name: "Lucknow Super Giants (LSG)",
    shortName: "LSG",
    city: "Lucknow",
    color: "#00A8CC"
  }
]

async function createAllIPLTeams() {
  try {
    console.log('Creating all 10 IPL teams...')
    
    for (const team of iplTeams) {
      // Check if team already exists
      const existingTeam = await prisma.iPLTeam.findFirst({
        where: {
          OR: [
            { shortName: team.shortName },
            { name: team.name }
          ]
        }
      })

      if (existingTeam) {
        console.log(`⚠️  Team ${team.shortName} already exists, skipping...`)
        continue
      }

      // Create the team
      const createdTeam = await prisma.iPLTeam.create({
        data: {
          name: team.name,
          shortName: team.shortName,
          city: team.city,
          color: team.color,
          isActive: true
        }
      })

      console.log(`✅ Created: ${createdTeam.name} (${createdTeam.shortName}) - ${createdTeam.color}`)
    }

    // Get final count
    const totalTeams = await prisma.iPLTeam.count()
    console.log(`\n🏏 Total IPL teams in database: ${totalTeams}/10`)
    
    if (totalTeams === 10) {
      console.log('🎉 All IPL teams created successfully!')
    }

  } catch (error) {
    console.error('Error creating IPL teams:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAllIPLTeams()