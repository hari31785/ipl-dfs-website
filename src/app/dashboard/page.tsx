"use client"

import { useEffect, useState } from "react"
import { Trophy, User, Phone, Mail, Calendar, LogOut, Settings, Target, Users, Zap, Clock, ChevronRight, Ticket, Coins } from "lucide-react"

interface UserData {
  id: string
  name: string
  username: string
  email: string
  phone?: string
  totalWins: number
  totalMatches: number
  winPercentage: number
  createdAt: string
}

interface IPLTeam {
  id: string
  name: string
  shortName: string
  color: string
}

interface Contest {
  id: string
  name: string
  entryFee: number
  prizePool: number
  maxParticipants: number
  contestType: {
    name: string
  }
  _count: {
    signups: number
  }
}

interface IPLGame {
  id: string
  title: string
  gameDate: string
  signupDeadline: string
  status: string
  team1: IPLTeam
  team2: IPLTeam
  tournament: {
    name: string
  }
  contests: Contest[]
}

interface Tournament {
  id: string
  name: string
  status: string
  startDate: string
  endDate: string
  games: IPLGame[]
}

interface UserContest {
  id: string
  signupAt: string
  contest: {
    id: string
    contestType: string
    coinValue: number
    status: string
    iplGame: {
      id: string
      title: string
      gameDate: string
      signupDeadline: string
      status: string
      team1: IPLTeam
      team2: IPLTeam
      tournament: {
        name: string
      }
    }
  }
  matchup?: {
    id: string
    status: string
    opponent: {
      id: string
      name: string
      username: string
    }
    myScore?: number
    opponentScore?: number
  } | null
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [userContests, setUserContests] = useState<UserContest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'available' | 'my-contests'>('available')
  const [joiningContest, setJoiningContest] = useState<string | null>(null)
  const [leavingContest, setLeavingContest] = useState<string | null>(null)

  useEffect(() => {
    // Get user data from localStorage (simple auth for now)
    const userData = localStorage.getItem('currentUser')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      fetchTournaments()
      fetchUserContests(parsedUser.id)
    } else {
      // Redirect to login if no user data
      window.location.href = '/login'
    }
    setLoading(false)
  }, [])

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/tournaments')
      if (response.ok) {
        const data = await response.json()
        setTournaments(data)
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error)
    }
  }

  const fetchUserContests = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/contests?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUserContests(data)
      }
    } catch (error) {
      console.error('Error fetching user contests:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    window.location.href = '/'
  }

  const handleJoinContest = async (contestId: string, gameId: string) => {
    if (!user) return
    
    setJoiningContest(contestId)
    
    try {
      const response = await fetch('/api/contests/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contestId,
          userId: user.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`✓ ${data.message}\n\nYou'll be able to draft your team once the signup deadline closes and matchups are created.`)
        // Refresh tournaments to update signup counts
        fetchTournaments()
        // Refresh user contests
        fetchUserContests(user.id)
      } else {
        alert(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error('Error joining contest:', error)
      alert('Failed to join contest. Please try again.')
    } finally {
      setJoiningContest(null)
    }
  }

  const handleLeaveContest = async (signupId: string) => {
    if (!confirm('Are you sure you want to leave this contest?')) {
      return
    }

    setLeavingContest(signupId)

    try {
      const response = await fetch('/api/contests/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signupId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)
        // Refresh the data
        fetchTournaments()
        if (user) {
          fetchUserContests(user.id)
        }
      } else {
        alert(data.error || 'Failed to leave contest')
      }
    } catch (error) {
      console.error('Error leaving contest:', error)
      alert('Failed to leave contest')
    } finally {
      setLeavingContest(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-primary-800">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary-500 rounded-full flex items-center justify-center">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">IPL DFS</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.href = '/coin-vault'}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2.5 rounded-lg transition-colors shadow-md font-semibold"
              >
                <Coins className="h-5 w-5" />
                Coin Vault
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg transition-colors shadow-md font-semibold"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-primary-800">{user.name}</h2>
                <p className="text-gray-600">@{user.username}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-700">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors">
                  <Settings className="h-4 w-4" />
                  Edit Profile
                </button>
              </div>

              {/* Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary-800">{user.totalMatches}</p>
                  <p className="text-xs text-gray-600">Matches</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-cricket-600">{user.totalWins}</p>
                  <p className="text-xs text-gray-600">Wins</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-secondary-600">{user.winPercentage.toFixed(0)}%</p>
                  <p className="text-xs text-gray-600">Win Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('available')}
                className={`pb-4 px-4 font-semibold transition-colors relative ${
                  activeTab === 'available'
                    ? 'text-secondary-600 border-b-2 border-secondary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Available Contests
              </button>
              <button
                onClick={() => setActiveTab('my-contests')}
                className={`pb-4 px-4 font-semibold transition-colors relative ${
                  activeTab === 'my-contests'
                    ? 'text-secondary-600 border-b-2 border-secondary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                My Contests ({userContests.length})
              </button>
            </div>

            {/* Available Contests Tab */}
            {activeTab === 'available' && (
              <div className="space-y-6">
                {tournaments.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active tournaments available</p>
                  </div>
                ) : (
                  tournaments.map((tournament) => (
                    <div key={tournament.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                      {/* Tournament Header */}
                      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-white" />
                            <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
                          </div>
                          <span className="bg-white/20 text-white px-2 py-1 rounded text-xs font-medium">
                            {tournament.status}
                          </span>
                        </div>
                      </div>

                      {/* Games List */}
                      <div className="p-3 space-y-2">
                        {tournament.games.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No upcoming games</p>
                        ) : (
                          tournament.games.map((game) => (
                            <div key={game.id} className="border border-gray-200 rounded-lg p-3 hover:border-secondary-300 transition-colors bg-white">
                              {/* Compact Game Info */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                                    <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: game.team1.color }}></div>
                                    <span className="font-bold text-sm text-gray-900">{game.team1.shortName}</span>
                                  </div>
                                  <span className="text-gray-400 text-sm font-bold">vs</span>
                                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                                    <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: game.team2.color }}></div>
                                    <span className="font-bold text-sm text-gray-900">{game.team2.shortName}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <Clock className="h-3 w-3" />
                                    <span className="font-medium">{new Date(game.gameDate).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Contests - Visible Join Buttons */}
                              {game.contests && game.contests.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-gray-700 mb-2">Available Contests:</p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {game.contests.map((contest) => (
                                      <button 
                                        key={contest.id}
                                        onClick={() => handleJoinContest(contest.id, game.id)}
                                        disabled={joiningContest === contest.id}
                                        className="flex flex-col items-center justify-center gap-1 px-4 py-3 bg-yellow-50 hover:bg-yellow-100 border-2 border-yellow-200 text-gray-800 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <span className="font-bold text-base text-gray-900">{String(contest.contestType).replace('_COIN', '')}</span>
                                        <span className="text-xs text-gray-700">{contest._count.signups}/{contest.maxParticipants} joined</span>
                                        {joiningContest === contest.id ? (
                                          <span className="text-xs text-gray-800 font-medium">Joining...</span>
                                        ) : (
                                          <span className="text-xs font-bold text-gray-900">JOIN NOW</span>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(!game.contests || game.contests.length === 0) && (
                                <p className="text-gray-500 text-sm text-center py-2">No contests available</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* My Contests Tab */}
            {activeTab === 'my-contests' && (
              <div className="space-y-4">
                {userContests.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">You haven't joined any contests yet</p>
                    <button
                      onClick={() => setActiveTab('available')}
                      className="text-secondary-600 hover:text-secondary-700 font-semibold"
                    >
                      Browse available contests →
                    </button>
                  </div>
                ) : (
                  userContests
                    .sort((a, b) => a.contest.coinValue - b.contest.coinValue)
                    .map((signup) => (
                    <div key={signup.id} className="bg-white rounded-lg shadow border border-gray-200 p-3">
                      {/* Compact Header with Team Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                            <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: signup.contest.iplGame.team1.color }}></div>
                            <span className="font-bold text-sm text-gray-900">{signup.contest.iplGame.team1.shortName}</span>
                          </div>
                          <span className="text-gray-400 text-sm font-bold">vs</span>
                          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                            <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: signup.contest.iplGame.team2.color }}></div>
                            <span className="font-bold text-sm text-gray-900">{signup.contest.iplGame.team2.shortName}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            signup.contest.iplGame.status === 'LIVE' ? 'bg-red-100 text-red-700' :
                            signup.contest.iplGame.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {signup.contest.iplGame.status}
                          </span>
                        </div>
                      </div>

                      {/* Contest Info */}
                      <div className="flex items-center justify-between p-2 bg-secondary-50 rounded mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm text-gray-900">{signup.contest.contestType}</span>
                          <span className="text-xs text-gray-600">{signup.contest.coinValue} coins/pt</span>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(signup.contest.iplGame.gameDate).toLocaleDateString()}</span>
                      </div>

                      {/* Status */}
                      <div className={`border rounded p-2 mb-2 ${
                        signup.matchup 
                          ? signup.matchup.status === 'DRAFTING' 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-green-50 border-green-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <p className="text-xs font-medium">
                          {signup.matchup ? (
                            signup.matchup.status === 'DRAFTING' ? (
                              <span className="text-blue-800">
                                ✍️ Drafting vs {signup.matchup.opponent.name}
                              </span>
                            ) : signup.matchup.status === 'COMPLETED' ? (
                              <span className="text-green-800">
                                ✅ Draft Complete - Ready for game
                              </span>
                            ) : (
                              <span className="text-yellow-800">
                                ⏳ Matched with {signup.matchup.opponent.name} - Draft starting soon
                              </span>
                            )
                          ) : (
                            <span className="text-yellow-800">
                              ⏳ Waiting for matchup assignment
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Scores - Only show if draft is complete and game has stats */}
                      {signup.matchup?.status === 'COMPLETED' && signup.matchup.myScore !== undefined && (
                        <div className="mb-2 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-xs text-gray-600 mb-1">Your Score</div>
                              <div className={`text-2xl font-black ${
                                signup.matchup.myScore > signup.matchup.opponentScore! 
                                  ? 'text-green-700' 
                                  : signup.matchup.myScore < signup.matchup.opponentScore!
                                  ? 'text-red-700'
                                  : 'text-gray-700'
                              }`}>
                                ⭐ {signup.matchup.myScore.toFixed(1)}
                              </div>
                            </div>
                            <div className="px-4">
                              <div className="text-2xl font-bold text-gray-400">vs</div>
                            </div>
                            <div className="flex-1 text-right">
                              <div className="text-xs text-gray-600 mb-1">{signup.matchup.opponent.name}</div>
                              <div className={`text-2xl font-black ${
                                signup.matchup.opponentScore! > signup.matchup.myScore 
                                  ? 'text-green-700' 
                                  : signup.matchup.opponentScore! < signup.matchup.myScore
                                  ? 'text-red-700'
                                  : 'text-gray-700'
                              }`}>
                                ⭐ {signup.matchup.opponentScore!.toFixed(1)}
                              </div>
                            </div>
                          </div>
                          {signup.matchup.myScore !== signup.matchup.opponentScore && (
                            <div className="mt-2 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                signup.matchup.myScore > signup.matchup.opponentScore!
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {signup.matchup.myScore > signup.matchup.opponentScore! ? '🎉 You Won!' : '😔 You Lost'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {signup.matchup?.status === 'COMPLETED' ? (
                          <button 
                            onClick={() => window.location.href = `/scores/${signup.matchup?.id}`}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                          >
                            View Scores
                          </button>
                        ) : (
                          <button 
                            disabled={!signup.matchup}
                            onClick={() => window.location.href = `/draft/${signup.matchup?.id}`}
                            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                              signup.matchup
                                ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            Draft Team
                          </button>
                        )}
                        {!signup.matchup && (
                          <button 
                            onClick={() => handleLeaveContest(signup.id)}
                            disabled={leavingContest === signup.id}
                            className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {leavingContest === signup.id ? 'Leaving...' : 'Leave Contest'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}