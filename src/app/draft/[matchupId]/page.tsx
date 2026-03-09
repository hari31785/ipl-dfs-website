'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Users, Trophy, Clock, Target } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  role: string;
  iplTeam: {
    id: string;
    name: string;
    shortName: string;
    color: string;
  };
  stats?: {
    points: number;
    runs: number;
    wickets: number;
    catches: number;
  }[];
}

interface DraftPick {
  id: string;
  pickOrder: number;
  player: Player;
  pickedByUserId: string;
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

export default function DraftPage({ params }: { params: Promise<{ matchupId: string }> }) {
  const { matchupId } = use(params);
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [makingPick, setMakingPick] = useState(false);
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchName, setSearchName] = useState<string>('');
  const [playerStats, setPlayerStats] = useState<Record<string, number>>({});

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
        setAvailablePlayers(data.availablePlayers);
      }
    } catch (error) {
      console.error('Error fetching matchup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDraftPick = async () => {
    if (!selectedPlayer || !currentUser) return;

    setMakingPick(true);
    try {
      const response = await fetch(`/api/draft/${matchupId}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer,
          userId: currentUser.id
        })
      });

      if (response.ok) {
        setSelectedPlayer(null);
        await fetchMatchupDetails();
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      console.error('Error making pick:', error);
      alert('Failed to make pick');
    } finally {
      setMakingPick(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading draft...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Please login to access draft</div>
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
          <div className="text-sm text-gray-600 mb-4">
            Your ID: {currentUser.id}<br/>
            User 1: {matchup.user1.user.username} ({matchup.user1.user.id})<br/>
            User 2: {matchup.user2.user.username} ({matchup.user2.user.id})
          </div>
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

  // Calculate total points for each team
  const myTotalPoints = myPicks.reduce((sum, pick) => {
    const playerPoints = pick.player.stats && pick.player.stats.length > 0 ? pick.player.stats[0].points : 0;
    return sum + playerPoints;
  }, 0);
  
  const opponentTotalPoints = opponentPicks.reduce((sum, pick) => {
    const playerPoints = pick.player.stats && pick.player.stats.length > 0 ? pick.player.stats[0].points : 0;
    return sum + playerPoints;
  }, 0);

  const currentPickOrder = matchup.draftPicks.length + 1;
  const isMyTurn = (() => {
    if (currentPickOrder > 14) return false;
    
    // Snake draft logic
    const round = Math.ceil(currentPickOrder / 2);
    const isOddRound = round % 2 === 1;
    const firstPicker = matchup.firstPickUser === 'user1' ? matchup.user1.id : matchup.user2.id;
    
    if (isOddRound) {
      return currentPickOrder % 2 === 1 ? mySignupId === firstPicker : mySignupId !== firstPicker;
    } else {
      return currentPickOrder % 2 === 0 ? mySignupId === firstPicker : mySignupId !== firstPicker;
    }
  })();

  const isDraftComplete = matchup.draftPicks.length >= 14;

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
                <h1 className="text-2xl md:text-3xl font-bold text-black">🏏 Snake Draft</h1>
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

        {/* Draft Status */}
        {isDraftComplete ? (
          <div className="bg-gradient-to-r from-cricket-500 to-green-600 text-black rounded-xl p-6 mb-6 shadow-lg">
            <p className="text-center font-bold text-lg flex items-center justify-center gap-2">
              <Trophy className="h-6 w-6" />
              Draft Complete! Good luck in the game!
            </p>
          </div>
        ) : (
          <div className={`border-2 rounded-xl p-6 mb-6 shadow-md ${isMyTurn ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-cricket-600' : 'bg-gray-50 border-gray-300'}`}>
            <p className={`text-center font-bold text-lg flex items-center justify-center gap-2 ${isMyTurn ? 'text-orange-700' : 'text-gray-600'}`}>
              {isMyTurn ? (
                <>
                  <Target className="h-6 w-6 text-secondary-400" />
                  Your Turn - Pick #{currentPickOrder}
                </>
              ) : (
                <>
                  <Clock className="h-6 w-6" />
                  Waiting for {opponent.name} - Pick #{currentPickOrder}
                </>
              )}
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Your Picks */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-green-800">Your Team</h3>
              <span className="bg-green-800 text-white px-3 py-1 rounded-full font-bold text-sm">
                {myPicks.length}/5
              </span>
            </div>
            {myTotalPoints > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-cricket-500 to-green-600 rounded-xl">
                <div className="text-center">
                  <div className="text-black text-xs font-semibold uppercase tracking-wider opacity-90 mb-1">Total Score</div>
                  <div className="text-black font-black text-3xl">⭐ {myTotalPoints.toFixed(1)}</div>
                  <div className="text-black/90 text-xs mt-1">Fantasy Points</div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {myPicks.length === 0 ? (
                <div className="text-center py-8 text-gray-400 italic">No picks yet</div>
              ) : (
                myPicks.map(pick => (
                  <div key={pick.id} className="group relative bg-gradient-to-br from-green-50 via-emerald-50 to-white border-2 border-green-300 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-102">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cricket-600 to-green-800 rounded-full flex items-center justify-center text-black font-black text-xl shadow-lg shrink-0">
                        {pick.pickOrder}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-xl text-black mb-2 leading-tight">{pick.player.name}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-black bg-green-200 px-2 py-1 rounded-md shadow-sm border border-green-400">
                            {pick.player.role}
                          </span>
                          <span 
                            className="text-xs font-bold px-2 py-1 rounded-md shadow-sm border-2" 
                            style={{ 
                              backgroundColor: pick.player.iplTeam.color + '15', 
                              color: 'black',
                              borderColor: pick.player.iplTeam.color + '60'
                            }}
                          >
                            {pick.player.iplTeam.shortName}
                          </span>
                          {pick.player.stats && pick.player.stats.length > 0 && (
                            <span className="text-sm font-black text-black bg-gradient-to-r from-cricket-300 to-green-300 px-3 py-1.5 rounded-md shadow-md border-2 border-green-700">
                              ⭐ {pick.player.stats[0].points.toFixed(1)} pts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Available Players */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="font-bold text-xl text-primary-800 mb-4">Available Players</h3>
            
            {/* Filters */}
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Filter by Team</label>
                  <select
                    value={filterTeam}
                    onChange={(e) => setFilterTeam(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:border-primary-500 focus:outline-none bg-white"
                  >
                    <option value="all">All Teams</option>
                    {matchup && [
                      { id: matchup.contest.iplGame.team1.id, name: matchup.contest.iplGame.team1.shortName },
                      { id: matchup.contest.iplGame.team2.id, name: matchup.contest.iplGame.team2.shortName }
                    ].map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Filter by Role</label>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:border-primary-500 focus:outline-none bg-white"
                  >
                    <option value="all">All Roles</option>
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicket-Keeper">Wicket-Keeper</option>
                  </select>
                </div>
              </div>
              
              {/* Search by Name */}
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Search by Name</label>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Type player name..."
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:border-primary-500 focus:outline-none bg-white"
                />
              </div>
              
              {(filterTeam !== 'all' || filterRole !== 'all' || searchName) && (
                <button
                  onClick={() => { setFilterTeam('all'); setFilterRole('all'); setSearchName(''); }}
                  className="text-xs font-semibold text-secondary-500 hover:text-secondary-600 underline mt-2"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
              {availablePlayers
                .filter(player => filterTeam === 'all' || player.iplTeam.id === filterTeam)
                .filter(player => filterRole === 'all' || player.role === filterRole)
                .filter(player => !searchName || player.name.toLowerCase().includes(searchName.toLowerCase()))
                .map(player => (
                <div
                  key={player.id}
                  onClick={() => isMyTurn && !isDraftComplete && setSelectedPlayer(player.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                    selectedPlayer === player.id
                      ? 'bg-gradient-to-r from-secondary-100 to-orange-100 border-secondary-500 shadow-lg scale-105'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300 hover:shadow-md'
                  } ${!isMyTurn || isDraftComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-bold text-base text-black">{player.name}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-semibold text-gray-700 bg-white px-2 py-1 rounded border border-gray-300">
                      {player.role}
                    </span>
                    <span 
                      className="text-xs font-bold px-2 py-1 rounded border-2" 
                      style={{ 
                        backgroundColor: player.iplTeam.color + '20', 
                        color: player.iplTeam.color,
                        borderColor: player.iplTeam.color + '40'
                      }}
                    >
                      {player.iplTeam.shortName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {isMyTurn && !isDraftComplete && (
              <button
                onClick={handleDraftPick}
                disabled={!selectedPlayer || makingPick}
                className="w-full mt-6 bg-gradient-to-r from-secondary-500 to-orange-600 hover:from-secondary-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 text-black px-6 py-4 rounded-lg font-bold text-lg shadow-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {makingPick ? 'Drafting...' : selectedPlayer ? 'Confirm Pick' : 'Select a Player'}
              </button>
            )}
          </div>

          {/* Opponent Picks */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-red-800">Opponent Team</h3>
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold text-sm">
                {opponentPicks.length}/5
              </span>
            </div>
            {opponentTotalPoints > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-cricket-500 to-green-600 rounded-xl">
                <div className="text-center">
                  <div className="text-black text-xs font-semibold uppercase tracking-wider opacity-90 mb-1">Total Score</div>
                  <div className="text-black font-black text-3xl">⭐ {opponentTotalPoints.toFixed(1)}</div>
                  <div className="text-black/90 text-xs mt-1">Fantasy Points</div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {opponentPicks.length === 0 ? (
                <div className="text-center py-8 text-gray-400 italic">No picks yet</div>
              ) : (
                opponentPicks.map(pick => (
                  <div key={pick.id} className="group relative bg-gradient-to-br from-red-50 via-orange-50 to-white border-2 border-red-300 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-102">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center text-black font-black text-xl shadow-lg shrink-0">
                        {pick.pickOrder}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-xl text-black mb-2 leading-tight">{pick.player.name}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-black bg-red-100 px-2 py-1 rounded-md shadow-sm border border-red-300">
                            {pick.player.role}
                          </span>
                          <span 
                            className="text-xs font-bold px-2 py-1 rounded-md shadow-sm border-2" 
                            style={{ 
                              backgroundColor: pick.player.iplTeam.color + '15', 
                              color: 'black',
                              borderColor: pick.player.iplTeam.color + '60'
                            }}
                          >
                            {pick.player.iplTeam.shortName}
                          </span>
                          {pick.player.stats && pick.player.stats.length > 0 && (
                            <span className="text-sm font-black text-black bg-gradient-to-r from-cricket-300 to-green-300 px-3 py-1.5 rounded-md shadow-md border-2 border-green-700">
                              ⭐ {pick.player.stats[0].points.toFixed(1)} pts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
