"use client"

import { useEffect, useState } from "react"
import { Shield, Plus, Edit, Trash2, ArrowLeft, Users, TrendingUp, Star } from "lucide-react"

interface Tournament {
  id: string
  name: string
  isActive: boolean
}

interface IPLTeam {
  id: string
  name: string
  shortName: string
  color: string
}

interface Player {
  id: string
  name: string
  role: string
  price: number
  jerseyNumber?: number
  isActive: boolean
  iplTeamId: string
  iplTeam: IPLTeam
  createdAt: string
  updatedAt: string
}

const PLAYER_ROLES = [
  { value: "BATSMAN", label: "Batsman" },
  { value: "BOWLER", label: "Bowler" },
  { value: "ALL_ROUNDER", label: "All-Rounder" },
  { value: "WICKET_KEEPER", label: "Wicket Keeper" }
]

export default function PlayersManagement() {
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<IPLTeam[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedTeam, setSelectedTeam] = useState("all")
  const [bulkData, setBulkData] = useState("")
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [isBulkAdding, setIsBulkAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    role: "BATSMAN",
    price: 8.5, // Hidden default price
    jerseyNumber: "",
    iplTeamId: "",
    tournamentId: ""
  })

  useEffect(() => {
    // Check admin authentication
    const adminData = localStorage.getItem('currentAdmin')
    if (!adminData) {
      window.location.href = '/admin/login'
      return
    }
    
    async function initializeData() {
      await Promise.all([
        fetchTournaments(),
        fetchTeams()
      ])
      setLoading(false)
    }
    
    initializeData()
  }, [])

  useEffect(() => {
    if (selectedTournament) {
      fetchPlayers()
    }
  }, [selectedTournament])

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/admin/teams")
      const data = await response.json()
      
      if (response.ok) {
        // API returns teams array directly, not wrapped in object
        setTeams(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }

  const fetchTournaments = async () => {
    try {
      const response = await fetch("/api/admin/tournaments")
      const data = await response.json()
      
      if (response.ok) {
        const tournamentsData = Array.isArray(data) ? data : []
        setTournaments(tournamentsData)
        // Auto-select first active tournament, or first tournament if none active
        const activeTournament = tournamentsData.find((t: Tournament) => t.isActive)
        const firstTournament = tournamentsData[0]
        const selectedTourney = activeTournament || firstTournament
        
        if (selectedTourney) {
          setSelectedTournament(selectedTourney.id)
          setFormData(prev => ({ ...prev, tournamentId: selectedTourney.id }))
        }
      }
    } catch (error) {
      console.error("Error fetching tournaments:", error)
    }
  }

  const fetchPlayers = async () => {
    if (!selectedTournament) {
      setPlayers([])
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/players?tournamentId=${selectedTournament}`)
      const data = await response.json()
      
      if (response.ok) {
        setPlayers(Array.isArray(data.players) ? data.players : [])
        setError("")
      } else {
        setPlayers([])
        setError(data.message || "Failed to fetch players")
      }
    } catch (error) {
      setPlayers([])
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsSaving(true)

    try {
      const url = editingPlayer ? `/api/admin/players/${editingPlayer.id}` : "/api/admin/players"
      const method = editingPlayer ? "PUT" : "POST"

      const requestData = {
        ...formData,
        jerseyNumber: formData.jerseyNumber ? parseInt(formData.jerseyNumber) : null
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(editingPlayer ? "Player updated successfully!" : "Player created successfully!")
        setFormData({
          name: "",
          role: "BATSMAN",
          price: 8.5,
          jerseyNumber: "",
          iplTeamId: "",
          tournamentId: selectedTournament
        })
        setShowForm(false)
        setEditingPlayer(null)
        fetchPlayers()
      } else {
        setError(data.message || `Failed to ${editingPlayer ? 'update' : 'create'} player`)
      }
    } catch (error) {
      setError("Network error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (player: Player) => {
    setFormData({
      name: player.name,
      role: player.role,
      price: player.price, // Keep existing price but don't show in form
      jerseyNumber: player.jerseyNumber ? player.jerseyNumber.toString() : "",
      iplTeamId: player.iplTeamId,
      tournamentId: selectedTournament
    })
    setEditingPlayer(player)
    setShowForm(true)
    setError("")
    setSuccess("")
  }

  const handleDelete = async (player: Player) => {
    if (!confirm(`Are you sure you want to delete ${player.name}? This action cannot be undone.`)) {
      return
    }

    setDeletingPlayerId(player.id)
    try {
      const response = await fetch(`/api/admin/players/${player.id}`, {
        method: "DELETE"
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Player deleted successfully!")
        fetchPlayers()
      } else {
        setError(data.message || "Failed to delete player")
      }
    } catch (error) {
      setError("Network error")
    } finally {
      setDeletingPlayerId(null)
    }
  }

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  const handleSelectAll = () => {
    const filteredPlayerIds = filteredPlayers.map(player => player.id)
    if (selectedPlayers.length === filteredPlayerIds.length) {
      setSelectedPlayers([])
    } else {
      setSelectedPlayers(filteredPlayerIds)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPlayers.length === 0) {
      setError("Please select players to delete")
      return
    }

    const selectedPlayerNames = players
      .filter(p => selectedPlayers.includes(p.id))
      .map(p => p.name)
      .join(', ')

    if (!confirm(`Are you sure you want to delete ${selectedPlayers.length} player(s)? (${selectedPlayerNames})\n\nThis action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const deletePromises = selectedPlayers.map(playerId =>
        fetch(`/api/admin/players/${playerId}`, { method: "DELETE" })
      )

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.ok).length
      const failCount = results.length - successCount

      if (successCount > 0) {
        setSuccess(`Successfully deleted ${successCount} player(s)`)
        setSelectedPlayers([])
        fetchPlayers()
      }
      
      if (failCount > 0) {
        setError(`Failed to delete ${failCount} player(s)`)
      }
    } catch (error) {
      setError("Network error during bulk delete")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      role: "BATSMAN", 
      price: 8.5, // Hidden default price
      jerseyNumber: "",
      iplTeamId: "",
      tournamentId: selectedTournament
    })
    setShowForm(false)
    setShowBulkForm(false)
    setEditingPlayer(null)
    setError("")
    setSuccess("")
    setBulkData("")
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "BATSMAN": return "🏏"
      case "BOWLER": return "⚡"
      case "ALL_ROUNDER": return "⭐"
      case "WICKET_KEEPER": return "🧤"
      default: return "🏏"
    }
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsBulkAdding(true)

    try {
      const lines = bulkData.trim().split('\n').filter(line => line.trim())
      const players = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineNumber = i + 1
        
        // Split by comma and filter out empty parts (from trailing commas)
        const parts = line.split(',').map(part => part.trim()).filter(part => part.length > 0)
        
        if (parts.length < 3) {
          setError(`Line ${lineNumber}: Invalid format. Expected: Name, Role, Team [, Jersey]\nGot: "${line}"\nParts found: ${parts.length}`)
          setIsBulkAdding(false)
          return
        }

        const [name, role, teamShort, jersey] = parts
        
        if (!name) {
          setError(`Line ${lineNumber}: Player name is required`)
          setIsBulkAdding(false)
          return
        }
        
        const team = teams.find(t => t.shortName.toLowerCase() === teamShort.toLowerCase())
        
        if (!team) {
          setError(`Line ${lineNumber}: Invalid team "${teamShort}" for player "${name}".\nUse team abbreviations like MI, CSK, RCB, etc.\nAvailable teams: ${teams.map(t => t.shortName).join(', ')}`)
          setIsBulkAdding(false)
          return
        }

        if (!PLAYER_ROLES.find(r => r.value === role.toUpperCase())) {
          setError(`Line ${lineNumber}: Invalid role "${role}" for player "${name}".\nUse: BATSMAN, BOWLER, ALL_ROUNDER, WICKET_KEEPER`)
          setIsBulkAdding(false)
          return
        }

        players.push({
          name,
          role: role.toUpperCase(),
          price: 8.5,
          jerseyNumber: jersey ? parseInt(jersey) : null,
          iplTeamId: team.id
        })
      }

      const response = await fetch("/api/admin/players/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          players,
          tournamentId: selectedTournament 
        }),
      })

      const data = await response.json()
      
      console.log('Response status:', response.status)
      console.log('Response data:', data)

      if (response.ok) {
        setSuccess(`Successfully added ${data.created} players!`)
        if (data.errors && data.errors.length > 0) {
          console.warn('Some errors occurred:', data.errors)
          setError(`Added ${data.created} players but with errors:\n${data.errors.join('\n')}`)
        }
        setBulkData("")
        setShowBulkForm(false)
        fetchPlayers()
      } else {
        // Display all validation errors
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const errorMsg = data.errors.join('\n')
          console.error('Validation errors:', data.errors)
          setError(`Validation errors:\n\n${errorMsg}`)
        } else {
          const errorMsg = data.message || data.error || JSON.stringify(data)
          console.error('Server error:', errorMsg)
          setError(`Server error: ${errorMsg}`)
        }
      }
    } catch (error) {
      console.error('Bulk add error:', error)
      setError(`Network error or invalid data format: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsBulkAdding(false)
    }
  }

  const filteredPlayers = selectedTeam === "all" 
    ? players 
    : players.filter(player => player.iplTeamId === selectedTeam)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-primary-800">Loading players...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <a
                href="/admin/dashboard"
                className="flex items-center gap-2 text-white hover:text-green-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </a>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-400 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Player Management</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            {/* Tournament Selector */}
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Tournament</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} {tournament.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => setShowForm(true)}
              disabled={!selectedTournament}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Single Player
            </button>
            <button
              onClick={() => setShowBulkForm(true)}
              disabled={!selectedTournament}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <Users className="h-5 w-5" />
              Bulk Add Players
            </button>
            {selectedPlayers.length > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <Trash2 className="h-5 w-5" />
                {isDeleting ? "Deleting..." : `Delete Selected (${selectedPlayers.length})`}
              </button>
            )}
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter by Team:</span>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
            >
              <option value="all">All Teams</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.shortName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Add/Edit Player Form */}
        {showForm && (
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-6 w-6 text-primary-600" />
              <h3 className="text-xl font-bold text-primary-800">
                {editingPlayer ? "Edit" : "Add New"} Player
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Player Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  placeholder="e.g., Virat Kohli"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IPL Team *
                </label>
                <select
                  name="iplTeamId"
                  required
                  value={formData.iplTeamId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                >
                  <option value="">Select Team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.shortName} - {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  name="role"
                  required
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                >
                  {PLAYER_ROLES.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jersey Number (Optional)
                </label>
                <input
                  type="number"
                  name="jerseyNumber"
                  min="1"
                  max="99"
                  value={formData.jerseyNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  placeholder="18"
                />
              </div>

              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (editingPlayer ? 'Updating Player...' : 'Creating Player...') : (editingPlayer ? "Update" : "Create")} Player
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bulk Add Players Form */}
        {showBulkForm && (
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-bold text-primary-800">Bulk Add Players</h3>
            </div>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Format Instructions:</h4>
              <p className="text-blue-700 text-sm mb-2">
                Enter one player per line using this format:
              </p>
              <code className="block bg-blue-100 p-2 rounded text-sm font-mono">
                Player Name, Role, Team, Jersey Number (optional)
              </code>
              <p className="text-blue-700 text-sm mt-2">
                <strong>Roles:</strong> BATSMAN, BOWLER, ALL_ROUNDER, WICKET_KEEPER<br/>
                <strong>Teams:</strong> MI, CSK, RCB, KKR, DC, PBKS, RR, SRH, GT, LSG
              </p>
            </div>

            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
              <h5 className="font-medium text-gray-700 mb-2">Example:</h5>
              <pre className="text-sm text-gray-600 font-mono">
{`Shubman Gill, BATSMAN, GT, 77
Rashid Khan, BOWLER, GT, 19
David Miller, BATSMAN, GT
Hardik Pandya, ALL_ROUNDER, GT, 33`}
              </pre>
            </div>

            <form onSubmit={handleBulkSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Player Data *
                </label>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  required
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm text-gray-900 bg-white"
                  placeholder="Enter player data, one per line..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  Lines: {bulkData.trim().split('\n').filter(line => line.trim()).length}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isBulkAdding}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  {isBulkAdding ? 'Adding Players...' : 'Add Players'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isBulkAdding}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Players List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-primary-800">
              Players ({filteredPlayers.length})
              {selectedTeam !== "all" && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  - {teams.find(t => t.id === selectedTeam)?.shortName}
                </span>
              )}
            </h3>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {selectedTeam === "all" ? "No players created yet" : "No players in this team yet"}
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Add your first player
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 w-12">
                      <input
                        type="checkbox"
                        checked={filteredPlayers.length > 0 && selectedPlayers.length === filteredPlayers.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Player</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Team</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Role</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Jersey</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPlayers.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedPlayers.includes(player.id)}
                          onChange={() => handleSelectPlayer(player.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getRoleIcon(player.role)}</span>
                          <span className="font-semibold text-gray-900">{player.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: player.iplTeam.color }}
                          ></div>
                          <span className="text-gray-600">{player.iplTeam.shortName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {PLAYER_ROLES.find(r => r.value === player.role)?.label}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {player.jerseyNumber ? `#${player.jerseyNumber}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(player)}
                            disabled={deletingPlayerId === player.id}
                            className="text-primary-600 hover:text-primary-800 p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit player"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(player)}
                            disabled={deletingPlayerId === player.id}
                            className="text-red-600 hover:text-red-800 p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete player"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}