import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        _count: {
          select: { games: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tournaments)
  } catch (error) {
    console.error("Error fetching tournaments:", error)
    return NextResponse.json(
      { message: "Failed to fetch tournaments" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, startDate, endDate, isActive, status } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { message: "Name, start date, and end date are required" },
        { status: 400 }
      )
    }

    const tournament = await prisma.tournament.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive,
        status
      }
    })

    return NextResponse.json(tournament, { status: 201 })
  } catch (error) {
    console.error("Error creating tournament:", error)
    return NextResponse.json(
      { message: "Failed to create tournament" },
      { status: 500 }
    )
  }
}