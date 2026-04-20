"use client"

import { useEffect, useState, use, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Trophy, Medal, TrendingUp, Users, ArrowLeft, Coins, Eye } from "lucide-react"
import { calculateFinalLineup, calculateTotalPointsWithSwap } from "@/lib/benchSwapUtils"

interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  username: string
  totalWins: number
  totalMatches: number
  totalVCWon: number
  totalVCLost: number
  encashedVC: number
  refilledVC: number
  netVC: number
  totalCoinsWon: number
  totalCoinsLost: number
  encashedCoins: number
  refilledCoins: number
  netCoins: number
  totalPointsWon: number
  totalPointsLost: number
  netPoints: number
  contestsPlayed: number
  biggestSingleWin: number
}

interface Tournament {
  id: string
  name: string
  status: string
}

export default function TournamentLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: tournamentId } = use(params)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [contestModal, setContestModal] = useState<{ userId: string; username: string } | null>(null)
  const [modalContests, setModalContests] = useState<any[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  // In-session cache so repeated eye-icon clicks skip the network round-trip
  const contestHistoryCache = useRef<Map<string, any[]>>(new Map())
  // Scorecard second modal
  const [scorecardSignup, setScorecardSignup] = useState<any | null>(null)
  const [scorecardLoading, setScorecardLoading] = useState(false)
  const [scorecardStatsMap, setScorecardStatsMap] = useState<Record<string, { points: number; runs: number; wickets: number; catches: number; didNotPlay: boolean; runOuts: number; stumpings: number }>>({}) 

  const openContestHistory = async (userId: string, username: string) => {
    setContestModal({ userId, username })
    setModalContests([])
    // Clear stale scorecard stats from a previous user's game
    setScorecardStatsMap({})
    setScorecardSignup(null)
    setModalLoading(true) // show spinner immediately — before any async work

    // Serve from in-session cache if available
    if (contestHistoryCache.current.has(userId)) {
      setModalContests(contestHistoryCache.current.get(userId)!)
      setModalLoading(false)
      return
    }
    try {
      // completed=true filters server-side — only COMPLETED contests are returned
      const res = await fetch(`/api/user/contests?userId=${userId}&completed=true`)
      if (res.ok) {
        const data = await res.json()
        const filtered = data.filter((s: any) =>
          s.matchup != null &&
          s.matchup.draftPicksCount > 0
        )
        contestHistoryCache.current.set(userId, filtered)
        setModalContests(filtered)
      }
    } catch {}
    finally { setModalLoading(false) }
  }

  // Fetch tournaments list + leaderboard data in parallel on mount
  useEffect(() => {
    const loadAll = async () => {
      const [tournamentsRes, leaderboardRes] = await Promise.allSettled([
        fetch(`/api/tournaments`),
        fetch(`/api/tournaments/${tournamentId}/leaderboard`),
      ])

      if (tournamentsRes.status === 'fulfilled' && tournamentsRes.value.ok) {
        const data: Tournament[] = await tournamentsRes.value.json()
        setTournaments(data)
        // Derive current tournament from the same list — no second API call needed
        const found = data.find((t) => t.id === tournamentId)
        if (found) setTournament(found)
      }

      if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.ok) {
        const data = await leaderboardRes.value.json()
        setLeaderboard(data)
      }

      setLoading(false)
    }
    loadAll()
  }, [tournamentId])



  const { maxWin, biggestWinner } = useMemo(() => {
    const maxWin = leaderboard.length > 0 ? Math.max(...leaderboard.map(e => e.biggestSingleWin || 0)) : 0
    const biggestWinner = leaderboard.find(e => (e.biggestSingleWin || 0) === maxWin)
    return { maxWin, biggestWinner }
  }, [leaderboard])

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
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          {/* Mobile: single compact bar with back + title + selector all inline */}
          <div className="flex items-center gap-2 md:hidden mb-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Trophy className="w-5 h-5 text-yellow-500 shrink-0" />
              <h1 className="text-lg font-bold text-gray-900 truncate">Leaderboard</h1>
            </div>
            {tournaments.length > 0 && (
              <select
                value={tournamentId}
                onChange={(e) => router.push(`/leaderboard/${e.target.value}`)}
                className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 shrink-0 max-w-[130px]"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Desktop: original full header card */}
          <div className="hidden md:block">
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
                  <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
                </div>
                {tournaments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Tournament:</label>
                    <select
                      value={tournamentId}
                      onChange={(e) => router.push(`/leaderboard/${e.target.value}`)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 font-medium"
                    >
                      {tournaments.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
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
        </div>

        {/* Stats Overview */}
        {/* Stats strip — compact 3-col on mobile, spacious cards on desktop */}
        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-6 mb-4 md:mb-8">
          {/* Total Players */}
          <div className="bg-white rounded-lg shadow-sm md:shadow-md px-3 py-2 md:p-6 flex flex-col md:flex-row items-center md:items-center gap-0 md:gap-3 text-center md:text-left">
            <Users className="w-5 h-5 md:w-10 md:h-10 text-blue-600 mb-0.5 md:mb-0 shrink-0" />
            <div>
              <p className="text-[10px] md:text-sm text-gray-500 leading-tight">Players</p>
              <p className="text-base md:text-2xl font-bold text-gray-900 leading-tight">{leaderboard.length}</p>
            </div>
          </div>

          {/* Top Player */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm md:shadow-md px-3 py-2 md:p-6 flex flex-col md:flex-row items-center md:items-center gap-0 md:gap-3 text-center md:text-left">
            <TrendingUp className="w-5 h-5 md:w-10 md:h-10 text-green-600 mb-0.5 md:mb-0 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-sm text-green-700 leading-tight">Top Player</p>
              <p className="text-sm md:text-2xl font-bold text-green-900 leading-tight truncate">
                {leaderboard.length > 0 ? leaderboard[0].username : '—'}
              </p>
              {leaderboard.length > 0 && (
                <p className="text-[10px] md:text-sm text-green-700 leading-tight">V̶₵{leaderboard[0].netVC.toFixed(2)}</p>
              )}
            </div>
          </div>

          {/* Biggest Single Win */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-sm md:shadow-md px-3 py-2 md:p-6 flex flex-col md:flex-row items-center md:items-center gap-0 md:gap-3 text-center md:text-left">
            <Trophy className="w-5 h-5 md:w-10 md:h-10 text-yellow-600 mb-0.5 md:mb-0 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-sm text-yellow-700 leading-tight">Best Win</p>
              <p className="text-sm md:text-2xl font-bold text-yellow-900 leading-tight">
                {maxWin > 0 ? `V̶₵${maxWin.toFixed(2)}` : '—'}
              </p>
              {maxWin > 0 && biggestWinner && (
                <p className="text-[10px] md:text-xs text-yellow-600 leading-tight truncate">@{biggestWinner.username}</p>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-2">
          {leaderboard.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg px-4 py-8 text-center text-gray-500">
              <Trophy className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p>No completed contests yet</p>
            </div>
          ) : (
            leaderboard.map((entry, index) => (
              <div
                key={entry.userId}
                className={`bg-white rounded-lg shadow-sm px-3 py-2 ${
                  index === 0 ? 'border-2 border-yellow-400' :
                  index === 1 ? 'border-2 border-gray-400' :
                  index === 2 ? 'border-2 border-amber-500' : 'border border-gray-200'
                }`}
              >
                {/* Row 1: Rank + Name + Contests button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                      {getRankDisplay(entry.rank)}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900">{entry.name}</span>
                      <span className="text-xs text-gray-400 ml-1.5">@{entry.username} · {entry.totalWins}/{entry.totalMatches}W</span>
                    </div>
                  </div>
                  <button
                    onClick={() => openContestHistory(entry.userId, entry.username)}
                    className="px-2 py-0.5 flex items-center gap-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 ring-1 ring-blue-300 hover:bg-blue-600 hover:text-white hover:ring-blue-600 transition-all flex-shrink-0"
                  >
                    {entry.contestsPlayed}
                    <Eye className="w-3 h-3" />
                  </button>
                </div>
                {/* Row 2: VC + Coins inline */}
                <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100 text-xs">
                  <span className="text-gray-400">Won <span className="text-green-600 font-semibold">{entry.totalVCWon.toFixed(2)}</span></span>
                  {entry.encashedVC > 0 ? (
                    <span className="text-gray-400">Sttl <span className="text-blue-600 font-semibold">-{entry.encashedVC.toFixed(2)}</span></span>
                  ) : entry.refilledVC > 0 ? (
                    <span className="text-gray-400">Sttl <span className="text-purple-600 font-semibold">+{entry.refilledVC.toFixed(2)}</span></span>
                  ) : null}
                  <span className={`font-black text-sm ${entry.netVC > 0 ? 'text-green-600' : entry.netVC < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {entry.netVC > 0 ? '+' : ''}V̶₵{entry.netVC.toFixed(2)}
                  </span>
                  <span className="text-gray-400">Lost <span className="text-red-600 font-semibold">{entry.totalVCLost.toFixed(2)}</span></span>
                  <span className={`font-semibold ${entry.netCoins > 0 ? 'text-green-700' : entry.netCoins < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                    {entry.netCoins > 0 ? '+' : ''}{entry.netCoins.toLocaleString()}🪙
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Leaderboard Table — desktop only */}
        <div className="hidden md:block bg-white rounded-lg shadow-lg overflow-hidden">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider w-16">
                    Rank
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider w-36">
                    Player
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase tracking-wider w-20">
                    <div className="flex items-center justify-center gap-1">
                      <span>Played</span>
                      <Eye className="w-3 h-3 opacity-70" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-white uppercase tracking-wider w-24">
                    V̶₵ Won
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-white uppercase tracking-wider w-24">
                    V̶₵ Lost
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-white uppercase tracking-wider w-24">
                    Settled
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-white uppercase tracking-wider w-28">
                    Net V̶₵
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-white uppercase tracking-wider w-28">
                    Net Coins
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
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
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {getRankDisplay(entry.rank)}
                        </div>
                      </td>
                      <td className="px-3 py-2 max-w-[160px]">
                        <div className="text-sm font-semibold text-gray-900 truncate">{entry.name}</div>
                        <div className="text-xs text-gray-400 truncate">@{entry.username} · {entry.totalWins}/{entry.totalMatches}W</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <button
                          onClick={() => openContestHistory(entry.userId, entry.username)}
                          className="px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 ring-1 ring-blue-300 hover:bg-blue-600 hover:text-white hover:ring-blue-600 transition-all cursor-pointer"
                          title={`View ${entry.username}'s contest history`}
                        >
                          {entry.contestsPlayed}
                          <Eye className="w-3 h-3" />
                        </button>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-green-600">
                          V̶₵{entry.totalVCWon.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-red-600">
                          V̶₵{entry.totalVCLost.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        {entry.encashedVC > 0 ? (
                          <span className="text-sm font-bold text-blue-600">
                            -V̶₵{entry.encashedVC.toFixed(2)}
                          </span>
                        ) : entry.refilledVC > 0 ? (
                          <span className="text-sm font-bold text-purple-600">
                            +V̶₵{entry.refilledVC.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <span className={`text-base font-bold ${
                          entry.netVC > 0 ? 'text-green-600' : entry.netVC < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {entry.netVC > 0 ? '+' : ''}V̶₵{entry.netVC.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
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
                      <div key={matchup?.id ?? signup.id} className={`rounded-xl border p-4 ${isWinner ? 'bg-green-50 border-green-200' : isTie ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900 text-sm">{gameLabel}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isWinner ? 'bg-green-600 text-white' : isTie ? 'bg-gray-500 text-white' : 'bg-red-600 text-white'}`}>
                            {isWinner ? '🏆 Won' : isTie ? '🤝 Tie' : '😔 Lost'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 flex items-center justify-between mb-2">
                          <span>vs <strong>@{opponent}</strong> · {coinValue}-coin contest</span>
                          <span className="font-mono">{myScore} – {oppScore}</span>
                        </div>
                        {matchup?.draftPicksCount > 0 && (
                          <button
                            onClick={async () => {
                              const gId = signup.contest?.iplGame?.id ?? signup.contest?.iplGameId
                              const matchupId = signup.matchup?.id
                              setScorecardStatsMap({})
                              setScorecardLoading(true)
                              setScorecardSignup(signup) // open modal immediately with loading state

                              // Fetch picks + stats in parallel
                              const [pollRes, statsRes] = await Promise.allSettled([
                                matchupId ? fetch(`/api/draft/${matchupId}/poll`) : Promise.reject(),
                                gId ? fetch(`/api/draft/stats/${gId}`) : Promise.reject(),
                              ])

                              if (pollRes.status === 'fulfilled' && pollRes.value.ok) {
                                const poll = await pollRes.value.json()
                                setScorecardSignup({ ...signup, matchup: { ...signup.matchup, draftPicks: poll.draftPicks } })
                              }
                              if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
                                setScorecardStatsMap(await statsRes.value.json())
                              }
                              setScorecardLoading(false)
                            }}
                            className="w-full text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 rounded-lg py-1.5 transition-colors"
                          >
                            View Scorecard →
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Scorecard second modal ───────────────────────────────────────── */}
      {scorecardSignup && (() => {
        const signup = scorecardSignup
        const matchup = signup.matchup
        const game = signup.contest?.iplGame
        const gameId = game?.id ?? signup.contest?.iplGameId
        const gameLabel = game ? `${game.team1?.shortName ?? ''} vs ${game.team2?.shortName ?? ''}` : 'Match'
        const isWinner = matchup?.winnerId === signup.id
        const isTie = matchup?.winnerId === null

        // Inject stats from the cached stats endpoint into picks so benchSwapUtils can read pick.player.stats
        const injectStats = (picks: any[]) => picks.map((pick: any) => ({
          ...pick,
          player: {
            ...pick.player,
            stats: scorecardStatsMap[pick.player?.id]
              ? [{ iplGameId: gameId, ...scorecardStatsMap[pick.player.id] }]
              : (pick.player?.stats ?? []),
          },
        }))

        // Split picks by user
        const user1Picks = injectStats((matchup?.draftPicks ?? []).filter((p: any) => p.pickedByUserId === matchup.user1Id))
        const user2Picks = injectStats((matchup?.draftPicks ?? []).filter((p: any) => p.pickedByUserId === matchup.user2Id))

        const { finalLineup: u1Lineup, benchPlayers: u1Bench } = calculateFinalLineup(user1Picks, gameId)
        const { finalLineup: u2Lineup, benchPlayers: u2Bench } = calculateFinalLineup(user2Picks, gameId)

        const u1Total = calculateTotalPointsWithSwap(user1Picks, gameId)
        const u2Total = calculateTotalPointsWithSwap(user2Picks, gameId)

        // Figure out which side is "this user's" side
        const viewedUser = contestModal?.username ?? ''
        // We use signup.matchup user1/user2 ids to map names
        const isViewedUser1 = matchup?.user1Id === signup?.id
        // Left always = viewed user, right always = opponent (lineups & scores already ordered this way)
        const leftLabel = `@${viewedUser}`
        const rightLabel = `@${matchup?.opponentUsername ?? 'Opponent'}`
        const { finalLineup: leftLineup, benchPlayers: leftBench } = isViewedUser1
          ? { finalLineup: u1Lineup, benchPlayers: u1Bench }
          : { finalLineup: u2Lineup, benchPlayers: u2Bench }
        const { finalLineup: rightLineup, benchPlayers: rightBench } = isViewedUser1
          ? { finalLineup: u2Lineup, benchPlayers: u2Bench }
          : { finalLineup: u1Lineup, benchPlayers: u1Bench }
        const leftTotal = isViewedUser1 ? u1Total : u2Total
        const rightTotal = isViewedUser1 ? u2Total : u1Total

        const renderRow = (pick: any, isBench = false) => {
          const stats = scorecardStatsMap[pick.player?.id] ?? pick.player?.stats?.find((s: any) => s.iplGameId === gameId)
          const pts = stats?.points ?? 0
          const dnp = stats?.didNotPlay ?? false
          return (
            <div key={pick.id ?? pick.player?.id} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs ${isBench ? 'opacity-60' : ''} ${pick.isSwapped ? 'bg-blue-50' : pick.swappedOut ? 'bg-orange-50' : ''}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${isBench ? 'bg-gray-400' : 'bg-green-700'}`}>
                {pick.pickOrder}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{pick.player?.name}</div>
                <div className="text-gray-500">{pick.player?.role}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {pick.isSwapped && <span className="text-blue-600 text-xs">↑</span>}
                {pick.swappedOut && <span className="text-orange-500 text-xs">↓</span>}
                {dnp && !pick.swappedOut && <span className="text-red-500 font-bold">DNP</span>}
                <span className={`font-bold w-8 text-right ${isBench ? 'text-gray-400' : 'text-gray-900'}`}>{pts}</span>
              </div>
            </div>
          )
        }

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setScorecardSignup(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{gameLabel} · Scorecard</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isWinner ? 'bg-green-600 text-white' : isTie ? 'bg-gray-500 text-white' : 'bg-red-600 text-white'}`}>
                      {isWinner ? '🏆 Won' : isTie ? '🤝 Tie' : '😔 Lost'}
                    </span>
                    <span className="text-xs text-gray-500">{signup.contest?.coinValue}-coin contest</span>
                  </div>
                </div>
                <button onClick={() => setScorecardSignup(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              {scorecardLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <>
                {/* Score banner */}
                <div className="grid grid-cols-3 items-center bg-gray-50 border-b border-gray-200 px-5 py-3 text-center">
                  <div>
                    <div className="text-xs text-gray-500 truncate">{leftLabel}</div>
                    <div className="text-2xl font-black text-gray-900">{leftTotal}</div>
                  </div>
                  <div className="text-lg font-bold text-gray-400">vs</div>
                  <div>
                    <div className="text-xs text-gray-500 truncate">{rightLabel}</div>
                    <div className="text-2xl font-black text-gray-900">{rightTotal}</div>
                  </div>
                </div>

              {/* Two-column lineups */}
              <div className="overflow-y-auto flex-1 p-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Left */}
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">⭐ Starting 5</div>
                    <div className="space-y-1">
                      {leftLineup.map((p: any) => renderRow(p, false))}
                    </div>
                    {leftBench.length > 0 && (
                      <>
                        <div className="text-xs font-bold text-gray-400 uppercase mt-3 mb-2">🪑 Bench</div>
                        <div className="space-y-1">
                          {leftBench.map((p: any) => renderRow(p, true))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Right */}
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">⭐ Starting 5</div>
                    <div className="space-y-1">
                      {rightLineup.map((p: any) => renderRow(p, false))}
                    </div>
                    {rightBench.length > 0 && (
                      <>
                        <div className="text-xs font-bold text-gray-400 uppercase mt-3 mb-2">🪑 Bench</div>
                        <div className="space-y-1">
                          {rightBench.map((p: any) => renderRow(p, true))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">↑ Swapped in &nbsp;·&nbsp; ↓ Benched &nbsp;·&nbsp; DNP = Did Not Play</p>
                </div>
              </div>
              </>
              )}

              {/* Footer back button */}
              <div className="px-5 py-3 border-t border-gray-200">
                <button onClick={() => setScorecardSignup(null)} className="w-full text-sm font-semibold text-gray-600 hover:text-gray-900 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                  ← Back to contests
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
