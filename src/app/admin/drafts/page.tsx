'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  isBench: boolean;
  player: {
    id: string;
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

interface AvailablePlayer {
  id: string;
  name: string;
  role: string;
  iplTeam: { shortName: string; id: string };
}

function DraftPageInner() {
  const searchParams = useSearchParams();
  const contestParam = searchParams.get('contest');

  const [contests, setContests] = useState<Contest[]>([]);
  const [matchups, setMatchups] = useState<HeadToHeadMatchup[]>([]);
  const [selectedContest, setSelectedContest] = useState<string>('');
  const [selectedMatchup, setSelectedMatchup] = useState<HeadToHeadMatchup | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActiveDrafts, setShowActiveDrafts] = useState(true);
  const [showCompletedDrafts, setShowCompletedDrafts] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  // Edit picks state
  const [showEditPicks, setShowEditPicks] = useState(false);
  const [editPicksLoading, setEditPicksLoading] = useState(false);
  const [allPlayers, setAllPlayers] = useState<AvailablePlayer[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({}); // pickId -> newPlayerId
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set()); // pickIds to delete
  const [pendingAdditions, setPendingAdditions] = useState<Array<{ playerId: string; userSignupId: string; isBench: boolean }>>([]); // picks to add
  const [savingPicks, setSavingPicks] = useState(false);
  const [editSearch, setEditSearch] = useState('');
  const [addPickPlayer, setAddPickPlayer] = useState('');
  const [addPickUser, setAddPickUser] = useState<'user1' | 'user2'>('user1');
  const [addPickIsBench, setAddPickIsBench] = useState(false);
  const [benchOrderOverride, setBenchOrderOverride] = useState<Record<string, string[]>>({}); // userId → ordered bench pickIds

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
          ['SIGNUP_CLOSED', 'DRAFT_PHASE', 'LIVE', 'COMPLETED'].includes(c.status)
        );
        setContests(draftableContests);
        // Auto-select contest from URL param
        if (contestParam && draftableContests.find((c: Contest) => c.id === contestParam)) {
          setSelectedContest(contestParam);
          // If it's completed, expand that section
          const c = draftableContests.find((c: Contest) => c.id === contestParam);
          if (c?.status === 'COMPLETED') setShowCompletedDrafts(true);
        }
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

  const openEditPicks = async (matchupId: string) => {
    // Initialize bench order from currently selected matchup
    if (selectedMatchup) {
      const initOrder: Record<string, string[]> = {};
      for (const uid of [selectedMatchup.user1.id, selectedMatchup.user2.id]) {
        initOrder[uid] = selectedMatchup.draftPicks
          .filter(p => p.pickedByUserId === uid && p.isBench)
          .sort((a, b) => a.pickOrder - b.pickOrder)
          .map(p => p.id);
      }
      setBenchOrderOverride(initOrder);
    }
    setEditPicksLoading(true);
    setPendingChanges({});
    setPendingDeletes(new Set());
    setPendingAdditions([]);
    setAddPickPlayer('');
    setAddPickUser('user1');
    setAddPickIsBench(false);
    setEditSearch('');
    setShowEditPicks(true);
    try {
      const res = await fetch(`/api/admin/matchups/${matchupId}/picks`);
      if (res.ok) {
        const data = await res.json();
        setAllPlayers(data.allPlayers);
      } else {
        alert('Failed to load player data');
        setShowEditPicks(false);
      }
    } catch {
      alert('Error loading player data');
      setShowEditPicks(false);
    } finally {
      setEditPicksLoading(false);
    }
  };

  const savePickChanges = async () => {
    if (!selectedMatchup) return;

    // Compute bench changes vs original matchup state
    type BenchChange = { type: 'swap'; ids: [string, string] } | { type: 'flip'; pickId: string; isBench: boolean };
    const benchChanges: BenchChange[] = [];
    for (const uid of [selectedMatchup.user1.id, selectedMatchup.user2.id]) {
      const orig = selectedMatchup.draftPicks
        .filter(p => p.pickedByUserId === uid && p.isBench)
        .sort((a, b) => a.pickOrder - b.pickOrder)
        .map(p => p.id);
      const intended = benchOrderOverride[uid] ?? orig;
      for (const id of intended) { if (!orig.includes(id) && !pendingDeletes.has(id)) benchChanges.push({ type: 'flip', pickId: id, isBench: true }); }
      for (const id of orig) { if (!intended.includes(id) && !pendingDeletes.has(id)) benchChanges.push({ type: 'flip', pickId: id, isBench: false }); }
      const still = orig.filter(id => intended.includes(id) && !pendingDeletes.has(id));
      if (still.length === 2) {
        const intStill = intended.filter(id => still.includes(id));
        if (intStill.length === 2 && intStill[0] !== still[0]) benchChanges.push({ type: 'swap', ids: [still[0], still[1]] });
      }
    }

    const hasChanges = Object.keys(pendingChanges).length > 0 || pendingDeletes.size > 0 || pendingAdditions.length > 0 || benchChanges.length > 0;
    if (!hasChanges) { setShowEditPicks(false); return; }

    setSavingPicks(true);
    try {
      let successCount = 0;
      const errors: string[] = [];

      // 1. Deletions first
      for (const pickId of pendingDeletes) {
        const res = await fetch(`/api/admin/matchups/${selectedMatchup.id}/picks`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pickId }),
        });
        if (res.ok) successCount++;
        else { const err = await res.json(); errors.push(err.error || 'Delete failed'); }
      }

      // 2. Bench priority swaps (before flips to avoid conflicts)
      for (const c of benchChanges.filter(c => c.type === 'swap')) {
        const res = await fetch(`/api/admin/matchups/${selectedMatchup.id}/picks`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ swapPickOrders: (c as { type: 'swap'; ids: [string, string] }).ids }),
        });
        if (res.ok) successCount++;
        else { const err = await res.json(); errors.push(err.error || 'Bench reorder failed'); }
      }

      // 3. Bench status flips
      for (const c of benchChanges.filter(c => c.type === 'flip')) {
        const fc = c as { type: 'flip'; pickId: string; isBench: boolean };
        const res = await fetch(`/api/admin/matchups/${selectedMatchup.id}/picks`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pickId: fc.pickId, isBench: fc.isBench }),
        });
        if (res.ok) successCount++;
        else { const err = await res.json(); errors.push(err.error || 'Bench flip failed'); }
      }

      // 4. Replacements (skip deleted picks)
      for (const [pickId, newPlayerId] of Object.entries(pendingChanges)) {
        if (pendingDeletes.has(pickId)) continue;
        const res = await fetch(`/api/admin/matchups/${selectedMatchup.id}/picks`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pickId, newPlayerId }),
        });
        if (res.ok) successCount++;
        else { const err = await res.json(); errors.push(err.error || 'Unknown error'); }
      }

      // 5. Additions
      for (const addition of pendingAdditions) {
        const res = await fetch(`/api/admin/matchups/${selectedMatchup.id}/add-pick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: addition.playerId, userSignupId: addition.userSignupId, isBench: addition.isBench, adminOverride: true }),
        });
        if (res.ok) successCount++;
        else { const err = await res.json(); errors.push(err.error || 'Add failed'); }
      }

      if (errors.length > 0) {
        alert(`${successCount} change(s) applied. Errors:\n${errors.join('\n')}`);
      } else {
        alert(`✅ ${successCount} change(s) applied successfully.`);
      }
      if (selectedContest) fetchMatchups(selectedContest);
      setShowEditPicks(false);
      setSelectedMatchup(null);
    } catch {
      alert('Failed to save changes');
    } finally {
      setSavingPicks(false);
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

  // Computed bench change count vs original matchup state (for footer display)
  const benchChangeCount = (() => {
    if (!selectedMatchup || !showEditPicks) return 0;
    let n = 0;
    for (const uid of [selectedMatchup.user1.id, selectedMatchup.user2.id]) {
      const orig = selectedMatchup.draftPicks.filter(p => p.pickedByUserId === uid && p.isBench).sort((a, b) => a.pickOrder - b.pickOrder).map(p => p.id);
      const intended = benchOrderOverride[uid] ?? orig;
      for (const id of intended) { if (!orig.includes(id) && !pendingDeletes.has(id)) n++; }
      for (const id of orig) { if (!intended.includes(id) && !pendingDeletes.has(id)) n++; }
      const still = orig.filter(id => intended.includes(id) && !pendingDeletes.has(id));
      if (still.length === 2) { const is = intended.filter(id => still.includes(id)); if (is.length === 2 && is[0] !== still[0]) n++; }
    }
    return n;
  })();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 via-pink-600 to-pink-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 md:py-6">
            <div className="flex items-center gap-4">
              <a
                href={contestParam ? '/admin/contests' : '/admin/dashboard'}
                className="flex items-center gap-2 text-white hover:text-pink-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">{contestParam ? 'Back to Contests' : 'Back to Dashboard'}</span>
              </a>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-400 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-lg md:text-2xl font-bold text-white">Draft Management</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8 space-y-4 md:space-y-6">

        {/* Contest Selection */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 md:p-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 md:mb-4">Select Contest</h2>

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
                          contest.status === 'SIGNUP_CLOSED' ? 'bg-yellow-100 text-yellow-700' :
                          contest.status === 'LIVE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>{contest.status.replace(/_/g, ' ')}</span>
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
            <div className="px-3 md:px-6 py-3 md:py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 text-sm md:text-base">Head-to-Head Matchups</h3>
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
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
                        <div className="font-semibold text-gray-900 text-sm">{matchup.user1.user.name} vs {matchup.user2.user.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">@{matchup.user1.user.username} vs @{matchup.user2.user.username}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {(matchup.firstPickUser?.split(':')[0] === 'user1') ? matchup.user1.user.name : matchup.user2.user.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800">{getDraftProgress(matchup)}</div>
                        <div className="w-32 bg-gray-200 rounded-full h-1.5 mt-1.5">
                          <div className="bg-pink-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (matchup.draftPicks.length / (14 - (matchup.firstPickUser?.includes(':w1') ? 2 : 0) - (matchup.firstPickUser?.includes(':w2') ? 2 : 0))) * 100)}%` }} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${getMatchupStatusColor(matchup.status)}`}>{matchup.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <button onClick={() => setSelectedMatchup(matchup)} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-lg transition-colors">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {matchups.map((matchup) => (
                <div key={matchup.id} className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{matchup.user1.user.name} vs {matchup.user2.user.name}</div>
                      <div className="text-xs text-gray-500">@{matchup.user1.user.username} · @{matchup.user2.user.username}</div>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full flex-shrink-0 ml-2 ${getMatchupStatusColor(matchup.status)}`}>{matchup.status.replace('_', ' ')}</span>
                  </div>
                  <div className="mb-2">
                    <div className="text-xs text-gray-600 mb-1">{getDraftProgress(matchup)}</div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (matchup.draftPicks.length / (14 - (matchup.firstPickUser?.includes(':w1') ? 2 : 0) - (matchup.firstPickUser?.includes(':w2') ? 2 : 0))) * 100)}%` }} />
                    </div>
                  </div>
                  <button onClick={() => setSelectedMatchup(matchup)} className="w-full bg-pink-600 hover:bg-pink-700 text-white py-1.5 rounded-lg text-xs font-semibold">View Details</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedContest && matchups.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 py-16 text-center">
            <p className="text-gray-500 text-sm">No matchups found for this contest.</p>
          </div>
        )}

        {/* Snake Draft Rules */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 md:p-6">
          <h3 className="font-bold text-gray-800 mb-2 md:mb-3 text-sm md:text-base">🐍 Snake Draft Rules</h3>
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
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90dvh] overflow-y-auto shadow-2xl">
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
                  <button
                    onClick={() => openEditPicks(selectedMatchup.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    ✏️ Edit Picks
                  </button>
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
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Team A Picks — col 1 always */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 lg:p-4 order-1">
                  <h3 className="font-bold text-blue-800 mb-2 text-xs lg:text-sm leading-tight">
                    {selectedMatchup.user1.user.name}
                    <span className="ml-1.5 text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                      {(selectedMatchup.firstPickUser?.split(':')[0] === 'user1') ? '1st' : '2nd'}
                    </span>
                  </h3>
                  <div className="space-y-1.5">
                    {getUserPicks(selectedMatchup, selectedMatchup.user1.id).map((pick) => (
                      <div key={pick.id} className="bg-white border border-blue-100 rounded-lg px-2 py-1.5 text-xs">
                        <div className="font-semibold text-gray-900">#{pick.pickOrder} {pick.player.name}</div>
                        <div className="text-gray-500 mt-0.5">{pick.player.role} · {pick.player.iplTeam.shortName}</div>
                      </div>
                    ))}
                    {getUserPicks(selectedMatchup, selectedMatchup.user1.id).length === 0 && (
                      <div className="text-blue-400 text-xs italic">No picks yet</div>
                    )}
                  </div>
                </div>

                {/* Team B Picks — col 2 on mobile, col 3 on desktop */}
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 lg:p-4 order-2 lg:order-3">
                  <h3 className="font-bold text-green-800 mb-2 text-xs lg:text-sm leading-tight">
                    {selectedMatchup.user2.user.name}
                    <span className="ml-1.5 text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                      {(selectedMatchup.firstPickUser?.split(':')[0] === 'user2') ? '1st' : '2nd'}
                    </span>
                  </h3>
                  <div className="space-y-1.5">
                    {getUserPicks(selectedMatchup, selectedMatchup.user2.id).map((pick) => (
                      <div key={pick.id} className="bg-white border border-green-100 rounded-lg px-2 py-1.5 text-xs">
                        <div className="font-semibold text-gray-900">#{pick.pickOrder} {pick.player.name}</div>
                        <div className="text-gray-500 mt-0.5">{pick.player.role} · {pick.player.iplTeam.shortName}</div>
                      </div>
                    ))}
                    {getUserPicks(selectedMatchup, selectedMatchup.user2.id).length === 0 && (
                      <div className="text-green-400 text-xs italic">No picks yet</div>
                    )}
                  </div>
                </div>

                {/* Snake Order — full-width row below teams on mobile, middle col on desktop */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 lg:p-4 order-3 lg:order-2 col-span-2 lg:col-span-1">
                  <h3 className="font-bold text-gray-800 mb-2 text-xs lg:text-sm">🐍 Snake Draft Order</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-0 text-xs text-gray-700">
                    {getSnakeOrder().map((order, index) => (
                      <div key={index} className="py-1 border-b border-gray-200 last:border-0 lg:last:border-0">
                        {order}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <strong>Note:</strong> 5 starters + 2 bench each. Order reverses each round.
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

      {/* Edit Picks Modal (stacked on top of matchup modal) */}
      {showEditPicks && selectedMatchup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90dvh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">✏️ Edit Draft Picks</h2>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold bg-blue-100 text-blue-700">A</span>
                      <span className="font-medium text-gray-800">{selectedMatchup.user1.user.name}</span>
                    </span>
                    <span className="text-gray-400 text-xs">vs</span>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold bg-green-100 text-green-700">B</span>
                      <span className="font-medium text-gray-800">{selectedMatchup.user2.user.name}</span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setShowEditPicks(false); setPendingChanges({}); setPendingDeletes(new Set()); setPendingAdditions([]); setAddPickPlayer(''); setAddPickIsBench(false); setBenchOrderOverride({}); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl"
                >×</button>
              </div>

              {editPicksLoading ? (
                <div className="py-12 text-center text-gray-500">Loading players...</div>
              ) : (
                <>
                  {/* Search */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search replacement players..."
                      value={editSearch}
                      onChange={e => setEditSearch(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {/* Picks table */}
                  <div className="space-y-2 mb-6">
                    <div className="grid grid-cols-12 gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1">
                      <div className="col-span-1">#</div>
                      <div className="col-span-1">By</div>
                      <div className="col-span-3">Player</div>
                      <div className="col-span-2">Bench?</div>
                      <div className="col-span-4">Replace With</div>
                      <div className="col-span-1"></div>
                    </div>
                    {selectedMatchup.draftPicks.map((pick) => {
                      const isUser1Pick = pick.pickedByUserId === selectedMatchup.user1.id;
                      const selectedNewId = pendingChanges[pick.id];
                      const markedForDelete = pendingDeletes.has(pick.id);
                      const uid = pick.pickedByUserId;
                      const origBench = selectedMatchup.draftPicks
                        .filter(p => p.pickedByUserId === uid && p.isBench)
                        .sort((a, b) => a.pickOrder - b.pickOrder)
                        .map(p => p.id);
                      const effectiveBenchOrder = benchOrderOverride[uid] ?? origBench;
                      const isBenchEffective = effectiveBenchOrder.includes(pick.id);
                      const benchIdx = effectiveBenchOrder.indexOf(pick.id); // -1 if starter
                      const canPromote = benchIdx > 0;
                      const filteredPlayers = allPlayers.filter(p =>
                        p.id !== pick.player.id &&
                        !selectedMatchup.draftPicks.some(dp =>
                          dp.id !== pick.id &&
                          !pendingDeletes.has(dp.id) &&
                          (pendingChanges[dp.id] ?? dp.player.id) === p.id
                        ) &&
                        !pendingAdditions.some(a => a.playerId === p.id) &&
                        (editSearch === '' || p.name.toLowerCase().includes(editSearch.toLowerCase()) || p.iplTeam.shortName.toLowerCase().includes(editSearch.toLowerCase()))
                      );
                      return (
                        <div key={pick.id} className={`grid grid-cols-12 gap-1.5 items-center p-2 rounded-lg border ${
                          markedForDelete ? 'border-red-300 bg-red-50' : selectedNewId ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-gray-50'
                        }`}>
                          <div className="col-span-1 text-xs font-bold text-gray-500">#{pick.pickOrder}</div>
                          <div className={`col-span-1 text-xs font-bold px-1 py-0.5 rounded text-center ${isUser1Pick ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {isUser1Pick ? 'A' : 'B'}
                          </div>
                          <div className="col-span-3 min-w-0">
                            <div className={`text-xs font-semibold truncate ${
                              markedForDelete ? 'line-through text-red-400' : selectedNewId ? 'line-through text-gray-400' : 'text-gray-900'
                            }`}>{pick.player.name}</div>
                            <div className="text-[10px] text-gray-400">{pick.player.role} · {pick.player.iplTeam.shortName}</div>
                          </div>
                          {/* Bench status */}
                          <div className="col-span-2 flex items-center gap-0.5 min-w-0">
                            {!markedForDelete && (
                              <button
                                title={isBenchEffective
                                  ? `Bench ${benchIdx + 1} (preference ${benchIdx + 1}) — click to make starter`
                                  : 'Starter — click to make bench'}
                                onClick={() => setBenchOrderOverride(prev => {
                                  const cur = prev[uid] ?? origBench;
                                  return cur.includes(pick.id)
                                    ? { ...prev, [uid]: cur.filter(id => id !== pick.id) }
                                    : { ...prev, [uid]: [...cur, pick.id] };
                                })}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all whitespace-nowrap ${
                                  isBenchEffective
                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700 hover:bg-indigo-200'
                                    : 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100'
                                }`}
                              >
                                {isBenchEffective ? `🪺${benchIdx + 1}` : '⭐St'}
                              </button>
                            )}
                            {isBenchEffective && canPromote && !markedForDelete && (
                              <button
                                title="Promote to higher bench priority (B2→B1)"
                                onClick={() => setBenchOrderOverride(prev => {
                                  const cur = [...(prev[uid] ?? origBench)];
                                  const idx = cur.indexOf(pick.id);
                                  if (idx > 0) [cur[idx - 1], cur[idx]] = [cur[idx], cur[idx - 1]];
                                  return { ...prev, [uid]: cur };
                                })}
                                className="text-indigo-400 hover:text-indigo-700 font-bold text-xs leading-none transition-colors"
                              >↑</button>
                            )}
                          </div>
                          <div className="col-span-4">
                            {markedForDelete ? (
                              <span className="text-xs text-red-500 italic font-medium">will be deleted</span>
                            ) : (
                              <select
                                value={selectedNewId || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setPendingChanges(prev => {
                                    if (!val) { const next = { ...prev }; delete next[pick.id]; return next; }
                                    return { ...prev, [pick.id]: val };
                                  });
                                }}
                                style={{ color: '#111827' }}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                              >
                                <option value="">— keep current —</option>
                                {filteredPlayers.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.role} · {p.iplTeam.shortName})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              onClick={() => {
                                setPendingDeletes(prev => {
                                  const next = new Set(prev);
                                  if (next.has(pick.id)) {
                                    next.delete(pick.id);
                                  } else {
                                    next.add(pick.id);
                                    setPendingChanges(p => { const n = { ...p }; delete n[pick.id]; return n; });
                                  }
                                  return next;
                                });
                              }}
                              title={markedForDelete ? 'Undo deletion' : 'Mark for deletion'}
                              className={`text-base transition-colors ${
                                markedForDelete ? 'text-red-500 hover:text-red-700' : 'text-gray-300 hover:text-red-400'
                              }`}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {selectedMatchup.draftPicks.length === 0 && pendingAdditions.length === 0 && (
                      <div className="text-center py-6 text-gray-400 text-sm">No picks have been made yet.</div>
                    )}
                    {/* Pending additions */}
                    {pendingAdditions.map((addition, idx) => {
                      const player = allPlayers.find(p => p.id === addition.playerId);
                      const isUser1 = addition.userSignupId === selectedMatchup.user1.id;
                      return (
                        <div key={`add-${idx}`} className="grid grid-cols-12 gap-1.5 items-center p-2 rounded-lg border border-purple-300 bg-purple-50">
                          <div className="col-span-1 text-xs font-bold text-purple-400">+</div>
                          <div className={`col-span-1 text-xs font-bold px-1 py-0.5 rounded text-center ${isUser1 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {isUser1 ? 'A' : 'B'}
                          </div>
                          <div className="col-span-3 min-w-0">
                            <div className="text-xs font-semibold text-purple-700 truncate">{player?.name}</div>
                            <div className="text-[10px] text-purple-400">{player?.role} · {player?.iplTeam.shortName}</div>
                          </div>
                          <div className="col-span-2"></div>
                          <div className="col-span-4">
                            <span className="text-xs text-purple-600 font-medium italic">will be added as {addition.isBench ? '🪑 bench' : '⭐ starter'}</span>
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              onClick={() => setPendingAdditions(prev => prev.filter((_, i) => i !== idx))}
                              title="Remove this addition"
                              className="text-gray-300 hover:text-red-400 text-base transition-colors"
                            >🗑️</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Pick form */}
                  <div className="mb-6 p-3 rounded-lg border border-dashed border-purple-300 bg-purple-50/40">
                    <div className="text-xs font-semibold text-purple-700 mb-2">➕ Add a Pick</div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <select
                        value={addPickPlayer}
                        onChange={e => setAddPickPlayer(e.target.value)}
                        style={{ color: '#111827' }}
                        className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                      >
                        <option value="">{editSearch ? `Search: "${editSearch}"` : 'Select player to add...'}</option>
                        {allPlayers
                          .filter(p =>
                            !selectedMatchup.draftPicks.some(dp => !pendingDeletes.has(dp.id) && (pendingChanges[dp.id] ?? dp.player.id) === p.id) &&
                            !pendingAdditions.some(a => a.playerId === p.id) &&
                            (editSearch === '' || p.name.toLowerCase().includes(editSearch.toLowerCase()) || p.iplTeam.shortName.toLowerCase().includes(editSearch.toLowerCase()))
                          )
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.role} · {p.iplTeam.shortName})</option>
                          ))
                        }
                      </select>
                      <select
                        value={addPickUser}
                        onChange={e => setAddPickUser(e.target.value as 'user1' | 'user2')}
                        style={{ color: '#111827' }}
                        className="border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                      >
                        <option value="user1">For A ({selectedMatchup.user1.user.name})</option>
                        <option value="user2">For B ({selectedMatchup.user2.user.name})</option>
                      </select>
                      {/* Starter / Bench toggle */}
                      <button
                        onClick={() => setAddPickIsBench(b => !b)}
                        title={addPickIsBench ? 'Adding as Bench — click to make Starter' : 'Adding as Starter — click to make Bench'}
                        className={`text-[11px] font-bold px-2 py-1.5 rounded border transition-all whitespace-nowrap ${
                          addPickIsBench
                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700 hover:bg-indigo-200'
                            : 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100'
                        }`}
                      >
                        {addPickIsBench ? '🪑 Bench' : '⭐ Starter'}
                      </button>
                      <button
                        disabled={!addPickPlayer}
                        onClick={() => {
                          if (!addPickPlayer) return;
                          setPendingAdditions(prev => [...prev, {
                            playerId: addPickPlayer,
                            userSignupId: addPickUser === 'user1' ? selectedMatchup.user1.id : selectedMatchup.user2.id,
                            isBench: addPickIsBench,
                          }]);
                          setAddPickPlayer('');
                          setAddPickIsBench(false);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 rounded transition whitespace-nowrap"
                      >+ Add</button>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                      {Object.keys(pendingChanges).length === 0 && pendingDeletes.size === 0 && pendingAdditions.length === 0 && benchChangeCount === 0
                        ? 'No changes'
                        : <>
                          {Object.keys(pendingChanges).length > 0 && <span className="text-orange-600 font-semibold">{Object.keys(pendingChanges).length} swap(s)</span>}
                          {pendingDeletes.size > 0 && <span className="text-red-600 font-semibold">{pendingDeletes.size} delete(s)</span>}
                          {pendingAdditions.length > 0 && <span className="text-purple-600 font-semibold">{pendingAdditions.length} add(s)</span>}
                          {benchChangeCount > 0 && <span className="text-indigo-600 font-semibold">{benchChangeCount} bench(es)</span>}
                        </>}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setShowEditPicks(false); setPendingChanges({}); setPendingDeletes(new Set()); setPendingAdditions([]); setAddPickPlayer(''); setAddPickIsBench(false); setBenchOrderOverride({}); }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={savePickChanges}
                        disabled={savingPicks || (Object.keys(pendingChanges).length === 0 && pendingDeletes.size === 0 && pendingAdditions.length === 0 && benchChangeCount === 0)}
                        className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded-lg transition"
                      >
                        {savingPicks ? 'Saving...' : `Save ${Object.keys(pendingChanges).length + pendingDeletes.size + pendingAdditions.length + benchChangeCount || ''} Change(s)`}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DraftPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <DraftPageInner />
    </Suspense>
  );
}