'use client';

import { useState, useEffect } from 'react';
import { Home, ArrowLeft, BarChart3, Plus } from 'lucide-react';

interface IPLGame {
  id: string;
  title: string;
  gameDate: string;
  status: string;
  team1: {
    name: string;
    shortName: string;
  };
  team2: {
    name: string;
    shortName: string;
  };
}

interface Player {
  id: string;
  name: string;
  role: string;
  iplTeam: {
    name: string;
    shortName: string;
  };
}

interface PlayerStat {
  id: string;
  player: Player;
  runs: number;
  wickets: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  points: number;
}

export default function StatsPage() {
  const [games, setGames] = useState<IPLGame[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    playerId: '',
    runs: '',
    wickets: '',
    catches: '',
    runOuts: '',
    stumpings: '',
    didNotPlay: false
  });

  useEffect(() => {
    fetchGames();
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (selectedGame) {
      fetchStats(selectedGame);
    }
  }, [selectedGame]);

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

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/admin/players');
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
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const calculatePoints = (runs: number, wickets: number, catches: number, runOuts: number, stumpings: number) => {
    return (runs * 1) + (wickets * 20) + ((catches + runOuts + stumpings) * 5);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGame || !formData.playerId) {
      alert('Please select a game and player');
      return;
    }

    const runs = parseInt(formData.runs) || 0;
    const wickets = parseInt(formData.wickets) || 0;
    const catches = parseInt(formData.catches) || 0;
    const runOuts = parseInt(formData.runOuts) || 0;
    const stumpings = parseInt(formData.stumpings) || 0;

    // If player did not play, set points to 0
    const points = formData.didNotPlay ? 0 : calculatePoints(runs, wickets, catches, runOuts, stumpings);

    try {
      const response = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          iplGameId: selectedGame,
          playerId: formData.playerId,
          runs,
          wickets,
          catches,
          runOuts,
          stumpings,
          didNotPlay: formData.didNotPlay,
          points
        }),
      });

      if (response.ok) {
        fetchStats(selectedGame);
        resetForm();
        alert('Player stats added successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving stats:', error);
      alert('Error saving stats');
    }
  };

  const resetForm = () => {
    setFormData({
      playerId: '',
      runs: '',
      wickets: '',
      catches: '',
      runOuts: '',
      stumpings: '',
      didNotPlay: false
    });
    setShowForm(false);
  };

  const getGameTeamPlayers = () => {
    if (!selectedGame) return [];
    const game = games.find(g => g.id === selectedGame);
    if (!game) return [];
    
    return players.filter(player => 
      player.iplTeam.shortName === game.team1.shortName || 
      player.iplTeam.shortName === game.team2.shortName
    );
  };

  const previewPoints = () => {
    const runs = parseInt(formData.runs) || 0;
    const wickets = parseInt(formData.wickets) || 0;
    const catches = parseInt(formData.catches) || 0;
    const runOuts = parseInt(formData.runOuts) || 0;
    const stumpings = parseInt(formData.stumpings) || 0;
    
    return calculatePoints(runs, wickets, catches, runOuts, stumpings);
  };

  if (loading) return <div>Loading...</div>;

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
                <h1 className="text-2xl font-bold text-white">Player Statistics Management</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-900 font-medium">Enter match performance data</p>
        </div>
        {selectedGame && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Player Stats
          </button>
        )}
      </div>

      {/* Game Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-900">
          Select Game <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
          className="border-2 border-gray-300 rounded-lg px-4 py-3 w-full max-w-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
        >
          <option value="" className="text-gray-500">Choose a game to manage stats</option>
          {games.map((game) => (
            <option key={game.id} value={game.id} className="text-gray-900">
              {game.title} - {new Date(game.gameDate).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {/* Stats List */}
      {selectedGame && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b">
            <h3 className="font-medium">
              {games.find(g => g.id === selectedGame)?.title} - Player Statistics
            </h3>
          </div>
          
          {stats.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Runs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wickets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fielding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Points
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.map((stat) => (
                  <tr key={stat.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{stat.player.name}</div>
                        <div className="text-sm text-gray-500">
                          {stat.player.role} - {stat.player.iplTeam.shortName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.runs}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.wickets}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.catches + stat.runOuts + stat.stumpings}
                      <div className="text-xs text-gray-500">
                        C:{stat.catches} RO:{stat.runOuts} S:{stat.stumpings}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-lg text-blue-600">{stat.points}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No stats recorded for this game yet
            </div>
          )}
        </div>
      )}

      {/* Stats Form Modal */}
      {showForm && selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Add Player Statistics</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">
                    Player <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.playerId}
                    onChange={(e) => setFormData({ ...formData, playerId: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                    required
                  >
                    <option value="" className="text-gray-500">Select player</option>
                    {getGameTeamPlayers().map((player) => (
                      <option key={player.id} value={player.id} className="text-gray-900">
                        {player.name} ({player.role} - {player.iplTeam.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900">
                      Runs <span className="text-gray-500">(1 pt each)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.runs}
                      onChange={(e) => setFormData({ ...formData, runs: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900">
                      Wickets <span className="text-gray-500">(20 pts each)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.wickets}
                      onChange={(e) => setFormData({ ...formData, wickets: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900">
                      Catches <span className="text-gray-500">(5 pts)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.catches}
                      onChange={(e) => setFormData({ ...formData, catches: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900">
                      Run Outs <span className="text-gray-500">(5 pts)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.runOuts}
                      onChange={(e) => setFormData({ ...formData, runOuts: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900">
                      Stumpings <span className="text-gray-500">(5 pts)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stumpings}
                      onChange={(e) => setFormData({ ...formData, stumpings: e.target.value })}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* DNP Checkbox */}
                <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.didNotPlay}
                      onChange={(e) => setFormData({ ...formData, didNotPlay: e.target.checked })}
                      className="w-5 h-5 text-orange-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                    />
                    <div>
                      <span className="font-semibold text-gray-900">Did Not Play (DNP)</span>
                      <p className="text-sm text-gray-600">Check this if the player did not participate in the game. Stats will be set to 0 points.</p>
                    </div>
                  </label>
                </div>

                {/* Points Preview */}
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="font-medium text-blue-900">Points Calculation Preview:</div>
                  {formData.didNotPlay ? (
                    <div className="text-sm text-blue-800 mt-1">
                      <strong className="text-blue-900 text-base">Player marked as DNP - 0 points</strong>
                    </div>
                  ) : (
                    <div className="text-sm text-blue-800 mt-1">
                      Runs: {formData.runs || 0} × 1 = {(parseInt(formData.runs) || 0) * 1} pts<br/>
                      Wickets: {formData.wickets || 0} × 20 = {(parseInt(formData.wickets) || 0) * 20} pts<br/>
                      Fielding: {((parseInt(formData.catches) || 0) + (parseInt(formData.runOuts) || 0) + (parseInt(formData.stumpings) || 0))} × 5 = {((parseInt(formData.catches) || 0) + (parseInt(formData.runOuts) || 0) + (parseInt(formData.stumpings) || 0)) * 5} pts<br/>
                      <strong className="text-blue-900 text-base">Total: {previewPoints()} points</strong>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 text-gray-700 bg-gray-100 border-2 border-gray-300 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
                  >
                    Add Stats
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <h3 className="font-medium text-green-900 mb-2">Scoring Rules:</h3>
        <ul className="text-sm text-green-800 space-y-1">
          <li><strong>1 point per run</strong> - Every run scored by the player</li>
          <li><strong>20 points per wicket</strong> - Each wicket taken (bowling)</li>
          <li><strong>5 points per fielding action</strong> - Catches, run outs, or stumpings</li>
          <li>Total points = (Runs × 1) + (Wickets × 20) + (Fielding × 5)</li>
        </ul>
      </div>
      </div>
    </div>
  );
}