'use client';

import { useState, useEffect } from 'react';
import { Home, ArrowLeft, Trophy } from 'lucide-react';

interface IPLGame {
  id: string;
  title: string;
  gameDate: string;
  signupDeadline: string;
  status: string;
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
}

interface Contest {
  id: string;
  contestType: string;
  coinValue: number;
  maxParticipants: number;
  totalSignups: number;
  status: string;
  iplGame: IPLGame;
  _count: {
    signups: number;
    matchups: number;
  };
  matchupStats?: {
    waiting: number;
    drafting: number;
    completed: number;
    totalDraftPicks: number;
  };
}

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [games, setGames] = useState<IPLGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchContests();
    fetchGames();
  }, []);

  const fetchContests = async () => {
    try {
      const response = await fetch('/api/admin/contests');
      if (response.ok) {
        const data = await response.json();
        setContests(data);
      }
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/admin/games');
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  const updateContestStatus = async (contestId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/contests/${contestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchContests();
        alert('Contest status updated successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating contest:', error);
      alert('Error updating contest status');
    }
  };

  const endContest = async (contestId: string) => {
    if (!confirm('Are you sure you want to end this contest? This will calculate winners/losers and update coin balances.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/contests/${contestId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        fetchContests();
        alert(`Contest ended successfully!\n\nResults:\n- Total Matchups: ${result.totalMatchups}\n- Winners Paid: ${result.winnersPaid}\n- Losers Charged: ${result.losersCharged}\n- Admin Fee Collected: ${result.adminFeeCollected} coins`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error ending contest:', error);
      alert('Error ending contest');
    }
  };

  const closeSignups = async (contestId: string) => {
    try {
      const response = await fetch(`/api/admin/contests/${contestId}/close-signups`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        fetchContests();
        alert(data.message);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error closing signups:', error);
      alert('Error closing signups');
    }
  };

  const generateMatchups = async (contestId: string) => {
    if (!confirm('Generate random head-to-head matchups? This will pair up all signed-up users.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/contests/${contestId}/generate-matchups`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        fetchContests();
        alert(data.message);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error generating matchups:', error);
      alert('Error generating matchups');
    }
  };

  const openDrafting = async (contestId: string) => {
    if (!confirm('Open the drafting window? Users will be able to start drafting their teams.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/contests/${contestId}/open-drafting`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        fetchContests();
        alert(data.message);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error opening drafting:', error);
      alert('Error opening drafting window');
    }
  };

  const reopenSignups = async (contestId: string) => {
    if (!confirm('Reopen signups? This will delete all matchups if drafting has not started.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/contests/${contestId}/reopen-signups`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        fetchContests();
        alert(data.message);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error reopening signups:', error);
      alert('Error reopening signups');
    }
  };

  const filteredContests = statusFilter === 'ALL' 
    ? contests 
    : contests.filter(contest => contest.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SIGNUP_OPEN': return 'bg-green-100 text-green-800';
      case 'SIGNUP_CLOSED': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT_PHASE': return 'bg-blue-100 text-blue-800';
      case 'LIVE': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContestTypeDisplay = (contestType: string, coinValue: number) => {
    return `${coinValue} Coins/Point`;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <a
                href="/admin/dashboard"
                className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </a>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-400 rounded-full flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Contest Types Management</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-900 font-medium">Contests are automatically created when IPL games are scheduled</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Filter by Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="ALL">All Contests</option>
          <option value="SIGNUP_OPEN">Signup Open</option>
          <option value="SIGNUP_CLOSED">Signup Closed</option>
          <option value="DRAFT_PHASE">Draft Phase</option>
          <option value="LIVE">Live</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Contests List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Game & Contest
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contest Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participants
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Schedule
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
            {filteredContests.map((contest) => (
              <tr key={contest.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="font-medium text-gray-900">{contest.iplGame.title}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: contest.iplGame.team1.color }}
                      ></span>
                      <span className="text-sm text-gray-600">{contest.iplGame.team1.shortName}</span>
                      <span className="text-xs text-gray-400">vs</span>
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: contest.iplGame.team2.color }}
                      ></span>
                      <span className="text-sm text-gray-600">{contest.iplGame.team2.shortName}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-lg text-blue-600">
                    {getContestTypeDisplay(contest.contestType, contest.coinValue)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Max: {contest.maxParticipants} users
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <strong>{contest._count.signups}</strong> signups
                  </div>
                  <div className="text-sm text-gray-500">
                    {contest._count.matchups} matchups
                  </div>
                  {contest.matchupStats && contest._count.matchups > 0 && (
                    <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                      {contest.matchupStats.waiting > 0 && (
                        <div className="text-yellow-600">⏳ {contest.matchupStats.waiting} waiting</div>
                      )}
                      {contest.matchupStats.drafting > 0 && (
                        <div className="text-blue-600">✍️ {contest.matchupStats.drafting} drafting</div>
                      )}
                      {contest.matchupStats.completed > 0 && (
                        <div className="text-green-600">✅ {contest.matchupStats.completed} complete</div>
                      )}
                      <div className="text-gray-500 text-xs">
                        {contest.matchupStats.totalDraftPicks}/50 picks made
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>Game: {new Date(contest.iplGame.gameDate).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">
                    Signup by: {new Date(contest.iplGame.signupDeadline).toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contest.status)}`}>
                    {contest.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-y-2">
                  {/* View Matchups Button */}
                  {contest._count.matchups > 0 && (
                    <a
                      href={`/admin/contests/${contest.id}`}
                      className="block w-full px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition text-center"
                      title="View matchups and draft details"
                    >
                      👁️ View Matchups ({contest._count.matchups})
                    </a>
                  )}
                  
                  {/* Step 1: Close Signups */}
                  {contest.status === 'SIGNUP_OPEN' && contest._count.signups >= 1 && (
                    <button
                      onClick={() => closeSignups(contest.id)}
                      className="block w-full px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                      title={contest._count.signups === 1
                        ? `Close signups (Admin user will be added to make it 2)` 
                        : contest._count.signups % 2 !== 0 
                        ? `Close signups (Admin user will be added for odd count: ${contest._count.signups})` 
                        : 'Close signups and generate matchups automatically'}
                    >
                      🔒 Close Signups ({contest._count.signups})
                    </button>
                  )}
                  
                  {/* Reopen Signups Button (for SIGNUP_CLOSED or DRAFT_PHASE without drafts) */}
                  {(contest.status === 'SIGNUP_CLOSED' || contest.status === 'DRAFT_PHASE') && (
                    <button
                      onClick={() => reopenSignups(contest.id)}
                      className="block w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                      title="Reopen signups (deletes matchups if no drafting has started)"
                    >
                      🔓 Reopen Signups
                    </button>
                  )}
                  
                  {/* Open Drafting Button (for DRAFT_PHASE status) */}
                  {contest.status === 'DRAFT_PHASE' && (
                    <button
                      onClick={() => openDrafting(contest.id)}
                      className="block w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
                      title="Open the drafting window for all matchups"
                    >
                      🎯 Open Draft Window
                    </button>
                  )}

                  {/* Start Contest Button - transitions to LIVE */}
                  {contest.status === 'DRAFT_PHASE' && contest.matchupStats && contest.matchupStats.completed > 0 && (
                    <button
                      onClick={() => updateContestStatus(contest.id, 'LIVE')}
                      className="block w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition mt-2"
                      title="Start the live contest (after drafts are complete)"
                    >
                      ▶️ Start Contest
                    </button>
                  )}
                  
                  {/* End Contest Button (when live) */}
                  {contest.status === 'LIVE' && (
                    <button
                      onClick={() => endContest(contest.id)}
                      className="block w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                      title="End contest and settle coin transactions"
                    >
                      🏁 End Contest
                    </button>
                  )}
                  
                  {/* Contest Info */}
                  <div className="text-xs text-gray-400 mt-1">
                    ID: {contest.id.slice(-8)}
                  </div>
                  
                  {/* Info for odd signups */}
                  {contest.status === 'SIGNUP_OPEN' && contest._count.signups % 2 !== 0 && contest._count.signups > 0 && (
                    <div className="text-xs text-blue-600 mt-1">
                      ℹ️ Admin user will join
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredContests.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No contests found. Create an IPL game to automatically generate contests.
          </div>
        )}
      </div>
      
      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-3">📋 Contest Management Workflow:</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-blue-800">
              <strong className="text-purple-600">Step 1:</strong> <strong>Create IPL Games</strong>
              <p className="text-xs ml-4">Contests (25/50/100 coins) are auto-generated for each game</p>
            </div>
            <div className="text-sm text-blue-800">
              <strong className="text-purple-600">Step 2:</strong> <strong>Users Sign Up</strong>
              <p className="text-xs ml-4">Open until signup deadline (8 PM EST day before game)</p>
            </div>
            <div className="text-sm text-blue-800">
              <strong className="text-purple-600">Step 3:</strong> <strong>Close Signups 🔒</strong>
              <p className="text-xs ml-4">Auto-adds Admin Bot if odd, then generates matchups automatically</p>
            </div>
            <div className="text-sm text-blue-800">
              <strong className="text-purple-600">Step 4:</strong> <strong>Contest Ready 🎯</strong>
              <p className="text-xs ml-4">Matchups created, contest moves to DRAFT_PHASE automatically</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-blue-800">
              <strong className="text-purple-600">Step 5:</strong> <strong>End Contest 🏁</strong> (when LIVE) to calculate winners and settle coins
              <p className="text-xs ml-4">Users draft teams, then contest goes live during IPL match</p>
            </div>
            <div className="text-sm text-blue-800">
              <strong className="text-purple-600">Step 6:</strong> <strong>Auto-Complete</strong>
              <p className="text-xs ml-4">Winners determined automatically, coins distributed with 10% admin fee</p>
            </div>
          </div>
        </div>
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-xs text-green-800">
            <strong>✅ Smart Matchups:</strong> Admin user automatically joins contests with odd signups to ensure head-to-head matchups. 
            Closing signups now auto-generates the schedule!
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}