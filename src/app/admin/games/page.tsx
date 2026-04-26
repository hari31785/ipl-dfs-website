'use client';

import { useState, useEffect } from 'react';
import { Home, ArrowLeft, Trophy, Plus } from 'lucide-react';

interface IPLTeam {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface IPLGame {
  id: string;
  tournamentId: string;
  tournament: Tournament;
  title: string;
  description?: string;
  team1: IPLTeam;
  team2: IPLTeam;
  gameDate: string;
  signupDeadline: string;
  status: string;
  createdAt: string;
  _count: {
    contests: number;
  };
}

export default function GamesPage() {
  const [games, setGames] = useState<IPLGame[]>([]);
  const [teams, setTeams] = useState<IPLTeam[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<IPLGame | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tournamentFilter, setTournamentFilter] = useState<string>('ALL');
  const [teamValidationError, setTeamValidationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    tournamentId: '',
    title: '',
    description: '',
    team1Id: '',
    team2Id: '',
    gameDate: '',
    signupDeadline: ''
  });

  // Auto-calculate signup deadline when game date changes
  useEffect(() => {
    if (formData.gameDate) {
      // formData.gameDate is in format "2026-03-27T20:00" (local time)
      const gameDate = new Date(formData.gameDate);
      
      // Set to 8 PM local time the day before
      const signupDate = new Date(gameDate);
      signupDate.setDate(signupDate.getDate() - 1);
      signupDate.setHours(20, 0, 0, 0); // 8 PM local time
      
      // Convert to datetime-local format (YYYY-MM-DDTHH:MM)
      const year = signupDate.getFullYear();
      const month = String(signupDate.getMonth() + 1).padStart(2, '0');
      const day = String(signupDate.getDate()).padStart(2, '0');
      const hours = String(signupDate.getHours()).padStart(2, '0');
      const minutes = String(signupDate.getMinutes()).padStart(2, '0');
      const signupDeadline = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      setFormData(prev => ({ ...prev, signupDeadline }));
    }
  }, [formData.gameDate]);

  useEffect(() => {
    fetchGames();
    fetchTeams();
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/admin/tournaments');
      if (response.ok) {
        const data = await response.json();
        setTournaments(data);
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
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

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/admin/teams');
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        setTeams(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch teams:', response.statusText);
        setTeams([]);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.team1Id === formData.team2Id) {
      setTeamValidationError('Home team and away team cannot be the same. Please select different teams.');
      return;
    }
    
    setTeamValidationError('');

    const gameDate = new Date(formData.gameDate);
    const signupDeadline = new Date(formData.signupDeadline);
    
    if (signupDeadline >= gameDate) {
      alert('Signup deadline must be before the game date');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingGame ? `/api/admin/games/${editingGame.id}` : '/api/admin/games';
      const method = editingGame ? 'PUT' : 'POST';
      
      // datetime-local input gives us strings like "2026-03-27T20:00" (local time, no timezone)
      // new Date() with this format interprets it as local time
      // toISOString() then converts it to UTC for storage
      const dataToSend = {
        ...formData,
        gameDate: new Date(formData.gameDate).toISOString(),
        signupDeadline: new Date(formData.signupDeadline).toISOString()
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        fetchGames();
        resetForm();
        alert(`Game ${editingGame ? 'updated' : 'created'} successfully!`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving game:', error);
      alert('Error saving game');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to convert UTC date to local datetime string for input
  const toLocalDateTimeString = (date: string) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEdit = (game: IPLGame) => {
    setEditingGame(game);
    setFormData({
      tournamentId: game.tournamentId,
      title: game.title,
      description: game.description || '',
      team1Id: game.team1.id,
      team2Id: game.team2.id,
      gameDate: toLocalDateTimeString(game.gameDate),
      signupDeadline: toLocalDateTimeString(game.signupDeadline)
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this game?')) {
      try {
        const response = await fetch(`/api/admin/games/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchGames();
          alert('Game deleted successfully!');
        } else {
          const error = await response.json();
          alert(`Error: ${error.message}`);
        }
      } catch (error) {
        console.error('Error deleting game:', error);
        alert('Error deleting game');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      tournamentId: '',
      title: '',
      description: '',
      team1Id: '',
      team2Id: '',
      gameDate: '',
      signupDeadline: ''
    });
    setEditingGame(null);
    setShowForm(false);
  };

  const filteredGames = games.filter(game => {
    const statusMatch = statusFilter === 'ALL' || game.status === statusFilter;
    const tournamentMatch = tournamentFilter === 'ALL' || game.tournamentId === tournamentFilter;
    return statusMatch && tournamentMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING': return 'bg-blue-100 text-blue-800';
      case 'SIGNUP_CLOSED': return 'bg-yellow-100 text-yellow-800';
      case 'LIVE': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 md:py-6">
            <div className="flex items-center gap-4">
              <a
                href="/admin/dashboard"
                className="flex items-center gap-2 text-white hover:text-indigo-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </a>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-400 rounded-full flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-lg md:text-2xl font-bold text-white">IPL Games Management</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
      <div className="flex justify-between items-center mb-3 md:mb-6">
        <p className="hidden sm:block text-gray-900 font-medium text-sm">Schedule and manage IPL matches</p>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 md:px-4 rounded-lg flex items-center gap-1.5 transition-colors font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create New </span>Game
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 md:gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Tournament:</label>
          <select
            value={tournamentFilter}
            onChange={(e) => setTournamentFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="ALL">All Tournaments</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="ALL">All Games</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="SIGNUP_CLOSED">Signup Closed</option>
            <option value="LIVE">Live</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Games List */}
      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg shadow">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Game
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teams
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Game Date
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deadline
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contests
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredGames.map((game) => (
              <tr key={game.id}>
                <td className="px-3 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{game.title}</div>
                    <div className="text-xs text-gray-500">{game.tournament.name}</div>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: game.team1.color }}
                    ></span>
                    <span className="font-medium text-gray-900">{game.team1.shortName}</span>
                    <span className="text-gray-400">vs</span>
                    <span 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: game.team2.color }}
                    ></span>
                    <span className="font-medium text-gray-900">{game.team2.shortName}</span>
                  </div>
                </td>
                <td className="px-3 py-4 text-sm text-gray-900 whitespace-nowrap">
                  {new Date(game.gameDate).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true
                  })}
                </td>
                <td className="px-3 py-4 text-sm text-gray-900 whitespace-nowrap">
                  {new Date(game.signupDeadline).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true
                  })}
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(game.status)}`}>
                    {game.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {game._count.contests}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(game)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(game.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredGames.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No games found
          </div>
        )}
      </div>
      {/* Mobile cards */}
      <div className="md:hidden bg-white rounded-lg shadow divide-y divide-gray-200">
        {filteredGames.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No games found</div>
        ) : (
          filteredGames.map((game) => (
            <div key={game.id} className="px-3 py-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-xs text-gray-900 truncate">{game.title}</span>
                    <span className={`inline-flex shrink-0 px-1.5 py-0.5 text-[9px] font-medium rounded-full ${getStatusColor(game.status)}`}>
                      {game.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: game.team1.color }}></span>
                    <span className="text-[10px] font-medium text-gray-700">{game.team1.shortName}</span>
                    <span className="text-[10px] text-gray-400">vs</span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: game.team2.color }}></span>
                    <span className="text-[10px] font-medium text-gray-700">{game.team2.shortName}</span>
                    <span className="text-[10px] text-gray-400">·</span>
                    <span className="text-[10px] text-gray-500">{new Date(game.gameDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    <span className="text-[10px] text-gray-400">·</span>
                    <span className="text-[10px] text-gray-500">{game._count.contests}c</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5 items-center">
                  <button onClick={() => handleEdit(game)} className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px] font-semibold">Edit</button>
                  <button onClick={() => handleDelete(game.id)} className="px-2.5 py-1 bg-red-600 text-white rounded text-[10px] font-semibold">Del</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Game Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90dvh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingGame ? 'Edit Game' : 'Create New Game'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">
                    Tournament <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tournamentId}
                    onChange={(e) => setFormData({ ...formData, tournamentId: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                    required
                  >
                    <option value="" className="text-gray-500">Select Tournament</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id} className="text-gray-900">
                        {tournament.name} ({tournament.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">
                    Match Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400"
                    placeholder="e.g., MI vs CSK - Match 1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white text-gray-900 placeholder-gray-400"
                    placeholder="Additional details about the game"
                    rows={3}
                  />
                </div>

                {teamValidationError && (
                  <div className="bg-red-50 border-2 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                    {teamValidationError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900">
                      Home Team <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.team1Id}
                      onChange={(e) => {
                        setFormData({ ...formData, team1Id: e.target.value });
                        if (teamValidationError) setTeamValidationError('');
                      }}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                      required
                    >
                      <option value="" className="text-gray-500">Select Home Team</option>
                      {Array.isArray(teams) && teams.map((team) => (
                        <option key={team.id} value={team.id} className="text-gray-900">
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900">
                      Away Team <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.team2Id}
                      onChange={(e) => {
                        setFormData({ ...formData, team2Id: e.target.value });
                        if (teamValidationError) setTeamValidationError('');
                      }}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                      required
                    >
                      <option value="" className="text-gray-500">Select Away Team</option>
                      {Array.isArray(teams) && teams.map((team) => (
                        <option key={team.id} value={team.id} className="text-gray-900">
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">
                    Match Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.gameDate}
                    onChange={(e) => setFormData({ ...formData, gameDate: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Enter the match time in your local timezone. It will be displayed correctly in the list.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">
                    Signup Deadline <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.signupDeadline}
                    onChange={(e) => setFormData({ ...formData, signupDeadline: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Auto-set to 8 PM EST the day before match. Users can signup until this time.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={isSaving}
                    className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (editingGame ? 'Updating Game...' : 'Creating Game...') : (editingGame ? 'Update Game' : 'Create Game')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}