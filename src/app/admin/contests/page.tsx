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
            {(contest.status === 'DRAFT_PHASE' || contest.status === 'SIGNUP_CLOSED') &&
             (contest.matchupStats.drafting > 0 || contest.matchupStats.waiting > 0 || contest.matchupStats.completed > 0) && (
              <a
                href={`/admin/drafts?contest=${contest.id}`}
                className="inline-flex items-center gap-1 mt-1 px-2 py-1 bg-pink-100 text-pink-700 hover:bg-pink-200 rounded text-xs font-semibold transition"
              >
                ✍️ Manage Drafts →
              </a>
            )}
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
        {(contest._count.matchups > 0 || contest.status === 'SIGNUP_CLOSED') && (
          <a
            href={`/admin/contests/${contest.id}`}
            className="block w-full px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition text-center text-sm font-medium"
          >
            👁️ View Matchups ({contest._count.matchups})
          </a>
        )}

        {/* Close Signups */}
        {contest.status === 'SIGNUP_OPEN' && (
          <button
            onClick={() => onCloseSignups(contest.id)}
            className="block w-full px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition text-sm font-medium"
            title={contest._count.signups === 0
              ? 'Close contest (no signups)'
              : contest._count.signups === 1
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
        {contest.status === 'DRAFT_PHASE' && contest.matchupStats &&
         contest.matchupStats.waiting > 0 && (
          <button
            onClick={() => onOpenDrafting(contest.id)}
            className="block w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition text-sm font-medium"
          >
            🎯 Open Draft ({contest.matchupStats.waiting} waiting)
          </button>
        )}

        {/* Start Contest - Show when drafting is open and at least one draft is complete */}
        {(contest.status === 'DRAFT_PHASE' || contest.status === 'SIGNUP_CLOSED') && contest.matchupStats && (
          contest.matchupStats.drafting > 0 || contest.matchupStats.completed > 0
        ) && contest.matchupStats.completed > 0 && (
          <button
            onClick={() => onUpdateStatus(contest.id, 'START_CONTEST')}
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
    iplGameId: '',
    customCoinValue: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [showCompletedGames, setShowCompletedGames] = useState(false);
  const [showActiveGames, setShowActiveGames] = useState(true);
  const [recertifyingGame, setRecertifyingGame] = useState<string | null>(null);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');
  const [showSignupsModal, setShowSignupsModal] = useState(false);
  const [selectedContestSignups, setSelectedContestSignups] = useState<any>(null);
  const [loadingSignups, setLoadingSignups] = useState(false);
  const [addUserInput, setAddUserInput] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<{id: string, username: string, name: string}[]>([]);
  const [allUsers, setAllUsers] = useState<{id: string, username: string, name: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenContestId, setReopenContestId] = useState<string | null>(null);
  const [reopenDeadline, setReopenDeadline] = useState('');

  useEffect(() => {
    // Throttle cleanup to once per hour per admin session to avoid hitting the DB on every page load
    const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
    const lastCleanup = parseInt(sessionStorage.getItem('adminLastCleanup') ?? '0', 10);
    const shouldCleanup = Date.now() - lastCleanup > CLEANUP_INTERVAL_MS;

    const init = async () => {
      if (shouldCleanup) {
        await cleanupPastDueContests();
        sessionStorage.setItem('adminLastCleanup', String(Date.now()));
      }
      // All three fetches are independent — run in parallel
      await Promise.all([fetchContests(), fetchGames(), fetchTournaments()]);
    };
    init();
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
    setLoadingSignups(true);
    try {
      const response = await fetch(`/api/admin/contests/${contestId}/signups`);
      if (response.ok) {
        const data = await response.json();
        setSelectedContestSignups(data);
        setShowSignupsModal(true);
        setAddUserInput(''); setAddUserError(''); setUserSuggestions([]); setShowSuggestions(false);
        // Always (re)load users for autocomplete
        fetch('/api/admin/users')
          .then(r => r.json())
          .then(d => setAllUsers((d.users || []).map((u: any) => ({ id: u.id, username: u.username, name: u.name }))))
          .catch(() => {});
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

  const addUserToContest = async () => {
    if (!addUserInput.trim() || !selectedContestSignups) return;
    setAddingUser(true);
    setShowSuggestions(false);
    setAddUserError('');
    try {
      const response = await fetch(`/api/admin/contests/${selectedContestSignups.contest.id}/signups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: addUserInput.trim() }),
      });
      const result = await response.json();
      if (response.ok) {
        setAddUserInput('');
        await fetchContestSignups(selectedContestSignups.contest.id);
        await fetchContests();
      } else {
        setAddUserError(result.message || 'Failed to add user');
      }
    } catch (error) {
      setAddUserError('Failed to add user');
    } finally {
      setAddingUser(false);
    }
  };

  const startContest = async (contestId: string) => {
    // Find the contest to check matchup stats
    const contest = contests.find(c => c.id === contestId);
    
    if (contest?.matchupStats) {
      const incompleteDrafts = contest.matchupStats.waiting + contest.matchupStats.drafting;
      
      if (incompleteDrafts > 0) {
        const confirmMessage = [
          '⚠️ WARNING: Not all matchups have completed drafting!\n',
          `Status:`,
          `• ✅ Completed: ${contest.matchupStats.completed}`,
          `• ✍️ Drafting: ${contest.matchupStats.drafting}`,
          `• ⏳ Waiting: ${contest.matchupStats.waiting}`,
          `\nTotal Incomplete: ${incompleteDrafts} matchup(s)`,
          `\nStarting the contest now may affect users who haven't finished drafting.`,
          `\nDo you want to proceed anyway?`
        ].join('\n');
        
        if (!confirm(confirmMessage)) {
          return; // Cancel the start
        }
      }
    }
    
    // Proceed with starting the contest
    updateContestStatus(contestId, 'LIVE');
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

  const toLocalDateTimeInput = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const reopenSignups = (contestId: string) => {
    // Pre-fill with now + 2 hours
    setReopenDeadline(toLocalDateTimeInput(new Date(Date.now() + 2 * 60 * 60 * 1000)));
    setReopenContestId(contestId);
    setShowReopenModal(true);
  };

  const confirmReopenSignups = async () => {
    if (!reopenContestId || !reopenDeadline) return;
    setShowReopenModal(false);
    setGlobalLoading(true, 'Reopening signups...');
    try {
      const response = await fetch(`/api/admin/contests/${reopenContestId}/reopen-signups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDeadline: new Date(reopenDeadline).toISOString() }),
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
    } finally {
      setReopenContestId(null);
      setReopenDeadline('');
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
      const requestBody: any = {
        contestType: createForm.contestType,
        maxParticipants: createForm.maxParticipants,
        iplGameId: createForm.iplGameId
      };
      
      // If custom contest type, include the custom coin value
      if (createForm.contestType === 'CUSTOM') {
        requestBody.customCoinValue = parseInt(createForm.customCoinValue);
      }
      
      const response = await fetch('/api/admin/contests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        fetchContests();
        setShowCreateForm(false);
        setCreateForm({
          contestType: '',
          maxParticipants: 10,
          iplGameId: '',
          customCoinValue: ''
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
    new Date(a.game.gameDate).getTime() - new Date(b.game.gameDate).getTime()
  );

  // Split into upcoming/active vs fully completed for UI sections
  const activeGameGroups = gameGroups.filter(g => g.contests.some(c => c.status !== 'COMPLETED'));
  const completedGameGroups = gameGroups.filter(g => g.contests.every(c => c.status === 'COMPLETED'));

  const toggleGameExpanded = (gameId: string) => {
    const newExpanded = new Set(expandedGames);
    if (newExpanded.has(gameId)) {
      newExpanded.delete(gameId);
    } else {
      newExpanded.add(gameId);
    }
    setExpandedGames(newExpanded);
  };

  const recertifyGame = async (gameId: string, gameTitle: string) => {
    if (!confirm(
      `Re-Certify all contests for "${gameTitle}"?\n\n` +
      `This will recalculate scores for every completed matchup under this game, ` +
      `reverse and rewrite all WIN/LOSS transactions based on the latest stats, ` +
      `and update coin balances accordingly.\n\n` +
      `Only do this if player stats were corrected after settlement.`
    )) return;
    setRecertifyingGame(gameId);
    try {
      const res = await fetch(`/api/admin/games/${gameId}/recertify`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const changed = data.changedMatchups;
        alert(
          `✅ Re-Certification complete for ${gameTitle}\n\n` +
          `• Matchups processed: ${data.totalMatchups}\n` +
          `• Scores changed: ${changed}\n` +
          `• Transactions reversed & rewritten: ${data.totalTransactionsReversed}\n` +
          `• Admin fee collected: ${data.totalAdminFeeCollected} coins\n\n` +
          (changed > 0
            ? data.matchups.filter((m: any) => m.changed).map((m: any) =>
                `  ${m.user1} vs ${m.user2} [${m.contestCoinValue}c]: ` +
                `${m.oldUser1Score.toFixed(1)}–${m.oldUser2Score.toFixed(1)} → ` +
                `${m.newUser1Score.toFixed(1)}–${m.newUser2Score.toFixed(1)} (${m.result})`
              ).join('\n')
            : 'No scores changed — all results remain the same.')
        );
        fetchContests();
      } else {
        alert(`❌ Re-Certification failed: ${data.message}`);
      }
    } catch {
      alert('❌ Re-Certification failed — network error');
    } finally {
      setRecertifyingGame(null);
    }
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
          <div className="flex items-center justify-between py-3 md:py-6">
            <div className="flex items-center gap-4">
              <a
                href="/admin/dashboard"
                className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </a>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-400 rounded-full flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-lg md:text-2xl font-bold text-white">Contest Types Management</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
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
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              
              {createForm.contestType === 'CUSTOM' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Coin Value</label>
                  <input
                    type="number"
                    value={createForm.customCoinValue}
                    onChange={(e) => setCreateForm({...createForm, customCoinValue: e.target.value})}
                    required
                    min="1"
                    placeholder="Enter coin value"
                    className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                  />
                </div>
              )}
              
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
                      iplGameId: '',
                      customCoinValue: ''
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

      <div className="flex justify-between items-center mb-3 md:mb-6">
        <p className="hidden sm:block text-gray-900 font-medium text-sm">Contests are automatically created when IPL games are scheduled</p>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors text-sm"
        >
          <Plus className="h-4 w-4 md:h-5 md:w-5" />
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
        <div className="space-y-8">
          {gameGroups.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              No contests found. Create an IPL game to automatically generate contests.
            </div>
          ) : (
            <>
              {/* ── Upcoming / Active Games ── */}
              {activeGameGroups.length > 0 && (
                <div>
                  <button
                    className="flex items-center gap-3 mb-3 w-full text-left group"
                    onClick={() => setShowActiveGames(v => !v)}
                  >
                    <span className="text-lg font-bold text-gray-900">🟢 Upcoming / Active Games</span>
                    <span className="text-sm text-gray-500 bg-gray-100 rounded-full px-3 py-0.5">{activeGameGroups.length} game{activeGameGroups.length !== 1 ? 's' : ''}</span>
                    <span className="ml-1 text-gray-400 group-hover:text-gray-600 transition-colors">
                      {showActiveGames ? <ChevronUp className="h-5 w-5 inline" /> : <ChevronDown className="h-5 w-5 inline" />}
                    </span>
                    <span className="text-xs text-gray-400 group-hover:text-gray-500">{showActiveGames ? 'Hide' : 'Show'}</span>
                  </button>
                  {showActiveGames && <div className="space-y-4">
                    {activeGameGroups.map(({ game, contests: gameContests }) => {
                      const isExpanded = expandedGames.has(game.id);
                      return (
                        <div key={game.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                          <div className="p-3 md:p-4 cursor-pointer hover:bg-blue-100 transition-colors bg-blue-50" onClick={() => toggleGameExpanded(game.id)}>
                            <div className="flex items-center gap-2">
                              <button className="text-gray-600 hover:text-gray-900 flex-shrink-0">
                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm md:text-lg font-bold text-gray-900 truncate">{game.title}</h3>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: game.team1.color }}></span>
                                    <span className="text-xs font-medium text-gray-700">{game.team1.shortName}</span>
                                    <span className="text-xs text-gray-500">vs</span>
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: game.team2.color }}></span>
                                    <span className="text-xs font-medium text-gray-700">{game.team2.shortName}</span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {new Date(game.gameDate).toLocaleDateString()} {new Date(game.gameDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  <span className="mx-1 text-gray-300">·</span>
                                  {gameContests.length} contest{gameContests.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                              <a href={`/admin/stats?gameId=${game.id}`} className="px-2 py-1.5 md:px-6 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs md:text-sm font-bold shadow-md whitespace-nowrap flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                📊<span className="hidden sm:inline"> Stats</span>
                              </a>
                            </div>
                          </div>
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
                                    onUpdateStatus={(id, status) => { if (status === 'START_CONTEST') { startContest(id); } else { updateContestStatus(id, status); } }}
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
                    })}
                  </div>}
                </div>
              )}

              {/* ── Completed Games ── */}
              {completedGameGroups.length > 0 && (
                <div>
                  <button
                    className="flex items-center gap-3 mb-3 w-full text-left group"
                    onClick={() => setShowCompletedGames(v => !v)}
                  >
                    <span className="text-lg font-bold text-gray-500">✅ Completed Games</span>
                    <span className="text-sm text-gray-400 bg-gray-100 rounded-full px-3 py-0.5">{completedGameGroups.length} game{completedGameGroups.length !== 1 ? 's' : ''}</span>
                    <span className="ml-1 text-gray-400 group-hover:text-gray-600 transition-colors">
                      {showCompletedGames ? <ChevronUp className="h-5 w-5 inline" /> : <ChevronDown className="h-5 w-5 inline" />}
                    </span>
                    <span className="text-xs text-gray-400 group-hover:text-gray-500">{showCompletedGames ? 'Hide' : 'Show'}</span>
                  </button>
                  {showCompletedGames && <div className="space-y-4 opacity-75">
                    {completedGameGroups.map(({ game, contests: gameContests }) => {
                      const isExpanded = expandedGames.has(game.id);
                      return (
                        <div key={game.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                          <div className="p-3 md:p-4 cursor-pointer hover:bg-gray-100 transition-colors bg-gray-50" onClick={() => toggleGameExpanded(game.id)}>
                            <div className="flex items-center gap-2">
                              <button className="text-gray-600 hover:text-gray-900 flex-shrink-0">
                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm md:text-lg font-bold text-gray-900 truncate">{game.title}</h3>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: game.team1.color }}></span>
                                    <span className="text-xs font-medium text-gray-700">{game.team1.shortName}</span>
                                    <span className="text-xs text-gray-500">vs</span>
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: game.team2.color }}></span>
                                    <span className="text-xs font-medium text-gray-700">{game.team2.shortName}</span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {new Date(game.gameDate).toLocaleDateString()} {new Date(game.gameDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  <span className="mx-1 text-gray-300">·</span>
                                  {gameContests.length} contest{gameContests.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <a href={`/admin/stats?gameId=${game.id}`} className="px-2 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs md:text-sm font-bold shadow-md whitespace-nowrap">
                                  📊<span className="hidden sm:inline"> Stats</span>
                                </a>
                                <button
                                  onClick={() => recertifyGame(game.id, game.title)}
                                  disabled={recertifyingGame === game.id}
                                  className="px-2 py-1.5 md:px-4 md:py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-lg transition text-xs md:text-sm font-bold shadow-md whitespace-nowrap disabled:cursor-not-allowed"
                                >
                                  {recertifyingGame === game.id ? '⏳' : <span>🔁<span className="hidden sm:inline"> Re-Certify</span></span>}
                                </button>
                              </div>
                            </div>
                          </div>
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
                                    onUpdateStatus={(id, status) => { if (status === 'START_CONTEST') { startContest(id); } else { updateContestStatus(id, status); } }}
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
                    })}
                  </div>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Table View - Original */}
      {viewMode === 'table' && (
      <div className="bg-white rounded-lg shadow">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                <input
                  type="checkbox"
                  checked={filteredContests.length > 0 && selectedContests.length === filteredContests.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Game
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Signups
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Schedule
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredContests.map((contest) => (
              <tr key={contest.id}>
                <td className="px-3 py-4">
                  <input
                    type="checkbox"
                    checked={selectedContests.includes(contest.id)}
                    onChange={() => handleSelectContest(contest.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
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
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="font-medium text-lg text-blue-600">
                    {getContestTypeDisplay(contest.contestType, contest.coinValue)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Max: {contest.maxParticipants}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
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
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{new Date(contest.iplGame.gameDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                  <div className="text-xs text-gray-500">
                    by {new Date(contest.iplGame.signupDeadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contest.status)}`}>
                    {contest.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium space-y-2">
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
                  {(contest._count.matchups > 0 || contest.status === 'SIGNUP_CLOSED') && (
                    <a
                      href={`/admin/contests/${contest.id}`}
                      className="block w-full px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition text-center"
                      title="View matchups and draft details"
                    >
                      👁️ View Matchups ({contest._count.matchups})
                    </a>
                  )}
                  
                  {/* Step 1: Close Signups */}
                  {contest.status === 'SIGNUP_OPEN' && (
                    <button
                      onClick={() => closeSignups(contest.id)}
                      className="block w-full px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                      title={contest._count.signups === 0
                        ? 'Close contest (no signups)'
                        : contest._count.signups === 1
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
                  
                  {/* Open Drafting Button (for DRAFT_PHASE or SIGNUP_CLOSED status) */}
                  {(contest.status === 'DRAFT_PHASE' || contest.status === 'SIGNUP_CLOSED') && contest.matchupStats && contest.matchupStats.waiting > 0 && (
                    <button
                      onClick={() => openDrafting(contest.id)}
                      className="block w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
                      title="Open the drafting window for all waiting matchups"
                    >
                      🎯 Open Draft ({contest.matchupStats.waiting} waiting)
                    </button>
                  )}

                  {/* Start Contest Button - transitions to LIVE */}
                  {(contest.status === 'DRAFT_PHASE' || contest.status === 'SIGNUP_CLOSED') && contest.matchupStats && (
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
      
      {/* Contest Management Workflow */}
      <div className="mt-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-4 group"
          onClick={() => setShowWorkflow(v => !v)}
        >
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-lg font-bold text-slate-800">Contest Management Workflow</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-600 transition-colors">
            <span className="text-xs">{showWorkflow ? 'Hide' : 'Show'}</span>
            {showWorkflow ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </button>

        {showWorkflow && <div className="px-6 pb-6">

        {/* Step Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* 1 */}
          <div className="bg-white rounded-xl p-3 text-center border border-slate-200 shadow-sm">
            <div className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">1</div>
            <div className="text-xl mb-1">🏏</div>
            <div className="font-bold text-slate-800 text-xs mb-0.5">Create Game</div>
            <div className="text-slate-500 text-xs">Contests auto-generated (25/50/100 VC)</div>
          </div>
          {/* 2 */}
          <div className="bg-white rounded-xl p-3 text-center border border-slate-200 shadow-sm">
            <div className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">2</div>
            <div className="text-xl mb-1">🟢</div>
            <div className="font-bold text-slate-800 text-xs mb-0.5">Signups Open</div>
            <div className="text-slate-500 text-xs">Users register for the contest</div>
          </div>
          {/* 3 — admin */}
          <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-300 shadow-sm">
            <div className="w-7 h-7 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">3</div>
            <div className="text-xl mb-1">🔒</div>
            <div className="font-bold text-yellow-800 text-xs mb-0.5">Close Signups</div>
            <div className="text-yellow-700 text-xs">Bot joins if odd · matchups auto-generated</div>
            <div className="mt-1.5 text-yellow-600 text-[10px] font-semibold uppercase tracking-wide">👤 Admin Action</div>
          </div>
          {/* 4 — admin */}
          <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-300 shadow-sm">
            <div className="w-7 h-7 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">4</div>
            <div className="text-xl mb-1">🎯</div>
            <div className="font-bold text-purple-800 text-xs mb-0.5">Open Draft</div>
            <div className="text-purple-700 text-xs">Each matchup opens for team selection</div>
            <div className="mt-1.5 text-purple-600 text-[10px] font-semibold uppercase tracking-wide">👤 Admin Action</div>
          </div>
          {/* 5 */}
          <div className="bg-white rounded-xl p-3 text-center border border-slate-200 shadow-sm">
            <div className="w-7 h-7 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">5</div>
            <div className="text-xl mb-1">✏️</div>
            <div className="font-bold text-slate-800 text-xs mb-0.5">Users Draft</div>
            <div className="text-slate-500 text-xs">Both players pick 7-player squads</div>
          </div>
          {/* 6 — admin */}
          <div className="bg-green-50 rounded-xl p-3 text-center border border-green-300 shadow-sm">
            <div className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">6</div>
            <div className="text-xl mb-1">▶️</div>
            <div className="font-bold text-green-800 text-xs mb-0.5">Start Contest</div>
            <div className="text-green-700 text-xs">Once ≥1 matchup draft is complete</div>
            <div className="mt-1.5 text-green-600 text-[10px] font-semibold uppercase tracking-wide">👤 Admin Action</div>
          </div>
          {/* 7 */}
          <div className="bg-white rounded-xl p-3 text-center border border-slate-200 shadow-sm">
            <div className="w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">7</div>
            <div className="text-xl mb-1">🔴</div>
            <div className="font-bold text-slate-800 text-xs mb-0.5">Live</div>
            <div className="text-slate-500 text-xs">IPL match running · scores updating</div>
          </div>
          {/* 8 — admin */}
          <div className="bg-red-50 rounded-xl p-3 text-center border border-red-300 shadow-sm">
            <div className="w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">8</div>
            <div className="text-xl mb-1">🏁</div>
            <div className="font-bold text-red-800 text-xs mb-0.5">End Contest</div>
            <div className="text-red-700 text-xs">Winners settled · 10% admin fee deducted</div>
            <div className="mt-1.5 text-red-600 text-[10px] font-semibold uppercase tracking-wide">👤 Admin Action</div>
          </div>
        </div>

        {/* Flow arrows row (desktop only) */}
        <div className="hidden md:flex items-center justify-around px-2 mb-4 -mt-1">
          {['→','→','→','→','→','→','→'].map((a, i) => (
            <span key={i} className="text-slate-400 text-sm font-bold">{a}</span>
          ))}
        </div>

        {/* Notes */}
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <div className="text-xs bg-white rounded-lg px-3 py-1.5 text-slate-600 border border-slate-200 shadow-sm">
            🤖 <strong className="text-slate-800">Bot:</strong> Auto-fills odd slots so every player has an opponent
          </div>
          <div className="text-xs bg-white rounded-lg px-3 py-1.5 text-slate-600 border border-slate-200 shadow-sm">
            🔓 <strong className="text-slate-800">Reopen Signups:</strong> Available from DRAFT_PHASE to go back
          </div>
          <div className="text-xs bg-white rounded-lg px-3 py-1.5 text-slate-600 border border-slate-200 shadow-sm">
            💰 <strong className="text-slate-800">Fee:</strong> Winner takes all minus 10% admin cut
          </div>
        </div>
        </div>}
      </div>
      </div>

      {/* Signups Modal */}
      {showSignupsModal && selectedContestSignups && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 md:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-base md:text-xl font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 shrink-0" />
                  Signups ({selectedContestSignups.signups.length})
                </h3>
                {selectedContestSignups.game && (
                  <p className="text-xs md:text-sm text-teal-50 mt-0.5 truncate">
                    {selectedContestSignups.game.title} · {selectedContestSignups.contest.coinValue} coins/pt
                  </p>
                )}
              </div>
              <button
                onClick={() => { setShowSignupsModal(false); setSelectedContestSignups(null); }}
                className="text-white hover:text-teal-100 transition text-xl shrink-0 ml-3"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-auto flex-1 p-3 md:p-6">
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
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matchup Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedContestSignups.signups.map((signup: any, index: number) => {
                          const matchup = signup.matchupsAsUser1?.[0] || signup.matchupsAsUser2?.[0];
                          return (
                            <tr key={signup.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-medium text-gray-900">{signup.user.name}</div>
                                  {signup.entryNumber > 1 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800">#{signup.entryNumber}</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">@{signup.user.username}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{signup.user.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {matchup ? (
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${matchup.status === 'WAITING_DRAFT' ? 'bg-yellow-100 text-yellow-800' : matchup.status === 'DRAFTING' ? 'bg-blue-100 text-blue-800' : matchup.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {matchup.status === 'WAITING_DRAFT' ? '⏳ Waiting' : matchup.status === 'DRAFTING' ? '✍️ Drafting' : matchup.status === 'COMPLETED' ? '✅ Completed' : matchup.status}
                                  </span>
                                ) : <span className="text-xs text-gray-400 italic">No matchup</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => removeUserFromContest(selectedContestSignups.contest.id, signup.id, signup.user.name)}
                                  disabled={matchup !== undefined && matchup !== null}
                                  className={`px-3 py-1 rounded text-xs font-medium transition ${matchup ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}`}
                                  title={matchup ? 'Cannot remove user with active matchup' : 'Remove user from contest'}
                                >Remove</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile card list */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {selectedContestSignups.signups.map((signup: any, index: number) => {
                      const matchup = signup.matchupsAsUser1?.[0] || signup.matchupsAsUser2?.[0];
                      return (
                        <div key={signup.id} className="py-3 flex items-center gap-3">
                          <div className="text-xs font-bold text-gray-400 w-5 shrink-0">{index + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className="text-sm font-semibold text-gray-900 truncate">{signup.user.name}</div>
                              {signup.entryNumber > 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 shrink-0">#{signup.entryNumber}</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">@{signup.user.username}</div>
                            <div className="text-xs text-gray-400 truncate">{signup.user.email}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {matchup ? (
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${matchup.status === 'WAITING_DRAFT' ? 'bg-yellow-100 text-yellow-800' : matchup.status === 'DRAFTING' ? 'bg-blue-100 text-blue-800' : matchup.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {matchup.status === 'WAITING_DRAFT' ? '⏳' : matchup.status === 'DRAFTING' ? '✍️' : matchup.status === 'COMPLETED' ? '✅' : ''} {matchup.status === 'WAITING_DRAFT' ? 'Waiting' : matchup.status === 'DRAFTING' ? 'Drafting' : matchup.status === 'COMPLETED' ? 'Done' : matchup.status}
                              </span>
                            ) : <span className="text-xs text-gray-400 italic">No matchup</span>}
                            <button
                              onClick={() => removeUserFromContest(selectedContestSignups.contest.id, signup.id, signup.user.name)}
                              disabled={matchup !== undefined && matchup !== null}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition ${matchup ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}`}
                            >Remove</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            
            <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 space-y-3">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Username to add..."
                    value={addUserInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAddUserInput(val);
                      setAddUserError('');
                      const q = val.toLowerCase().trim();
                      const filtered = q
                        ? allUsers.filter(u =>
                            u.username.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q)
                          ).slice(0, 8)
                        : allUsers.slice(0, 8);
                      setUserSuggestions(filtered);
                      setShowSuggestions(filtered.length > 0);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setShowSuggestions(false); addUserToContest(); } if (e.key === 'Escape') setShowSuggestions(false); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    onFocus={() => {
                      const q = addUserInput.toLowerCase().trim();
                      const filtered = q
                        ? allUsers.filter(u => u.username.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q)).slice(0, 8)
                        : allUsers.slice(0, 8);
                      if (filtered.length > 0) { setUserSuggestions(filtered); setShowSuggestions(true); }
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {showSuggestions && userSuggestions.length > 0 && (
                    <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {userSuggestions.map(u => (
                        <li
                          key={u.id}
                          onMouseDown={() => { setAddUserInput(u.username); setShowSuggestions(false); }}
                          className="px-3 py-2 text-sm hover:bg-teal-50 cursor-pointer flex items-center gap-2"
                        >
                          <span className="font-medium text-gray-900">@{u.username}</span>
                          {u.name && <span className="text-gray-400 text-xs">{u.name}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  onClick={addUserToContest}
                  disabled={!addUserInput.trim() || addingUser}
                  className="px-4 py-1.5 bg-teal-600 text-white rounded text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {addingUser ? 'Adding...' : '+ Add User'}
                </button>
                <button
                  onClick={() => { setShowSignupsModal(false); setSelectedContestSignups(null); setAddUserInput(''); setAddUserError(''); setUserSuggestions([]); setShowSuggestions(false); }}
                  className="px-4 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm whitespace-nowrap"
                >
                  Close
                </button>
              </div>
              {addUserError && (
                <p className="text-xs text-red-600 font-medium">{addUserError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reopen Signups Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-xl">
              <h2 className="text-lg font-bold text-white">🔓 Reopen Signups</h2>
              <p className="text-green-100 text-sm mt-0.5">Set a new deadline so users can join again</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                ⚠️ This extends the signup deadline for <strong>all contests on the same game</strong>. Existing matchups and picks are preserved.
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  New Signup Deadline
                </label>
                <input
                  type="datetime-local"
                  value={reopenDeadline}
                  onChange={(e) => setReopenDeadline(e.target.value)}
                  min={toLocalDateTimeInput(new Date())}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">Must be a future date/time</p>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReopenModal(false);
                  setReopenContestId(null);
                  setReopenDeadline('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmReopenSignups}
                disabled={!reopenDeadline || new Date(reopenDeadline) <= new Date()}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✅ Reopen Signups
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}