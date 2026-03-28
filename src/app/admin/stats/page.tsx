'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, Trash2, Edit, Save, X, Download, AlertCircle, CheckCircle } from 'lucide-react';

interface IPLGame {
  id: string;
  title: string;
  gameDate: string;
  status: string;
  tournamentId: string;
  team1: {
    id: string;
    name: string;
    shortName: string;
  };
  team2: {
    id: string;
    name: string;
    shortName: string;
  };
}

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
}

interface PlayerStat {
  id: string;
  playerId: string;
  player: Player;
  runs: number;
  wickets: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  didNotPlay: boolean;
  points: number;
}

interface BulkStatEntry {
  playerId: string;
  runs: number;
  wickets: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  didNotPlay: boolean;
}

interface Tournament {
  id: string;
  name: string;
}

interface ScoreDbGame {
  gameId: number;
  date: string;
  homeTeam: string | null;
  visitingTeam: string | null;
  statusId: number;
}

export default function BulkStatsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('all');
  const [games, setGames] = useState<IPLGame[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [existingStats, setExistingStats] = useState<PlayerStat[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkStats, setBulkStats] = useState<Record<string, BulkStatEntry>>({});
  const [editingStatId, setEditingStatId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PlayerStat>>({});
  const [draftedPlayerIds, setDraftedPlayerIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingStatId, setDeletingStatId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isFetchingScores, setIsFetchingScores] = useState(false);
  const [scoreProviderAvailable, setScoreProviderAvailable] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);
  const [scoreDbGames, setScoreDbGames] = useState<ScoreDbGame[]>([]);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [selectedScoreDbGameId, setSelectedScoreDbGameId] = useState<number | null>(null);
  const [loadingScoreDbGames, setLoadingScoreDbGames] = useState(false);
  const [bridgeAvailable, setBridgeAvailable] = useState<boolean | null>(null); // null = not checked yet

  useEffect(() => {
    fetchTournaments();
    fetchGames();
    checkScoreProviderStatus();
    checkBridgeStatus();
  }, []);

  // Handle gameId query parameter after games are loaded
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId');
    if (gameId && games.length > 0 && !selectedGame) {
      const game = games.find(g => g.id === gameId);
      if (game) {
        setSelectedTournament(game.tournamentId);
        setSelectedGame(gameId);
      }
    }
  }, [games, selectedGame]);

  useEffect(() => {
    if (selectedGame) {
      fetchStats(selectedGame);
      fetchDraftedPlayers(selectedGame);
      const game = games.find(g => g.id === selectedGame);
      if (game && game.tournamentId) {
        fetchPlayersForTournament(game.tournamentId);
      }
    } else {
      setPlayers([]);
      setExistingStats([]);
      setBulkStats({});
      setDraftedPlayerIds(new Set());
    }
  }, [selectedGame, games]);

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

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/admin/games');
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayersForTournament = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/admin/players?tournamentId=${tournamentId}`);
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || []);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchStats = async (gameId: string) => {
    try {
      const response = await fetch(`/api/admin/stats?gameId=${gameId}`);
      if (response.ok) {
        const data = await response.json();
        setExistingStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchDraftedPlayers = async (gameId: string) => {
    try {
      const response = await fetch(`/api/admin/games/${gameId}/drafted-players`);
      if (response.ok) {
        const data = await response.json();
        setDraftedPlayerIds(new Set(data.playerIds || []));
      }
    } catch (error) {
      console.error('Error fetching drafted players:', error);
      setDraftedPlayerIds(new Set());
    }
  };

  const getGamePlayers = () => {
    if (!selectedGame) return [];
    const game = games.find(g => g.id === selectedGame);
    if (!game) return [];
    
    // Filter to only players from the two teams playing
    const teamPlayers = players.filter(player => 
      player.iplTeam.id === game.team1.id || 
      player.iplTeam.id === game.team2.id
    );
    
    // Show ALL team players for stats entry (admin needs to enter stats for everyone)
    return teamPlayers;
  };

  const calculatePoints = (runs: number, wickets: number, catches: number, runOuts: number, stumpings: number) => {
    return (runs * 1) + (wickets * 20) + ((catches + runOuts + stumpings) * 5);
  };

  const handleStatChange = (playerId: string, field: string, value: string | boolean) => {
    setBulkStats(prev => {
      const currentStats = prev[playerId] || {};
      
      // If DNP is being checked, clear all stats
      if (field === 'didNotPlay' && value === true) {
        return {
          ...prev,
          [playerId]: {
            playerId,
            runs: 0,
            wickets: 0,
            catches: 0,
            runOuts: 0,
            stumpings: 0,
            didNotPlay: true
          }
        };
      }
      
      return {
        ...prev,
        [playerId]: {
          ...currentStats,
          playerId,
          [field]: field === 'didNotPlay' ? value : (value === '' ? 0 : parseInt(value as string) || 0)
        }
      };
    });
  };

  const getStatValue = (playerId: string, field: keyof BulkStatEntry): number | boolean => {
    if (bulkStats[playerId]) {
      const value = bulkStats[playerId][field];
      if (field === 'didNotPlay') {
        return typeof value === 'boolean' ? value : false;
      }
      return typeof value === 'number' ? value : 0;
    }
    return field === 'didNotPlay' ? false : 0;
  };

  const hasAnyStats = (playerId: string): boolean => {
    const stats = bulkStats[playerId];
    if (!stats) return false;
    return stats.runs > 0 || stats.wickets > 0 || stats.catches > 0 || 
           stats.runOuts > 0 || stats.stumpings > 0 || stats.didNotPlay;
  };

  const handleBulkSave = async () => {
    if (!selectedGame) {
      alert('Please select a game first');
      return;
    }

    const statsToSave = Object.values(bulkStats).filter(stat => 
      hasAnyStats(stat.playerId)
    );

    console.log('Stats to save:', statsToSave);
    console.log('Request payload:', {
      iplGameId: selectedGame,
      stats: statsToSave
    });

    if (statsToSave.length === 0) {
      alert('Please enter stats for at least one player');
      return;
    }

    if (!confirm(`Save stats for ${statsToSave.length} player(s)?`)) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/stats/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          iplGameId: selectedGame,
          stats: statsToSave
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully saved stats for ${result.count} player(s)!`);
        fetchStats(selectedGame);
        setBulkStats({});
      } else {
        // Handle error response with better error display
        let errorMessage = 'Unknown error occurred';
        const responseText = await response.text();
        console.log('Error response text:', responseText);
        
        try {
          const error = JSON.parse(responseText);
          if (error.message) {
            errorMessage = error.message;
          } else if (error.error) {
            errorMessage = error.error;
          }
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `Server error: ${response.status} ${response.statusText}\n\nResponse: ${responseText}`;
        }
        alert(`Error saving stats:\n\n${errorMessage}\n\nPlease check the console for more details.`);
        console.error('Bulk save error:', errorMessage);
      }
    } catch (error) {
      console.error('Error saving bulk stats:', error);
      alert(`Network error saving stats:\n\n${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your connection and try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditStat = (stat: PlayerStat) => {
    setEditingStatId(stat.id);
    setEditFormData({
      runs: stat.runs,
      wickets: stat.wickets,
      catches: stat.catches,
      runOuts: stat.runOuts,
      stumpings: stat.stumpings,
      didNotPlay: stat.didNotPlay
    });
  };

  const handleUpdateStat = async (statId: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/stats/${statId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        alert('Stats updated successfully!');
        fetchStats(selectedGame);
        setEditingStatId(null);
        setEditFormData({});
      } else {
        let errorMessage = 'Unknown error occurred';
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        alert(`Error updating stats:\n\n${errorMessage}`);
        console.error('Update stat error:', errorMessage);
      }
    } catch (error) {
      console.error('Error updating stat:', error);
      alert(`Network error:\n\n${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteStat = async (statId: string) => {
    if (!confirm('Are you sure you want to delete this stat entry?')) {
      return;
    }

    setDeletingStatId(statId);
    try {
      const response = await fetch(`/api/admin/stats/${statId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Stats deleted successfully!');
        fetchStats(selectedGame);
      } else {
        let errorMessage = 'Unknown error occurred';
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        alert(`Error deleting stats:\n\n${errorMessage}`);
        console.error('Delete stat error:', errorMessage);
      }
    } catch (error) {
      console.error('Error deleting stat:', error);
      alert(`Network error:\n\n${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingStatId(null);
    }
  };

  const handleDeleteAllStats = async () => {
    if (!selectedGame) return;
    
    if (!confirm(`Are you sure you want to delete ALL stats for this game? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/stats/bulk?gameId=${selectedGame}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchStats(selectedGame);
      } else {
        let errorMessage = 'Unknown error occurred';
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        alert(`Error deleting all stats:\n\n${errorMessage}`);
        console.error('Delete all stats error:', errorMessage);
      }
    } catch (error) {
      console.error('Error deleting stats:', error);
      alert(`Network error:\n\n${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const checkBridgeStatus = async () => {
    try {
      const resp = await fetch('http://localhost:3001/health', {
        signal: AbortSignal.timeout(2000)
      });
      setBridgeAvailable(resp.ok);
    } catch {
      setBridgeAvailable(false);
    }
  };

  const checkScoreProviderStatus = async () => {
    try {
      const response = await fetch('/api/admin/fetch-scores');
      if (response.ok) {
        const data = await response.json();
        setScoreProviderAvailable(data.available);
      }
    } catch (error) {
      console.error('Error checking score provider status:', error);
      setScoreProviderAvailable(false);
    }
  };

  // Called when button is clicked — loads game list from bridge
  const handleFetchScoresClick = async () => {
    if (!selectedGame) {
      alert('Please select a game first');
      return;
    }
    setFetchError(null);
    setFetchSuccess(null);

    // Always try to load game list from local bridge
    setLoadingScoreDbGames(true);
    try {
      const resp = await fetch('http://localhost:3001/games', {
        signal: AbortSignal.timeout(3000)
      });
      const data = await resp.json();
      setLoadingScoreDbGames(false);
      setBridgeAvailable(true);
      if (data.success && data.games?.length > 0) {
        setScoreDbGames(data.games);
        setSelectedScoreDbGameId(null);
        setShowGamePicker(true);
        return; // wait for user to pick a game in the modal
      }
      // Bridge running but no games returned
      setFetchError('Bridge is running but returned no games from the score database.');
      return;
    } catch {
      setLoadingScoreDbGames(false);
      setBridgeAvailable(false);
    }

    // Bridge not running — show inline error (no alert, no prompt)
    setFetchError('bridge_not_running');
  };

  const handleFetchScores = async (externalMatchId?: string) => {
    if (!selectedGame) return;

    setFetchError(null);
    setFetchSuccess(null);

    const game = games.find(g => g.id === selectedGame);
    if (!game) return;

    setIsFetchingScores(true);
    try {
      // Step 1: Try Vercel fetch-scores (works if score DB is reachable from server)
      const response = await fetch('/api/admin/fetch-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iplGameId: selectedGame,
          externalMatchId: externalMatchId || undefined
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Direct fetch succeeded — populate directly
        populateBulkStats(result.data.stats, result.data.summary, result.data.unmatchedPlayers);
        return;
      }

      // If provider IS configured but returned a real error (e.g. game not found), show it directly
      // Only fall through to bridge if provider is not available/configured
      if (result.available === true || response.status === 404) {
        const errorMsg = result.error || 'Failed to fetch scores';
        setFetchError(errorMsg);
        alert(
          `⚠️ Error Fetching Scores\n\n` +
          `${errorMsg}\n\n` +
          `Make sure you select the correct game from the score database.\n\n` +
          `You can also enter scores manually below.`
        );
        return;
      }

      // Step 2: Provider not configured on this server — try local bridge on localhost:3001
      console.log('Score provider unavailable on server, trying local bridge on localhost:3001...');

      let bridgeResponse: Response;
      try {
        bridgeResponse = await fetch('http://localhost:3001/fetch-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            iplGameId: selectedGame,
            externalMatchId: externalMatchId || undefined
          }),
        });
      } catch {
        // Bridge not running — show helpful message
        setFetchError('Local bridge not running');
        alert(
          `❌ Score Provider Not Available\n\n` +
          `The score database cannot be reached from the server.\n\n` +
          `To fetch scores, use http://localhost:3000/admin/stats on your Mac and run:\n\n` +
          `  node scripts/score-bridge-server.js\n\n` +
          `Then click "Fetch Scores from API" again.\n\n` +
          `You can also enter scores manually below.`
        );
        return;
      }

      const bridgeResult = await bridgeResponse.json();

      if (!bridgeResponse.ok || !bridgeResult.success) {
        const errorMsg = bridgeResult.error || 'Bridge fetch failed';
        setFetchError(errorMsg);
        alert(`❌ Bridge Error\n\n${errorMsg}\n\nPlease enter scores manually.`);
        return;
      }

      // Step 3: Bridge returned raw player data — send to Vercel to match player names → IDs
      const matchResponse = await fetch('/api/admin/match-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iplGameId: selectedGame,
          rawPlayers: bridgeResult.data.players
        }),
      });

      const matchResult = await matchResponse.json();

      if (!matchResponse.ok || !matchResult.success) {
        const errorMsg = matchResult.error || 'Player matching failed';
        setFetchError(errorMsg);
        alert(`❌ Error matching players\n\n${errorMsg}\n\nPlease enter scores manually.`);
        return;
      }

      // Populate form with matched stats
      populateBulkStats(matchResult.data.stats, matchResult.data.summary, matchResult.data.unmatchedPlayers);

    } catch (error) {
      console.error('Error fetching scores:', error);
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setFetchError(errorMsg);
      alert(
        `❌ Network Error\n\n` +
        `${errorMsg}\n\n` +
        `Please check your connection and try again, or enter scores manually.`
      );
    } finally {
      setIsFetchingScores(false);
    }
  };

  const populateBulkStats = (stats: any[], summary: any, unmatchedPlayers: string[]) => {
    const newBulkStats: Record<string, BulkStatEntry> = {};
    for (const stat of stats) {
      newBulkStats[stat.playerId] = {
        playerId: stat.playerId,
        runs: stat.runs,
        wickets: stat.wickets,
        catches: stat.catches,
        runOuts: stat.runOuts,
        stumpings: stat.stumpings,
        didNotPlay: stat.didNotPlay
      };
    }
    setBulkStats(newBulkStats);

    let successMessage = `✅ Scores fetched from score DB!\n\n`;
    successMessage += `From score DB: ${summary.totalPlayers} players\n`;
    successMessage += `Matched to your roster: ${summary.matchedPlayers}\n`;
    successMessage += `Marked DNP (not in score data): ${summary.dnpPlayers}\n`;
    if (summary.unmatchedPlayers > 0) {
      successMessage += `\n⚠️ Unmatched (score DB names not in your roster): ${summary.unmatchedPlayers}\n`;
      successMessage += `  ${unmatchedPlayers.join(', ')}\n`;
    }
    successMessage += `\n📝 Review the populated stats below and click "Save All Stats" when ready.`;
    setFetchSuccess(successMessage);
    alert(successMessage);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <a
                href="/admin/dashboard"
                className="flex items-center gap-2 text-white hover:text-orange-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </a>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Bulk Player Statistics</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tournament Filter */}
        {tournaments.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Filter by Tournament
            </label>
            <select
              value={selectedTournament}
              onChange={(e) => {
                setSelectedTournament(e.target.value);
                setSelectedGame(''); // Clear game selection when tournament changes
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-medium text-gray-900"
            >
              <option value="all" className="text-gray-900">All Tournaments</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id} className="text-gray-900">
                  {tournament.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Game Selection */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Select Game
          </label>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-medium text-gray-900"
              >
                <option value="" className="text-gray-900">-- Select a game --</option>
                {games
                  .filter(game => selectedTournament === 'all' || game.tournamentId === selectedTournament)
                  .map((game) => (
                    <option key={game.id} value={game.id} className="text-gray-900">
                      {game.title} - {new Date(game.gameDate).toLocaleDateString()}
                    </option>
                  ))}
              </select>
            </div>
            {selectedGame && (
              <button
                onClick={handleFetchScoresClick}
                disabled={isFetchingScores || loadingScoreDbGames}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Download className="h-5 w-5" />
                {loadingScoreDbGames ? 'Loading games...' : isFetchingScores ? 'Fetching...' : 'Fetch Scores from API'}
              </button>
            )}
          </div>
          
          {/* Status Messages */}
          {selectedGame && (
            <div className="mt-4 space-y-2">
              {bridgeAvailable === true && (
                <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">✅ Bridge server is running — click "Fetch Scores from API" to pick a game</p>
                    <p className="text-xs mt-1">A game picker will appear so you don&apos;t need to know the external match ID.</p>
                  </div>
                </div>
              )}
              {bridgeAvailable === false && (
                <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">⚠️ Bridge server not running — score fetching requires it</p>
                    <p className="text-xs mt-1 leading-relaxed">
                      Open a terminal on your <strong>developer Mac</strong> and run:<br />
                      <code className="bg-orange-100 px-1 py-0.5 rounded font-mono text-orange-800">node scripts/score-bridge-server.js</code><br />
                      Then also make sure you&apos;re using <strong>http://localhost:3000/admin/stats</strong> (not the Vercel URL).<br />
                      After starting, click "Fetch Scores from API" again.
                    </p>
                  </div>
                </div>
              )}
              {bridgeAvailable === null && (
                <div className="flex items-start gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p>Checking bridge server status…</p>
                </div>
              )}
              {fetchError && fetchError !== 'bridge_not_running' && (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Error fetching scores</p>
                    <p className="text-xs mt-1">{fetchError}</p>
                  </div>
                </div>
              )}
              {fetchError === 'bridge_not_running' && (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Bridge server not running</p>
                    <p className="text-xs mt-1 leading-relaxed">
                      Start it with: <code className="bg-red-100 px-1 rounded font-mono">node scripts/score-bridge-server.js</code><br />
                      Also ensure you&apos;re on <strong>http://localhost:3000/admin/stats</strong>, then click "Fetch Scores from API" again.
                    </p>
                  </div>
                </div>
              )}
              {fetchSuccess && (
                <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Scores fetched successfully!</p>
                    <p className="text-xs mt-1 whitespace-pre-line">{fetchSuccess}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedGame && (
          <>
            {/* Existing Stats Section */}
            {existingStats.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Existing Stats ({existingStats.length})
                  </h2>
                  <button
                    onClick={handleDeleteAllStats}
                    disabled={isDeletingAll}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeletingAll ? 'Deleting All...' : 'Delete All'}
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Player</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Team</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Runs</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Wickets</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Catches</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Run Outs</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Stumpings</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">DNP</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Points</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {existingStats.map((stat) => (
                        <tr key={stat.id} className="hover:bg-gray-50">
                          {editingStatId === stat.id ? (
                            <>
                              <td className="px-4 py-3 font-medium text-gray-900">{stat.player.name}</td>
                              <td className="px-4 py-3">
                                <span 
                                  className="text-xs font-bold px-2 py-1 rounded"
                                  style={{ 
                                    backgroundColor: stat.player.iplTeam.color + '20',
                                    color: stat.player.iplTeam.color
                                  }}
                                >
                                  {stat.player.iplTeam.shortName}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={editFormData.runs ?? 0}
                                  onChange={(e) => setEditFormData({ ...editFormData, runs: parseInt(e.target.value) || 0 })}
                                  disabled={editFormData.didNotPlay ?? false}
                                  className="w-16 px-2 py-1 border rounded text-center text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={editFormData.wickets ?? 0}
                                  onChange={(e) => setEditFormData({ ...editFormData, wickets: parseInt(e.target.value) || 0 })}
                                  disabled={editFormData.didNotPlay ?? false}
                                  className="w-16 px-2 py-1 border rounded text-center text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={editFormData.catches ?? 0}
                                  onChange={(e) => setEditFormData({ ...editFormData, catches: parseInt(e.target.value) || 0 })}
                                  disabled={editFormData.didNotPlay ?? false}
                                  className="w-16 px-2 py-1 border rounded text-center text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={editFormData.runOuts ?? 0}
                                  onChange={(e) => setEditFormData({ ...editFormData, runOuts: parseInt(e.target.value) || 0 })}
                                  disabled={editFormData.didNotPlay ?? false}
                                  className="w-16 px-2 py-1 border rounded text-center text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={editFormData.stumpings ?? 0}
                                  onChange={(e) => setEditFormData({ ...editFormData, stumpings: parseInt(e.target.value) || 0 })}
                                  disabled={editFormData.didNotPlay ?? false}
                                  className="w-16 px-2 py-1 border rounded text-center text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={editFormData.didNotPlay ?? false}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setEditFormData({ 
                                      ...editFormData, 
                                      didNotPlay: isChecked,
                                      // Clear all stats if DNP is checked
                                      ...(isChecked && {
                                        runs: 0,
                                        wickets: 0,
                                        catches: 0,
                                        runOuts: 0,
                                        stumpings: 0
                                      })
                                    });
                                  }}
                                  className="w-4 h-4"
                                />
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-green-600">
                                {editFormData.didNotPlay ? (
                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-bold">DNP</span>
                                ) : (
                                  calculatePoints(
                                    editFormData.runs ?? 0,
                                    editFormData.wickets ?? 0,
                                    editFormData.catches ?? 0,
                                    editFormData.runOuts ?? 0,
                                    editFormData.stumpings ?? 0
                                  )
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleUpdateStat(stat.id)}
                                    disabled={isUpdating}
                                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Save"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingStatId(null);
                                      setEditFormData({});
                                    }}
                                    disabled={isUpdating}
                                    className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Cancel"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 font-medium text-gray-900">{stat.player.name}</td>
                              <td className="px-4 py-3">
                                <span 
                                  className="text-xs font-bold px-2 py-1 rounded"
                                  style={{ 
                                    backgroundColor: stat.player.iplTeam.color + '20',
                                    color: stat.player.iplTeam.color
                                  }}
                                >
                                  {stat.player.iplTeam.shortName}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-gray-900">{stat.didNotPlay ? '—' : stat.runs}</td>
                              <td className="px-4 py-3 text-center text-gray-900">{stat.didNotPlay ? '—' : stat.wickets}</td>
                              <td className="px-4 py-3 text-center text-gray-900">{stat.didNotPlay ? '—' : stat.catches}</td>
                              <td className="px-4 py-3 text-center text-gray-900">{stat.didNotPlay ? '—' : stat.runOuts}</td>
                              <td className="px-4 py-3 text-center text-gray-900">{stat.didNotPlay ? '—' : stat.stumpings}</td>
                              <td className="px-4 py-3 text-center">
                                {stat.didNotPlay ? (
                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-bold">DNP</span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-green-600">{stat.points}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleEditStat(stat)}
                                    disabled={deletingStatId === stat.id || isDeletingAll}
                                    className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStat(stat.id)}
                                    disabled={deletingStatId === stat.id || isDeletingAll}
                                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bulk Entry Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Add/Update Stats (Bulk Entry)
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (confirm('Clear all entered stats from the form? This does not delete saved stats from the database.')) {
                        setBulkStats({});
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
                  >
                    <X className="h-4 w-4" />
                    Clear Form
                  </button>
                  <button
                    onClick={handleBulkSave}
                    disabled={saving || Object.keys(bulkStats).filter(id => hasAnyStats(id)).length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
                  >
                    <Save className="h-5 w-5" />
                    {saving ? 'Saving...' : `Save All (${Object.keys(bulkStats).filter(id => hasAnyStats(id)).length})`}
                  </button>
                </div>
              </div>

              <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Instructions:</strong> Enter stats for multiple players below and click "Save All" when done. 
                  Stats will be created or updated automatically.
                </p>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Player</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Team</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Runs</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Wickets</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Catches</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Run Outs</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Stumpings</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">DNP</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-gray-50 border-b-2 border-gray-200">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getGamePlayers().map((player) => (
                      <tr 
                        key={player.id} 
                        className={`hover:bg-gray-50 ${hasAnyStats(player.id) ? 'bg-green-50' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{player.name}</td>
                        <td className="px-4 py-3">
                          <span 
                            className="text-xs font-bold px-2 py-1 rounded"
                            style={{ 
                              backgroundColor: player.iplTeam.color + '20',
                              color: player.iplTeam.color
                            }}
                          >
                            {player.iplTeam.shortName}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={getStatValue(player.id, 'runs') as number}
                            onChange={(e) => handleStatChange(player.id, 'runs', e.target.value)}
                            disabled={getStatValue(player.id, 'didNotPlay') as boolean}
                            className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-orange-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={getStatValue(player.id, 'wickets') as number}
                            onChange={(e) => handleStatChange(player.id, 'wickets', e.target.value)}
                            disabled={getStatValue(player.id, 'didNotPlay') as boolean}
                            className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-orange-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={getStatValue(player.id, 'catches') as number}
                            onChange={(e) => handleStatChange(player.id, 'catches', e.target.value)}
                            disabled={getStatValue(player.id, 'didNotPlay') as boolean}
                            className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-orange-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={getStatValue(player.id, 'runOuts') as number}
                            onChange={(e) => handleStatChange(player.id, 'runOuts', e.target.value)}
                            disabled={getStatValue(player.id, 'didNotPlay') as boolean}
                            className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-orange-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={getStatValue(player.id, 'stumpings') as number}
                            onChange={(e) => handleStatChange(player.id, 'stumpings', e.target.value)}
                            disabled={getStatValue(player.id, 'didNotPlay') as boolean}
                            className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-orange-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={getStatValue(player.id, 'didNotPlay') as boolean}
                            onChange={(e) => handleStatChange(player.id, 'didNotPlay', e.target.checked)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-green-600">
                          {getStatValue(player.id, 'didNotPlay') ? (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-bold">DNP</span>
                          ) : (
                            calculatePoints(
                              getStatValue(player.id, 'runs') as number,
                              getStatValue(player.id, 'wickets') as number,
                              getStatValue(player.id, 'catches') as number,
                              getStatValue(player.id, 'runOuts') as number,
                              getStatValue(player.id, 'stumpings') as number
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!selectedGame && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <BarChart3 className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <p className="text-xl text-gray-600">Please select a game to manage player statistics</p>
          </div>
        )}
      </div>

      {/* Score DB Game Picker Modal */}
      {showGamePicker && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Select Game from Score Database</h3>
              <button
                onClick={() => setShowGamePicker(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Pick the matching game from the score database for{' '}
              <strong className="text-gray-900">{games.find(g => g.id === selectedGame)?.title}</strong>:
            </p>
            <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2 mb-3">
              ⚠️ Only select games marked <strong>✓ completed</strong> — upcoming games have no score data yet.
            </p>
            <select
              value={selectedScoreDbGameId ?? ''}
              onChange={(e) => setSelectedScoreDbGameId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 mb-5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select a completed game --</option>
              {scoreDbGames.filter(g => g.statusId === 44).length > 0 && (
                <optgroup label="✓ Completed (have score data)">
                  {scoreDbGames.filter(g => g.statusId === 44).map(g => (
                    <option key={g.gameId} value={g.gameId}>
                      {g.homeTeam ?? '?'} vs {g.visitingTeam ?? '?'} — {g.date}
                    </option>
                  ))}
                </optgroup>
              )}
              {scoreDbGames.filter(g => g.statusId !== 44).length > 0 && (
                <optgroup label="⏳ Upcoming (no data yet)">
                  {scoreDbGames.filter(g => g.statusId !== 44).map(g => (
                    <option key={g.gameId} value={g.gameId} disabled>
                      {g.homeTeam ?? '?'} vs {g.visitingTeam ?? '?'} — {g.date}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGamePicker(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedScoreDbGameId) {
                    alert('Please select a game');
                    return;
                  }
                  setShowGamePicker(false);
                  await handleFetchScores(String(selectedScoreDbGameId));
                }}
                disabled={!selectedScoreDbGameId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Fetch Scores
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
