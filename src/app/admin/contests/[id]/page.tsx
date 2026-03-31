'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Users, Trophy, Search, Edit, UserPlus, Trash2 } from 'lucide-react';
import { getEffectivePickSlots } from '@/lib/draftUtils';

interface Player {
  id: string;
  name: string;
  role: string;
  iplTeam?: {
    name: string;
    shortName: string;
  };
}

interface DraftPick {
  id: string;
  pickOrder: number;
  pickTimestamp: string;
  pickedByUserId: string;
  isBench: boolean;
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

interface UserSearchResult {
  id: string;
  username: string;
  name: string;
  email: string;
  totalWins: number;
  totalMatches: number;
}

export default function ContestMatchupsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatchup, setSelectedMatchup] = useState<string | null>(null);
  const [showCreateMatchup, setShowCreateMatchup] = useState(false);
  const [user1Username, setUser1Username] = useState('');
  const [user2Username, setUser2Username] = useState('');
  const [creatingMatchup, setCreatingMatchup] = useState(false);
  const [createError, setCreateError] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchField, setActiveSearchField] = useState<'user1' | 'user2' | null>(null);
  const [selectedUser1, setSelectedUser1] = useState<UserSearchResult | null>(null);
  const [selectedUser2, setSelectedUser2] = useState<UserSearchResult | null>(null);
  const [editingMatchup, setEditingMatchup] = useState<Matchup | null>(null);
  const [updatingMatchup, setUpdatingMatchup] = useState(false);
  const [updateError, setUpdateError] = useState('');
  
  // Manual draft pick states
  const [showAddPick, setShowAddPick] = useState<string | null>(null); // matchupId
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [addingPick, setAddingPick] = useState(false);
  const [addPickError, setAddPickError] = useState('');
  const [pendingPicks, setPendingPicks] = useState<{ userId: string; player: Player }[]>([]);
  const [deletingPick, setDeletingPick] = useState(false);
  const [deletingMatchup, setDeletingMatchup] = useState<string | null>(null);
  const [selectedMatchups, setSelectedMatchups] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [resettlingMatchup, setResettlingMatchup] = useState<string | null>(null);
  const [openingDraft, setOpeningDraft] = useState(false);

  useEffect(() => {
    fetchContestDetails();
  }, [id]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers(searchQuery);
    } else {
      setUserSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async (query: string) => {
    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setUserSearchResults(data.users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

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
      .filter(pick => pick.pickedByUserId === userSignupId)
      .sort((a, b) => a.pickOrder - b.pickOrder);
  };

  const fetchAvailablePlayers = async (matchupId: string) => {
    setLoadingPlayers(true);
    setAddPickError('');
    try {
      const response = await fetch(`/api/admin/matchups/${matchupId}/available-players`);
      if (response.ok) {
        const data = await response.json();
        setAvailablePlayers(data.players);
      } else {
        setAddPickError('Failed to load available players');
      }
    } catch (error) {
      console.error('Error fetching available players:', error);
      setAddPickError('Network error while loading players');
    } finally {
      setLoadingPlayers(false);
    }
  };

  // Queue a player for a user (no API call yet)
  const addToPending = (userId: string, player: Player) => {
    setPendingPicks(prev => [...prev, { userId, player }]);
  };

  // Remove a queued player
  const removeFromPending = (playerId: string) => {
    setPendingPicks(prev => prev.filter(p => p.player.id !== playerId));
  };

  // Submit all pending picks sequentially
  const handleSubmitPicks = async (matchupId: string) => {
    if (pendingPicks.length === 0) return;
    setAddingPick(true);
    setAddPickError('');
    const errors: string[] = [];

    for (const pending of pendingPicks) {
      try {
        const res = await fetch(`/api/admin/matchups/${matchupId}/add-pick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: pending.player.id, userSignupId: pending.userId }),
        });
        const data = await res.json();
        if (!res.ok) errors.push(`${pending.player.name}: ${data.error}`);
      } catch {
        errors.push(`${pending.player.name}: Network error`);
      }
    }

    setAddingPick(false);
    if (errors.length > 0) {
      setAddPickError(errors.join('\n'));
    } else {
      setShowAddPick(null);
      setPlayerSearchQuery('');
      setPendingPicks([]);
      setAddPickError('');
      fetchContestDetails();
    }
  };

  const getNextPickInfo = (matchup: Matchup) => {
    if (!matchup.firstPickUser) return null;
    const effectiveSlots = getEffectivePickSlots(matchup.firstPickUser, matchup.user1.id, matchup.user2.id);
    const nextPickOrder = matchup.draftPicks.length + 1;
    if (nextPickOrder > effectiveSlots.length) return null;

    const nextSignupId = effectiveSlots[nextPickOrder - 1];
    const isUser1 = nextSignupId === matchup.user1.id;
    return {
      pickOrder: nextPickOrder,
      userSignupId: nextSignupId,
      username: isUser1 ? matchup.user1.user.username : matchup.user2.user.username,
      name: isUser1 ? matchup.user1.user.name : matchup.user2.user.name,
    };
  };

  const handleDeletePick = async (matchupId: string, pickId: string) => {
    if (!confirm('Delete this pick? Only the most recently added pick can be removed.')) return;
    setDeletingPick(true);
    try {
      const response = await fetch(`/api/admin/matchups/${matchupId}/picks/${pickId}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok) {
        fetchContestDetails();
      } else {
        alert(data.error || 'Failed to delete pick');
      }
    } catch {
      alert('Network error while deleting pick');
    } finally {
      setDeletingPick(false);
    }
  };

  const handleCreateMatchup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser1 || !selectedUser2) {
      setCreateError('Please select both users');
      return;
    }

    if (selectedUser1.id === selectedUser2.id) {
      setCreateError('Cannot create matchup with the same user');
      return;
    }

    setCreatingMatchup(true);
    setCreateError('');

    try {
      const response = await fetch(`/api/admin/contests/${id}/create-matchup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user1Username: selectedUser1.username,
          user2Username: selectedUser2.username
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.message}\n\nMatchup ID: ${data.matchup.id}\nStatus: ${data.matchup.status}\nFirst Pick: ${data.matchup.firstPick}`);
        setShowCreateMatchup(false);
        setSelectedUser1(null);
        setSelectedUser2(null);
        setSearchQuery('');
        setActiveSearchField(null);
        fetchContestDetails(); // Refresh the list
      } else {
        setCreateError(data.message || 'Failed to create matchup');
      }
    } catch (error) {
      console.error('Error creating matchup:', error);
      setCreateError('Network error occurred');
    } finally {
      setCreatingMatchup(false);
    }
  };

  const handleUpdateMatchup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingMatchup || !selectedUser1 || !selectedUser2) {
      setUpdateError('Please select both users');
      return;
    }

    if (selectedUser1.id === selectedUser2.id) {
      setUpdateError('Cannot create matchup with the same user');
      return;
    }

    setUpdatingMatchup(true);
    setUpdateError('');

    try {
      const response = await fetch(`/api/admin/matchups/${editingMatchup.id}/update-users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user1Username: selectedUser1.username,
          user2Username: selectedUser2.username
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.message}`);
        setEditingMatchup(null);
        setSelectedUser1(null);
        setSelectedUser2(null);
        setSearchQuery('');
        setActiveSearchField(null);
        fetchContestDetails(); // Refresh the list
      } else {
        setUpdateError(data.message || 'Failed to update matchup');
      }
    } catch (error) {
      console.error('Error updating matchup:', error);
      setUpdateError('Network error occurred');
    } finally {
      setUpdatingMatchup(false);
    }
  };

  const handleDeleteMatchup = async (matchupId: string, matchupDetails: string) => {
    if (!confirm(`⚠️ DELETE MATCHUP?\n\n${matchupDetails}\n\nThis will delete the matchup and all draft picks.\n\nAre you sure?`)) {
      return;
    }

    setDeletingMatchup(matchupId);

    try {
      const response = await fetch(`/api/admin/matchups/${matchupId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.message}${data.draftPicksDeleted > 0 ? `\n${data.draftPicksDeleted} draft picks deleted` : ''}`);
        fetchContestDetails(); // Refresh the list
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error deleting matchup:', error);
      alert('❌ Network error occurred');
    } finally {
      setDeletingMatchup(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedMatchups);
    if (ids.length === 0) return;

    const nonCompleted = contest?.matchups.filter(
      m => ids.includes(m.id) && m.status !== 'COMPLETED'
    ) ?? [];

    if (!confirm(
      `⚠️ DELETE ${nonCompleted.length} MATCHUP(S)?\n\nThis will delete the selected matchups and all their draft picks.\n\nAre you sure?`
    )) return;

    setBulkDeleting(true);
    try {
      const response = await fetch('/api/admin/matchups/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchupIds: ids })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.message}${data.draftPicksDeleted > 0 ? `\n${data.draftPicksDeleted} draft picks deleted` : ''}`);
        setSelectedMatchups(new Set());
        fetchContestDetails();
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error bulk deleting matchups:', error);
      alert('❌ Network error occurred');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleResettle = async (matchupId: string, matchupDetails: string) => {
    if (!confirm(
      `⚖️ RE-SETTLE MATCHUP?\n\n${matchupDetails}\n\nThis will:\n• Reverse all existing WIN/LOSS coin transactions\n• Recalculate scores with latest bench-swap logic\n• Re-apply correct coin changes and update win/loss stats\n\nAre you sure?`
    )) return;

    setResettlingMatchup(matchupId);
    try {
      const response = await fetch(`/api/admin/matchups/${matchupId}/resettle`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        alert(
          `✅ Re-settled successfully!\n\n` +
          `Score: ${data.user1Score} – ${data.user2Score}\n` +
          `Result: ${data.result}\n` +
          `Reversed ${data.reversedTransactions} old transaction(s)\n` +
          `Admin fee collected: ${data.adminFeeCollected} coins`
        );
        fetchContestDetails();
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch {
      alert('❌ Network error occurred');
    } finally {
      setResettlingMatchup(null);
    }
  };

  const toggleMatchupSelection = (matchupId: string) => {
    setSelectedMatchups(prev => {
      const next = new Set(prev);
      if (next.has(matchupId)) next.delete(matchupId);
      else next.add(matchupId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const deletable = contest?.matchups.filter(m => m.status !== 'COMPLETED').map(m => m.id) ?? [];
    if (deletable.every(id => selectedMatchups.has(id))) {
      setSelectedMatchups(new Set());
    } else {
      setSelectedMatchups(new Set(deletable));
    }
  };

  const handleOpenDrafting = async () => {
    if (!confirm('Open the drafting window? All WAITING_DRAFT matchups will move to DRAFTING and users will be notified.')) return;
    setOpeningDraft(true);
    try {
      const res = await fetch(`/api/admin/contests/${id}/open-drafting`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        fetchContestDetails();
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch {
      alert('❌ Network error occurred');
    } finally {
      setOpeningDraft(false);
    }
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

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowCreateMatchup(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md flex items-center gap-2"
          >
            <Users className="h-5 w-5" />
            Create Custom Matchup
          </button>
          {contest.status === 'DRAFT_PHASE' && contest.matchups.some(m => m.status === 'WAITING_DRAFT') && (
            <button
              onClick={handleOpenDrafting}
              disabled={openingDraft}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md flex items-center gap-2"
            >
              🎯 {openingDraft ? 'Opening...' : `Open Draft (${contest.matchups.filter(m => m.status === 'WAITING_DRAFT').length} waiting)`}
            </button>
          )}
        </div>

        {/* Edit Matchup Modal */}
        {editingMatchup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Edit H2H Matchup</h3>
              <p className="text-sm text-gray-600 mb-2">
                Update the opponents for this matchup.
              </p>
              <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded mb-4">
                ⚠️ Note: Cannot update if drafting has started ({editingMatchup.draftPicks.length} picks made)
              </p>
              
              <form onSubmit={handleUpdateMatchup} className="space-y-4">
                {/* User 1 Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User 1 {selectedUser1 && <span className="text-green-600">✓</span>}
                  </label>
                  {selectedUser1 ? (
                    <div className="border border-green-300 bg-green-50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{selectedUser1.name}</div>
                        <div className="text-sm text-gray-600">@{selectedUser1.username}</div>
                        <div className="text-xs text-gray-500">{selectedUser1.totalWins}W - {selectedUser1.totalMatches}M</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedUser1(null)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={activeSearchField === 'user1' ? searchQuery : ''}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setActiveSearchField('user1');
                          }}
                          onFocus={() => setActiveSearchField('user1')}
                          placeholder="Search by name, username, or email..."
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      {activeSearchField === 'user1' && userSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {userSearchResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setSelectedUser1(user);
                                setSearchQuery('');
                                setActiveSearchField(null);
                                setUserSearchResults([]);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                              disabled={selectedUser2?.id === user.id}
                            >
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-600">@{user.username}</div>
                              <div className="text-xs text-gray-500">{user.email} • {user.totalWins}W - {user.totalMatches}M</div>
                              {selectedUser2?.id === user.id && (
                                <div className="text-xs text-orange-600 mt-1">Already selected as User 2</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User 2 Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User 2 {selectedUser2 && <span className="text-green-600">✓</span>}
                  </label>
                  {selectedUser2 ? (
                    <div className="border border-green-300 bg-green-50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{selectedUser2.name}</div>
                        <div className="text-sm text-gray-600">@{selectedUser2.username}</div>
                        <div className="text-xs text-gray-500">{selectedUser2.totalWins}W - {selectedUser2.totalMatches}M</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedUser2(null)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={activeSearchField === 'user2' ? searchQuery : ''}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setActiveSearchField('user2');
                          }}
                          onFocus={() => setActiveSearchField('user2')}
                          placeholder="Search by name, username, or email..."
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      {activeSearchField === 'user2' && userSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {userSearchResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setSelectedUser2(user);
                                setSearchQuery('');
                                setActiveSearchField(null);
                                setUserSearchResults([]);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                              disabled={selectedUser1?.id === user.id}
                            >
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-600">@{user.username}</div>
                              <div className="text-xs text-gray-500">{user.email} • {user.totalWins}W - {user.totalMatches}M</div>
                              {selectedUser1?.id === user.id && (
                                <div className="text-xs text-orange-600 mt-1">Already selected as User 1</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {updateError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                    {updateError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={updatingMatchup || !selectedUser1 || !selectedUser2 || editingMatchup.draftPicks.length > 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    {updatingMatchup ? 'Updating...' : 'Update Matchup'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMatchup(null);
                      setSelectedUser1(null);
                      setSelectedUser2(null);
                      setSearchQuery('');
                      setActiveSearchField(null);
                      setUpdateError('');
                      setUserSearchResults([]);
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Matchup Modal */}
        {showCreateMatchup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create Custom H2H Matchup</h3>
              <p className="text-sm text-gray-600 mb-4">
                Search and select 2 active users. They will be automatically signed up if not already.
              </p>
              
              <form onSubmit={handleCreateMatchup} className="space-y-4">
                {/* User 1 Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User 1 {selectedUser1 && <span className="text-green-600">✓</span>}
                  </label>
                  {selectedUser1 ? (
                    <div className="border border-green-300 bg-green-50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{selectedUser1.name}</div>
                        <div className="text-sm text-gray-600">@{selectedUser1.username}</div>
                        <div className="text-xs text-gray-500">{selectedUser1.totalWins}W - {selectedUser1.totalMatches}M</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedUser1(null)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={activeSearchField === 'user1' ? searchQuery : ''}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setActiveSearchField('user1');
                          }}
                          onFocus={() => setActiveSearchField('user1')}
                          placeholder="Search by name, username, or email..."
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      {activeSearchField === 'user1' && userSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {userSearchResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setSelectedUser1(user);
                                setSearchQuery('');
                                setActiveSearchField(null);
                                setUserSearchResults([]);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                              disabled={selectedUser2?.id === user.id}
                            >
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-600">@{user.username}</div>
                              <div className="text-xs text-gray-500">{user.email} • {user.totalWins}W - {user.totalMatches}M</div>
                              {selectedUser2?.id === user.id && (
                                <div className="text-xs text-orange-600 mt-1">Already selected as User 2</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User 2 Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User 2 {selectedUser2 && <span className="text-green-600">✓</span>}
                  </label>
                  {selectedUser2 ? (
                    <div className="border border-green-300 bg-green-50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{selectedUser2.name}</div>
                        <div className="text-sm text-gray-600">@{selectedUser2.username}</div>
                        <div className="text-xs text-gray-500">{selectedUser2.totalWins}W - {selectedUser2.totalMatches}M</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedUser2(null)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={activeSearchField === 'user2' ? searchQuery : ''}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setActiveSearchField('user2');
                          }}
                          onFocus={() => setActiveSearchField('user2')}
                          placeholder="Search by name, username, or email..."
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      {activeSearchField === 'user2' && userSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {userSearchResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setSelectedUser2(user);
                                setSearchQuery('');
                                setActiveSearchField(null);
                                setUserSearchResults([]);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                              disabled={selectedUser1?.id === user.id}
                            >
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-600">@{user.username}</div>
                              <div className="text-xs text-gray-500">{user.email} • {user.totalWins}W - {user.totalMatches}M</div>
                              {selectedUser1?.id === user.id && (
                                <div className="text-xs text-orange-600 mt-1">Already selected as User 1</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {createError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                    {createError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={creatingMatchup || !selectedUser1 || !selectedUser2}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    {creatingMatchup ? 'Creating...' : 'Create Matchup'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateMatchup(false);
                      setSelectedUser1(null);
                      setSelectedUser2(null);
                      setSearchQuery('');
                      setActiveSearchField(null);
                      setCreateError('');
                      setUserSearchResults([]);
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Player Pick Modal */}
        {showAddPick && (() => {
          const matchup = contest?.matchups.find(m => m.id === showAddPick);
          if (!matchup) return null;

          const pendingIds = new Set(pendingPicks.map(p => p.player.id));
          const existingIds = new Set(matchup.draftPicks.map(p => p.player.id));
          const totalQueued = pendingPicks.length;
          const remainingSlots = 14 - matchup.draftPicks.length;

          const user1Pending = pendingPicks.filter(p => p.userId === matchup.user1.id);
          const user2Pending = pendingPicks.filter(p => p.userId === matchup.user2.id);

          const filteredPlayers = availablePlayers
            .filter(p => !pendingIds.has(p.id) && !existingIds.has(p.id))
            .filter(p =>
              playerSearchQuery.length < 2 ||
              p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
              p.role.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
              (p.iplTeam?.name ?? '').toLowerCase().includes(playerSearchQuery.toLowerCase())
            );

          const closeModal = () => {
            setShowAddPick(null);
            setPlayerSearchQuery('');
            setPendingPicks([]);
            setAddPickError('');
          };

          return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-gray-200 shrink-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">🏏 Draft Players</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {matchup.user1.user.name.split(' ')[0]} vs {matchup.user2.user.name.split(' ')[0]}
                        &nbsp;·&nbsp;{matchup.draftPicks.length} saved picks
                        &nbsp;·&nbsp;{remainingSlots} slots left
                      </p>
                    </div>
                    <button onClick={closeModal} disabled={addingPick}
                      className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none disabled:opacity-40">
                      ✕
                    </button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

                  {/* Pending queues — always visible */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 min-h-[72px]">
                      <div className="text-xs font-semibold text-blue-700 mb-2">
                        {matchup.user1.user.name.split(' ')[0]} — {user1Pending.length} queued
                      </div>
                      {user1Pending.length === 0 ? (
                        <div className="text-xs text-blue-300 italic">Click +{matchup.user1.user.name.split(' ')[0]} below</div>
                      ) : (
                        user1Pending.map(p => (
                          <div key={p.player.id} className="flex items-center justify-between gap-1 py-0.5">
                            <span className="text-xs text-gray-800 truncate">{p.player.name}</span>
                            <button onClick={() => removeFromPending(p.player.id)}
                              className="text-red-400 hover:text-red-600 text-xs shrink-0 font-bold">✕</button>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 min-h-[72px]">
                      <div className="text-xs font-semibold text-purple-700 mb-2">
                        {matchup.user2.user.name.split(' ')[0]} — {user2Pending.length} queued
                      </div>
                      {user2Pending.length === 0 ? (
                        <div className="text-xs text-purple-300 italic">Click +{matchup.user2.user.name.split(' ')[0]} below</div>
                      ) : (
                        user2Pending.map(p => (
                          <div key={p.player.id} className="flex items-center justify-between gap-1 py-0.5">
                            <span className="text-xs text-gray-800 truncate">{p.player.name}</span>
                            <button onClick={() => removeFromPending(p.player.id)}
                              className="text-red-400 hover:text-red-600 text-xs shrink-0 font-bold">✕</button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Player list */}
                  {loadingPlayers ? (
                    <div className="text-center py-10 text-gray-500">Loading players…</div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={playerSearchQuery}
                          onChange={e => setPlayerSearchQuery(e.target.value)}
                          placeholder="Search by name, role, or team…"
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="text-xs text-gray-500">
                        {filteredPlayers.length} players available
                        {totalQueued > 0 && <span className="ml-2 text-green-600 font-semibold">{totalQueued} queued</span>}
                      </div>

                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {filteredPlayers.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            {availablePlayers.filter(p => !pendingIds.has(p.id) && !existingIds.has(p.id)).length === 0
                              ? 'All players queued or already picked'
                              : 'No players match your search'}
                          </div>
                        ) : (
                          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                            {filteredPlayers.map(player => (
                              <div key={player.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900 truncate">{player.name}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">{player.role}</span>
                                    {player.iplTeam && <span className="text-xs text-gray-400">{player.iplTeam.shortName || player.iplTeam.name}</span>}
                                  </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <button
                                    onClick={() => addToPending(matchup.user1.id, player)}
                                    disabled={addingPick || totalQueued + matchup.draftPicks.length >= 14}
                                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold px-2.5 py-1 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    +{matchup.user1.user.name.split(' ')[0]}
                                  </button>
                                  <button
                                    onClick={() => addToPending(matchup.user2.id, player)}
                                    disabled={addingPick || totalQueued + matchup.draftPicks.length >= 14}
                                    className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold px-2.5 py-1 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    +{matchup.user2.user.name.split(' ')[0]}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {addPickError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm whitespace-pre-line">
                      {addPickError}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0">
                  <button
                    onClick={closeModal}
                    disabled={addingPick}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmitPicks(matchup.id)}
                    disabled={addingPick || totalQueued === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
                  >
                    {addingPick
                      ? 'Saving…'
                      : totalQueued === 0
                        ? 'Queue players above'
                        : `Save ${totalQueued} pick${totalQueued > 1 ? 's' : ''} →`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Matchups List */}
        {contest.matchups.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Matchups Yet</h3>
            <p className="text-gray-500">Close signups to generate matchups for this contest.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bulk Actions Toolbar */}
            {(() => {
              const deletable = contest.matchups.filter(m => m.status !== 'COMPLETED');
              const allSelected = deletable.length > 0 && deletable.every(m => selectedMatchups.has(m.id));
              return (
                <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border px-4 py-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-red-600 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 font-medium">
                      {selectedMatchups.size > 0
                        ? `${selectedMatchups.size} selected`
                        : `Select all (${deletable.length} deletable)`}
                    </span>
                  </label>
                  {selectedMatchups.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedMatchups.size})`}
                    </button>
                  )}
                </div>
              );
            })()}

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
                        {matchup.status !== 'COMPLETED' && (
                          <input
                            type="checkbox"
                            checked={selectedMatchups.has(matchup.id)}
                            onChange={(e) => { e.stopPropagation(); toggleMatchupSelection(matchup.id); }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 accent-red-600 cursor-pointer flex-shrink-0"
                          />
                        )}
                        <div className="text-lg font-bold text-gray-600">#{index + 1}</div>
                        
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{matchup.user1.user.name}</div>
                            <div className="text-sm text-gray-600">@{matchup.user1.user.username}</div>
                            {matchup.firstPickUser === 'user1' && (
                              <div className="text-xs text-blue-600 mt-1">⚡ First Pick</div>
                            )}
                          </div>
                          
                          <div className="text-2xl font-bold text-gray-600">VS</div>
                          
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMatchup(matchup);
                            setSelectedUser1(null);
                            setSelectedUser2(null);
                            setSearchQuery('');
                            setActiveSearchField(null);
                            setUpdateError('');
                          }}
                          className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit matchup opponents"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {matchup.status === 'COMPLETED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResettle(
                                matchup.id,
                                `${matchup.user1.user.name} (@${matchup.user1.user.username}) vs ${matchup.user2.user.name} (@${matchup.user2.user.username})\nCurrent score: ${matchup.user1Score} – ${matchup.user2Score}`
                              );
                            }}
                            disabled={resettlingMatchup === matchup.id}
                            className="text-orange-600 hover:text-orange-700 p-2 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
                            title="Re-settle this matchup (recalculate scores & coins)"
                          >
                            {resettlingMatchup === matchup.id ? '⏳' : '⚖️'}
                          </button>
                        )}
                        {matchup.status !== 'COMPLETED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMatchup(
                                matchup.id,
                                `${matchup.user1.user.name} vs ${matchup.user2.user.name}\nStatus: ${matchup.status}\nPicks: ${matchup.draftPicks.length}/14`
                              );
                            }}
                            disabled={deletingMatchup === matchup.id}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete matchup"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <div className="text-right">
                          <div className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(matchup.status)}`}>
                            {getStatusIcon(matchup.status)} {matchup.status.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {matchup.draftPicks.length}/14 picks
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
                      {/* Side-by-side picks */}
                      {(() => {
                        const user1Picks = [...matchup.draftPicks]
                          .filter(p => p.pickedByUserId === matchup.user1.id)
                          .sort((a, b) => a.pickOrder - b.pickOrder);
                        const user2Picks = [...matchup.draftPicks]
                          .filter(p => p.pickedByUserId === matchup.user2.id)
                          .sort((a, b) => a.pickOrder - b.pickOrder);
                        const allSorted = [...matchup.draftPicks].sort((a, b) => a.pickOrder - b.pickOrder);
                        const lastPickId = allSorted.length > 0 ? allSorted[allSorted.length - 1].id : null;

                        const renderPick = (pick: DraftPick, color: 'blue' | 'purple') => (
                          <div key={pick.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${color === 'blue' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                              {pick.pickOrder}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900 truncate">{pick.player.name}</div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-xs text-gray-500">{pick.player.role}</span>
                                {pick.player.iplTeam && <span className="text-xs text-gray-400">· {pick.player.iplTeam.shortName}</span>}
                                {pick.isBench && <span className="text-xs bg-gray-200 text-gray-600 px-1 rounded">bench</span>}
                              </div>
                            </div>
                            {pick.id === lastPickId && (
                              <button
                                onClick={() => handleDeletePick(matchup.id, pick.id)}
                                disabled={deletingPick}
                                title="Undo last pick"
                                className="shrink-0 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors disabled:opacity-50"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );

                        return (
                          <div className="bg-white rounded-lg p-4 mb-4">
                            <div className="grid grid-cols-2 gap-4">
                              {/* User 1 */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
                                  <span className="font-semibold text-sm text-blue-700">{matchup.user1.user.name}</span>
                                  <span className="text-xs text-gray-400">({user1Picks.length} picks)</span>
                                </div>
                                <div className="space-y-1.5">
                                  {user1Picks.length === 0
                                    ? <div className="text-xs text-gray-400 italic">No picks yet</div>
                                    : user1Picks.map(p => renderPick(p, 'blue'))}
                                </div>
                              </div>
                              {/* User 2 */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0"></span>
                                  <span className="font-semibold text-sm text-purple-700">{matchup.user2.user.name}</span>
                                  <span className="text-xs text-gray-400">({user2Picks.length} picks)</span>
                                </div>
                                <div className="space-y-1.5">
                                  {user2Picks.length === 0
                                    ? <div className="text-xs text-gray-400 italic">No picks yet</div>
                                    : user2Picks.map(p => renderPick(p, 'purple'))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Manual Draft Pick Button */}
                      {matchup.draftPicks.length < 14 && (
                        <div className="mt-6">
                          <button
                            onClick={() => {
                              setShowAddPick(matchup.id);
                              fetchAvailablePlayers(matchup.id);
                              setPendingPicks([]);
                              setPlayerSearchQuery('');
                              setAddPickError('');
                            }}
                            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors shadow-md flex items-center justify-center gap-2"
                          >
                            <UserPlus className="h-5 w-5" />
                            Manually Add Player Pick
                          </button>
                          {(() => {
                            const nextPick = getNextPickInfo(matchup);
                            return nextPick && (
                              <div className="mt-2 text-center text-sm text-gray-600">
                                Next pick (#{nextPick.pickOrder}): <span className="font-semibold text-gray-900">{nextPick.name}</span>
                              </div>
                            );
                          })()}
                        </div>
                      )}
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
