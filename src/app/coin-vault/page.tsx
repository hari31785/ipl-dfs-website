"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Coins, TrendingUp, TrendingDown, Trophy, ArrowLeft, History } from "lucide-react"

interface CoinTransaction {
  id: string
  amount: number
  balance: number
  type: string
  description: string
  adminFee: number
  createdAt: string
  matchupId?: string
  contestId?: string
  contest?: {
    contestType: string
    iplGame: {
      team1: { shortName: string }
      team2: { shortName: string }
      gameDate: string
    }
  }
  matchup?: {
    user1Score: number
    user2Score: number
    user1: {
      user: { name: string, username: string }
    }
    user2: {
      user: { name: string, username: string }
    }
  }
}

interface Tournament {
  id: string
  name: string
  status: string
}

interface UserData {
  id: string
  name: string
}

export default function CoinVaultPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>('')
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<CoinTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [totalWinnings, setTotalWinnings] = useState(0)
  const [totalLosses, setTotalLosses] = useState(0)

  useEffect(() => {
    const userData = localStorage.getItem('currentUser')
    if (!userData) {
      router.push('/login')
      return
    }
    
    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    fetchTournaments()
  }, [router])

  useEffect(() => {
    console.log('Coin data effect triggered:', { user: user?.id, selectedTournament })
    if (user && selectedTournament) {
      fetchCoinData(user.id, selectedTournament)
    }
  }, [user, selectedTournament])

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/tournaments?forCoinVault=true')
      if (response.ok) {
        const data = await response.json()
        console.log('Tournaments fetched:', data)
        setTournaments(data)
        // Auto-select first active tournament
        const activeTournament = data.find((t: Tournament) => t.status === 'ACTIVE') || data[0]
        console.log('Selected tournament:', activeTournament)
        if (activeTournament) {
          setSelectedTournament(activeTournament.id)
        } else {
          // No tournaments found, stop loading
          console.log('No tournaments found')
          setLoading(false)
        }
      } else {
        console.log('Failed to fetch tournaments:', response.status)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error)
      setLoading(false)
    }
  }

  const fetchCoinData = async (userId: string, tournamentId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/user/coins?userId=${userId}&tournamentId=${tournamentId}`)
      const data = await response.json()
      
      if (response.ok) {
        setBalance(data.balance)
        setTransactions(data.transactions)
        
        // Calculate totals
        const winnings = data.transactions
          .filter((t: CoinTransaction) => t.type === 'WIN')
          .reduce((sum: number, t: CoinTransaction) => sum + t.amount, 0)
        const losses = data.transactions
          .filter((t: CoinTransaction) => t.type === 'LOSS')
          .reduce((sum: number, t: CoinTransaction) => sum + Math.abs(t.amount), 0)
        
        setTotalWinnings(winnings)
        setTotalLosses(losses)
      }
    } catch (error) {
      console.error('Error fetching coin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('currentUser')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-primary-800">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Show message if no tournaments exist
  if (!loading && tournaments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary-500 rounded-full flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">IPL DFS</h1>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-primary-700 hover:text-primary-800 font-medium mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
            <Coins className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Tournaments Available</h3>
            <p className="text-gray-500">There are currently no tournaments set up. Please contact the administrator.</p>
          </div>
        </div>
      </div>
    )
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
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-primary-700 hover:text-primary-800 font-medium mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Dashboard
        </button>

        {/* Tournament Selector */}
        {tournaments.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <label htmlFor="tournament" className="block text-sm font-medium text-gray-700 mb-2">
              Select Tournament
            </label>
            <select
              id="tournament"
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
            >
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} {tournament.status === 'ACTIVE' && '(Active)'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              💡 Each tournament has a separate coin balance that doesn't carry over
            </p>
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl shadow-lg p-3 sm:p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-yellow-100 mb-1">
                <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm font-medium">
                  {tournaments.find(t => t.id === selectedTournament)?.name || 'Tournament'} Balance
                </span>
              </div>
              <div className="text-2xl sm:text-4xl font-bold text-white mb-1">
                V̶₵{(balance / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-yellow-100 text-xs font-semibold mb-0.5">
                Virtual Credits (V̶₵)
              </p>
              <p className="text-yellow-100 text-xs">
                Won: V̶₵{(totalWinnings / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Lost: V̶₵{(totalLosses / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-yellow-100 text-xs mt-0.5">
                (1 V̶₵ = 100 Coins)
              </p>
            </div>
            <div className="hidden sm:flex w-16 h-16 bg-white bg-opacity-20 rounded-full items-center justify-center">
              <Coins className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-700 font-medium">Total Winnings</p>
                <p className="text-xl font-bold text-green-900">V̶₵{(totalWinnings / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-red-700 font-medium">Total Losses</p>
                <p className="text-xl font-bold text-red-900">V̶₵{(totalLosses / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary-700" />
              <h2 className="text-lg font-bold text-gray-900">Contest History</h2>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Coins className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No contest results yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Join contests and compete to earn coins!
              </p>
            </div>
          ) : (
            <>
              {/* ── Mobile card list (< md) ── */}
              <div className="divide-y divide-gray-100 md:hidden">
                {transactions.map((transaction) => {
                  const isWin = transaction.type === 'WIN'
                  const coinsWon = isWin ? transaction.amount : 0
                  const coinsLost = !isWin ? Math.abs(transaction.amount) : 0
                  const gameDate = transaction.contest?.iplGame.gameDate
                    ? new Date(transaction.contest.iplGame.gameDate).toLocaleDateString()
                    : new Date(transaction.createdAt).toLocaleDateString()
                  const gameInfo = transaction.contest
                    ? `${transaction.contest.iplGame.team1.shortName} vs ${transaction.contest.iplGame.team2.shortName}`
                    : 'N/A'
                  const contestType = transaction.contest?.contestType || 'N/A'
                  let opponentName = 'Unknown'
                  let userScore = 0
                  let opponentScore = 0
                  let result = ''
                  if (transaction.matchup && user) {
                    const isUser1 = transaction.matchup.user1.user.name === user.name
                    opponentName = isUser1 ? transaction.matchup.user2.user.name : transaction.matchup.user1.user.name
                    userScore = isUser1 ? transaction.matchup.user1Score : transaction.matchup.user2Score
                    opponentScore = isUser1 ? transaction.matchup.user2Score : transaction.matchup.user1Score
                    result = userScore > opponentScore ? 'WON' : userScore < opponentScore ? 'LOST' : 'TIE'
                  }
                  return (
                    <div key={transaction.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-800">{gameInfo}</span>
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{contestType}</span>
                        </div>
                        {result && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            result === 'WON' ? 'bg-green-100 text-green-700' :
                            result === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                          }`}>{result}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        {gameDate} · vs {opponentName}
                        {result && <span className="ml-1">({userScore.toFixed(1)} – {opponentScore.toFixed(1)})</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        {coinsWon > 0 ? (
                          <span className="text-sm font-bold text-purple-600">+V̶₵{(coinsWon / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ) : coinsLost > 0 ? (
                          <span className="text-sm font-bold text-purple-600">-V̶₵{(coinsLost / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ) : null}
                        {coinsWon > 0 ? (
                          <span className="text-xs text-green-600 font-medium">+{coinsWon.toLocaleString()} coins</span>
                        ) : coinsLost > 0 ? (
                          <span className="text-xs text-red-600 font-medium">-{coinsLost.toLocaleString()} coins</span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── Desktop table (≥ md) ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Game & Opponent</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Score & Result</th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-green-700 uppercase tracking-wider">Coins Won</th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-red-700 uppercase tracking-wider">Coins Lost</th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-purple-700 uppercase tracking-wider">VC Won/Lost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((transaction) => {
                      const isWin = transaction.type === 'WIN'
                      const coinsWon = isWin ? transaction.amount : 0
                      const coinsLost = !isWin ? Math.abs(transaction.amount) : 0
                      const gameDate = transaction.contest?.iplGame.gameDate
                        ? new Date(transaction.contest.iplGame.gameDate).toLocaleDateString()
                        : new Date(transaction.createdAt).toLocaleDateString()
                      const gameInfo = transaction.contest
                        ? `${transaction.contest.iplGame.team1.shortName} vs ${transaction.contest.iplGame.team2.shortName}`
                        : 'N/A'
                      const contestType = transaction.contest?.contestType || 'N/A'
                      let opponentName = 'Unknown'
                      let userScore = 0
                      let opponentScore = 0
                      let scoreInfo = 'Score unavailable'
                      if (transaction.matchup && user) {
                        const isUser1 = transaction.matchup.user1.user.name === user.name
                        opponentName = isUser1 ? transaction.matchup.user2.user.name : transaction.matchup.user1.user.name
                        userScore = isUser1 ? transaction.matchup.user1Score : transaction.matchup.user2Score
                        opponentScore = isUser1 ? transaction.matchup.user2Score : transaction.matchup.user1Score
                        const result = userScore > opponentScore ? 'WON' : userScore < opponentScore ? 'LOST' : 'TIE'
                        scoreInfo = `${userScore.toFixed(1)} - ${opponentScore.toFixed(1)} (${result})`
                      }
                      return (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{gameDate}</td>
                          <td className="px-3 py-2 text-xs text-gray-900">
                            <div className="font-medium">{gameInfo}</div>
                            <div className="text-gray-500">vs {opponentName}</div>
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium mt-0.5 inline-block">{contestType}</span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900">
                            <div className={`font-medium ${
                              scoreInfo.includes('WON') ? 'text-green-600' :
                              scoreInfo.includes('LOST') ? 'text-red-600' : 'text-gray-600'
                            }`}>{scoreInfo}</div>
                            {(coinsWon > 0 || coinsLost > 0) && (
                              <div className={`font-semibold mt-0.5 ${coinsWon > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {coinsWon > 0 ? `+${coinsWon.toLocaleString()} coins` : `-${coinsLost.toLocaleString()} coins`}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            {coinsWon > 0 ? <span className="text-sm font-bold text-green-600">+{coinsWon.toLocaleString()}</span> : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            {coinsLost > 0 ? <span className="text-sm font-bold text-red-600">-{coinsLost.toLocaleString()}</span> : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            {coinsWon > 0 ? (
                              <span className="text-sm font-bold text-purple-600">+V̶₵{(coinsWon / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            ) : coinsLost > 0 ? (
                              <span className="text-sm font-bold text-purple-600">-V̶₵{(coinsLost / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
