import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// GET /api/admin/contests/[id]/matchups
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        iplGame: {
          include: {
            team1: true,
            team2: true
          }
        },
        matchups: {
          include: {
            user1: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true
                  }
                }
              }
            },
            user2: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true
                  }
                }
              }
            },
            draftPicks: {
              include: {
                player: {
                  select: {
                    id: true,
                    name: true,
                    role: true
                  }
                }
              },
              orderBy: {
                pickOrder: 'asc'
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        _count: {
          select: {
            signups: true,
            matchups: true
          }
        }
      }
    });

    if (!contest) {
      return NextResponse.json(
        { message: 'Contest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(contest);

  } catch (error) {
    console.error('Error fetching contest matchups:', error);
    return NextResponse.json(
      { message: 'Failed to fetch contest matchups' },
      { status: 500 }
    );
  }
}
