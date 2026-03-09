'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Users, Trophy } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  role: string;
}

interface DraftPick {
  id: string;
  pickOrder: number;
  pickTimestamp: string;
  player: Player;
}

interface User {
  id: string;
  name: string;
  username: string;
}

interface ContestSignup {
  id: string;
  user: User;
}

interface Matchup {
  id: string;
  status: string;
  firstPickUser: string;
  user1Score: number;
  user2Score: number;
  winnerId: string | null;
  user1: ContestSignup;
  user2: ContestSignup;
  draftPicks: DraftPick[];
}

interface Contest {
  id: string;
  contestType: string;
  coinValue: number;
  status: string;
  iplGame: {
    title: string;
    gameDate: string;
    team1: {
      name: string;
      shortName: string;
      color: string;
    };
    team2: {
      name: string;
      shortName: string;
      color: string;
    };
  };
  matchups: Matchup[];
  _count: {
    signups: number;
    matchups: number;
  };
}

export default function ContestMatchupsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatchup, setSelectedMatchup] = useState<string | null>(null);

  useEffect(() => {
    fetchContestDetails();
  }, [id]);

  const fetchContestDetails = async () => {
    try {
      const response = await fetch(`/api/admin/contests/${id}/matchups`);
      if (response.ok) {
        const data = await response.json();
        setContest(data);
      }
    } catch (error) {
      console.error('Error fetching contest details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING_DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFTING': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WAITING_DRAFT': return '⏳';
      case 'DRAFTING': return '✍️';
      case 'COMPLETED': return '✅';
      default: return '❓';
    }
  };

  const getUserPicks = (matchup: Matchup, userSignupId: string) => {
    return matchup.draftPicks
      .filter(pick => pick.pickOrder % 2 === (matchup.user1.id === userSignupId ? 1 : 0))
      .sort((a, b) => a.pickOrder - b.pickOrder);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading contest details...</div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Contest not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <a
                href="/admin/contests"
                className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Contests
              </a>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-400 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Contest Matchups</h1>
                  <div className="text-purple-100 text-sm">{contest.iplGame.title}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Contest Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Contest Type</div>
              <div className="text-lg font-semibold text-blue-600">{contest.coinValue} Coins/Point</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="text-lg font-semibold text-gray-900">{contest.status.replace('_', ' ')}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Participants</div>
              <div className="text-lg font-semibold text-gray-900">{contest._count.signups} signups</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Matchups</div>
              <div className="text-lg font-semibold text-gray-900">{contest._count.matchups} total</div>
            </div>
          </div>
        </div>

        {/* Matchups List */}
        {contest.matchups.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Matchups Yet</h3>
            <p className="text-gray-500">Close signups to generate matchups for this contest.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contest.matchups.map((matchup, index) => {
              const user1Picks = getUserPicks(matchup, matchup.user1.id);
              const user2Picks = getUserPicks(matchup, matchup.user2.id);
              const isExpanded = selectedMatchup === matchup.id;

              return (
                <div key={matchup.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {/* Matchup Header */}
                  <div 
                    className="p-4 bg-gradient-to-r from-gray-50 to-white border-b cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setSelectedMatchup(isExpanded ? null : matchup.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                        
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{matchup.user1.user.name}</div>
                            <div className="text-sm text-gray-600">@{matchup.user1.user.username}</div>
                            {matchup.firstPickUser === 'user1' && (
                              <div className="text-xs text-blue-600 mt-1">⚡ First Pick</div>
                            )}
                          </div>
                          
                          <div className="text-2xl font-bold text-gray-300">VS</div>
                          
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{matchup.user2.user.name}</div>
                            <div className="text-sm text-gray-600">@{matchup.user2.user.username}</div>
                            {matchup.firstPickUser === 'user2' && (
                              <div className="text-xs text-blue-600 mt-1">⚡ First Pick</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(matchup.status)}`}>
                            {getStatusIcon(matchup.status)} {matchup.status.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {matchup.draftPicks.length}/10 picks
                          </div>
                        </div>
                        <div className="text-gray-400">
                          {isExpanded ? '▲' : '▼'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Draft Details */}
                  {isExpanded && (
                    <div className="p-6 bg-gray-50">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* User 1 Picks */}
                        <div className="bg-white rounded-lg p-4">
                          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                              1
                            </div>
                            {matchup.user1.user.name}
                          </h3>
                          <div className="space-y-2">
                            {user1Picks.length === 0 ? (
                              <div className="text-sm text-gray-500 italic">No picks yet</div>
                            ) : (
                              user1Picks.map(pick => (
                                <div key={pick.id} className="flex items-center gap-3 p-2 bg-blue-50 rounded">
                                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {pick.pickOrder}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm text-gray-900">{pick.player.name}</div>
                                    <div className="text-xs text-gray-600">{pick.player.role}</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* User 2 Picks */}
                        <div className="bg-white rounded-lg p-4">
                          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900">
                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                              2
                            </div>
                            {matchup.user2.user.name}
                          </h3>
                          <div className="space-y-2">
                            {user2Picks.length === 0 ? (
                              <div className="text-sm text-gray-500 italic">No picks yet</div>
                            ) : (
                              user2Picks.map(pick => (
                                <div key={pick.id} className="flex items-center gap-3 p-2 bg-purple-50 rounded">
                                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {pick.pickOrder}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm text-gray-900">{pick.player.name}</div>
                                    <div className="text-xs text-gray-600">{pick.player.role}</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
