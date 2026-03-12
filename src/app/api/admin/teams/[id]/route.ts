import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const team = await prisma.iPLTeam.findUnique({
      where: { id },
      include: {
        players: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { message: "Team not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ team })

  } catch (error) {
    console.error("Error fetching team:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { name, shortName, city, color, logoUrl } = await request.json()

    if (!name || !shortName || !city || !color) {
      return NextResponse.json(
        { message: "Name, short name, city, and color are required" },
        { status: 400 }
      )
    }

    // Check if another team with same name or short name already exists (excluding current team)
    const existingTeam = await prisma.iPLTeam.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { name: name },
              { shortName: shortName }
            ]
          }
        ]
      }
    })

    if (existingTeam) {
      return NextResponse.json(
        { message: "Team with this name or short name already exists" },
        { status: 400 }
      )
    }

    const team = await prisma.iPLTeam.update({
      where: { id },
      data: {
        name,
        shortName,
        city,
        color,
        logoUrl: logoUrl || null
      }
    })

    return NextResponse.json({
      message: "Team updated successfully",
      team
    })

  } catch (error) {
    console.error("Error updating team:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Check if team has players
    const teamWithPlayers = await prisma.iPLTeam.findUnique({
      where: { id },
      include: {
        players: {
          select: { id: true }
        }
      }
    })

    if (!teamWithPlayers) {
      return NextResponse.json(
        { message: "Team not found" },
        { status: 404 }
      )
    }

    if (teamWithPlayers.players.length > 0) {
      return NextResponse.json(
        { message: "Cannot delete team with existing players. Please remove all players first." },
        { status: 400 }
      )
    }

    await prisma.iPLTeam.delete({
      where: { id }
    })

    return NextResponse.json({
      message: "Team deleted successfully"
    })

  } catch (error) {
    console.error("Error deleting team:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
  }
}