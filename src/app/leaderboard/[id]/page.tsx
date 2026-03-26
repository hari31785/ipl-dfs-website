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
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {entry.contestsPlayed}
                        </span>
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
    </div>
  )
}
