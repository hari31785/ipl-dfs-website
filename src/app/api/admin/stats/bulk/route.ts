import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/admin/stats/bulk - Add or update multiple player stats at once
export async function POST(request: NextRequest) {
  try {
    const { iplGameId, stats } = await request.json();

    if (!iplGameId) {
      return NextResponse.json(
        { message: 'Game ID is required' },
        { status: 400 }
      );
    }

    if (!stats || !Array.isArray(stats) || stats.length === 0) {
      return NextResponse.json(
        { message: 'Stats array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate all stats entries
    for (const stat of stats) {
      if (!stat.playerId) {
        return NextResponse.json(
          { message: 'Each stat entry must have a playerId' },
          { status: 400 }
        );
      }

      const { runs = 0, wickets = 0, catches = 0, runOuts = 0, stumpings = 0 } = stat;
      
      if (runs < 0 || wickets < 0 || catches < 0 || runOuts < 0 || stumpings < 0) {
        return NextResponse.json(
          { message: `Invalid stats for player ${stat.playerId}: all values must be non-negative` },
          { status: 400 }
        );
      }
    }

    // Verify game exists
    const game = await prisma.iPLGame.findUnique({
      where: { id: iplGameId },
      include: {
        team1: true,
        team2: true
      }
    });

    if (!game) {
      return NextResponse.json(
        { message: 'Game not found' },
        { status: 404 }
      );
    }

    // Process all stats in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const createdOrUpdated = [];
      
      for (const stat of stats) {
        const { playerId, runs = 0, wickets = 0, catches = 0, runOuts = 0, stumpings = 0, didNotPlay = false } = stat;
        
        // Calculate points
        const points = (runs * 1) + (wickets * 20) + ((catches + runOuts + stumpings) * 5);
        
        // Check if player exists and is part of the game
        const player = await tx.player.findUnique({
          where: { id: playerId },
          include: { iplTeam: true }
        });

        if (!player) {
          throw new Error(`Player with ID ${playerId} not found`);
        }

        if (player.iplTeam.id !== game.team1.id && player.iplTeam.id !== game.team2.id) {
          throw new Error(`Player ${player.name} is not part of the teams playing in this game`);
        }

        // Check if stats already exist
        const existingStats = await tx.playerStat.findFirst({
          where: {
            iplGameId,
            playerId
          }
        });

        if (existingStats) {
          // Update existing stats
          const updated = await tx.playerStat.update({
            where: { id: existingStats.id },
            data: {
              runs,
              wickets,
              catches,
              runOuts,
              stumpings,
              didNotPlay,
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
          createdOrUpdated.push(updated);
        } else {
          // Create new stats
          const created = await tx.playerStat.create({
            data: {
              iplGameId,
              playerId,
              runs,
              wickets,
              catches,
              runOuts,
              stumpings,
              didNotPlay,
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
          createdOrUpdated.push(created);
        }
      }

      return createdOrUpdated;
    });

    // After stats are entered, update game status to COMPLETED
    // This indicates the game has finished and stats have been recorded
    await prisma.iPLGame.update({
      where: { id: iplGameId },
      data: {
        status: 'COMPLETED'
      }
    });

    return NextResponse.json({
      success: true,
      count: results.length,
      stats: results,
      gameStatusUpdated: true
    });

  } catch (error) {
    console.error('Error creating/updating bulk stats:', error);
    return NextResponse.json(
      { 
        message: 'Failed to process bulk stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
  }
}

// DELETE /api/admin/stats/bulk - Delete multiple player stats
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const statIdsParam = searchParams.get('statIds');

    if (gameId) {
      // Delete all stats for a game
      const result = await prisma.playerStat.deleteMany({
        where: {
          iplGameId: gameId
        }
      });

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.count} stats for game`,
        count: result.count
      });
    } else if (statIdsParam) {
      // Delete specific stats by IDs
      const statIds = statIdsParam.split(',');
      
      const result = await prisma.playerStat.deleteMany({
        where: {
          id: {
            in: statIds
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.count} stats`,
        count: result.count
      });
    } else {
      return NextResponse.json(
        { message: 'Either gameId or statIds parameter is required' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error deleting bulk stats:', error);
    return NextResponse.json(
      { message: 'Failed to delete stats' },
      { status: 500 }
    );
  } finally {
  }
}
