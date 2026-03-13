const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const admin = await prisma.admin.upsert({
      where: { username: 'admin' },
      update: {
        password: hashedPassword,
        name: 'IPL DFS Admin'
      },
      create: {
        username: 'admin',
        password: hashedPassword,
        name: 'IPL DFS Admin'
      }
    });
    
    console.log('✅ Admin account updated successfully!\n');
    console.log('Login credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('\nLogin URL: http://localhost:3001/admin/login\n');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
