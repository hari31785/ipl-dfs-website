const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { username: 'admin' }
    })

    if (existingAdmin) {
      console.log('Admin user already exists!')
      return
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    // Create admin user
    const admin = await prisma.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: 'IPL DFS Admin'
      }
    })

    console.log('Admin user created successfully!')
    console.log('Username: admin')
    console.log('Password: admin123')
    console.log('Admin ID:', admin.id)
    
  } catch (error) {
    console.error('Error creating admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()