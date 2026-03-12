import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        iplTeam: {
          select: {
            id: true,
            name: true,
            shortName: true,
            color: true
          }
        },
        stats: {
          select: {
            id: true,
            runs: true,
            wickets: true,
            catches: true,
            runOuts: true,
            stumpings: true,
            points: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!player) {
      return NextResponse.json(
        { message: "Player not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ player })

  } catch (error) {
    console.error("Error fetching player:", error)
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
    const { name, role, price, jerseyNumber, iplTeamId } = await request.json()

    if (!name || !role || !price || !iplTeamId) {
      return NextResponse.json(
        { message: "Name, role, price, and team are required" },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: "Invalid player role" },
        { status: 400 }
      )
    }

    // Validate price range
    if (price < 5 || price > 15) {
      return NextResponse.json(
        { message: "Price must be between 5 and 15 credits" },
        { status: 400 }
      )
    }

    // Check if team exists
    const team = await prisma.iPLTeam.findUnique({
      where: { id: iplTeamId }
    })

    if (!team) {
      return NextResponse.json(
        { message: "Team not found" },
        { status: 404 }
      )
    }

    // Check if jersey number is already taken by another player in the team
    if (jerseyNumber) {
      const existingPlayer = await prisma.player.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { iplTeamId: iplTeamId },
            { jerseyNumber: jerseyNumber },
            { isActive: true }
          ]
        }
      })

      if (existingPlayer) {
        return NextResponse.json(
          { message: "Jersey number already taken by another player in this team" },
          { status: 400 }
        )
      }
    }

    // Check if another player with same name already exists in the team
    const existingPlayerName = await prisma.player.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          { name: name },
          { iplTeamId: iplTeamId },
          { isActive: true }
        ]
      }
    })

    if (existingPlayerName) {
      return NextResponse.json(
        { message: "Player with this name already exists in this team" },
        { status: 400 }
      )
    }

    const player = await prisma.player.update({
      where: { id },
      data: {
        name,
        role,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
        iplTeamId
      },
      include: {
        iplTeam: {
          select: {
            id: true,
            name: true,
            shortName: true,
            color: true
          }
        }
      }
    })

    return NextResponse.json({
      message: "Player updated successfully",
      player
    })

  } catch (error) {
    console.error("Error updating player:", error)
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

    // Check if player exists
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        stats: { select: { id: true } },
        teamPlayers: { select: { id: true } }
      }
    })

    if (!player) {
      return NextResponse.json(
        { message: "Player not found" },
        { status: 404 }
      )
    }

    // Check if player has statistics or is part of user teams
    if (player.stats.length > 0) {
      // Instead of deleting, set as inactive
      await prisma.player.update({
        where: { id },
        data: { isActive: false }
      })

      return NextResponse.json({
        message: "Player deactivated successfully (player has statistics)"
      })
    } else {
      // Safe to delete if no statistics
      await prisma.player.delete({
        where: { id }
      })

      return NextResponse.json({
        message: "Player deleted successfully"
      })
    }

  } catch (error) {
    console.error("Error deleting player:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
  }
}