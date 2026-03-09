import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        games: {
          include: {
            team1: true,
            team2: true,
            _count: {
              select: { contests: true }
            }
          }
        }
      }
    })

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(tournament)
  } catch (error) {
    console.error("Error fetching tournament:", error)
    return NextResponse.json(
      { message: "Failed to fetch tournament" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, startDate, endDate, isActive, status } = body

    const tournament = await prisma.tournament.update({
      where: { id },
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive,
        status
      }
    })

    return NextResponse.json(tournament)
  } catch (error) {
    console.error("Error updating tournament:", error)
    return NextResponse.json(
      { message: "Failed to update tournament" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check if tournament has games
    const gamesCount = await prisma.iPLGame.count({
      where: { tournamentId: id }
    })

    if (gamesCount > 0) {
      return NextResponse.json(
        { message: "Cannot delete tournament with existing games. Please delete all games first or they will be moved to a different tournament." },
        { status: 400 }
      )
    }

    await prisma.tournament.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Tournament deleted successfully" })
  } catch (error) {
    console.error("Error deleting tournament:", error)
    return NextResponse.json(
      { message: "Failed to delete tournament" },
      { status: 500 }
    )
  }
}