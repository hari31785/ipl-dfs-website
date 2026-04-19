'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, RefreshCw } from 'lucide-react';
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
    status: string;
    iplGame: {
      id: string;
      title: string;
      gameDate: string;
      status: string;
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
  const searchParams = useSearchParams();
  const fromTab = searchParams.get('from'); // 'active' | 'drafted' | 'completed' | null

  const backHref =
    fromTab === 'spectate'  ? '/dashboard?tab=spectate' :
    `/dashboard?tab=my-contests&sub=${fromTab || 'active'}`;
  const backLabel =
    fromTab === 'spectate'  ? 'Back to Spectate' :
    fromTab === 'completed' ? 'Back to Completed Contests' :
    fromTab === 'drafted'   ? 'Back to Drafted Contests' :
    fromTab === 'active'    ? 'Back to Active Contests' :
                              'Back to Dashboard';
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState<{ player: Player; pickOrder: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [playerStatsMap, setPlayerStatsMap] = useState<Record<string, { points: number; runs: number; wickets: number; catches: number; didNotPlay: boolean; runOuts: number; stumpings: number }>>({});

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMatchupDetails();
    setIsRefreshing(false);
  };

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
        // Fetch stats from the cached endpoint (separate from the poll route)
        const gameId = data.matchup?.contest?.iplGame?.id;
        if (gameId) {
          fetch(`/api/draft/stats/${gameId}`)
            .then(r => r.ok ? r.json() : {})
            .then(map => setPlayerStatsMap(map))
            .catch(() => {});
        }
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
  const isSpectator = !isUser1 && !isUser2;

  // For participants: my side = their signup; for spectators: user1 = left, user2 = right
  const mySignupId = isSpectator ? matchup.user1.id : (isUser1 ? matchup.user1.id : matchup.user2.id);
  const opponentSignupId = isSpectator ? matchup.user2.id : (isUser1 ? matchup.user2.id : matchup.user1.id);
  const opponent = isSpectator ? matchup.user2.user : (isUser1 ? matchup.user2.user : matchup.user1.user);

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
  
  // Check if any player has stats entered
  const hasAnyStats = matchup.draftPicks.some(pick => playerStatsMap[pick.player.id] !== undefined);
  const hasScores = hasAnyStats;

  // Helper function to render a player card
  const gameIsCompleted = matchup.contest.iplGame.status === 'COMPLETED';

  const renderPlayerCard = (pick: any, isActive: boolean, swappedFor?: string, isSwapped?: boolean, swappedOut?: boolean, replacedBy?: string) => {
    const gameId = matchup.contest.iplGame.id;
    const playerStats = playerStatsMap[pick.player.id];
    const playerPoints = playerStats?.points || 0;
    const didNotPlay = playerStats?.didNotPlay || false;
    const showScoreBadge = (!!playerStats && !didNotPlay) || (!playerStats && gameIsCompleted);

    // Status label: only one can be true at a time
    const statusLabel = isSwapped ? '↑SWAP' : swappedOut ? '↓BENCH' : (didNotPlay && !isActive && !swappedOut) ? 'DNP' : null;
    const statusColor = isSwapped ? 'bg-blue-500' : swappedOut ? 'bg-orange-500' : 'bg-red-500';

    return (
      <div
        key={pick.id}
        className={`flex items-center gap-1.5 rounded-lg p-1.5 sm:p-3 ${
          isActive
            ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-white border-2 border-green-300'
            : 'bg-gray-50 border-2 border-gray-200 opacity-75'
        }`}
      >
        {/* Pick number */}
        <div className={`w-5 h-5 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white font-black text-[9px] sm:text-sm shadow shrink-0 ${
          isActive ? 'bg-gradient-to-br from-cricket-600 to-green-800' : 'bg-gray-400'
        }`}>
          {pick.pickOrder}
        </div>

        {/* Name (row 1) + role/team badges (row 2) */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + score side by side */}
          <div className="flex items-center gap-1 justify-between">
            <div className={`font-bold text-[10px] sm:text-sm leading-tight truncate flex-1 min-w-0 ${isActive ? 'text-black' : 'text-gray-500'}`}>
              {pick.player.name}
            </div>
            {showScoreBadge && isActive ? (
              <button
                onClick={() => playerStats && setSelectedPlayerStats({ player: pick.player, pickOrder: pick.pickOrder })}
                className={`shrink-0 text-[9px] sm:text-sm font-black text-black bg-gradient-to-r from-cricket-300 to-green-300 px-1 sm:px-3 py-0 sm:py-1.5 rounded shadow border border-green-700 ${playerStats ? 'cursor-pointer' : 'cursor-default'}`}
              >
                ⭐{playerPoints.toFixed(1)}
              </button>
            ) : showScoreBadge && !isActive ? (
              <span className="shrink-0 text-[9px] sm:text-xs font-bold text-gray-400">{playerPoints.toFixed(1)}</span>
            ) : null}
          </div>
          {/* Row 2: role + team + status — no score competition */}
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[8px] sm:text-[10px] font-semibold px-1 py-0 rounded ${isActive ? 'bg-green-200 text-black' : 'bg-gray-200 text-gray-500'}`}>
              {pick.player.role}
            </span>
            <span className="text-[8px] sm:text-[10px] font-semibold px-1 py-0 rounded border"
              style={{ backgroundColor: pick.player.iplTeam.color + '20', color: 'black', borderColor: pick.player.iplTeam.color + '60' }}>
              {pick.player.iplTeam.shortName}
            </span>
            {statusLabel && (
              <span className={`text-[8px] sm:text-[10px] font-bold px-1 py-0 rounded text-white ${statusColor}`}>
                {statusLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <div className="bg-white border-b-4 border-cricket-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5 sm:py-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <a
                href={backHref}
                className="flex items-center gap-1.5 text-black hover:text-cricket-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold text-sm sm:text-base">{backLabel}</span>
              </a>
              <div className="w-px h-6 sm:h-8 bg-black/30"></div>
              <div>
                <h1 className="text-base sm:text-2xl md:text-3xl font-bold text-black">🏏 Contest Scores</h1>
                <div className="text-gray-800 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate max-w-[180px] sm:max-w-none">{matchup.contest.iplGame.title}</div>
                <div className="flex items-center gap-1.5 mt-0.5 md:hidden">
                  <span className="bg-secondary-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded">
                    {matchup.contest.coinValue}🪙
                  </span>
                  <span className="text-[10px] font-semibold text-gray-600">
                    {matchup.contest.contestType === 'HIGH_ROLLER' ? 'High Roller' :
                     matchup.contest.contestType === 'REGULAR' ? 'Regular' :
                     matchup.contest.contestType === 'LOW_STAKES' ? 'Low Stakes' :
                     matchup.contest.contestType}
                  </span>
                </div>
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
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-3 py-2 sm:p-6 mb-4 sm:mb-6">
          {isSpectator && (
            <div className="flex justify-center mb-2 sm:mb-4">
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                👁 Spectating — Read Only
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 sm:grid sm:grid-cols-3 sm:gap-6">
            <div className="flex-1 text-center py-2 px-2 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <div className="text-[10px] sm:text-sm font-semibold text-black uppercase tracking-wide mb-0.5 sm:mb-2">
                {isSpectator ? 'Player 1' : 'You'}
              </div>
              <div className="text-sm sm:text-xl font-bold text-black truncate">
                {isSpectator ? matchup.user1.user.name : currentUser.name}
              </div>
              <div className="text-[10px] sm:text-sm text-black mt-0 sm:mt-1 truncate">
                @{isSpectator ? matchup.user1.user.username : currentUser.username}
              </div>
            </div>
            <div className="text-center flex items-center justify-center shrink-0 px-1">
              <div className="text-xl sm:text-4xl font-bold text-secondary-400">VS</div>
            </div>
            <div className="flex-1 text-center py-2 px-2 sm:p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg">
              <div className="text-[10px] sm:text-sm font-semibold text-black uppercase tracking-wide mb-0.5 sm:mb-2">
                {isSpectator ? 'Player 2' : 'Opponent'}
              </div>
              <div className="text-sm sm:text-xl font-bold text-black truncate">{opponent.name}</div>
              <div className="text-[10px] sm:text-sm text-black mt-0 sm:mt-1 truncate">@{opponent.username}</div>
            </div>
          </div>
        </div>

        {/* Victory/Result Banner - Only show for completed games, not for live/active games */}
        {hasScores && matchup.contest.status === 'COMPLETED' && (
          <div className={`rounded-lg px-3 py-2 sm:p-4 mb-3 sm:mb-4 shadow-md ${
            isTie ? 'bg-gradient-to-r from-gray-500 to-gray-600' :
            didIWin ? 'bg-gradient-to-r from-green-500 to-green-600' :
            'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            {/* Row 1: Result label + scores */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-white font-bold text-base sm:text-xl flex items-center gap-1 shrink-0">
                {isTie
                  ? '🤝 Tie!'
                  : isSpectator
                    ? (didIWin ? `🏆 ${matchup.user1.user.name} Wins!` : `🏆 ${matchup.user2.user.name} Wins!`)
                    : (didIWin ? '🎉 You Won!' : '😔 You Lost')}
              </p>
              <div className="flex items-center gap-2">
                <div className="text-white font-black text-sm sm:text-xl">⭐ {myTotalPoints.toFixed(1)}</div>
                <div className="text-white/70 text-xs font-bold">vs</div>
                <div className="text-white font-black text-sm sm:text-xl">⭐ {opponentTotalPoints.toFixed(1)}</div>
              </div>
            </div>
            {/* Row 2: Victory Margin + Coins Impact */}
            {!isTie && (
              <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-white/30">
                <div className="flex items-center gap-1.5">
                  <div className="text-white/70 text-[10px]">Margin</div>
                  <div className="text-white font-black text-sm sm:text-2xl">
                    {didIWin ? '+' : ''}{(myTotalPoints - opponentTotalPoints).toFixed(1)}
                  </div>
                </div>
                {!isSpectator && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/10 rounded border border-white/30">
                    <div className="text-white/70 text-[10px]">Coins</div>
                    <div className={`text-white font-black text-sm sm:text-2xl ${didIWin ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`}>
                      {didIWin ? '+' : '-'}{Math.abs((myTotalPoints - opponentTotalPoints) * matchup.contest.coinValue).toFixed(0)}🪙
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!hasScores && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
            <p className="text-center text-yellow-800 font-semibold">
              ⏳ Player scores will be available once the game is complete and stats are updated
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:gap-6">
          {/* Your Team */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-1">
              <h3 className="font-bold text-sm sm:text-xl text-green-800">
                {isSpectator ? `${matchup.user1.user.name}'s Team` : 'Your Team'}
              </h3>
              <span className="hidden sm:inline bg-green-800 text-white px-3 py-1 rounded-full font-bold text-sm">
                5 Starters + 2 Bench
              </span>
            </div>
            
            {myTotalPoints > 0 && (
              <div className="mb-3 sm:mb-4 p-2 sm:p-4 bg-gradient-to-r from-cricket-500 to-green-600 rounded-lg sm:rounded-xl">
                <div className="text-center">
                  <div className="hidden sm:block text-black text-xs font-semibold uppercase tracking-wider opacity-90 mb-1">Total Score (Active Players Only)</div>
                  <div className="text-black font-black text-xl sm:text-3xl">⭐ {myTotalPoints.toFixed(1)}</div>
                  <div className="text-black/90 text-[10px] sm:text-xs mt-0.5">pts</div>
                </div>
              </div>
            )}

            {/* Starting Lineup */}
            <div className="mb-3 sm:mb-6">
              <h4 className="font-bold text-xs sm:text-lg text-green-800 mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
                🏏 <span className="hidden sm:inline">Active </span>Lineup
                <span className="hidden sm:inline text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Counts toward score
                </span>
              </h4>
              <div className="space-y-1.5 sm:space-y-3">
                {myFinalLineup.map((player: any) => 
                  renderPlayerCard(player, true, player.swappedFor, player.isSwapped)
                )}
              </div>
            </div>

            {/* Bench Players */}
            <div>
              <h4 className="font-bold text-xs sm:text-lg text-gray-600 mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
                🪑 Bench
                <span className="hidden sm:inline text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  Backup only
                </span>
              </h4>
              <div className="space-y-1.5 sm:space-y-3">
                {myBenchPlayers.length > 0 ? (
                  myBenchPlayers.map((pick: any) => 
                    renderPlayerCard(pick, false, undefined, false, pick.swappedOut, pick.replacedBy)
                  )
                ) : (
                  <div className="text-gray-500 text-xs italic p-2 sm:p-4 bg-gray-50 rounded-lg">
                    All bench in use
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Opponent Team */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-1">
              <h3 className="font-bold text-sm sm:text-xl text-red-800">
                {isSpectator ? `${matchup.user2.user.name}'s Team` : 'Opponent'}
              </h3>
              <span className="hidden sm:inline bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold text-sm">
                5 Starters + 2 Bench
              </span>
            </div>
            
            {opponentTotalPoints > 0 && (
              <div className="mb-3 sm:mb-4 p-2 sm:p-4 bg-gradient-to-r from-cricket-500 to-red-600 rounded-lg sm:rounded-xl">
                <div className="text-center">
                  <div className="hidden sm:block text-black text-xs font-semibold uppercase tracking-wider opacity-90 mb-1">Total Score (Active Players Only)</div>
                  <div className="text-black font-black text-xl sm:text-3xl">⭐ {opponentTotalPoints.toFixed(1)}</div>
                  <div className="text-black/90 text-[10px] sm:text-xs mt-0.5">pts</div>
                </div>
              </div>
            )}

            {/* Starting Lineup */}
            <div className="mb-3 sm:mb-6">
              <h4 className="font-bold text-xs sm:text-lg text-red-800 mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
                🏏 <span className="hidden sm:inline">Active </span>Lineup
                <span className="hidden sm:inline text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                  Counts toward score
                </span>
              </h4>
              <div className="space-y-1.5 sm:space-y-3">
                {opponentFinalLineup.map((player: any) => 
                  renderPlayerCard(player, true, player.swappedFor, player.isSwapped)
                )}
              </div>
            </div>

            {/* Bench Players */}
            <div>
              <h4 className="font-bold text-xs sm:text-lg text-gray-600 mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
                🪑 Bench
                <span className="hidden sm:inline text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  Backup only
                </span>
              </h4>
              <div className="space-y-1.5 sm:space-y-3">
                {opponentBenchPlayers.length > 0 ? (
                  opponentBenchPlayers.map((pick: any) => 
                    renderPlayerCard(pick, false, undefined, false, pick.swappedOut, pick.replacedBy)
                  )
                ) : (
                  <div className="text-gray-500 text-xs italic p-2 sm:p-4 bg-gray-50 rounded-lg">
                    All bench in use
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

              {(() => {
                const s = playerStatsMap[selectedPlayerStats.player.id];
                if (!s) return <div className="text-center py-8 text-gray-500">No stats available</div>;
                return (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-cricket-500 to-green-600 rounded-lg p-4 text-center">
                      <div className="text-white text-sm font-semibold uppercase tracking-wider opacity-90 mb-1">Total Points</div>
                      <div className="text-white font-black text-3xl">⭐ {s.points.toFixed(1)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-3">Performance Breakdown</h4>
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-sm font-semibold text-gray-700">🏏 Runs Scored</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-black">{s.runs}</span>
                          <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded min-w-[70px] text-right">+{(s.runs * 1).toFixed(1)} pts</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-sm font-semibold text-gray-700">🎯 Wickets Taken</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-black">{s.wickets}</span>
                          <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded min-w-[70px] text-right">+{(s.wickets * 20).toFixed(1)} pts</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-sm font-semibold text-gray-700">🧤 Catches</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-black">{s.catches}</span>
                          <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded min-w-[70px] text-right">+{(s.catches * 5).toFixed(1)} pts</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-sm font-semibold text-gray-700">🏃 Run Outs</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-black">{s.runOuts}</span>
                          <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded min-w-[70px] text-right">+{(s.runOuts * 5).toFixed(1)} pts</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-semibold text-gray-700">🥊 Stumpings</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-black">{s.stumpings}</span>
                          <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded min-w-[70px] text-right">+{(s.stumpings * 5).toFixed(1)} pts</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-4">
                      Points: Runs (1pt), Wickets (20pts), Catches/RunOuts/Stumpings (5pts each)
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      {/* Floating Refresh Button */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="fixed bottom-6 right-4 z-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-70 text-white font-semibold px-5 py-3 rounded-full shadow-2xl transition-all"
        aria-label="Refresh scores"
      >
        <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="text-sm">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
      </button>
      </div>
    </div>
  );
}
