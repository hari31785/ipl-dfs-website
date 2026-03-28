"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Trophy, Medal, TrendingUp, TrendingDown, Users, ArrowLeft, Coins } from "lucide-react"

interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  username: string
  totalWins: number
  totalMatches: number
  totalVCWon: number
  totalVCLost: number
  netVC: number
  totalCoinsWon: number
  totalCoinsLost: number
  netCoins: number
  totalPointsWon: number
  totalPointsLost: number
  netPoints: number
  contestsPlayed: number
}

interface Tournament {
  id: string
  name: string
  status: string
}

export default function TournamentLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [tournamentId, setTournamentId] = useState<string>("")
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [contestModal, setContestModal] = useState<{ userId: string; username: string } | null>(null)
  const [modalContests, setModalContests] = useState<any[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('currentUser')
    if (userData) {
      try { setCurrentUserId(JSON.parse(userData).id) } catch {}
    }
  }, [])

  const openContestHistory = async (userId: string, username: string) => {
    setContestModal({ userId, username })
    setModalContests([])
    setModalLoading(true)
    try {
      const res = await fetch(`/api/user/contests?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setModalContests(data.filter((s: any) => s.matchup?.status === 'COMPLETED'))
      }
    } catch {}
    finally { setModalLoading(false) }
  }

  useEffect(() => {
    params.then((resolvedParams) => {
      setTournamentId(resolvedParams.id)
    })
  }, [params])

  useEffect(() => {
    fetchTournaments()
  }, [])

  useEffect(() => {
    if (tournamentId) {
      fetchTournament()
      fetchLeaderboard()
    }
  }, [tournamentId])

  const fetchTournaments = async () => {
    try {
      const response = await fetch(`/api/tournaments`)
      if (response.ok) {
        const data = await response.json()
        setTournaments(data)
      }
    } catch (error) {
      console.error("Error fetching tournaments:", error)
    }
  }

  const fetchTournament = async () => {
    try {
      const response = await fetch(`/api/tournaments`)
      if (response.ok) {
        const tournamentsData = await response.json()
        const found = tournamentsData.find((t: Tournament) => t.id === tournamentId)
        if (found) {
          setTournament(found)
        }
      }
    } catch (error) {
      console.error("Error fetching tournament:", error)
    }
  }

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tournaments/${tournamentId}/leaderboard`)
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data)
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-500" />
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />
    return <span className="text-gray-600 font-bold">#{rank}</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Leaderboard
                </h1>
              </div>
              
              {/* Tournament Selector */}
              {tournaments.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Tournament:</label>
                  <select
                    value={tournamentId}
                    onChange={(e) => router.push(`/leaderboard/${e.target.value}`)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 font-medium"
                  >
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p className="text-gray-600">
              Rankings based on total Virtual Credits (V̶₵) earned throughout the tournament
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3">
              <Users className="w-10 h-10 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Players</p>
                <p className="text-2xl font-bold text-gray-900">{leaderboard.length}</p>
              </div>
            </div>
          </div>

          {leaderboard.length > 0 && (
            <>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-10 h-10 text-green-600" />
                  <div>
                    <p className="text-sm text-green-700">Top Player</p>
                    <p className="text-2xl font-bold text-green-900">{leaderboard[0].username}</p>
                    <p className="text-sm text-green-700">V̶₵{leaderboard[0].netVC.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3">
                  <Trophy className="w-10 h-10 text-yellow-600" />
                  <div>
                    <p className="text-sm text-yellow-700">Total V̶₵ in Play</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      V̶₵{leaderboard.reduce((sum, entry) => sum + Math.abs(entry.totalVCWon + entry.totalVCLost), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Contests
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white uppercase tracking-wider">
                    V̶₵ Won
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white uppercase tracking-wider">
                    V̶₵ Lost
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white uppercase tracking-wider">
                    Net V̶₵
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white uppercase tracking-wider">
                    Coins Won
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white uppercase tracking-wider">
                    Coins Lost
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-white uppercase tracking-wider">
                    Net Coins
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-lg">No completed contests yet</p>
                      <p className="text-sm">The leaderboard will populate as contests are completed</p>
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((entry, index) => (
                    <tr
                      key={entry.userId}
                      className={`
                        ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100' : ''}
                        ${index === 1 ? 'bg-gradient-to-r from-gray-50 to-gray-100' : ''}
                        ${index === 2 ? 'bg-gradient-to-r from-amber-50 to-amber-100' : ''}
                        hover:bg-blue-50 transition-colors
                      `}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center w-12">
                          {getRankDisplay(entry.rank)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{entry.name}</div>
                          <div className="text-sm text-gray-500">@{entry.username}</div>
                          <div className="text-xs text-gray-500">
                            {entry.totalWins}/{entry.totalMatches} wins
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => openContestHistory(entry.userId, entry.username)}
                          className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                          title={`View ${entry.username}'s contest history`}
                        >
                          {entry.contestsPlayed}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-bold text-green-600">
                            V̶₵{entry.totalVCWon.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-bold text-red-600">
                            V̶₵{entry.totalVCLost.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-lg font-bold ${
                          entry.netVC > 0 ? 'text-green-600' : entry.netVC < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {entry.netVC > 0 ? '+' : ''}V̶₵{entry.netVC.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-green-700">
                          {entry.totalCoinsWon.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-red-700">
                          {entry.totalCoinsLost.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-semibold ${
                          entry.netCoins > 0 ? 'text-green-700' : entry.netCoins < 0 ? 'text-red-700' : 'text-gray-700'
                        }`}>
                          {entry.netCoins > 0 ? '+' : ''}{entry.netCoins.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coin Vault CTA */}
        <div className="mt-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Coins className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-900 mb-2">
                Want to see your detailed transaction history?
              </h3>
              <p className="text-sm text-yellow-800 mb-3">
                Visit the <strong>Coin Vault</strong> to see a complete breakdown of all your V̶₵ and coins won or lost in each contest, 
                including transaction dates, contest details, and running balance.
              </p>
              <button
                onClick={() => window.location.href = '/coin-vault'}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2.5 rounded-lg transition-colors shadow-md font-semibold"
              >
                <Coins className="w-5 h-5" />
                View My Coin Vault
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Rankings are based on net Virtual Credits (V̶₵) earned from completed contests only. 
            1 V̶₵ = 100 Coins. Leaderboard updates automatically as new contests are completed.
          </p>
        </div>
      </div>

      {/* Contest History Modal */}
      {contestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setContestModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">@{contestModal.username}'s Contests</h2>
                <p className="text-sm text-gray-500">Completed contests only</p>
              </div>
              <button onClick={() => setContestModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : modalContests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p>No completed contests yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modalContests.map((signup: any) => {
                    const game = signup.contest?.iplGame
                    const matchup = signup.matchup
                    const isWinner = matchup?.winnerId === signup.id
                    const isTie = matchup?.winnerId === null
                    const gameLabel = game ? `${game.team1?.shortName ?? ''} vs ${game.team2?.shortName ?? ''}` : 'Unknown Game'
                    const coinValue = signup.contest?.coinValue ?? '?'
                    const opponent = matchup?.opponentUsername ?? 'Unknown'
                    const myScore = matchup?.myScore ?? '—'
                    const oppScore = matchup?.opponentScore ?? '—'

                    return (
                      <div key={signup.id} className={`rounded-xl border p-4 ${isWinner ? 'bg-green-50 border-green-200' : isTie ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900 text-sm">{gameLabel}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isWinner ? 'bg-green-600 text-white' : isTie ? 'bg-gray-500 text-white' : 'bg-red-600 text-white'}`}>
                            {isWinner ? '🏆 Won' : isTie ? '🤝 Tie' : '😔 Lost'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 flex items-center justify-between">
                          <span>vs <strong>@{opponent}</strong> · {coinValue}-coin contest</span>
                          <span className="font-mono">{myScore} – {oppScore}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
