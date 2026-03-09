const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    if (existingUser) {
      console.log('✅ Admin user already exists!')
      console.log('Email: admin@ipldfs.com')
      console.log('Password: admin123')
      console.log('Username: admin')
      return
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        name: 'Admin',
        email: 'admin@ipldfs.com',
        password: hashedPassword,
        coins: 1000000, // Give admin plenty of coins
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('Email: admin@ipldfs.com')
    console.log('Password: admin123')
    console.log('Username: admin')
    console.log('User ID:', adminUser.id)
    console.log('\nYou can now login to the main application with these credentials.')
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
