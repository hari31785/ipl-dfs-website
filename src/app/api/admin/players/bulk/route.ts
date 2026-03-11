import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { players, tournamentId } = await request.json()

    if (!Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { message: "Players array is required and cannot be empty" },
        { status: 400 }
      )
    }

    if (!tournamentId) {
      return NextResponse.json(
        { message: "Tournament ID is required" },
        { status: 400 }
      )
    }

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    })

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      )
    }

    const validRoles = ["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"]
    const results = []
    const errors = []

    // Validate all players first
    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      const lineNumber = i + 1

      if (!player.name || !player.role || !player.iplTeamId) {
        errors.push(`Line ${lineNumber}: Name, role, and team are required`)
        continue
      }

      if (!validRoles.includes(player.role)) {
        errors.push(`Line ${lineNumber}: Invalid role "${player.role}"`)
        continue
      }

      if (player.price && (player.price < 5 || player.price > 15)) {
        errors.push(`Line ${lineNumber}: Price must be between 5 and 15 credits`)
        continue
      }

      // Check if team exists
      const team = await prisma.iPLTeam.findUnique({
        where: { id: player.iplTeamId }
      })

      if (!team) {
        errors.push(`Line ${lineNumber}: Team not found`)
        continue
      }

      // Check for duplicate jersey numbers within the same team AND tournament
      if (player.jerseyNumber) {
        const existingPlayer = await prisma.player.findFirst({
          where: {
            iplTeamId: player.iplTeamId,
            jerseyNumber: player.jerseyNumber,
            tournamentId: tournamentId,
            isActive: true
          }
        })

        if (existingPlayer) {
          errors.push(`Line ${lineNumber}: Jersey number ${player.jerseyNumber} already taken in ${team.shortName} for this tournament`)
          continue
        }

        // Check for duplicates within the current batch
        const duplicateInBatch = players.slice(0, i).find(p => 
          p.iplTeamId === player.iplTeamId && p.jerseyNumber === player.jerseyNumber
        )
        if (duplicateInBatch) {
          errors.push(`Line ${lineNumber}: Duplicate jersey number ${player.jerseyNumber} in batch for ${team.shortName}`)
          continue
        }
      }

      // Check for duplicate player names within the same team AND tournament
      const existingPlayerName = await prisma.player.findFirst({
        where: {
          name: player.name,
          iplTeamId: player.iplTeamId,
          tournamentId: tournamentId,
          isActive: true
        }
      })

      if (existingPlayerName) {
        errors.push(`Line ${lineNumber}: Player "${player.name}" already exists in ${team.shortName} for this tournament`)
        continue
      }

      // Check for duplicates within the current batch
      const duplicateNameInBatch = players.slice(0, i).find(p => 
        p.iplTeamId === player.iplTeamId && p.name === player.name
      )
      if (duplicateNameInBatch) {
        errors.push(`Line ${lineNumber}: Duplicate player name "${player.name}" in batch for ${team.shortName}`)
        continue
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { message: "Validation errors found", errors },
        { status: 400 }
      )
    }

    // Create all players
    let created = 0
    for (const playerData of players) {
      try {
        await prisma.player.create({
          data: {
            name: playerData.name,
            role: playerData.role,
            jerseyNumber: playerData.jerseyNumber || null,
            iplTeamId: playerData.iplTeamId,
            tournamentId: tournamentId
          }
        })
        created++
      } catch (error) {
        console.error(`Error creating player ${playerData.name}:`, error)
        errors.push(`Failed to create player: ${playerData.name}`)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        message: `Created ${created} players with some errors`,
        created,
        errors
      })
    }

    return NextResponse.json({
      message: `Successfully created ${created} players`,
      created
    })

  } catch (error) {
    console.error("Error in bulk player creation:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}