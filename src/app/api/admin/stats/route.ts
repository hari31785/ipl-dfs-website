import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/stats - Get player stats for a specific game
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json(
        { message: 'Game ID is required' },
        { status: 400 }
      );
    }

    const stats = await prisma.playerStat.findMany({
      where: {
        iplGameId: gameId
      },
      include: {
        player: {
          include: {
            iplTeam: true
          }
        }
      },
      orderBy: {
        points: 'desc'
      }
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

// POST /api/admin/stats - Add player stats
export async function POST(request: NextRequest) {
  try {
    const { iplGameId, playerId, runs, wickets, catches, runOuts, stumpings, points } = await request.json();

    // Validation
    if (!iplGameId || !playerId) {
      return NextResponse.json(
        { message: 'Game ID and Player ID are required' },
        { status: 400 }
      );
    }

    if (runs < 0 || wickets < 0 || catches < 0 || runOuts < 0 || stumpings < 0) {
      return NextResponse.json(
        { message: 'All stat values must be non-negative' },
        { status: 400 }
      );
    }

    // Check if game and player exist
    const [game, player] = await Promise.all([
      prisma.iPLGame.findUnique({ where: { id: iplGameId } }),
      prisma.player.findUnique({ 
        where: { id: playerId },
        include: { iplTeam: true }
      })
    ]);

    if (!game) {
      return NextResponse.json(
        { message: 'Game not found' },
        { status: 404 }
      );
    }

    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      );
    }

    // Check if player is part of the teams playing in this game
    const gameTeams = await prisma.iPLGame.findUnique({
      where: { id: iplGameId },
      include: {
        team1: true,
        team2: true
      }
    });

    if (player.iplTeam.id !== gameTeams?.team1.id && player.iplTeam.id !== gameTeams?.team2.id) {
      return NextResponse.json(
        { message: 'Player is not part of the teams playing in this game' },
        { status: 400 }
      );
    }

    // Check if stats already exist for this player in this game
    const existingStats = await prisma.playerStat.findFirst({
      where: {
        iplGameId,
        playerId
      }
    });

    if (existingStats) {
      // Update existing stats
      const updatedStats = await prisma.playerStat.update({
        where: { id: existingStats.id },
        data: {
          runs,
          wickets,
          catches,
          runOuts,
          stumpings,
          points
        },
        include: {
          player: {
            include: {
              iplTeam: true
            }
          }
        }
      });
      
      return NextResponse.json(updatedStats);
    } else {
      // Create new stats
      const newStats = await prisma.playerStat.create({
        data: {
          iplGameId,
          playerId,
          runs,
          wickets,
          catches,
          runOuts,
          stumpings,
          points
        },
        include: {
          player: {
            include: {
              iplTeam: true
            }
          }
        }
      });

      return NextResponse.json(newStats, { status: 201 });
    }
  } catch (error) {
    console.error('Error saving stats:', error);
    return NextResponse.json(
      { message: 'Failed to save stats' },
      { status: 500 }
    );
  }
}