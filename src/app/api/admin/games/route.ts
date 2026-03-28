import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToAll } from '@/lib/pushNotifications';


// GET /api/admin/games - List all IPL games
export async function GET() {
  try {
    const games = await prisma.iPLGame.findMany({
      include: {
        tournament: true,
        team1: true,
        team2: true,
        _count: {
          select: {
            contests: true
          }
        }
      },
      orderBy: {
        gameDate: 'desc'
      }
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { message: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}

// POST /api/admin/games - Create new IPL game
export async function POST(request: NextRequest) {
  try {
    const { tournamentId, title, description, team1Id, team2Id, gameDate, signupDeadline } = await request.json();

    // Validation
    if (!tournamentId || !title || !team1Id || !team2Id || !gameDate || !signupDeadline) {
      return NextResponse.json(
        { message: 'Tournament, title, both teams, game date and signup deadline are required' },
        { status: 400 }
      );
    }

    if (team1Id === team2Id) {
      return NextResponse.json(
        { message: 'Teams must be different' },
        { status: 400 }
      );
    }

    const gameDateTime = new Date(gameDate);
    const signupDateTime = new Date(signupDeadline);
    const now = new Date();

    if (gameDateTime <= now) {
      return NextResponse.json(
        { message: 'Game date must be in the future' },
        { status: 400 }
      );
    }

    if (signupDateTime >= gameDateTime) {
      return NextResponse.json(
        { message: 'Signup deadline must be before game date' },
        { status: 400 }
      );
    }

    // Check if tournament and teams exist
    const [tournament, team1, team2] = await Promise.all([
      prisma.tournament.findUnique({ where: { id: tournamentId } }),
      prisma.iPLTeam.findUnique({ where: { id: team1Id } }),
      prisma.iPLTeam.findUnique({ where: { id: team2Id } })
    ]);

    if (!tournament || !team1 || !team2) {
      return NextResponse.json(
        { message: 'Tournament or one or both teams not found' },
        { status: 404 }
      );
    }

    const game = await prisma.iPLGame.create({
      data: {
        tournamentId,
        title,
        description,
        team1Id,
        team2Id,
        gameDate: gameDateTime,
        signupDeadline: signupDateTime,
        status: signupDateTime > now ? 'UPCOMING' : 'SIGNUP_CLOSED'
      },
      include: {
        tournament: true,
        team1: true,
        team2: true
      }
    });

    // Auto-create contest types for the game
    const contestTypes = [
      { type: 'LOW_STAKES', value: 25 },
      { type: 'REGULAR', value: 50 },
      { type: 'HIGH_ROLLER', value: 100 }
    ];

    await Promise.all(
      contestTypes.map(({ type, value }) =>
        prisma.contest.create({
          data: {
            iplGameId: game.id,
            contestType: type,
            coinValue: value,
            maxParticipants: 100,
            status: 'SIGNUP_OPEN'
          }
        })
      )
    );

    // Notify all subscribed users that contests are open for this game
    const matchupLabel = `${game.team1.shortName || game.team1.name} v ${game.team2.shortName || game.team2.name}`;
    const gameDay = new Date(game.gameDate).toLocaleDateString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
    sendToAll({
      title: `🏏 Contests open: ${matchupLabel}`,
      body: `Sign up now for ${matchupLabel} on ${gameDay}. Pick your wager and compete head-to-head!`,
      icon: '/icon-192.png',
      url: '/dashboard?tab=join',
    }).catch(err => console.error('Push broadcast error (new game):', err));

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { message: 'Failed to create game' },
      { status: 500 }
    );
  }
}