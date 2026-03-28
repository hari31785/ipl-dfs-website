"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Shield, Users, Trophy, Target, Database, BarChart3, LogOut, Plus, MessageSquare, Bell, Send } from "lucide-react"

interface AdminData {
  id: string
  username: string
  name: string
  createdAt: string
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

  useEffect(() => {
    // Get admin data from localStorage
    const adminData = localStorage.getItem('currentAdmin')
    if (adminData) {
      setAdmin(JSON.parse(adminData))
      // Run cleanup first, then fetch stats
      cleanupPastDueContests().then(() => {
        fetchDashboardStats() // Fetch stats after cleanup
      })
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

  const sendBroadcast = async () => {
    if (!pushForm.title.trim() || !pushForm.body.trim()) return
    setPushSending(true)
    setPushResult(null)
    try {
      const res = await fetch('/api/admin/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pushForm.title, body: pushForm.body, url: pushForm.url || '/dashboard' }),
      })
      const data = await res.json()
      setPushResult(data)
      if (res.ok) setPushForm({ title: '', body: '', url: '' })
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
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">IPL DFS Admin</h1>
                <p className="text-red-100 text-sm">Welcome back, {admin.name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors border-2 border-white/40 hover:border-white/60 shadow-lg font-medium"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Dashboard - Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Link href="/admin/users" className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">Total Users</p>
                <p className="text-3xl font-bold text-primary-800 group-hover:text-blue-700 transition-colors">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 group-hover:text-blue-600 transition-colors" />
            </div>
          </Link>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Players</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalPlayers}</p>
              </div>
              <Target className="h-8 w-8 text-cricket-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">IPL Teams</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalTeams}</p>
              </div>
              <Database className="h-8 w-8 text-secondary-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Contests</p>
                <p className="text-3xl font-bold text-red-600">{stats.activeContests}</p>
              </div>
              <Trophy className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <Link href="/admin/messages" className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-purple-600 transition-colors">Pending Messages</p>
                <p className="text-3xl font-bold text-purple-600 group-hover:text-purple-700 transition-colors">{stats.pendingMessages}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-500 group-hover:text-purple-600 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tournament Management */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-primary-800 mb-6 flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Tournament Management
            </h3>
            <div className="space-y-4">
              <a
                href="/admin/tournaments"
                className="block w-full p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6" />
                    <div>
                      <div className="font-semibold">Manage Tournaments</div>
                      <div className="text-sm opacity-90">Create IPL seasons</div>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </div>

          {/* User Management */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-primary-800 mb-6 flex items-center gap-2">
              <Users className="h-6 w-6" />
              User & Coin Management
            </h3>
            <div className="space-y-4">
              <Link
                href="/admin/users"
                className="block w-full p-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6" />
                    <div>
                      <div className="font-semibold">Manage Users</div>
                      <div className="text-sm opacity-90">View and manage registered users</div>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              
              <Link
                href="/admin/vc-management"
                className="block w-full p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <div>
                      <div className="font-semibold">VC Settlement</div>
                      <div className="text-sm opacity-90">Encash winners & refill losers</div>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              
              <Link
                href="/admin/messages"
                className="block w-full p-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💬</span>
                    <div>
                      <div className="font-semibold">User Messages</div>
                      <div className="text-sm opacity-90">View support messages from users</div>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>

          {/* Team & Player Management */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-primary-800 mb-6 flex items-center gap-2">
              <Database className="h-6 w-6" />
              Team & Player Management
            </h3>
            <div className="space-y-4">
              <a
                href="/admin/teams"
                className="block w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-6 w-6" />
                    <div>
                      <div className="font-semibold">Manage IPL Teams</div>
                      <div className="text-sm opacity-90">Add/Edit 10 IPL teams</div>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>

              <a
                href="/admin/players"
                className="block w-full p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6" />
                    <div>
                      <div className="font-semibold">Manage Players</div>
                      <div className="text-sm opacity-90">Add/Edit player roster</div>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </div>

          {/* Contest Management */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-primary-800 mb-6 flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Contest Management
            </h3>
            <div className="space-y-4">
              <a
                href="/admin/games"
                className="block w-full p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6" />
                    <div>
                      <div className="font-semibold">IPL Games</div>
                      <div className="text-sm opacity-90">Schedule matches</div>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>

              <a
                href="/admin/contests"
                className="block w-full p-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6" />
                    <div>
                      <div className="font-semibold">Contest Types</div>
                      <div className="text-sm opacity-90">Manage contest variations</div>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>

              <a
                href="/admin/stats"
                className="block w-full p-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-6 w-6" />
                    <div>
                      <div className="font-semibold">Player Statistics</div>
                      <div className="text-sm opacity-90">Enter match performance</div>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>

              <a
                href="/admin/drafts"
                className="block w-full p-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-lg transition-colors group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="h-6 w-6" />
                    <div>
                      <div className="font-semibold">Draft Management</div>
                      <div className="text-sm opacity-90">Monitor snake drafts</div>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Push Notifications Broadcast */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-primary-800 mb-1 flex items-center gap-2">
              <Bell className="h-6 w-6 text-indigo-500" />
              Push Notifications
            </h3>
            <p className="text-gray-500 text-sm mb-5">Send a custom notification to all subscribed users.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. 🏏 Draft opens in 1 hour!"
                  value={pushForm.title}
                  onChange={e => setPushForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                maxLength={150}
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">{pushForm.body.length}/150</p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={sendBroadcast}
                disabled={pushSending || !pushForm.title.trim() || !pushForm.body.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <Send className="h-4 w-4" />
                {pushSending ? 'Sending…' : 'Send to All Users'}
              </button>

              {pushResult && (
                <span className={`text-sm font-medium ${ pushResult.sent > 0 ? 'text-green-600' : 'text-red-500' }`}>
                  {pushResult.message && pushResult.message !== 'Broadcast sent'
                    ? `❌ ${pushResult.message}`
                    : `✅ Sent to ${pushResult.sent} user${pushResult.sent !== 1 ? 's' : ''}${pushResult.failed ? ` (${pushResult.failed} failed)` : ''}`
                  }
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Setup */}
        <div className="mt-8">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
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