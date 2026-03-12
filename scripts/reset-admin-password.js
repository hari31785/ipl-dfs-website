const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function resetAdminPassword() {
  try {
    console.log('🔐 Admin Password Reset\n');

    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { username: 'admin' }
    });

    if (!admin) {
      console.log('❌ Admin user not found!');
      console.log('💡 Creating new admin user...\n');
      
      const password = await question('Enter new admin password: ');
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.admin.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          name: 'IPL DFS Admin'
        }
      });

      console.log('\n✅ Admin user created successfully!');
    } else {
      console.log(`✓ Found admin: ${admin.name} (@${admin.username})\n`);
      
      const password = await question('Enter new password for admin: ');
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.admin.update({
        where: { username: 'admin' },
        data: { password: hashedPassword }
      });

      console.log('\n✅ Admin password updated successfully!');
    }

    console.log('\n📝 Admin Login Details:');
    console.log('   Username: admin');
    console.log('   Password: (the one you just entered)');
    console.log('   URL: /admin/login');
    console.log('\n🎉 You can now login to the admin panel!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

resetAdminPassword();
