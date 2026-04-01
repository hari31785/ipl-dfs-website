"use client"

import { useEffect, useState } from "react"
import { Shield, Plus, Edit, Trash2, ArrowLeft, Users, Home } from "lucide-react"

interface IPLTeam {
  id: string
  name: string
  shortName: string
  city: string
  color: string
  logoUrl?: string
  isActive: boolean
  players: { id: string; name: string }[]
}

export default function TeamsManagement() {
  const [teams, setTeams] = useState<IPLTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<IPLTeam | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    shortName: "",
    city: "",
    color: "#FF6B35",
    logoUrl: ""
  })

  useEffect(() => {
    // Check admin authentication
    const adminData = localStorage.getItem('currentAdmin')
    if (!adminData) {
      window.location.href = '/admin/login'
      return
    }
    
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/admin/teams")
      const data = await response.json()
      
      if (response.ok) {
        // API returns teams array directly, not wrapped in object
        setTeams(Array.isArray(data) ? data : [])
      } else {
        setError(data.message || "Failed to fetch teams")
      }
    } catch (error) {
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
      const url = editingTeam ? `/api/admin/teams/${editingTeam.id}` : "/api/admin/teams"
      const method = editingTeam ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(editingTeam ? "Team updated successfully!" : "Team created successfully!")
        setFormData({
          name: "",
          shortName: "",
          city: "",
          color: "#FF6B35",
          logoUrl: ""
        })
        setShowForm(false)
        setEditingTeam(null)
        fetchTeams() // Refresh the list
      } else {
        setError(data.message || `Failed to ${editingTeam ? 'update' : 'create'} team`)
      }
    } catch (error) {
      setError("Network error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (team: IPLTeam) => {
    setFormData({
      name: team.name,
      shortName: team.shortName,
      city: team.city,
      color: team.color,
      logoUrl: team.logoUrl || ""
    })
    setEditingTeam(team)
    setShowForm(true)
    setError("")
    setSuccess("")
  }

  const handleDelete = async (team: IPLTeam) => {
    if (!confirm(`Are you sure you want to delete ${team.name}? This action cannot be undone.`)) {
      return
    }

    setDeletingTeamId(team.id)
    try {
      const response = await fetch(`/api/admin/teams/${team.id}`, {
        method: "DELETE"
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Team deleted successfully!")
        fetchTeams() // Refresh the list
      } else {
        setError(data.message || "Failed to delete team")
      }
    } catch (error) {
      setError("Network error")
    } finally {
      setDeletingTeamId(null)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      shortName: "",
      city: "",
      color: "#FF6B35",
      logoUrl: ""
    })
    setShowForm(false)
    setEditingTeam(null)
    setError("")
    setSuccess("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-primary-800">Loading teams...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 md:py-6">
            <div className="flex items-center gap-4">
              <a
                href="/admin/dashboard"
                className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </a>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-lg md:text-2xl font-bold text-white">IPL Teams Management</h1>
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

        {/* Add Team Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add New IPL Team
          </button>
        </div>

        {/* Add/Edit Team Form */}
        {showForm && (
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="h-6 w-6 text-primary-600" />
              <h3 className="text-xl font-bold text-primary-800">
                {editingTeam ? "Edit" : "Add New"} IPL Team
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Mumbai Indians"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Name *
                </label>
                <input
                  type="text"
                  name="shortName"
                  required
                  maxLength={4}
                  value={formData.shortName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., MI"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Mumbai"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Color *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="#FF6B35"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo URL (Optional)
                </label>
                <input
                  type="url"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (editingTeam ? 'Updating Team...' : 'Creating Team...') : (editingTeam ? "Update" : "Create")} Team
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

        {/* Teams List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-primary-800">IPL Teams ({teams.length}/10)</h3>
          </div>

          {teams.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No IPL teams created yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Create your first team
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Team</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Short Name</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">City</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Players</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teams.map((team) => (
                    <tr key={team.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full"
                            style={{ backgroundColor: team.color }}
                          ></div>
                          <span className="font-semibold text-gray-900">{team.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{team.shortName}</td>
                      <td className="px-6 py-4 text-gray-600">{team.city}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{team.players.length}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(team)}
                            disabled={deletingTeamId === team.id}
                            className="text-primary-600 hover:text-primary-800 p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit team"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(team)}
                            disabled={deletingTeamId === team.id}
                            className="text-red-600 hover:text-red-800 p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete team"
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

        {/* Quick Add Popular Teams */}
        {teams.length < 10 && (
          <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
            <h4 className="text-lg font-bold text-amber-800 mb-4">Quick Add Popular IPL Teams</h4>
            <p className="text-amber-700 mb-4">
              Click to quickly add these popular IPL teams with their official colors:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { name: "Mumbai Indians", short: "MI", city: "Mumbai", color: "#004BA0" },
                { name: "Chennai Super Kings", short: "CSK", city: "Chennai", color: "#FFD700" },
                { name: "Royal Challengers Bangalore", short: "RCB", city: "Bangalore", color: "#D82131" },
                { name: "Kolkata Knight Riders", short: "KKR", city: "Kolkata", color: "#8A2BE2" },
                { name: "Delhi Capitals", short: "DC", city: "Delhi", color: "#282968" }
              ].map((team) => (
                <button
                  key={team.short}
                  onClick={() => {
                    setFormData({
                      name: team.name,
                      shortName: team.short,
                      city: team.city,
                      color: team.color,
                      logoUrl: ""
                    })
                    setShowForm(true)
                  }}
                  className="flex items-center gap-2 p-3 bg-white rounded-lg border border-amber-200 hover:border-amber-300 transition-colors"
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: team.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">{team.short}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}