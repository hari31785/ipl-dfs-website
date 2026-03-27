'use client';

import { useState, useEffect } from 'react';
import { Home, ArrowLeft, Trophy, Trash2, Plus, ChevronDown, ChevronUp, Users, Filter } from 'lucide-react';
import { useLoading } from '@/contexts/LoadingContext';

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
  tournament: {
    id: string;
    name: string;
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

// Contest Card Component for Grouped View
function ContestCard({ 
  contest, 
  isSelected, 
  onToggleSelect, 
  onCloseSignups, 
  onReopenSignups, 
  onOpenDrafting, 
  onUpdateStatus, 
  onEndContest,
  onViewSignups,
  getStatusColor,
  getContestTypeDisplay
}: {
  contest: Contest;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onCloseSignups: (id: string) => void;
  onReopenSignups: (id: string) => void;
  onOpenDrafting: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onEndContest: (id: string) => void;
  onViewSignups: (id: string) => void;
  getStatusColor: (status: string) => string;
  getContestTypeDisplay: (type: string, value: number) => string;
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 ${isSelected ? 'border-primary-500' : 'border-gray-200'} p-4 hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(contest.id)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-1"
          />
          <div>
            <div className="font-bold text-lg text-blue-600">
              {getContestTypeDisplay(contest.contestType, contest.coinValue)}
            </div>
            <div className="text-xs text-gray-500">
              Max: {contest.maxParticipants} users
            </div>
          </div>
        </div>
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contest.status)}`}>
          {contest.status.replace('_', ' ')}
        </span>
      </div>

      {/* Stats */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <div className="text-sm text-gray-900 mb-1">
          <strong>{contest._count.signups}</strong> signups • <strong>{contest._count.matchups}</strong> matchups
        </div>
        {contest.matchupStats && contest._count.matchups > 0 && (
          <div className="text-xs text-gray-600 space-y-0.5">
            {contest.matchupStats.waiting > 0 && (
              <div className="text-yellow-600">⏳ {contest.matchupStats.waiting} waiting</div>
            )}
            {contest.matchupStats.drafting > 0 && (
              <div className="text-blue-600">✍️ {contest.matchupStats.drafting} drafting</div>
            )}
            {contest.matchupStats.completed > 0 && (
              <div className="text-green-600">✅ {contest.matchupStats.completed} complete</div>
            )}
            <div className="text-gray-500">
              {contest.matchupStats.totalDraftPicks}/50 picks
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {/* View Signups */}
        {contest._count.signups > 0 && (
          <button
            onClick={() => onViewSignups(contest.id)}
            className="block w-full px-3 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition text-center text-sm font-medium"
          >
            <Users className="inline-block h-4 w-4 mr-1" /> View Signups ({contest._count.signups})
          </button>
        )}
        
        {/* View Matchups */}
        {contest._count.matchups > 0 && (
          <a
            href={`/admin/contests/${contest.id}`}
            className="block w-full px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition text-center text-sm font-medium"
          >
            👁️ View Matchups ({contest._count.matchups})
          </a>
        )}
        
        {/* Close Signups */}
        {contest.status === 'SIGNUP_OPEN' && contest._count.signups >= 1 && (
          <button
            onClick={() => onCloseSignups(contest.id)}
            className="block w-full px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition text-sm font-medium"
            title={contest._count.signups === 1
              ? `Close signups (Admin will be added)` 
              : contest._count.signups % 2 !== 0 
              ? `Close signups (Admin will join: ${contest._count.signups})` 
              : 'Close signups and generate matchups'}
          >
            🔒 Close Signups ({contest._count.signups})
          </button>
        )}
        
        {/* Reopen Signups */}
        {(contest.status === 'SIGNUP_CLOSED' || contest.status === 'DRAFT_PHASE') && (
          <button
            onClick={() => onReopenSignups(contest.id)}
            className="block w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm font-medium"
          >
            🔓 Reopen Signups
          </button>
        )}
        
        {/* Open Drafting */}
        {contest.status === 'DRAFT_PHASE' && (!contest.matchupStats || contest.matchupStats.drafting === 0) && (
          <button
            onClick={() => onOpenDrafting(contest.id)}
            className="block w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition text-sm font-medium"
          >
            🎯 Open Draft
          </button>
        )}

        {/* Start Contest - Show when drafting is open and at least one draft is complete */}
        {contest.status === 'DRAFT_PHASE' && contest.matchupStats && (
          contest.matchupStats.drafting > 0 || contest.matchupStats.completed > 0
        ) && contest.matchupStats.completed > 0 && (
          <button
            onClick={() => onUpdateStatus(contest.id, 'LIVE')}
            className="block w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm font-medium"
          >
            ▶️ Start Contest
          </button>
        )}
        
        {/* End Contest */}
        {(contest.status === 'LIVE' || contest.status === 'ACTIVE') && (
          <button
            onClick={() => onEndContest(contest.id)}
            className="block w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm font-medium"
          >
            🏁 End Contest
          </button>
        )}
        
        {/* Info */}
        {contest.status === 'SIGNUP_OPEN' && contest._count.signups % 2 !== 0 && contest._count.signups > 0 && (
          <div className="text-xs text-blue-600 text-center">
            ℹ️ Admin will join
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContestsPage() {
  const { setLoading: setGlobalLoading } = useLoading();
  const [contests, setContests] = useState<Contest[]>([]);
  const [games, setGames] = useState<IPLGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tournamentFilter, setTournamentFilter] = useState<string>('ALL');
  const [tournaments, setTournaments] = useState<Array<{id: string, name: string}>>([]);
  const [selectedContests, setSelectedContests] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    contestType: '',
    maxParticipants: 10,
    iplGameId: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');
  const [showSignupsModal, setShowSignupsModal] = useState(false);
  const [selectedContestSignups, setSelectedContestSignups] = useState<any>(null);
  const [loadingSignups, setLoadingSignups] = useState(false);

  useEffect(() => {
    // First run cleanup for past due contests
    cleanupPastDueContests().then(() => {
      // Then fetch the updated contests
      fetchContests();
      fetchGames();
      fetchTournaments();
    });
  }, []);

  const cleanupPastDueContests = async () => {
    try {
      const response = await fetch('/api/admin/contests/cleanup', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.completedContests > 0 || result.cleanedUpSignups > 0) {
          console.log(`Cleanup completed: ${result.message}`);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

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

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/admin/tournaments');
      if (response.ok) {
        const data = await response.json();
        setTournaments(data);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchContestSignups = async (contestId: string) => {
    console.log('fetchContestSignups called with ID:', contestId);
    setLoadingSignups(true);
    try {
      console.log('Fetching from:', `/api/admin/contests/${contestId}/signups`);
      const response = await fetch(`/api/admin/contests/${contestId}/signups`);
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Received signups data:', data);
        setSelectedContestSignups(data);
        setShowSignupsModal(true);
      } else {
        console.error('Response not OK:', response.status, response.statusText);
        alert(`Failed to load signups: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching signups:', error);
      alert('Failed to load signups');
    } finally {
      setLoadingSignups(false);
    }
  };

  const removeUserFromContest = async (contestId: string, signupId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this contest?`)) {
      return;
    }

    setGlobalLoading(true, 'Removing user...');
    try {
      const response = await fetch(`/api/admin/contests/${contestId}/signups/${signupId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh the signups data
        await fetchContestSignups(contestId);
        // Refresh the contests list to update signup counts
        await fetchContests();
        setGlobalLoading(false);
      } else {
        setGlobalLoading(false);
        alert(result.message || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      setGlobalLoading(false);
      alert('Failed to remove user from contest');
    }
  };

  const updateContestStatus = async (contestId: string, newStatus: string) => {
    setGlobalLoading(true, 'Updating contest status...');
    try {
      const response = await fetch(`/api/admin/contests/${contestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchContests();
        setGlobalLoading(false);
        alert('Contest status updated successfully!');
      } else {
        const error = await response.json();
        setGlobalLoading(false);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating contest:', error);
      setGlobalLoading(false);
      alert('Error updating contest status');
    }
  };

  const endContest = async (contestId: string, forceEnd: boolean = false) => {
    if (!forceEnd && !confirm('Are you sure you want to end this contest? This will calculate winners/losers and update coin balances.')) {
      return;
    }

    setGlobalLoading(true, 'Ending contest and calculating results...');
    try {
      const url = forceEnd 
        ? `/api/admin/contests/${contestId}/end?force=true`
        : `/api/admin/contests/${contestId}/end`;
        
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        await fetchContests();
        setGlobalLoading(false);
        alert(`Contest ended successfully!\n\nResults:\n- Total Matchups: ${result.totalMatchups}\n- Winners Paid: ${result.winnersPaid}\n- Losers Charged: ${result.losersCharged}\n- Admin Fee Collected: ${result.adminFeeCollected} coins`);
      } else {
        const error = await response.json();
        setGlobalLoading(false);
        
        // Handle stats validation errors with force-end option
        if (error.canForce && (error.error === 'NO_STATS' || error.error === 'INSUFFICIENT_STATS')) {
          const forceConfirm = confirm(
            `⚠️ WARNING: ${error.message}\n\n` +
            `This could result in incorrect scores and coin transactions!\n\n` +
            `${error.details ? `Details:\n- Total Players: ${error.details.totalPlayers}\n- Players with Stats: ${error.details.playersWithStats}\n- Coverage: ${error.details.percentage}%\n\n` : ''}` +
            `Do you want to FORCE END anyway? (Not recommended)`
          );
          
          if (forceConfirm) {
            // Retry with force flag
            endContest(contestId, true);
          }
        } else {
          alert(`Error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error ending contest:', error);
      setGlobalLoading(false);
      alert('Error ending contest');
    }
  };

  const closeSignups = async (contestId: string) => {
    setGlobalLoading(true, 'Closing signups and generating matchups...');
    try {
      const response = await fetch(`/api/admin/contests/${contestId}/close-signups`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        await fetchContests();
        setGlobalLoading(false);
        alert(data.message);
      } else {
        const error = await response.json();
        setGlobalLoading(false);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error closing signups:', error);
      setGlobalLoading(false);
      alert('Error closing signups');
    }
  };

  const generateMatchups = async (contestId: string) => {
    if (!confirm('Generate random head-to-head matchups? This will pair up all signed-up users.')) {
      return;
    }

    setGlobalLoading(true, 'Generating matchups...');
    try {
      const response = await fetch(`/api/admin/contests/${contestId}/generate-matchups`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        await fetchContests();
        setGlobalLoading(false);
        alert(data.message);
      } else {
        const error = await response.json();
        setGlobalLoading(false);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error generating matchups:', error);
      setGlobalLoading(false);
      alert('Error generating matchups');
    }
  };

  const openDrafting = async (contestId: string) => {
    if (!confirm('Open the drafting window? Users will be able to start drafting their teams.')) {
      return;
    }

    setGlobalLoading(true, 'Opening drafting window...');
    try {
      const response = await fetch(`/api/admin/contests/${contestId}/open-drafting`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        await fetchContests();
        setGlobalLoading(false);
        alert(data.message);
      } else {
        const error = await response.json();
        setGlobalLoading(false);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error opening drafting:', error);
      setGlobalLoading(false);
      alert('Error opening drafting window');
    }
  };

  const reopenSignups = async (contestId: string) => {
    if (!confirm('Reopen signups? This will allow more users to join the contest. Existing matchups will be preserved.')) {
      return;
    }

    setGlobalLoading(true, 'Reopening signups...');
    try {
      const response = await fetch(`/api/admin/contests/${contestId}/reopen-signups`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        await fetchContests();
        setGlobalLoading(false);
        alert(data.message);
      } else {
        const error = await response.json();
        setGlobalLoading(false);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error reopening signups:', error);
      setGlobalLoading(false);
      alert('Error reopening signups');
    }
  };

  const handleSelectContest = (contestId: string) => {
    setSelectedContests(prev => 
      prev.includes(contestId)
        ? prev.filter(id => id !== contestId)
        : [...prev, contestId]
    )
  }

  const handleSelectAll = () => {
    const filteredContestIds = filteredContests.map(contest => contest.id)
    if (selectedContests.length === filteredContestIds.length) {
      setSelectedContests([])
    } else {
      setSelectedContests(filteredContestIds)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedContests.length === 0) {
      alert("Please select contests to delete")
      return
    }

    const selectedContestTitles = contests
      .filter(c => selectedContests.includes(c.id))
      .map(c => `${c.contestType} (${c.iplGame.title})`)
      .join(', ')

    if (!confirm(`Are you sure you want to delete ${selectedContests.length} contest(s)?\n\n${selectedContestTitles}\n\nThis action cannot be undone. Only contests without signups or matchups can be deleted.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const deletePromises = selectedContests.map(contestId =>
        fetch(`/api/admin/contests/${contestId}`, { method: "DELETE" })
      )

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.ok).length
      const failCount = results.length - successCount

      if (successCount > 0) {
        alert(`Successfully deleted ${successCount} contest(s)`)
        setSelectedContests([])
        fetchContests()
      }
      
      if (failCount > 0) {
        alert(`Failed to delete ${failCount} contest(s). They may have signups or matchups.`)
      }
    } catch (error) {
      alert("Network error during bulk delete")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError('');
    
    try {
      const response = await fetch('/api/admin/contests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        fetchContests();
        setShowCreateForm(false);
        setCreateForm({
          contestType: '',
          maxParticipants: 10,
          iplGameId: ''
        });
        alert('Contest created successfully!');
      } else {
        const error = await response.json();
        setCreateError(error.message || 'Failed to create contest');
      }
    } catch (error) {
      console.error('Error creating contest:', error);
      setCreateError('Network error occurred');
    } finally {
      setIsCreating(false);
    }
  }

  const filteredContests = contests
    .filter(contest => statusFilter === 'ALL' || contest.status === statusFilter)
    .filter(contest => tournamentFilter === 'ALL' || contest.iplGame.tournament.id === tournamentFilter);

  // Group contests by game
  const contestsByGame = filteredContests.reduce((acc, contest) => {
    const gameId = contest.iplGame.id;
    if (!acc[gameId]) {
      acc[gameId] = {
        game: contest.iplGame,
        contests: []
      };
    }
    acc[gameId].contests.push(contest);
    return acc;
  }, {} as Record<string, { game: IPLGame; contests: Contest[] }>);

  const gameGroups = Object.values(contestsByGame).sort((a, b) => 
    new Date(b.game.gameDate).getTime() - new Date(a.game.gameDate).getTime()
  );

  const toggleGameExpanded = (gameId: string) => {
    const newExpanded = new Set(expandedGames);
    if (newExpanded.has(gameId)) {
      newExpanded.delete(gameId);
    } else {
      newExpanded.add(gameId);
    }
    setExpandedGames(newExpanded);
  };

  const expandAll = () => {
    setExpandedGames(new Set(gameGroups.map(g => g.game.id)));
  };

  const collapseAll = () => {
    setExpandedGames(new Set());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SIGNUP_OPEN': return 'bg-green-100 text-green-800';
      case 'SIGNUP_CLOSED': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT_PHASE': return 'bg-blue-100 text-blue-800';
      case 'LIVE': return 'bg-purple-100 text-purple-800';
      case 'ACTIVE': return 'bg-purple-100 text-purple-800'; // Legacy status, treat as LIVE
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
      {/* Create Contest Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Contest</h3>
            
            <form onSubmit={handleSubmitCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contest Type</label>
                <select
                  value={createForm.contestType}
                  onChange={(e) => setCreateForm({...createForm, contestType: e.target.value})}
                  required
                  className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                >
                  <option value="">Select Contest Type</option>
                  <option value="HIGH_ROLLER">High Roller (100 coins)</option>
                  <option value="REGULAR">Regular (50 coins)</option>
                  <option value="LOW_STAKES">Low Stakes (25 coins)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Participants</label>
                <input
                  type="number"
                  value={createForm.maxParticipants}
                  onChange={(e) => setCreateForm({...createForm, maxParticipants: parseInt(e.target.value)})}
                  required
                  min="2"
                  className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">IPL Game</label>
                <select
                  value={createForm.iplGameId}
                  onChange={(e) => setCreateForm({...createForm, iplGameId: e.target.value})}
                  required
                  className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                >
                  <option value="">Select IPL Game</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.team1?.shortName} vs {game.team2?.shortName} | {new Date(game.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(game.gameDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </option>
                  ))}
                </select>
              </div>
              
              {createError && (
                <div className="text-red-600 text-sm">{createError}</div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold"
                >
                  {isCreating ? "Creating..." : "Create Contest"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError('');
                    setCreateForm({
                      contestType: '',
                      maxParticipants: 10,
                      iplGameId: ''
                    });
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-900 font-medium">Contests are automatically created when IPL games are scheduled</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Contest
        </button>
      </div>

      {/* Status Filter and Bulk Actions */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-2 text-gray-900 bg-white"
            >
              <option value="ALL">All Contests</option>
              <option value="SIGNUP_OPEN">Signup Open</option>
              <option value="SIGNUP_CLOSED">Signup Closed</option>
              <option value="DRAFT_PHASE">Draft Phase</option>
              <option value="LIVE">Live</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Filter by Tournament:</label>
            <select
              value={tournamentFilter}
              onChange={(e) => setTournamentFilter(e.target.value)}
              className="border rounded px-3 py-2 text-gray-900 bg-white"
            >
              <option value="ALL">All Tournaments</option>
              {tournaments.map(tournament => (
                <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">View Mode:</label>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-4 py-2 rounded-md font-medium transition-colors text-sm ${
                  viewMode === 'grouped' 
                    ? 'bg-white text-primary-700 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 By Game
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-md font-medium transition-colors text-sm ${
                  viewMode === 'table' 
                    ? 'bg-white text-primary-700 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Table
              </button>
            </div>
          </div>

          {viewMode === 'grouped' && (
            <div className="flex items-center gap-2 mt-7">
              <button
                onClick={expandAll}
                className="text-sm px-3 py-2 text-primary-600 hover:text-primary-700 font-medium border border-primary-300 rounded"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="text-sm px-3 py-2 text-gray-600 hover:text-gray-700 font-medium border border-gray-300 rounded"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

        {selectedContests.length > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            {isDeleting ? "Deleting..." : `Delete Selected (${selectedContests.length})`}
          </button>
        )}
      </div>

      {/* Grouped View by Game */}
      {viewMode === 'grouped' && (
        <div className="space-y-4">
          {gameGroups.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              No contests found. Create an IPL game to automatically generate contests.
            </div>
          ) : (
            gameGroups.map(({ game, contests: gameContests }) => {
              const isExpanded = expandedGames.has(game.id);
              const hasActiveContests = gameContests.some(c => c.status !== 'COMPLETED');
              
              return (
                <div key={game.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                  {/* Game Header - Always Visible */}
                  <div 
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      hasActiveContests ? 'bg-blue-50' : 'bg-gray-50'
                    }`}
                    onClick={() => toggleGameExpanded(game.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button className="text-gray-600 hover:text-gray-900">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{game.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: game.team1.color }}
                            ></span>
                            <span className="text-sm font-medium text-gray-700">{game.team1.shortName}</span>
                            <span className="text-xs text-gray-600">vs</span>
                            <span 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: game.team2.color }}
                            ></span>
                            <span className="text-sm font-medium text-gray-700">{game.team2.shortName}</span>
                          </div>
                        </div>
                      </div>
                      
                      <a
                        href={`/admin/stats?gameId=${game.id}`}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-bold shadow-md whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📊 Player Stats
                      </a>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Game: {new Date(game.gameDate).toLocaleDateString()} {new Date(game.gameDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-xs text-gray-500">
                          Signup by: {new Date(game.signupDeadline).toLocaleDateString()} {new Date(game.signupDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {gameContests.length} contest{gameContests.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contest Cards - Collapsible */}
                  {isExpanded && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <div className="grid md:grid-cols-3 gap-4">
                        {gameContests.map((contest) => (
                          <ContestCard 
                            key={contest.id}
                            contest={contest}
                            isSelected={selectedContests.includes(contest.id)}
                            onToggleSelect={handleSelectContest}
                            onCloseSignups={closeSignups}
                            onReopenSignups={reopenSignups}
                            onOpenDrafting={openDrafting}
                            onUpdateStatus={updateContestStatus}
                            onEndContest={endContest}
                            onViewSignups={fetchContestSignups}
                            getStatusColor={getStatusColor}
                            getContestTypeDisplay={getContestTypeDisplay}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Table View - Original */}
      {viewMode === 'table' && (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={filteredContests.length > 0 && selectedContests.length === filteredContests.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
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
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedContests.includes(contest.id)}
                    onChange={() => handleSelectContest(contest.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
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
                  {/* View Signups Button */}
                  {contest._count.signups > 0 && (
                    <button
                      onClick={() => fetchContestSignups(contest.id)}
                      className="block w-full px-3 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition text-center"
                      title="View users who signed up"
                    >
                      <Users className="inline-block h-4 w-4 mr-1" /> Signups ({contest._count.signups})
                    </button>
                  )}
                  
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
                      title="Reopen signups to allow more users to join (preserves existing matchups)"
                    >
                      🔓 Reopen Signups
                    </button>
                  )}
                  
                  {/* Open Drafting Button (for DRAFT_PHASE status) */}
                  {contest.status === 'DRAFT_PHASE' && (!contest.matchupStats || contest.matchupStats.drafting === 0) && (
                    <button
                      onClick={() => openDrafting(contest.id)}
                      className="block w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
                      title="Open the drafting window for all matchups"
                    >
                      🎯 Open Draft Window
                    </button>
                  )}

                  {/* Start Contest Button - transitions to LIVE */}
                  {contest.status === 'DRAFT_PHASE' && contest.matchupStats && (
                    contest.matchupStats.drafting > 0 || contest.matchupStats.completed > 0
                  ) && contest.matchupStats.completed > 0 && (
                    <button
                      onClick={() => updateContestStatus(contest.id, 'LIVE')}
                      className="block w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition mt-2"
                      title="Start the live contest (after drafts are complete)"
                    >
                      ▶️ Start Contest
                    </button>
                  )}
                  
                  {/* End Contest Button (when live or active) */}
                  {(contest.status === 'LIVE' || contest.status === 'ACTIVE') && (
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
      )}
      
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

      {/* Signups Modal */}
      {showSignupsModal && selectedContestSignups && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Contest Signups ({selectedContestSignups.signups.length})
                </h3>
                {selectedContestSignups.game && (
                  <p className="text-sm text-teal-50 mt-1">
                    {selectedContestSignups.game.title} • {selectedContestSignups.contest.contestType.replace('_', ' ')} ({selectedContestSignups.contest.coinValue} coins/point)
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowSignupsModal(false);
                  setSelectedContestSignups(null);
                }}
                className="text-white hover:text-teal-100 transition"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-auto flex-1 p-6">
              {loadingSignups ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading signups...</p>
                </div>
              ) : selectedContestSignups.signups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No signups yet for this contest.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Matchup Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedContestSignups.signups.map((signup: any, index: number) => {
                        // Get the first matchup (user could be user1 or user2 in matchups)
                        const matchup = signup.matchupsAsUser1?.[0] || signup.matchupsAsUser2?.[0];
                        return (
                          <tr key={signup.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{signup.user.name}</div>
                              <div className="text-xs text-gray-500">@{signup.user.username}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {signup.user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {matchup ? (
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  matchup.status === 'WAITING_DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                                  matchup.status === 'DRAFTING' ? 'bg-blue-100 text-blue-800' :
                                  matchup.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {matchup.status === 'WAITING_DRAFT' ? '⏳ Waiting' :
                                   matchup.status === 'DRAFTING' ? '✍️ Drafting' :
                                   matchup.status === 'COMPLETED' ? '✅ Completed' :
                                   matchup.status}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">No matchup</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => removeUserFromContest(
                                  selectedContestSignups.contest.id,
                                  signup.id,
                                  signup.user.name
                                )}
                                disabled={matchup !== undefined && matchup !== null}
                                className={`px-3 py-1 rounded text-xs font-medium transition ${
                                  matchup ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                                title={matchup ? 'Cannot remove user with active matchup' : 'Remove user from contest'}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowSignupsModal(false);
                  setSelectedContestSignups(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}