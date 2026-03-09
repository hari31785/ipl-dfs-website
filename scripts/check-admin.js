const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAdmin() {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true
      }
    })
    
    console.log('Admin users in database:')
    console.log(JSON.stringify(admins, null, 2))
    
    if (admins.length === 0) {
      console.log('\nNo admin users found! Creating admin user...')
      
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash('admin123', 12)
      
      const admin = await prisma.admin.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          name: 'IPL DFS Admin'
        }
      })
      
      console.log('Admin user created!')
      console.log('Username: admin')
      console.log('Password: admin123')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdmin()