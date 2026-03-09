// Production script to create the admin user for contest participation
// This is needed for the odd-number signup logic to work properly

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminUserForProduction() {
  try {
    console.log('🏏 Creating admin user for contest participation...')
    
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    if (existingUser) {
      console.log('✅ Admin user already exists!')
      console.log('   Username:', existingUser.username)
      console.log('   Email:', existingUser.email || 'No email')
      
      // Update email if it's not set correctly
      if (existingUser.email !== 'admin@ipldfs.com') {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { email: 'admin@ipldfs.com' }
        })
        console.log('✅ Updated email to admin@ipldfs.com')
      }
      return
    }

    // Hash the password  
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    // Create admin user with high coin balance
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        name: 'Admin User',
        email: 'admin@ipldfs.com',
        password: hashedPassword,
        coins: 1000000, // 1 million coins for contest participation
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('   ID:', adminUser.id)
    console.log('   Username: admin')
    console.log('   Email: admin@ipldfs.com')
    console.log('   Password: admin123')
    console.log('   Coins:', adminUser.coins.toLocaleString())
    console.log('')
    console.log('🎯 This user will now automatically join contests when there are odd number of signups!')
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    if (error.code === 'P2002') {
      console.log('💡 User already exists with that email/username')
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Run this in production environment
createAdminUserForProduction()