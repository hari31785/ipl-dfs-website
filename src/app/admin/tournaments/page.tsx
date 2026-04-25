"use client"

import { useState, useEffect } from "react"
import { Calendar, Trophy, Plus, Edit3, Trash2, Clock, Users, Play, ArrowLeft, Home, BarChart3 } from "lucide-react"

interface Tournament {
  id: string
  name: string
  description?: string
  startDate: string
  endDate: string
  isActive: boolean
  status: string
  createdAt: string
  _count?: {
    games: number
  }
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    isActive: true,
    status: "UPCOMING"
  })

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/admin/tournaments')
      if (response.ok) {
        const data = await response.json()
        setTournaments(data)
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const method = selectedTournament ? 'PUT' : 'POST'
      const url = selectedTournament 
        ? `/api/admin/tournaments/${selectedTournament.id}` 
        : '/api/admin/tournaments'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchTournaments()
        resetForm()
        setShowForm(false)
      }
    } catch (error) {
      console.error('Failed to save tournament:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      isActive: true,
      status: "UPCOMING"
    })
    setSelectedTournament(null)
  }

  const handleEdit = (tournament: Tournament) => {
    setSelectedTournament(tournament)
    setFormData({
      name: tournament.name,
      description: tournament.description || "",
      startDate: tournament.startDate.split('T')[0],
      endDate: tournament.endDate.split('T')[0],
      isActive: tournament.isActive,
      status: tournament.status
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string, tournamentName: string = '') => {
    if (!confirm(`Are you sure you want to delete ${tournamentName || 'this tournament'}?`)) return

    try {
      const response = await fetch(`/api/admin/tournaments/${id}`, {
        method: 'DELETE',
      })

      const responseData = await response.json()

      if (response.ok) {
        await fetchTournaments()
        alert('Tournament deleted successfully!')
      } else if (response.status === 400 && responseData.canForceDelete) {
        // Tournament has associated data but can be force deleted
        const confirmMessage = `${responseData.message}\n\nThis will permanently delete:\n${responseData.details?.games || 0} games\n${responseData.details?.players || 0} players\n${responseData.details?.contests || 0} contests\n\nDo you want to continue?`
        
        if (confirm(confirmMessage)) {
          // Force delete
          const forceResponse = await fetch(`/api/admin/tournaments/${id}?force=true`, {
            method: 'DELETE',
          })
          
          const forceData = await forceResponse.json()
          
          if (forceResponse.ok) {
            await fetchTournaments()
            alert(`Tournament deleted successfully!\nDeleted: ${forceData.deleted?.games || 0} games, ${forceData.deleted?.players || 0} players, ${forceData.deleted?.contests || 0} contests`)
          } else {
            alert(`Failed to force delete tournament: ${forceData.message}`)
          }
        }
      } else {
        // Show detailed error message
        let errorMessage = responseData.message || 'Failed to delete tournament'
        if (responseData.details) {
          errorMessage += `\n\nAssociated data:\n• ${responseData.details.games || 0} games\n• ${responseData.details.players || 0} players\n• ${responseData.details.contests || 0} contests`
        }
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Failed to delete tournament:', error)
      alert('Network error while deleting tournament. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING': return 'bg-blue-100 text-blue-800'
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 md:py-6">
            <div className="flex items-center gap-4">
              <a
                href="/admin/dashboard"
                className="flex items-center gap-2 text-white hover:text-yellow-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </a>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-lg md:text-2xl font-bold text-white">Tournament Management</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-900 font-medium">Create and manage IPL tournaments</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
          >
            <Plus className="h-4 w-4" />
            New Tournament
          </button>
        </div>

        {/* Tournament Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90dvh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {selectedTournament ? 'Edit Tournament' : 'Create New Tournament'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tournament Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., IPL 2024"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tournament description"
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  >
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 h-4 w-4"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Active Tournament
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 font-medium"
                  >
                    {isLoading ? 'Saving...' : (selectedTournament ? 'Update Tournament' : 'Create Tournament')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tournament Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tournaments found</h3>
            <p className="text-gray-600 mb-6">Create your first tournament to get started.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              Create Tournament
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{tournament.name}</h3>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                        {tournament.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => handleEdit(tournament)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tournament.id, tournament.name)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {tournament.description && (
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">{tournament.description}</p>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Play className="h-4 w-4 text-gray-400" />
                      <span>{tournament._count?.games || 0} games</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Created {new Date(tournament.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <a
                      href={`/admin/games?tournament=${tournament.id}`}
                      className="block w-full text-center bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-lg transition-colors font-medium"
                    >
                      Manage Games
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}