"use client"

import { useState, useEffect } from "react"
import { Users, ArrowLeft, Home, Search, Filter, Calendar, Mail, Phone, Coins, CheckCircle, Activity, Bell } from "lucide-react"
import Link from "next/link"

interface User {
  id: string
  username: string
  name: string | null
  email: string | null
  phone: string | null
  password: string
  coins: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    contestSignups: number
    coinTransactions: number
    pushSubscriptions: number
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "coins">("newest")
  const [showResetModal, setShowResetModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState("")
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterAndSortUsers()
  }, [users, searchTerm, statusFilter, sortBy])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        console.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortUsers = () => {
    let filtered = users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive)

      return matchesSearch && matchesStatus
    })

    // Sort users
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "name":
          return (a.name || a.username).localeCompare(b.name || b.username)
        case "coins":
          return b.coins - a.coins
        default:
          return 0
      }
    })

    setFilteredUsers(filtered)
  }

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${username}"? This action cannot be undone and will remove all their data.`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        await fetchUsers() // Refresh the list
        alert('User deleted successfully')
      } else {
        const error = await response.json()
        alert(`Failed to delete user: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Network error while deleting user')
    }
  }

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user)
    // Generate a random simple password
    const randomPassword = `IPL${Math.floor(1000 + Math.random() * 9000)}`
    setTemporaryPassword(randomPassword)
    setGeneratedPassword("")
    setShowResetModal(true)
  }

  const resetPassword = async () => {
    if (!selectedUser || !temporaryPassword) return

    if (temporaryPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    setResetting(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temporaryPassword })
      })

      if (response.ok) {
        const data = await response.json()
        setGeneratedPassword(data.temporaryPassword)
        alert(`Password reset successfully for ${selectedUser.username}`)
      } else {
        const error = await response.json()
        alert(`Failed to reset password: ${error.message}`)
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Network error while resetting password')
    } finally {
      setResetting(false)
    }
  }

  const copyTemporaryPassword = () => {
    navigator.clipboard.writeText(generatedPassword)
    alert('Temporary password copied to clipboard!')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center text-gray-800 text-xl">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 via-cyan-600 to-cyan-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 md:py-6">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 text-white hover:text-cyan-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </Link>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-400 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-lg md:text-2xl font-bold text-white">User Management</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Action Header */}
        <div className="hidden md:flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-900 font-medium">View and manage all registered users</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-1.5 mb-4 md:gap-6 md:mb-6">
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-2 md:p-6">
            <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left">
              <div>
                <p className="text-[9px] leading-tight md:text-sm font-medium text-gray-600">Total<br className="md:hidden" /> Users</p>
                <p className="text-lg md:text-3xl font-bold text-blue-600">{users.length}</p>
              </div>
              <Users className="hidden md:block h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-2 md:p-6">
            <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left">
              <div>
                <p className="text-[9px] leading-tight md:text-sm font-medium text-gray-600">Active<br className="md:hidden" /> Users</p>
                <p className="text-lg md:text-3xl font-bold text-green-600">{users.filter(u => u.isActive).length}</p>
              </div>
              <CheckCircle className="hidden md:block h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-2 md:p-6">
            <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left">
              <div>
                <p className="text-[9px] leading-tight md:text-sm font-medium text-gray-600">Total<br className="md:hidden" /> Coins</p>
                <p className="text-lg md:text-3xl font-bold text-yellow-600">
                  {users.reduce((sum, user) => sum + user.coins, 0).toLocaleString()}
                </p>
              </div>
              <Coins className="hidden md:block h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-2 md:p-6">
            <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left">
              <div>
                <p className="text-[9px] leading-tight md:text-sm font-medium text-gray-600">Contest<br className="md:hidden" /> Signups</p>
                <p className="text-lg md:text-3xl font-bold text-purple-600">
                  {users.reduce((sum, user) => sum + user._count.contestSignups, 0)}
                </p>
              </div>
              <Activity className="hidden md:block h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-4 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by username, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm text-gray-900 bg-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div>
              <label className="block text-sm font-medium mb-2">Filter by Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm text-gray-900 bg-white"
              >
                <option value="all">All Users</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "name" | "coins")}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm text-gray-900 bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
                <option value="coins">Coins (High-Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">User</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Contact</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Coins</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Activity</th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-600">Push</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Joined</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.name || 'No name set'}
                          </div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {user.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[160px]">{user.email}</span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                          {!user.email && !user.phone && (
                            <span className="text-sm text-gray-500">No contact info</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium text-gray-900">{user.coins.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">
                            {user._count.contestSignups} signups
                          </div>
                          <div className="text-sm text-gray-600">
                            {user._count.coinTransactions} transactions
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {user._count.pushSubscriptions > 0 ? (
                          <span title="Subscribed to push notifications" className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            <Bell className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">
                            <Bell className="h-3 w-3" /> No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {formatDate(user.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openResetPasswordModal(user)}
                            className="px-2 py-1 rounded-lg text-sm font-medium transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            Reset Pwd
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, user.username)}
                            className="px-2 py-1 rounded-lg text-sm font-medium transition-colors bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card Layout */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-3 space-y-2">
                  {/* Row 1: avatar + name/username + coins */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-xs">
                          {(user.name || user.username).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{user.name || 'N/A'}</p>
                        <p className="text-xs text-gray-400 truncate">@{user.username}{user.email ? ` · ${user.email}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Coins className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-sm font-bold text-gray-800">{user.coins.toLocaleString()}</span>
                    </div>
                  </div>
                  {/* Row 2: stats + actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{user._count.contestSignups} signups</span>
                      <span className="text-gray-300">·</span>
                      <span>{user._count.coinTransactions} txns</span>
                      <span className="text-gray-300">·</span>
                      {user._count.pushSubscriptions > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                          <Bell className="h-2.5 w-2.5" /> Push
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-400">
                          <Bell className="h-2.5 w-2.5" /> Off
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => openResetPasswordModal(user)}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.username)}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>

        {/* Summary */}
        <div className="mt-8 text-center text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Reset Password
            </h2>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                Resetting password for:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900">{selectedUser.name || selectedUser.username}</p>
                <p className="text-sm text-gray-600">@{selectedUser.username}</p>
                {selectedUser.email && <p className="text-sm text-gray-600">{selectedUser.email}</p>}
              </div>
            </div>

            {!generatedPassword ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temporary Password
                  </label>
                  <input
                    type="text"
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter temporary password"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 6 characters. A random password has been generated, or you can enter your own.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowResetModal(false)
                      setSelectedUser(null)
                      setTemporaryPassword("")
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={resetting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={resetPassword}
                    disabled={resetting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                  >
                    {resetting ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium mb-2">✅ Password Reset Successful!</p>
                  <p className="text-sm text-green-700 mb-3">
                    The temporary password for this user is:
                  </p>
                  <div className="flex items-center gap-2 bg-white p-3 rounded border border-green-200">
                    <code className="flex-1 text-lg font-mono font-bold text-green-900">
                      {generatedPassword}
                    </code>
                    <button
                      onClick={copyTemporaryPassword}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-green-700 mt-2">
                    📋 Give this password to the user. They can use it to login and should change it after logging in.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowResetModal(false)
                    setSelectedUser(null)
                    setTemporaryPassword("")
                    setGeneratedPassword("")
                  }}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}