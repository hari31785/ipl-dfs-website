const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdmins() {
  try {
    const admins = await prisma.admin.findMany();
    
    console.log('\n📋 Admin Accounts in Database:\n');
    
    if (admins.length === 0) {
      console.log('❌ No admin accounts found!');
    } else {
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. Username: ${admin.username}`);
        console.log(`   Password: ${admin.password}`);
        console.log(`   Name: ${admin.name}`);
        console.log(`   Created: ${admin.createdAt}\n`);
      });
    }
    
    console.log('💡 Use these credentials to login at: http://localhost:3001/admin/login\n');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmins();
