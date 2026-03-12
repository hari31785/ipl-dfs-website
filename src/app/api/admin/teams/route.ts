import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const teams = await prisma.iPLTeam.findMany({
      orderBy: { name: 'asc' },
      include: {
        players: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json(teams)

  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, shortName, city, color, logoUrl } = await request.json()

    if (!name || !shortName || !city || !color) {
      return NextResponse.json(
        { message: "Name, short name, city, and color are required" },
        { status: 400 }
      )
    }

    // Check if team with same name or short name already exists
    const existingTeam = await prisma.iPLTeam.findFirst({
      where: {
        OR: [
          { name: name },
          { shortName: shortName }
        ]
      }
    })

    if (existingTeam) {
      return NextResponse.json(
        { message: "Team with this name or short name already exists" },
        { status: 400 }
      )
    }

    const team = await prisma.iPLTeam.create({
      data: {
        name,
        shortName,
        city,
        color,
        logoUrl: logoUrl || null
      }
    })

    return NextResponse.json({
      message: "Team created successfully",
      team
    })

  } catch (error) {
    console.error("Error creating team:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
  }
}