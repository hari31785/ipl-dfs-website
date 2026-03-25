const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { username: 'gunnerhari' },
    select: {
      username: true,
      name: true,
      email: true,
      coins: true
    }
  });
  
  console.log('=== gunnerhari User Data ===');
  console.log('Username:', user.username);
  console.log('Name:', user.name);
  console.log('Email:', user.email);
  console.log('Coins (Global Balance):', user.coins);
  console.log('');
  console.log('This is the GLOBAL coin balance stored in the users table.');
  console.log('It is displayed in the View Signups modal.');
  
  await prisma.$disconnect();
}

checkUser();
