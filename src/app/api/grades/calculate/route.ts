import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Grade thresholds
const GRADE_THRESHOLDS = {
  'A+': 75,
  'A': 60,
  'B': 45,
  'C': 30,
  'D': 15,
  'E': 0
};

function calculateGrade(score: number): string {
  if (score >= GRADE_THRESHOLDS['A+']) return 'A+';
  if (score >= GRADE_THRESHOLDS['A']) return 'A';
  if (score >= GRADE_THRESHOLDS['B']) return 'B';
  if (score >= GRADE_THRESHOLDS['C']) return 'C';
  if (score >= GRADE_THRESHOLDS['D']) return 'D';
  return 'E';
}

// GET /api/grades/calculate - Calculate grades for all players based on recent performance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iplGameId = searchParams.get('iplGameId');

    if (!iplGameId) {
      return NextResponse.json(
        { message: 'iplGameId is required' },
        { status: 400 }
      );
    }

    // Get the game to find its tournament
    const game = await prisma.iPLGame.findUnique({
      where: { id: iplGameId },
      include: { tournament: true }
    });

    if (!game) {
      return NextResponse.json(
        { message: 'Game not found' },
        { status: 404 }
      );
    }

    // Get all players in this tournament
    const players = await prisma.player.findMany({
      where: { tournamentId: game.tournamentId },
      include: {
        iplTeam: true
      }
    });

    // Get all completed games in this tournament (up to the current game)
    const completedGames = await prisma.iPLGame.findMany({
      where: {
        tournamentId: game.tournamentId,
        gameDate: {
          lte: game.gameDate // Only consider games before or on this game's date
        },
        status: 'COMPLETED' // Only completed games have stats
      },
      include: {
        team1: { select: { shortName: true } },
        team2: { select: { shortName: true } }
      },
      orderBy: {
        gameDate: 'desc' // Most recent first
      }
    });

    const completedGameIds = completedGames.map(g => g.id);

    // Get all player stats for completed games
    const allStats = await prisma.playerStat.findMany({
      where: {
        iplGameId: { in: completedGameIds }
      },
      include: {
        player: true
      },
      orderBy: [
        { iplGameId: 'desc' }
      ]
    });

    // Calculate grades for each player
    const playerGrades = players.map(player => {
      // Get this player's stats from completed games
      const playerStats = allStats
        .filter(stat => stat.playerId === player.id)
        .sort((a, b) => {
          // Sort by game date (most recent first)
          const gameA = completedGames.find(g => g.id === a.iplGameId);
          const gameB = completedGames.find(g => g.id === b.iplGameId);
          if (!gameA || !gameB) return 0;
          return gameB.gameDate.getTime() - gameA.gameDate.getTime();
        })
        .slice(0, 5); // Take only last 5 matches

      // If no stats, return default grade
      if (playerStats.length === 0) {
        return {
          playerId: player.id,
          playerName: player.name,
          teamName: player.iplTeam.shortName,
          role: player.role,
          matchesPlayed: 0,
          matchesAppeared: 0,
          weightedScore: 0,
          grade: 'N/A',
          recentMatches: []
        };
      }

      // Build recentMatches for display (includes DNPs so the ℹ modal shows them)
      const recentMatches = playerStats.map((stat, index) => {
        const matchGame = completedGames.find(g => g.id === stat.iplGameId);
        const opponent = matchGame
          ? (matchGame.team1Id === player.iplTeamId ? matchGame.team2.shortName : matchGame.team1.shortName)
          : 'Unknown';
        const date = matchGame
          ? matchGame.gameDate.toISOString().split('T')[0]
          : '';

        return {
          gameId: stat.iplGameId,
          points: stat.points,
          didNotPlay: stat.didNotPlay,
          weight: 0, // filled below for played games
          weightedPoints: 0,
          opponent,
          date
        };
      });

      // Weighted average uses only games the player actually played (DNP excluded)
      const playedStats = playerStats.filter(s => !s.didNotPlay);
      const weights = [5, 4, 3, 2, 1];
      let totalWeightedScore = 0;
      let totalWeight = 0;

      playedStats.forEach((stat, index) => {
        const weight = weights[index] || 1;
        totalWeightedScore += stat.points * weight;
        totalWeight += weight;

        // Back-fill weight into recentMatches for the modal
        const rm = recentMatches.find(r => r.gameId === stat.iplGameId);
        if (rm) { rm.weight = weight; rm.weightedPoints = stat.points * weight; }
      });

      const weightedScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
      const grade = calculateGrade(weightedScore);

      return {
        playerId: player.id,
        playerName: player.name,
        teamName: player.iplTeam.shortName,
        role: player.role,
        matchesPlayed: playedStats.length,       // games actually played (used for avg)
        matchesAppeared: playerStats.length,     // total squad appearances incl. DNP
        weightedScore: Math.round(weightedScore),
        grade: grade,
        recentMatches: recentMatches
      };
    });

    // Sort by weighted score (highest first)
    playerGrades.sort((a, b) => b.weightedScore - a.weightedScore);

    return NextResponse.json({
      success: true,
      gameId: iplGameId,
      gameName: game.title,
      totalPlayers: players.length,
      playersWithStats: playerGrades.filter(p => p.matchesPlayed > 0).length,
      grades: playerGrades
    });

  } catch (error) {
    console.error('Error calculating grades:', error);
    return NextResponse.json(
      { message: 'Failed to calculate grades', error: String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
