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
    const fpRaw = matchup.firstPickUser || '';
    const u1Waived = fpRaw.includes(':w1');
    const u2Waived = fpRaw.includes(':w2');
    const maxPicks = 14 - (u1Waived ? 2 : 0) - (u2Waived ? 2 : 0);
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Contest Selection */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Select Contest</h2>

          {/* Active / In-Progress Contests */}
          {contests.filter(c => c.status !== 'COMPLETED').length > 0 && (
            <div className="mb-4">
              <button
                className="flex items-center gap-2 mb-3 group w-full text-left"
                onClick={() => setShowActiveDrafts(v => !v)}
              >
                <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">🟢 Active / In Progress</span>
                <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 font-medium">{contests.filter(c => c.status !== 'COMPLETED').length}</span>
                <span className="ml-1 text-gray-400 group-hover:text-gray-600 transition-colors">
                  {showActiveDrafts ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
                </span>
              </button>
              {showActiveDrafts && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contests.filter(c => c.status !== 'COMPLETED').map((contest) => (
                    <button
                      key={contest.id}
                      onClick={() => setSelectedContest(contest.id)}
                      className={`text-left px-4 py-3 rounded-lg border-2 transition-all ${
                        selectedContest === contest.id
                          ? 'border-pink-500 bg-pink-50 shadow-sm'
                          : 'border-gray-200 bg-gray-50 hover:border-pink-300 hover:bg-pink-50/40'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 text-sm">{contest.iplGame.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">{contest.coinValue} VC</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-600">{contest._count.matchups} matchup{contest._count.matchups !== 1 ? 's' : ''}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
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
                className="flex items-center gap-2 mb-3 group w-full text-left"
                onClick={() => setShowCompletedDrafts(v => !v)}
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">✅ Completed</span>
                <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 font-medium">{contests.filter(c => c.status === 'COMPLETED').length}</span>
                <span className="ml-1 text-gray-400 group-hover:text-gray-600 transition-colors">
                  {showCompletedDrafts ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
                </span>
              </button>
              {showCompletedDrafts && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contests.filter(c => c.status === 'COMPLETED').map((contest) => (
                    <button
                      key={contest.id}
                      onClick={() => setSelectedContest(contest.id)}
                      className={`text-left px-4 py-3 rounded-lg border-2 transition-all opacity-70 ${
                        selectedContest === contest.id
                          ? 'border-pink-500 bg-pink-50 shadow-sm opacity-100'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:opacity-90'
                      }`}
                    >
                      <div className="font-semibold text-gray-700 text-sm">{contest.iplGame.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{contest.coinValue} VC</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{contest._count.matchups} matchup{contest._count.matchups !== 1 ? 's' : ''}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">COMPLETED</span>
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
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">Head-to-Head Matchups</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Matchup</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">First Pick</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Draft Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matchups.map((matchup) => (
                    <tr key={matchup.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 text-sm">
                          {matchup.user1.user.name} vs {matchup.user2.user.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          @{matchup.user1.user.username} vs @{matchup.user2.user.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {(matchup.firstPickUser?.split(':')[0] === 'user1')
                          ? matchup.user1.user.name
                          : matchup.user2.user.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800">{getDraftProgress(matchup)}</div>
                        <div className="w-32 bg-gray-200 rounded-full h-1.5 mt-1.5">
                          <div
                            className="bg-pink-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (matchup.draftPicks.length / (14 - (matchup.firstPickUser?.includes(':w1') ? 2 : 0) - (matchup.firstPickUser?.includes(':w2') ? 2 : 0))) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${getMatchupStatusColor(matchup.status)}`}>
                          {matchup.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <button
                          onClick={() => setSelectedMatchup(matchup)}
                          className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-lg transition-colors"
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
        )}

        {selectedContest && matchups.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 py-16 text-center">
            <p className="text-gray-500 text-sm">No matchups found for this contest.</p>
          </div>
        )}

        {/* Snake Draft Rules */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-3">🐍 Snake Draft Rules</h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex gap-2"><span className="text-gray-400">•</span><span>Each user picks <strong className="text-gray-900">7 players</strong> (5 starters + 2 bench) from the two IPL teams playing</span></li>
            <li className="flex gap-2"><span className="text-gray-400">•</span><span><strong className="text-gray-900">Snake format</strong> — pick order reverses each round: A-B · B-A · A-B · B-A · A-B · B-A · A-B (14 total picks)</span></li>
            <li className="flex gap-2"><span className="text-gray-400">•</span><span>Each player can only be picked once per matchup</span></li>
            <li className="flex gap-2"><span className="text-gray-400">•</span><span><strong className="text-gray-900">Scoring:</strong> (Runs × 1) + (Wickets × 20) + (Catches / Run Outs / Stumpings × 5)</span></li>
            <li className="flex gap-2"><span className="text-gray-400">•</span><span><strong className="text-gray-900">Bench swap:</strong> If a starter didn't play (DNP), the next available bench player automatically replaces them</span></li>
            <li className="flex gap-2"><span className="text-gray-400">•</span><span>Winner takes the opponent's VC entry fee minus 10% admin fee</span></li>
          </ul>
        </div>

      </div>

      {/* Matchup Detail Modal */}
      {selectedMatchup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedMatchup.user1.user.name} vs {selectedMatchup.user2.user.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedMatchup.contest.iplGame.title}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {selectedMatchup.status !== 'COMPLETED' && (
                    <button
                      onClick={() => markDraftComplete(selectedMatchup.id)}
                      disabled={markingComplete}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {markingComplete ? (
                        <>
                          <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
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
                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Picks Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Team A Picks */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="font-bold text-blue-800 mb-3 text-sm">
                    {selectedMatchup.user1.user.name}
                    <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                      {(selectedMatchup.firstPickUser?.split(':')[0] === 'user1') ? 'Picks First' : 'Picks Second'}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {getUserPicks(selectedMatchup, selectedMatchup.user1.id).map((pick) => (
                      <div key={pick.id} className="bg-white border border-blue-100 rounded-lg p-2.5 text-sm">
                        <div className="font-semibold text-gray-900">#{pick.pickOrder} {pick.player.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{pick.player.role} · {pick.player.iplTeam.shortName}</div>
                      </div>
                    ))}
                    {getUserPicks(selectedMatchup, selectedMatchup.user1.id).length === 0 && (
                      <div className="text-blue-400 text-sm italic">No picks yet</div>
                    )}
                  </div>
                </div>

                {/* Snake Order */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h3 className="font-bold text-gray-800 mb-3 text-sm">Snake Draft Order</h3>
                  <div className="space-y-1 text-xs text-gray-700">
                    {getSnakeOrder().map((order, index) => (
                      <div key={index} className="py-1.5 border-b border-gray-200 last:border-0">
                        {order}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <strong>Note:</strong> Each team picks 7 total (5 starters + 2 bench). Pick order reverses each round.
                  </div>
                </div>

                {/* Team B Picks */}
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <h3 className="font-bold text-green-800 mb-3 text-sm">
                    {selectedMatchup.user2.user.name}
                    <span className="ml-2 text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                      {(selectedMatchup.firstPickUser?.split(':')[0] === 'user2') ? 'Picks First' : 'Picks Second'}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {getUserPicks(selectedMatchup, selectedMatchup.user2.id).map((pick) => (
                      <div key={pick.id} className="bg-white border border-green-100 rounded-lg p-2.5 text-sm">
                        <div className="font-semibold text-gray-900">#{pick.pickOrder} {pick.player.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{pick.player.role} · {pick.player.iplTeam.shortName}</div>
                      </div>
                    ))}
                    {getUserPicks(selectedMatchup, selectedMatchup.user2.id).length === 0 && (
                      <div className="text-green-400 text-sm italic">No picks yet</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contest Info */}
              <div className="mt-5 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h4 className="font-bold text-gray-800 text-sm mb-3">Contest Information</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div><span className="text-gray-500">Game:</span> <span className="font-medium text-gray-900">{selectedMatchup.contest.iplGame.title}</span></div>
                  <div><span className="text-gray-500">Entry:</span> <span className="font-medium text-gray-900">{selectedMatchup.contest.coinValue} VC</span></div>
                  <div><span className="text-gray-500">Teams:</span> <span className="font-medium text-gray-900">{selectedMatchup.contest.iplGame.team1.shortName} vs {selectedMatchup.contest.iplGame.team2.shortName}</span></div>
                  <div><span className="text-gray-500">Status:</span> <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full ${getMatchupStatusColor(selectedMatchup.status)}`}>{selectedMatchup.status.replace('_', ' ')}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}