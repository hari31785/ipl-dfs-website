"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Shield, Users, Trophy, Target, Database, BarChart3, LogOut, Plus, MessageSquare, Bell, Send, X, Search } from "lucide-react"

interface AdminData {
  id: string
  username: string
  name: string
  createdAt: string
}

interface UserSearchResult {
  id: string
  username: string
  name: string
}

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPlayers: 0,
    totalTeams: 0,
    activeContests: 0,
    pendingMessages: 0
  })
  const [pushForm, setPushForm] = useState({ title: '', body: '', url: '' })
  const [pushSending, setPushSending] = useState(false)
  const [pushResult, setPushResult] = useState<{ sent: number; failed: number; message?: string } | null>(null)
  // Audience targeting
  const [pushAudience, setPushAudience] = useState<'all' | 'specific' | 'activeDrafts'>('all')
  const [userQuery, setUserQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [pushStats, setPushStats] = useState<{ totalUsers: number; subscribedUsers: number; totalDevices: number; unsubscribedUsers: number } | null>(null)

  useEffect(() => {
    // Get admin data from localStorage
    const adminData = localStorage.getItem('currentAdmin')
    if (adminData) {
      setAdmin(JSON.parse(adminData))
      // Run cleanup first, then fetch stats
      cleanupPastDueContests().then(() => {
        fetchDashboardStats() // Fetch stats after cleanup
      })
      fetch('/api/admin/push/broadcast').then(r => r.json()).then(setPushStats).catch(() => {})
    } else {
      // Redirect to admin login if no admin data
      window.location.href = '/admin/login'
    }
    setLoading(false)
  }, [])

  const cleanupPastDueContests = async () => {
    try {
      const response = await fetch('/api/admin/contests/cleanup', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.completedContests > 0 || result.cleanedUpSignups > 0) {
          console.log(`Cleanup completed: ${result.message}`);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        console.error('Failed to fetch dashboard stats')
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }

  const searchUsers = async (q: string) => {
    if (q.length < 2) { setUserSearchResults([]); return }
    setSearchingUsers(true)
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setUserSearchResults((data.users ?? []).slice(0, 8))
      }
    } catch {}
    finally { setSearchingUsers(false) }
  }

  const addUser = (u: UserSearchResult) => {
    if (!selectedUsers.find(s => s.id === u.id)) {
      setSelectedUsers(prev => [...prev, u])
    }
    setUserQuery('')
    setUserSearchResults([])
  }

  const removeUser = (id: string) => setSelectedUsers(prev => prev.filter(u => u.id !== id))

  const sendBroadcast = async () => {
    if (!pushForm.title.trim() || !pushForm.body.trim()) return
    if (pushAudience === 'specific' && selectedUsers.length === 0) return
    setPushSending(true)
    setPushResult(null)
    try {
      const body: Record<string, unknown> = {
        title: pushForm.title,
        body: pushForm.body,
        url: pushForm.url || '/dashboard',
      }
      if (pushAudience === 'specific') {
        body.userIds = selectedUsers.map(u => u.id)
      }
      if (pushAudience === 'activeDrafts') {
        body.activeDraftsOnly = true
      }
      const res = await fetch('/api/admin/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setPushResult(data)
      if (res.ok) {
        setPushForm({ title: '', body: '', url: '' })
        if (pushAudience === 'specific') setSelectedUsers([])
        // Refresh subscription stats (expired subs may have been pruned)
        fetch('/api/admin/push/broadcast').then(r => r.json()).then(setPushStats).catch(() => {})
      }
    } catch {
      setPushResult({ sent: 0, failed: 0, message: 'Network error' })
    } finally {
      setPushSending(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('currentAdmin')
    window.location.href = '/admin/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-primary-800">Loading...</div>
      </div>
    )
  }

  if (!admin) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-red-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 md:py-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-red-500 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-white">IPL DFS Admin</h1>
                <p className="text-red-100 text-sm">Welcome back, {admin.name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-colors border-2 border-white/40 hover:border-white/60 shadow-lg font-medium text-sm md:text-base"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Admin Dashboard - Stats Cards */}
        {/* Mobile: 5-col compact grid (no scroll)  |  Desktop: 5-col spacious grid */}
        <div className="grid grid-cols-5 gap-1.5 mb-4 md:gap-6 md:mb-8">
          <Link href="/admin/users" className="bg-white rounded-lg md:rounded-xl shadow-sm md:shadow-lg p-2 md:p-6 border border-gray-100 hover:shadow-xl transition-shadow cursor-pointer group">
            <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left gap-0.5 md:gap-0">
              <div>
                <p className="text-[9px] leading-tight md:text-sm font-medium text-gray-500 group-hover:text-blue-600 transition-colors">Total<br className="md:hidden" /> Users</p>
                <p className="text-lg md:text-3xl font-bold text-primary-800 group-hover:text-blue-700 transition-colors">{stats.totalUsers}</p>
              </div>
              <Users className="hidden md:block h-8 w-8 text-blue-500 group-hover:text-blue-600 transition-colors" />
            </div>
          </Link>

          <div className="bg-white rounded-lg md:rounded-xl shadow-sm md:shadow-lg p-2 md:p-6 border border-gray-100">
            <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left gap-0.5 md:gap-0">
              <div>
                <p className="text-[9px] leading-tight md:text-sm font-medium text-gray-500">Total<br className="md:hidden" /> Players</p>
                <p className="text-lg md:text-3xl font-bold text-gray-900">{stats.totalPlayers}</p>
              </div>
              <Target className="hidden md:block h-8 w-8 text-cricket-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg md:rounded-xl shadow-sm md:shadow-lg p-2 md:p-6 border border-gray-100">
            <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left gap-0.5 md:gap-0">
              <div>
                <p className="text-[9px] leading-tight md:text-sm font-medium text-gray-500">IPL<br className="md:hidden" /> Teams</p>
                <p className="text-lg md:text-3xl font-bold text-gray-900">{stats.totalTeams}</p>
              </div>
              <Database className="hidden md:block h-8 w-8 text-secondary-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg md:rounded-xl shadow-sm md:shadow-lg p-2 md:p-6 border border-gray-100">
            <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left gap-0.5 md:gap-0">
              <div>
                <p className="text-[9px] leading-tight md:text-sm font-medium text-gray-500">Active<br className="md:hidden" /> Contests</p>
                <p className="text-lg md:text-3xl font-bold text-red-600">{stats.activeContests}</p>
              </div>
              <Trophy className="hidden md:block h-8 w-8 text-red-500" />
            </div>
          </div>

          <Link href="/admin/messages" className="bg-white rounded-lg md:rounded-xl shadow-sm md:shadow-lg p-2 md:p-6 border border-gray-100 hover:shadow-xl transition-shadow cursor-pointer group">
            <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left gap-0.5 md:gap-0">
              <div>
                <p className="text-[9px] leading-tight md:text-sm font-medium text-gray-500 group-hover:text-purple-600 transition-colors">Msgs<br className="md:hidden" /><span className="hidden md:inline"> Pending</span></p>
                <p className="text-lg md:text-3xl font-bold text-purple-600 group-hover:text-purple-700 transition-colors">{stats.pendingMessages}</p>
              </div>
              <MessageSquare className="hidden md:block h-8 w-8 text-purple-500 group-hover:text-purple-600 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {/* Tournament Management */}
          <div className="bg-white rounded-xl shadow-lg p-2 md:p-6 border border-gray-100">
            <h3 className="text-xs md:text-xl font-bold text-primary-800 mb-2 md:mb-6 flex items-center gap-1.5 md:gap-2">
              <Trophy className="h-3.5 w-3.5 md:h-6 md:w-6" />
              <span className="leading-tight">Tournament<br className="md:hidden" /> Mgmt</span>
            </h3>
            <div className="space-y-1 md:space-y-4">
              <a
                href="/admin/tournaments"
                className="block w-full px-2 py-1 md:p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <Trophy className="h-4 w-4 md:h-6 md:w-6 flex-shrink-0" />
                    <div>
                      <div className="text-xs md:text-base font-semibold leading-tight">Tournaments</div>
                      <div className="hidden md:block text-sm opacity-90">Create IPL seasons</div>
                    </div>
                  </div>
                  <Plus className="hidden md:block h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </div>

          {/* User Management */}
          <div className="bg-white rounded-xl shadow-lg p-2 md:p-6 border border-gray-100">
            <h3 className="text-xs md:text-xl font-bold text-primary-800 mb-2 md:mb-6 flex items-center gap-1.5 md:gap-2">
              <Users className="h-3.5 w-3.5 md:h-6 md:w-6" />
              <span className="leading-tight">User &amp; Coin<br className="md:hidden" /> Mgmt</span>
            </h3>
            <div className="space-y-1 md:space-y-4">
              <Link
                href="/admin/users"
                className="block w-full px-2 py-1 md:p-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <Users className="h-4 w-4 md:h-6 md:w-6 flex-shrink-0" />
                    <div>
                      <div className="text-xs md:text-base font-semibold leading-tight">Users</div>
                      <div className="hidden md:block text-sm opacity-90">View and manage registered users</div>
                    </div>
                  </div>
                  <Plus className="hidden md:block h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              
              <Link
                href="/admin/vc-management"
                className="block w-full px-2 py-1 md:p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <span className="text-base md:text-2xl">💰</span>
                    <div>
                      <div className="text-xs md:text-base font-semibold leading-tight">VC Settlement</div>
                      <div className="hidden md:block text-sm opacity-90">Encash winners &amp; refill losers</div>
                    </div>
                  </div>
                  <Plus className="hidden md:block h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              
              <Link
                href="/admin/messages"
                className="block w-full px-2 py-1 md:p-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <span className="text-base md:text-2xl">💬</span>
                    <div>
                      <div className="text-xs md:text-base font-semibold leading-tight">Messages</div>
                      <div className="hidden md:block text-sm opacity-90">View support messages from users</div>
                    </div>
                  </div>
                  <Plus className="hidden md:block h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>

          {/* Team & Player Management */}
          <div className="bg-white rounded-xl shadow-lg p-2 md:p-6 border border-gray-100">
            <h3 className="text-xs md:text-xl font-bold text-primary-800 mb-2 md:mb-6 flex items-center gap-1.5 md:gap-2">
              <Database className="h-3.5 w-3.5 md:h-6 md:w-6" />
              <span className="leading-tight">Team &amp; Player<br className="md:hidden" /> Mgmt</span>
            </h3>
            <div className="space-y-1 md:space-y-4">
              <a
                href="/admin/teams"
                className="block w-full px-2 py-1 md:p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <Database className="h-4 w-4 md:h-6 md:w-6 flex-shrink-0" />
                    <div>
                      <div className="text-xs md:text-base font-semibold leading-tight">IPL Teams</div>
                      <div className="hidden md:block text-sm opacity-90">Add/Edit 10 IPL teams</div>
                    </div>
                  </div>
                  <Plus className="hidden md:block h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>

              <a
                href="/admin/players"
                className="block w-full px-2 py-1 md:p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <Users className="h-4 w-4 md:h-6 md:w-6 flex-shrink-0" />
                    <div>
                      <div className="text-xs md:text-base font-semibold leading-tight">Players</div>
                      <div className="hidden md:block text-sm opacity-90">Add/Edit player roster</div>
                    </div>
                  </div>
                  <Plus className="hidden md:block h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </div>

          {/* Contest Management */}
          <div className="bg-white rounded-xl shadow-lg p-2 md:p-6 border border-gray-100">
            <h3 className="text-xs md:text-xl font-bold text-primary-800 mb-2 md:mb-6 flex items-center gap-1.5 md:gap-2">
              <Trophy className="h-3.5 w-3.5 md:h-6 md:w-6" />
              <span className="leading-tight">Contest<br className="md:hidden" /> Mgmt</span>
            </h3>
            <div className="space-y-1 md:space-y-4">
              <a
                href="/admin/games"
                className="block w-full px-2 py-1 md:p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <Trophy className="h-4 w-4 md:h-6 md:w-6 flex-shrink-0" />
                    <div>
                      <div className="text-xs md:text-base font-semibold leading-tight">IPL Games</div>
                      <div className="hidden md:block text-sm opacity-90">Schedule matches</div>
                    </div>
                  </div>
                  <Plus className="hidden md:block h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>

              <a
                href="/admin/contests"
                className="block w-full px-2 py-1 md:p-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <Trophy className="h-4 w-4 md:h-6 md:w-6 flex-shrink-0" />
                    <div>
                      <div className="text-xs md:text-base font-semibold leading-tight">Contests</div>
                      <div className="hidden md:block text-sm opacity-90">Manage contest variations</div>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>

              <a
                href="/admin/stats"
                className="block w-full px-2 py-1 md:p-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <BarChart3 className="h-4 w-4 md:h-6 md:w-6 flex-shrink-0" />
                    <div>
                      <div className="text-xs md:text-base font-semibold leading-tight">Statistics</div>
                      <div className="hidden md:block text-sm opacity-90">Enter match performance</div>
                    </div>
                  </div>
                  <Plus className="hidden md:block h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>

              <a
                href="/admin/drafts"
                className="block w-full px-2 py-1 md:p-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <Target className="h-4 w-4 md:h-6 md:w-6 flex-shrink-0" />
                    <div>
                      <div className="text-xs md:text-base font-semibold leading-tight">Drafts</div>
                      <div className="hidden md:block text-sm opacity-90">Monitor snake drafts</div>
                    </div>
                  </div>
                  <Plus className="hidden md:block h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Push Notifications Broadcast */}
        <div className="mt-4 md:mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-primary-800 mb-1 flex items-center gap-2">
              <Bell className="h-6 w-6 text-indigo-500" />
              Push Notifications
            </h3>
            <p className="text-gray-500 text-sm mb-4">Send a custom notification to all users or specific individuals.</p>

            {/* Subscription stats bar */}
            {pushStats && (
              <div className="mb-5 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm">
                <span className="font-semibold text-gray-700">📱 Reach:</span>
                <span className="text-green-700 font-bold">{pushStats.subscribedUsers} subscribed</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{pushStats.totalDevices} device{pushStats.totalDevices !== 1 ? 's' : ''}</span>
                {pushStats.unsubscribedUsers > 0 && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span className="text-amber-600 font-medium">⚠️ {pushStats.unsubscribedUsers} users have no notifications enabled</span>
                  </>
                )}
              </div>
            )}

            {/* Audience toggle */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => { setPushAudience('all'); setSelectedUsers([]); setUserQuery(''); setUserSearchResults([]); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  pushAudience === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                }`}
              >
                📢 All Users
              </button>
              <button
                onClick={() => { setPushAudience('activeDrafts'); setSelectedUsers([]); setUserQuery(''); setUserSearchResults([]); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  pushAudience === 'activeDrafts'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                }`}
              >
                🏏 Active Drafts
              </button>
              <button
                onClick={() => setPushAudience('specific')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  pushAudience === 'specific'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                }`}
              >
                👤 Specific Users
              </button>
            </div>

            {/* Specific user picker */}
            {pushAudience === 'specific' && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select recipients</label>

                {/* Selected users chips */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedUsers.map(u => (
                      <span key={u.id} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-1 rounded-full">
                        @{u.username}
                        <button onClick={() => removeUser(u.id)} className="hover:text-red-600 ml-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search input */}
                <div className="relative" ref={searchRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={userQuery}
                    onChange={e => { setUserQuery(e.target.value); searchUsers(e.target.value); }}
                    placeholder="Search by name or username…"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {(searchingUsers || userSearchResults.length > 0) && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {searchingUsers && (
                        <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
                      )}
                      {userSearchResults.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => addUser(u)}
                          disabled={!!selectedUsers.find(s => s.id === u.id)}
                          className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 border-b last:border-b-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <div className="font-medium text-sm text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-500">@{u.username}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedUsers.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Add at least one user to send.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. 🏏 Draft opens in 1 hour!"
                  value={pushForm.title}
                  onChange={e => setPushForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  maxLength={60}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
                <input
                  type="text"
                  placeholder="/dashboard  or  /how-to-play"
                  value={pushForm.url}
                  onChange={e => setPushForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message <span className="text-red-500">*</span></label>
              <textarea
                placeholder="e.g. Head to your dashboard to lock in your picks before the draft closes."
                value={pushForm.body}
                onChange={e => setPushForm(f => ({ ...f, body: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                maxLength={150}
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">{pushForm.body.length}/150</p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={sendBroadcast}
                disabled={
                  pushSending ||
                  !pushForm.title.trim() ||
                  !pushForm.body.trim() ||
                  (pushAudience === 'specific' && selectedUsers.length === 0)
                }
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <Send className="h-4 w-4" />
                {pushSending
                  ? 'Sending…'
                  : pushAudience === 'all'
                    ? 'Send to All Users'
                    : pushAudience === 'activeDrafts'
                      ? 'Send to Active Draft Players'
                      : `Send to ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`
                }
              </button>

              {pushResult && (
                <span className={`text-sm font-medium ${ pushResult.sent > 0 ? 'text-green-600' : 'text-red-500' }`}>
                  {pushResult.message && pushResult.message !== 'Broadcast sent' && pushResult.message !== 'Targeted send complete'
                    ? `❌ ${pushResult.message}`
                    : `✅ Sent to ${pushResult.sent} device${pushResult.sent !== 1 ? 's' : ''}${pushResult.failed ? ` (${pushResult.failed} failed)` : ''}`
                  }
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Setup */}
        <div className="mt-4 md:mt-8">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 md:p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-amber-800 mb-2">Quick Setup Guide</h4>
                <div className="text-amber-700 space-y-2">
                  <p>1. <strong>Add IPL Teams:</strong> Create all 10 IPL teams with details</p>
                  <p>2. <strong>Add Players:</strong> Build the complete player roster for each team</p>
                  <p>3. <strong>Create Contests:</strong> Setup competitions for users to join</p>
                  <p>4. <strong>Enter Stats:</strong> Update player performance after each match</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}