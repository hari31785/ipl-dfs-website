import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'


export async function GET(request: NextRequest) {
  try {
    const tournamentId = request.nextUrl.searchParams.get('tournamentId')
    
    if (!tournamentId) {
      // Return empty array if no tournament selected
      return NextResponse.json({ players: [] })
    }

    const players = await prisma.player.findMany({
      where: {
        tournamentId: tournamentId
      },
      orderBy: [
        { name: 'asc' }
      ],
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

    return NextResponse.json({ players })

  } catch (error) {
    console.error("Error fetching players:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, role, price, jerseyNumber, iplTeamId, tournamentId } = await request.json()

    if (!name || !role || !price || !iplTeamId || !tournamentId) {
      return NextResponse.json(
        { message: "Name, role, price, team, and tournament are required" },
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

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    })

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
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

    // Check if jersey number is already taken in the team for this tournament
    if (jerseyNumber) {
      const existingPlayer = await prisma.player.findFirst({
        where: {
          iplTeamId: iplTeamId,
          tournamentId: tournamentId,
          jerseyNumber: jerseyNumber,
          isActive: true
        }
      })

      if (existingPlayer) {
        return NextResponse.json(
          { message: "Jersey number already taken by another player in this team for this tournament" },
          { status: 400 }
        )
      }
    }

    // Check if player with same name already exists in the team for this tournament
    const existingPlayerName = await prisma.player.findFirst({
      where: {
        name: name,
        iplTeamId: iplTeamId,
        tournamentId: tournamentId,
        isActive: true
      }
    })

    if (existingPlayerName) {
      return NextResponse.json(
        { message: "Player with this name already exists in this team for this tournament" },
        { status: 400 }
      )
    }

    const player = await prisma.player.create({
      data: {
        name,
        role,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
        iplTeamId,
        tournamentId
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
      message: "Player created successfully",
      player
    })

  } catch (error) {
    console.error("Error creating player:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
  }
}