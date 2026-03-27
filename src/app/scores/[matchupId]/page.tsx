'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { calculateFinalLineup, calculateTotalPointsWithSwap } from '@/lib/benchSwapUtils';

interface Player {
  id: string;
  name: string;
  role: string;
  iplTeam: {
    name: string;
    shortName: string;
    color: string;
  };
  stats: {
    iplGameId: string;
    didNotPlay: boolean;
    points: number;
    runs: number;
    wickets: number;
    catches: number;
    runOuts: number;
    stumpings: number;
  }[];
}

interface DraftPick {
  id: string;
  playerId: string;
  pickOrder: number;
  player: Player;
  pickedByUserId: string;
  isBench: boolean;
}

interface User {
  id: string;
  name: string;
  username: string;
}

interface Matchup {
  id: string;
  status: string;
  firstPickUser: string;
  user1: {
    id: string;
    user: User;
  };
  user2: {
    id: string;
    user: User;
  };
  contest: {
    id: string;
    contestType: string;
    coinValue: number;
    iplGame: {
      id: string;
      title: string;
      gameDate: string;
      team1: {
        id: string;
        name: string;
        shortName: string;
        color: string;
      };
      team2: {
        id: string;
        name: string;
        shortName: string;
        color: string;
      };
    };
  };
  draftPicks: DraftPick[];
}

export default function ScoresPage({ params }: { params: Promise<{ matchupId: string }> }) {
  const { matchupId } = use(params);
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState<{ player: Player; pickOrder: number } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    fetchMatchupDetails();
  }, [matchupId]);

  const fetchMatchupDetails = async () => {
    try {
      const response = await fetch(`/api/draft/${matchupId}`);
      if (response.ok) {
        const data = await response.json();
        setMatchup(data.matchup);
      }
    } catch (error) {
      console.error('Error fetching matchup:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading scores...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Please login to view scores</div>
          <a href="/login" className="text-primary-600 underline">Go to Login</a>
        </div>
      </div>
    );
  }

  if (!matchup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Matchup not found</div>
          <a href="/dashboard" className="text-primary-600 underline">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  const isUser1 = matchup.user1.user.id === currentUser.id;
  const isUser2 = matchup.user2.user.id === currentUser.id;
  
  if (!isUser1 && !isUser2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">You are not part of this matchup</div>
          <a href="/dashboard" className="text-primary-600 underline">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  const mySignupId = isUser1 ? matchup.user1.id : matchup.user2.id;
  const opponentSignupId = isUser1 ? matchup.user2.id : matchup.user1.id;
  const opponent = isUser1 ? matchup.user2.user : matchup.user1.user;

  const myPicks = matchup.draftPicks.filter(p => p.pickedByUserId === mySignupId);
  const opponentPicks = matchup.draftPicks.filter(p => p.pickedByUserId === opponentSignupId);

  // Calculate total points using bench swap logic
  const gameId = matchup.contest.iplGame.id;
  const myTotalPoints = calculateTotalPointsWithSwap(myPicks, gameId);
  const opponentTotalPoints = calculateTotalPointsWithSwap(opponentPicks, gameId);

  // Get final lineups with bench swaps applied
  const { finalLineup: myFinalLineup, benchPlayers: myBenchPlayers } = calculateFinalLineup(myPicks, gameId);
  const { finalLineup: opponentFinalLineup, benchPlayers: opponentBenchPlayers } = calculateFinalLineup(opponentPicks, gameId);

  const didIWin = myTotalPoints > opponentTotalPoints;
  const isTie = myTotalPoints === opponentTotalPoints;
  
  // Check if any player has stats entered (not just if scores > 0)
  const hasAnyStats = matchup.draftPicks.some(pick => {
    const playerStats = pick.player.stats.find((s: any) => s.iplGameId === gameId);
    return playerStats !== undefined;
  });
  const hasScores = hasAnyStats; // Show scores as soon as any stats are entered

  // Helper function to render a player card
  const renderPlayerCard = (pick: any, isActive: boolean, swappedFor?: string, isSwapped?: boolean, swappedOut?: boolean, replacedBy?: string) => {
    const gameId = matchup.contest.iplGame.id;
    const playerStats = pick.player.stats.find((s: any) => s.iplGameId === gameId);
    const playerPoints = playerStats?.points || 0;
    const didNotPlay = playerStats?.didNotPlay || false;
    
    return (
      <div 
        key={pick.id} 
        className={`group relative rounded-xl p-4 transition-all ${
          isActive 
            ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-white border-2 border-green-300' 
            : 'bg-gradient-to-br from-gray-100 to-gray-50 border-2 border-gray-300 opacity-75'
        }`}
      >
        {isSwapped && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            SWAPPED IN
          </div>
        )}
        {swappedOut && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            BENCHED
          </div>
        )}
        {didNotPlay && !isActive && !swappedOut && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            DNP
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg ${
              isActive ? 'bg-gradient-to-br from-cricket-600 to-green-800' : 'bg-gray-400'
            }`}>
              {pick.pickOrder}
            </div>
            <div className="flex-1">
              <div className={`font-bold text-lg mb-1 ${isActive ? 'text-black' : 'text-gray-600'}`}>
                {pick.player.name}
                {isSwapped && swappedFor && (
                  <span className="text-xs text-blue-600 block">
                    (replacing {swappedFor})
                  </span>
                )}
                {swappedOut && replacedBy && (
                  <span className="text-xs text-orange-600 block">
                    (replaced by {replacedBy})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  isActive ? 'bg-green-200 text-black' : 'bg-gray-200 text-gray-600'
                }`}>
                  {pick.player.role}
                </span>
                <span 
                  className="text-xs font-bold px-2 py-1 rounded border-2" 
                  style={{ 
                    backgroundColor: pick.player.iplTeam.color + '15', 
                    color: 'black',
                    borderColor: pick.player.iplTeam.color + '60'
                  }}
                >
                  {pick.player.iplTeam.shortName}
                </span>
                {pick.isBench && (
                  <span className="text-xs font-bold bg-orange-200 text-orange-800 px-2 py-1 rounded">
                    BENCH
                  </span>
                )}
              </div>
            </div>
          </div>
          {playerPoints > 0 && isActive && (
            <button
              onClick={() => setSelectedPlayerStats({ player: pick.player, pickOrder: pick.pickOrder })}
              className="text-lg font-black text-black bg-gradient-to-r from-cricket-300 to-green-300 px-3 py-2 rounded shadow-md border-2 border-green-700 hover:scale-105 transition-transform cursor-pointer"
            >
              ⭐ {playerPoints.toFixed(1)}
            </button>
          )}
          {!isActive && playerPoints > 0 && (
            <div className="text-sm font-bold text-gray-500 px-3 py-2">
              {playerPoints.toFixed(1)} pts (not counted)
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <div className="bg-white border-b-4 border-cricket-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="flex items-center gap-2 text-black hover:text-cricket-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-semibold">Back to Dashboard</span>
              </a>
              <div className="w-px h-8 bg-black/30"></div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-black">🏏 Contest Scores</h1>
                <div className="text-gray-800 text-sm mt-1">{matchup.contest.iplGame.title}</div>
              </div>
            </div>
            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="bg-gradient-to-r from-secondary-500 to-orange-600 px-6 py-3 rounded-xl shadow-lg border-2 border-black/30">
                <div className="text-primary-800 text-xs font-semibold uppercase tracking-wider">Contest Type</div>
                <div className="text-primary-800 font-black text-2xl">{matchup.contest.coinValue} COINS</div>
              </div>
              <div className="text-black text-xs font-medium">Head-to-Head</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Matchup Info */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <div className="text-sm font-semibold text-black uppercase tracking-wide mb-2">Your Team</div>
              <div className="text-xl font-bold text-black">{currentUser.name}</div>
              <div className="text-sm text-black mt-1">@{currentUser.username}</div>
            </div>
            <div className="text-center flex items-center justify-center">
              <div className="text-4xl font-bold text-secondary-400">VS</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg">
              <div className="text-sm font-semibold text-black uppercase tracking-wide mb-2">Opponent</div>
              <div className="text-xl font-bold text-black">{opponent.name}</div>
              <div className="text-sm text-black mt-1">@{opponent.username}</div>
            </div>
          </div>
        </div>

        {hasScores && (
          <div className={`rounded-xl p-6 mb-6 shadow-lg ${
            isTie ? 'bg-gradient-to-r from-gray-500 to-gray-600' :
            didIWin ? 'bg-gradient-to-r from-green-500 to-green-600' :
            'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            <div className="text-center">
              <p className="text-white font-bold text-3xl mb-3 flex items-center justify-center gap-2">
                {isTie ? '🤝 Tie Game!' : didIWin ? '🎉 You Won!' : '😔 You Lost'}
              </p>
              {!isTie && (
                <>
                  <div className="mb-4">
                    <div className="text-white/90 text-sm mb-1">Victory Margin</div>
                    <div className="text-white font-black text-5xl">
                      {didIWin ? '+' : ''}{(myTotalPoints - opponentTotalPoints).toFixed(1)}
                    </div>
                    <div className="text-white/90 text-xs mt-1">Fantasy Points</div>
                  </div>
                  {/* Coins Won/Lost */}
                  <div className="mb-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg border-2 border-white/30">
                    <div className="text-white/90 text-sm mb-2">Coins Impact</div>
                    <div className={`text-white font-black text-4xl ${
                      didIWin ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : ''
                    }`}>
                      {didIWin ? '+' : '-'}{Math.abs((myTotalPoints - opponentTotalPoints) * matchup.contest.coinValue).toFixed(0)}
                      <span className="text-2xl ml-2">🪙</span>
                    </div>
                    <div className="text-white/90 text-xs mt-2">
                      {Math.abs(myTotalPoints - opponentTotalPoints).toFixed(1)} points × {matchup.contest.coinValue} coins/point
                    </div>
                  </div>
                </>
              )}
              <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-white/30">
                <div className="text-center">
                  <div className="text-white/90 text-sm mb-1">Your Score</div>
                  <div className="text-white font-black text-3xl">⭐ {myTotalPoints.toFixed(1)}</div>
                </div>
                <div className="text-white text-2xl font-bold">vs</div>
                <div className="text-center">
                  <div className="text-white/90 text-sm mb-1">Opponent Score</div>
                  <div className="text-white font-black text-3xl">⭐ {opponentTotalPoints.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!hasScores && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
            <p className="text-center text-yellow-800 font-semibold">
              ⏳ Player scores will be available once the game is complete and stats are updated
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Your Team */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-green-800">Your Team</h3>
              <span className="bg-green-800 text-white px-3 py-1 rounded-full font-bold text-sm">
                5 Starters + 2 Bench
              </span>
            </div>
            
            {myTotalPoints > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-cricket-500 to-green-600 rounded-xl">
                <div className="text-center">
                  <div className="text-black text-xs font-semibold uppercase tracking-wider opacity-90 mb-1">Total Score (Active Players Only)</div>
                  <div className="text-black font-black text-3xl">⭐ {myTotalPoints.toFixed(1)}</div>
                  <div className="text-black/90 text-xs mt-1">Fantasy Points</div>
                </div>
              </div>
            )}

            {/* Starting Lineup */}
            <div className="mb-6">
              <h4 className="font-bold text-lg text-green-800 mb-3 flex items-center gap-2">
                🏏 Active Lineup
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Counts toward score
                </span>
              </h4>
              <div className="space-y-3">
                {myFinalLineup.map((player: any) => 
                  renderPlayerCard(player, true, player.swappedFor, player.isSwapped)
                )}
              </div>
            </div>

            {/* Bench Players */}
            <div>
              <h4 className="font-bold text-lg text-gray-600 mb-3 flex items-center gap-2">
                🪑 Bench Players
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  Backup only
                </span>
              </h4>
              <div className="space-y-3">
                {myBenchPlayers.length > 0 ? (
                  myBenchPlayers.map((pick: any) => 
                    renderPlayerCard(pick, false, undefined, false, pick.swappedOut, pick.replacedBy)
                  )
                ) : (
                  <div className="text-gray-500 text-sm italic p-4 bg-gray-50 rounded-lg">
                    All bench players are in use
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Opponent Team */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-red-800">Opponent Team</h3>
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold text-sm">
                5 Starters + 2 Bench
              </span>
            </div>
            
            {opponentTotalPoints > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-cricket-500 to-red-600 rounded-xl">
                <div className="text-center">
                  <div className="text-black text-xs font-semibold uppercase tracking-wider opacity-90 mb-1">Total Score (Active Players Only)</div>
                  <div className="text-black font-black text-3xl">⭐ {opponentTotalPoints.toFixed(1)}</div>
                  <div className="text-black/90 text-xs mt-1">Fantasy Points</div>
                </div>
              </div>
            )}

            {/* Starting Lineup */}
            <div className="mb-6">
              <h4 className="font-bold text-lg text-red-800 mb-3 flex items-center gap-2">
                🏏 Active Lineup
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                  Counts toward score
                </span>
              </h4>
              <div className="space-y-3">
                {opponentFinalLineup.map((player: any) => 
                  renderPlayerCard(player, true, player.swappedFor, player.isSwapped)
                )}
              </div>
            </div>

            {/* Bench Players */}
            <div>
              <h4 className="font-bold text-lg text-gray-600 mb-3 flex items-center gap-2">
                🪑 Bench Players
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  Backup only
                </span>
              </h4>
              <div className="space-y-3">
                {opponentBenchPlayers.length > 0 ? (
                  opponentBenchPlayers.map((pick: any) => 
                    renderPlayerCard(pick, false, undefined, false, pick.swappedOut, pick.replacedBy)
                  )
                ) : (
                  <div className="text-gray-500 text-sm italic p-4 bg-gray-50 rounded-lg">
                    All bench players are in use
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Breakdown Modal */}
        {selectedPlayerStats && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPlayerStats(null)}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cricket-600 to-green-800 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg">
                    {selectedPlayerStats.pickOrder}
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-black">{selectedPlayerStats.player.name}</h3>
                    <p className="text-sm text-gray-600">{selectedPlayerStats.player.iplTeam.shortName} • {selectedPlayerStats.player.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlayerStats(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {selectedPlayerStats.player.stats && selectedPlayerStats.player.stats.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-cricket-500 to-green-600 rounded-lg p-4 text-center">
                    <div className="text-white text-sm font-semibold uppercase tracking-wider opacity-90 mb-1">Total Points</div>
                    <div className="text-white font-black text-3xl">⭐ {selectedPlayerStats.player.stats[0].points.toFixed(1)}</div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-3">Performance Breakdown</h4>
                    
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">🏏 Runs Scored</span>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-black">{selectedPlayerStats.player.stats[0].runs}</span>
                        <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded min-w-[70px] text-right">+{(selectedPlayerStats.player.stats[0].runs * 1).toFixed(1)} pts</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">🎯 Wickets Taken</span>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-black">{selectedPlayerStats.player.stats[0].wickets}</span>
                        <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded min-w-[70px] text-right">+{(selectedPlayerStats.player.stats[0].wickets * 20).toFixed(1)} pts</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">🧤 Catches</span>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-black">{selectedPlayerStats.player.stats[0].catches}</span>
                        <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded min-w-[70px] text-right">+{(selectedPlayerStats.player.stats[0].catches * 5).toFixed(1)} pts</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">🏃 Run Outs</span>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-black">{selectedPlayerStats.player.stats[0].runOuts}</span>
                        <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded min-w-[70px] text-right">+{(selectedPlayerStats.player.stats[0].runOuts * 5).toFixed(1)} pts</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-semibold text-gray-700">🥊 Stumpings</span>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-black">{selectedPlayerStats.player.stats[0].stumpings}</span>
                        <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded min-w-[70px] text-right">+{(selectedPlayerStats.player.stats[0].stumpings * 5).toFixed(1)} pts</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 text-center mt-4">
                    Points: Runs (1pt), Wickets (20pts), Catches/RunOuts/Stumpings (5pts each)
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No stats available
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
