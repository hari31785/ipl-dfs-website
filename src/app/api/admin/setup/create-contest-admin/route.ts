import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'
import bcrypt from "bcryptjs"


export async function POST(request: Request) {
  try {
    const { secret } = await request.json()
    
    // Verify admin secret
    if (secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log('🏏 Creating admin user for contest participation...')
    
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    if (existingUser) {
      console.log('✅ Admin user already exists!')
      
      // Update email if it's not set correctly
      if (existingUser.email !== 'admin@ipldfs.com') {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { email: 'admin@ipldfs.com' }
        })
        console.log('✅ Updated email to admin@ipldfs.com')
      }
      
      return NextResponse.json({
        message: "Admin user already exists",
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          coins: existingUser.coins
        }
      })
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

    return NextResponse.json({
      message: "Admin user created successfully",
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        coins: adminUser.coins
      },
      note: "This user will automatically join contests when there are odd number of signups"
    })
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    return NextResponse.json(
      { 
        message: "Failed to create admin user",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  } finally {
  }
}