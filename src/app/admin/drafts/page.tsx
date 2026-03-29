'use client';

import { useState, useEffect } from 'react';
import { Home, ArrowLeft, Target, ChevronDown, ChevronUp } from 'lucide-react';

interface HeadToHeadMatchup {
  id: string;
  firstPickUser: string;
  status: string;
  user1Score: number;
  user2Score: number;
  winnerId?: string;
  user1: {
    id: string;
    user: {
      name: string;
      username: string;
    };
  };
  user2: {
    id: string;
    user: {
      name: string;
      username: string;
    };
  };
  contest: {
    contestType: string;
    coinValue: number;
    iplGame: {
      title: string;
      team1: {
        name: string;
        shortName: string;
      };
      team2: {
        name: string;
        shortName: string;
      };
    };
  };
  draftPicks: DraftPick[];
}

interface DraftPick {
  id: string;
  pickOrder: number;
  pickedByUserId: string;
  player: {
    name: string;
    role: string;
    iplTeam: {
      shortName: string;
    };
  };
}

interface Contest {
  id: string;
  contestType: string;
  coinValue: number;
  status: string;
  iplGame: {
    title: string;
    team1: { shortName: string; };
    team2: { shortName: string; };
  };
  _count: {
    matchups: number;
  };
}

export default function DraftPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [matchups, setMatchups] = useState<HeadToHeadMatchup[]>([]);
  const [selectedContest, setSelectedContest] = useState<string>('');
  const [selectedMatchup, setSelectedMatchup] = useState<HeadToHeadMatchup | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActiveDrafts, setShowActiveDrafts] = useState(true);
  const [showCompletedDrafts, setShowCompletedDrafts] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    if (selectedContest) {
      fetchMatchups(selectedContest);
    }
  }, [selectedContest]);

  const fetchContests = async () => {
    try {
      const response = await fetch('/api/admin/contests');
      if (response.ok) {
        const data = await response.json();
        // Filter to show only contests that can have drafts
        const draftableContests = data.filter((c: Contest) => 
          ['DRAFT_PHASE', 'LIVE', 'COMPLETED'].includes(c.status)
        );
        setContests(draftableContests);
      }
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchups = async (contestId: string) => {
    try {
      const response = await fetch(`/api/admin/drafts?contestId=${contestId}`);
      if (response.ok) {
        const data = await response.json();
        setMatchups(data);
      }
    } catch (error) {
      console.error('Error fetching matchups:', error);
    }
  };

  const markDraftComplete = async (matchupId: string) => {
    if (!confirm('Mark this draft as COMPLETED? This will close the draft and the contest will move to the scoring phase.')) return;
    setMarkingComplete(true);
    try {
      const res = await fetch(`/api/admin/matchups/${matchupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.message}`);
        return;
      }
      // Update local state so modal + table reflect new status immediately
      const updatedMatchup = { ...selectedMatchup!, status: 'COMPLETED' };
      setSelectedMatchup(updatedMatchup);
      setMatchups(prev => prev.map(m => m.id === matchupId ? updatedMatchup : m));
    } catch (e) {
      console.error('Error marking draft complete:', e);
      alert('Failed to mark draft as complete.');
    } finally {
      setMarkingComplete(false);
    }
  };

  const getMatchupStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING_DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFTING': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDraftProgress = (matchup: HeadToHeadMatchup) => {
    const totalPicks = matchup.draftPicks.length;
    const maxPicks = 14; // 7 per user (5 starters + 2 subs)
    return `${totalPicks}/${maxPicks} picks completed`;
  };

  const getSnakeOrder = () => {
    const order = [];
    for (let round = 1; round <= 7; round++) {
      const pick1 = (round * 2) - 1;
      const pick2 = round * 2;
      if (round % 2 === 1) {
        order.push(`Round ${round}: A picks #${pick1}, B picks #${pick2}`);
      } else {
        order.push(`Round ${round}: B picks #${pick1}, A picks #${pick2}`);
      }
    }
    return order;
  };

  const getUserPicks = (matchup: HeadToHeadMatchup, userId: string) => {
    return matchup.draftPicks
      .filter(pick => pick.pickedByUserId === userId)
      .sort((a, b) => a.pickOrder - b.pickOrder);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 via-pink-600 to-pink-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <a
                href="/admin/dashboard"
                className="flex items-center gap-2 text-white hover:text-pink-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </a>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-400 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Draft Management</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <p className="text-gray-900 font-medium">Monitor snake drafts and pick orders</p>
      </div>
        <h1 className="text-2xl font-bold">Draft Management</h1>
        <div className="text-sm text-gray-600">
          Monitor head-to-head snake drafts
        </div>
      </div>

      {/* Contest Selection */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Select Contest:</h2>

        {/* Active / In-Progress Contests */}
        {contests.filter(c => c.status !== 'COMPLETED').length > 0 && (
          <div className="mb-4">
            <button
              className="flex items-center gap-2 mb-2 group w-full text-left"
              onClick={() => setShowActiveDrafts(v => !v)}
            >
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">🟢 Active / In Progress</span>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{contests.filter(c => c.status !== 'COMPLETED').length}</span>
              <span className="ml-1 text-gray-400 group-hover:text-gray-600 transition-colors">
                {showActiveDrafts ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
              </span>
            </button>
            {showActiveDrafts && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {contests.filter(c => c.status !== 'COMPLETED').map((contest) => (
                <button
                  key={contest.id}
                  onClick={() => setSelectedContest(contest.id)}
                  className={`text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedContest === contest.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                  }`}
                >
                  <div className="font-semibold text-gray-900 text-sm">{contest.iplGame.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {contest.coinValue} VC · {contest._count.matchups} matchup{contest._count.matchups !== 1 ? 's' : ''}
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      contest.status === 'DRAFT_PHASE' ? 'bg-purple-100 text-purple-700' :
                      contest.status === 'LIVE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>{contest.status.replace('_', ' ')}</span>
                  </div>
                </button>
              ))}
            </div>
            )}
          </div>
        )}

        {/* Completed Contests */}
        {contests.filter(c => c.status === 'COMPLETED').length > 0 && (
          <div>
            <button
              className="flex items-center gap-2 mb-2 group w-full text-left"
              onClick={() => setShowCompletedDrafts(v => !v)}
            >
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">✅ Completed</span>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{contests.filter(c => c.status === 'COMPLETED').length}</span>
              <span className="ml-1 text-gray-400 group-hover:text-gray-600 transition-colors">
                {showCompletedDrafts ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
              </span>
            </button>
            {showCompletedDrafts && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {contests.filter(c => c.status === 'COMPLETED').map((contest) => (
                <button
                  key={contest.id}
                  onClick={() => setSelectedContest(contest.id)}
                  className={`text-left px-4 py-3 rounded-lg border-2 transition-all opacity-75 ${
                    selectedContest === contest.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm opacity-100'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-700 text-sm">{contest.iplGame.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {contest.coinValue} VC · {contest._count.matchups} matchup{contest._count.matchups !== 1 ? 's' : ''}
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">COMPLETED</span>
                  </div>
                </button>
              ))}
            </div>
            )}
          </div>
        )}

        {contests.length === 0 && (
          <p className="text-gray-500 text-sm">No contests with drafts available yet.</p>
        )}
      </div>

      {/* Matchups List */}
      {selectedContest && matchups.length > 0 && (
        <div className="grid gap-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b">
              <h3 className="font-medium">Head-to-Head Matchups</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matchup
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      First Pick
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Draft Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matchups.map((matchup) => (
                    <tr key={matchup.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {matchup.user1.user.name} vs {matchup.user2.user.name}
                          </div>
                          <div className="text-gray-500">
                            @{matchup.user1.user.username} vs @{matchup.user2.user.username}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {matchup.firstPickUser === 'user1' 
                          ? matchup.user1.user.name 
                          : matchup.user2.user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getDraftProgress(matchup)}
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(matchup.draftPicks.length / 14) * 100}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getMatchupStatusColor(matchup.status)}`}>
                          {matchup.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedMatchup(matchup)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedContest && matchups.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No matchups found for this contest
        </div>
      )}

      {/* Matchup Detail Modal */}
      {selectedMatchup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Draft Details: {selectedMatchup.user1.user.name} vs {selectedMatchup.user2.user.name}
                </h2>
                <div className="flex items-center gap-3">
                  {selectedMatchup.status !== 'COMPLETED' && (
                    <button
                      onClick={() => markDraftComplete(selectedMatchup.id)}
                      disabled={markingComplete}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {markingComplete ? (
                        <>
                          <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
                          Marking…
                        </>
                      ) : (
                        <>✓ Mark Draft Complete</>
                      )}
                    </button>
                  )}
                  {selectedMatchup.status === 'COMPLETED' && (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-100 text-green-700 text-sm font-semibold rounded-lg">
                      ✓ Draft Completed
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedMatchup(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Team A Picks */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-3">
                    {selectedMatchup.user1.user.name} ({selectedMatchup.firstPickUser === 'user1' ? 'Picks First' : 'Picks Second'})
                  </h3>
                  <div className="space-y-2">
                    {getUserPicks(selectedMatchup, selectedMatchup.user1.id).map((pick, index) => (
                      <div key={pick.id} className="bg-white rounded p-2 text-sm">
                        <div className="font-medium text-gray-900">Pick #{pick.pickOrder}: {pick.player.name}</div>
                        <div className="text-gray-600">{pick.player.role} - {pick.player.iplTeam.shortName}</div>
                      </div>
                    ))}
                    {getUserPicks(selectedMatchup, selectedMatchup.user1.id).length === 0 && (
                      <div className="text-gray-500 text-sm">No picks yet</div>
                    )}
                  </div>
                </div>

                {/* Snake Order */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Snake Draft Order</h3>
                  <div className="space-y-1 text-xs">
                    {getSnakeOrder().map((order, index) => (
                      <div key={index} className="py-1 border-b border-gray-200">
                        {order}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                    <strong>Rules:</strong> Each team picks 5 players total. Snake format means pick order reverses each round.
                  </div>
                </div>

                {/* Team B Picks */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-3">
                    {selectedMatchup.user2.user.name} ({selectedMatchup.firstPickUser === 'user2' ? 'Picks First' : 'Picks Second'})
                  </h3>
                  <div className="space-y-2">
                    {getUserPicks(selectedMatchup, selectedMatchup.user2.id).map((pick, index) => (
                      <div key={pick.id} className="bg-white rounded p-2 text-sm">
                        <div className="font-medium text-gray-900">Pick #{pick.pickOrder}: {pick.player.name}</div>
                        <div className="text-gray-600">{pick.player.role} - {pick.player.iplTeam.shortName}</div>
                      </div>
                    ))}
                    {getUserPicks(selectedMatchup, selectedMatchup.user2.id).length === 0 && (
                      <div className="text-gray-500 text-sm">No picks yet</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contest Info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Contest Information</h4>
                <div className="text-sm text-gray-600 grid grid-cols-2 gap-4">
                  <div>Game: {selectedMatchup.contest.iplGame.title}</div>
                  <div>Prize: {selectedMatchup.contest.coinValue} coins per point</div>
                  <div>Teams: {selectedMatchup.contest.iplGame.team1.shortName} vs {selectedMatchup.contest.iplGame.team2.shortName}</div>
                  <div>Status: {selectedMatchup.status}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">🐍 Snake Draft Rules:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Each user picks <strong>7 players</strong> (5 starters + 2 bench) from the two IPL teams playing</li>
          <li>• <strong>Snake format</strong> — pick order reverses each round: A-B · B-A · A-B · B-A · A-B · B-A · A-B (14 total picks)</li>
          <li>• Each player can only be picked once per matchup</li>
          <li>• <strong>Scoring:</strong> (Runs × 1) + (Wickets × 20) + (Catches/Run Outs/Stumpings × 5)</li>
          <li>• <strong>Bench swap:</strong> If a starter didn't play (DNP), the next available bench player automatically replaces them</li>
          <li>• Winner takes the opponent's VC entry fee minus 10% admin fee</li>
        </ul>
      </div>
    </div>
  );
}