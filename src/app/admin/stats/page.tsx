'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, Trash2, Edit, Save, X } from 'lucide-react';

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

export default function BulkStatsPage() {
  const [games, setGames] = useState<IPLGame[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [existingStats, setExistingStats] = useState<PlayerStat[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkStats, setBulkStats] = useState<Record<string, BulkStatEntry>>({});
  const [editingStatId, setEditingStatId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PlayerStat>>({});

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    if (selectedGame) {
      fetchStats(selectedGame);
      const game = games.find(g => g.id === selectedGame);
      if (game && game.tournamentId) {
        fetchPlayersForTournament(game.tournamentId);
      }
    } else {
      setPlayers([]);
      setExistingStats([]);
      setBulkStats({});
    }
  }, [selectedGame, games]);

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

  const getGamePlayers = () => {
    if (!selectedGame) return [];
    const game = games.find(g => g.id === selectedGame);
    if (!game) return [];
    
    return players.filter(player => 
      player.iplTeam.id === game.team1.id || 
      player.iplTeam.id === game.team2.id
    );
  };

  const calculatePoints = (runs: number, wickets: number, catches: number, runOuts: number, stumpings: number) => {
    return (runs * 1) + (wickets * 20) + ((catches + runOuts + stumpings) * 5);
  };

  const handleStatChange = (playerId: string, field: string, value: string | boolean) => {
    setBulkStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        playerId,
        [field]: field === 'didNotPlay' ? value : (value === '' ? 0 : parseInt(value as string) || 0)
      }
    }));
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

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully saved stats for ${result.count} player(s)!`);
        fetchStats(selectedGame);
        setBulkStats({});
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving bulk stats:', error);
      alert('Error saving stats');
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
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating stat:', error);
      alert('Error updating stat');
    }
  };

  const handleDeleteStat = async (statId: string) => {
    if (!confirm('Are you sure you want to delete this stat entry?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/stats/${statId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Stats deleted successfully!');
        fetchStats(selectedGame);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting stat:', error);
      alert('Error deleting stat');
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
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting stats:', error);
      alert('Error deleting stats');
    }
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
        {/* Game Selection */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Select Game
          </label>
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-medium text-gray-900"
          >
            <option value="" className="text-gray-900">-- Select a game --</option>
            {games.map((game) => (
              <option key={game.id} value={game.id} className="text-gray-900">
                {game.title} - {new Date(game.gameDate).toLocaleDateString()}
              </option>
            ))}
          </select>
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
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Player</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Team</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Runs</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Wickets</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Catches</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Run Outs</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Stumpings</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">DNP</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Points</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
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
                                  className="w-16 px-2 py-1 border rounded text-center"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={editFormData.wickets ?? 0}
                                  onChange={(e) => setEditFormData({ ...editFormData, wickets: parseInt(e.target.value) || 0 })}
                                  className="w-16 px-2 py-1 border rounded text-center"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={editFormData.catches ?? 0}
                                  onChange={(e) => setEditFormData({ ...editFormData, catches: parseInt(e.target.value) || 0 })}
                                  className="w-16 px-2 py-1 border rounded text-center"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={editFormData.runOuts ?? 0}
                                  onChange={(e) => setEditFormData({ ...editFormData, runOuts: parseInt(e.target.value) || 0 })}
                                  className="w-16 px-2 py-1 border rounded text-center"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={editFormData.stumpings ?? 0}
                                  onChange={(e) => setEditFormData({ ...editFormData, stumpings: parseInt(e.target.value) || 0 })}
                                  className="w-16 px-2 py-1 border rounded text-center"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={editFormData.didNotPlay ?? false}
                                  onChange={(e) => setEditFormData({ ...editFormData, didNotPlay: e.target.checked })}
                                  className="w-4 h-4"
                                />
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-green-600">
                                {calculatePoints(
                                  editFormData.runs ?? 0,
                                  editFormData.wickets ?? 0,
                                  editFormData.catches ?? 0,
                                  editFormData.runOuts ?? 0,
                                  editFormData.stumpings ?? 0
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleUpdateStat(stat.id)}
                                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                    title="Save"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingStatId(null);
                                      setEditFormData({});
                                    }}
                                    className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
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
                              <td className="px-4 py-3 text-center">{stat.runs}</td>
                              <td className="px-4 py-3 text-center">{stat.wickets}</td>
                              <td className="px-4 py-3 text-center">{stat.catches}</td>
                              <td className="px-4 py-3 text-center">{stat.runOuts}</td>
                              <td className="px-4 py-3 text-center">{stat.stumpings}</td>
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
                                    className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStat(stat.id)}
                                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
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
                <button
                  onClick={handleBulkSave}
                  disabled={saving || Object.keys(bulkStats).filter(id => hasAnyStats(id)).length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
                >
                  <Save className="h-5 w-5" />
                  {saving ? 'Saving...' : `Save All (${Object.keys(bulkStats).filter(id => hasAnyStats(id)).length})`}
                </button>
              </div>

              <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Instructions:</strong> Enter stats for multiple players below and click "Save All" when done. 
                  Stats will be created or updated automatically.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Player</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Team</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Runs</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Wickets</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Catches</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Run Outs</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Stumpings</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">DNP</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Points</th>
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
                            className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-orange-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={getStatValue(player.id, 'wickets') as number}
                            onChange={(e) => handleStatChange(player.id, 'wickets', e.target.value)}
                            className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-orange-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={getStatValue(player.id, 'catches') as number}
                            onChange={(e) => handleStatChange(player.id, 'catches', e.target.value)}
                            className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-orange-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={getStatValue(player.id, 'runOuts') as number}
                            onChange={(e) => handleStatChange(player.id, 'runOuts', e.target.value)}
                            className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-orange-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={getStatValue(player.id, 'stumpings') as number}
                            onChange={(e) => handleStatChange(player.id, 'stumpings', e.target.value)}
                            className="w-16 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-orange-500"
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
                          {calculatePoints(
                            getStatValue(player.id, 'runs') as number,
                            getStatValue(player.id, 'wickets') as number,
                            getStatValue(player.id, 'catches') as number,
                            getStatValue(player.id, 'runOuts') as number,
                            getStatValue(player.id, 'stumpings') as number
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
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">Please select a game to manage player statistics</p>
          </div>
        )}
      </div>
    </div>
  );
}
