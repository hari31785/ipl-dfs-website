"use client"

import { useEffect, useState } from "react"
import { Trophy, User, Phone, Mail, Calendar, LogOut, Settings, Target, Users, Zap, Clock, ChevronRight, ChevronDown, Ticket, Coins, Bell, BellOff } from "lucide-react"
import { useLoading } from '@/contexts/LoadingContext'
import { usePushNotifications } from '@/hooks/usePushNotifications'

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
  coins?: number
  securityQuestion1?: string
  securityQuestion2?: string
  securityQuestion3?: string
}

interface IPLTeam {
  id: string
  name: string
  shortName: string
  color: string
}

interface Contest {
  id: string
  contestType: string
  coinValue: number
  maxParticipants: number
  totalSignups: number
  status: string
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
    id: string
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
        id: string
        name: string
      }
    }
  }
  matchup?: {
    id: string
    status: string
    draftPicksCount: number
    user1Id: string
    user2Id: string
    firstPickUser: string
    draftPicks: {
      id: string
      pickOrder: number
      pickedByUserId: string
      player: {
        id: string
        name: string
        role: string
      }
    }[]
    opponent: {
      id: string
      name: string
      username: string
    }
    opponentUsername: string
    myScore?: number
    opponentScore?: number
  } | null
}

export default function DashboardPage() {
  const { setLoading: setGlobalLoading } = useLoading();
  const { permission, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [user, setUser] = useState<UserData | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [leaderboardTournamentId, setLeaderboardTournamentId] = useState<string | null>(null)
  const [userContests, setUserContests] = useState<UserContest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'available' | 'my-contests' | 'spectate'>('available')
  const [contestSubTab, setContestSubTab] = useState<'upcoming' | 'drafted' | 'active' | 'completed'>('upcoming')
  const [spectateData, setSpectateData] = useState<any[]>([])
  const [spectateLoading, setSpectateLoading] = useState(false)
  const [expandedSpectateGames, setExpandedSpectateGames] = useState<Set<string>>(new Set())
  const [expandedCompletedGames, setExpandedCompletedGames] = useState<Set<string>>(new Set())
  const [myContestsTournamentFilter, setMyContestsTournamentFilter] = useState<string>('all')
  const [joiningContest, setJoiningContest] = useState<string | null>(null)
  const [leavingContest, setLeavingContest] = useState<string | null>(null)
  const [unjoiningContest, setUnjoiningContest] = useState<string | null>(null)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: ''
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showSecuritySection, setShowSecuritySection] = useState(false)
  const [securityForm, setSecurityForm] = useState({
    securityQuestion1: '',
    securityAnswer1: '',
    securityQuestion2: '',
    securityAnswer2: '',
    securityQuestion3: '',
    securityAnswer3: '',
    password: ''
  })
  const [showDraftedTeamsModal, setShowDraftedTeamsModal] = useState(false)
  const [selectedDraftedContest, setSelectedDraftedContest] = useState<UserContest | null>(null)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [dismissedPushBanner, setDismissedPushBanner] = useState(false)

  useEffect(() => {
    // Restore tab state from URL params (e.g. when navigating back from scores page)
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    const subParam = urlParams.get('sub')
    if (tabParam === 'my-contests') setActiveTab('my-contests')
    if (tabParam === 'spectate') {
      setActiveTab('spectate')
      fetchSpectateData()
    }
    if (subParam === 'upcoming' || subParam === 'drafted' || subParam === 'active' || subParam === 'completed') {
      setContestSubTab(subParam)
    }

    // Restore push banner dismissed state
    if (localStorage.getItem('pushBannerDismissed') === '1') {
      setDismissedPushBanner(true)
    }

    // Get user data from localStorage (simple auth for now)
    const userData = localStorage.getItem('currentUser')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      // Fetch fresh user data from database to get latest stats
      fetchUserData(parsedUser.id)
      fetchTournaments()
      fetchLeaderboardTournament()
      fetchUserContests(parsedUser.id)
    } else {
      // Redirect to login if no user data
      window.location.href = '/login'
    }
    setLoading(false)
  }, [])

  const fetchUserData = async (userId: string) => {
    try {
      const response = await fetch(`/api/user?id=${userId}`)
      if (response.ok) {
        const data = await response.json()
        // Update both state and localStorage with fresh data
        setUser(data.user)
        localStorage.setItem('currentUser', JSON.stringify(data.user))
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

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

  const fetchLeaderboardTournament = async () => {
    try {
      const response = await fetch('/api/tournaments?forLeaderboard=true')
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) setLeaderboardTournamentId(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching leaderboard tournament:', error)
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

  const fetchSpectateData = async () => {
    setSpectateLoading(true)
    try {
      const response = await fetch('/api/contests/spectate')
      if (response.ok) {
        const data = await response.json()
        setSpectateData(data.contests)
      }
    } catch (error) {
      console.error('Error fetching spectate data:', error)
    } finally {
      setSpectateLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    window.location.href = '/'
  }

  const openEditProfile = () => {
    if (user) {
      setEditForm({
        name: user.name,
        phone: user.phone || ''
      })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setSecurityForm({
        securityQuestion1: user.securityQuestion1 || '',
        securityAnswer1: '',
        securityQuestion2: user.securityQuestion2 || '',
        securityAnswer2: '',
        securityQuestion3: user.securityQuestion3 || '',
        securityAnswer3: '',
        password: ''
      })
      setShowPasswordSection(false)
      setShowSecuritySection(false)
      setShowEditProfile(true)
    }
  }

  const handleChangePassword = async () => {
    if (!user) return

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      alert('Please fill in all password fields')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      alert('New password must be at least 6 characters long')
      return
    }

    setSavingProfile(true)
    setGlobalLoading(true, 'Changing password...')

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        setShowPasswordSection(false)
        setGlobalLoading(false)
        alert('Password changed successfully!')
      } else {
        setGlobalLoading(false)
        alert(data.error || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setGlobalLoading(false)
      alert('Failed to change password. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleUpdateSecurityQuestions = async () => {
    if (!user) return

    if (!securityForm.securityQuestion1 || !securityForm.securityAnswer1 ||
        !securityForm.securityQuestion2 || !securityForm.securityAnswer2 ||
        !securityForm.securityQuestion3 || !securityForm.securityAnswer3 ||
        !securityForm.password) {
      alert('Please fill in all security questions, answers, and your password')
      return
    }

    setSavingProfile(true)
    setGlobalLoading(true, 'Updating security questions...')

    try {
      const response = await fetch('/api/user/security-questions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          securityQuestion1: securityForm.securityQuestion1,
          securityAnswer1: securityForm.securityAnswer1,
          securityQuestion2: securityForm.securityQuestion2,
          securityAnswer2: securityForm.securityAnswer2,
          securityQuestion3: securityForm.securityQuestion3,
          securityAnswer3: securityForm.securityAnswer3,
          password: securityForm.password
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Update local user data
        const updatedUser = {
          ...user,
          securityQuestion1: data.user.securityQuestion1,
          securityQuestion2: data.user.securityQuestion2,
          securityQuestion3: data.user.securityQuestion3
        }
        setUser(updatedUser)
        localStorage.setItem('currentUser', JSON.stringify(updatedUser))
        
        setSecurityForm({
          ...securityForm,
          securityAnswer1: '',
          securityAnswer2: '',
          securityAnswer3: '',
          password: ''
        })
        setShowSecuritySection(false)
        setGlobalLoading(false)
        alert('Security questions updated successfully!')
      } else {
        setGlobalLoading(false)
        alert(data.error || 'Failed to update security questions')
      }
    } catch (error) {
      console.error('Error updating security questions:', error)
      setGlobalLoading(false)
      alert('Failed to update security questions. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    if (!editForm.name.trim()) {
      alert('Name is required')
      return
    }

    setSavingProfile(true)
    setGlobalLoading(true, 'Saving profile...')

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          name: editForm.name.trim(),
          phone: editForm.phone.trim() || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Update local user data
        const updatedUser = { ...user, name: data.user.name, phone: data.user.phone }
        setUser(updatedUser)
        localStorage.setItem('currentUser', JSON.stringify(updatedUser))
        setShowEditProfile(false)
        setGlobalLoading(false)
        alert('Profile updated successfully!')
      } else {
        setGlobalLoading(false)
        alert(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setGlobalLoading(false)
      alert('Failed to update profile. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleJoinContest = async (contestId: string, gameId: string) => {
    if (!user) return
    
    setJoiningContest(contestId)
    setGlobalLoading(true, 'Joining contest...')
    
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
        // Refresh tournaments to update signup counts
        await fetchTournaments()
        // Refresh user contests
        await fetchUserContests(user.id)
        setGlobalLoading(false)
        alert(`✓ ${data.message}\n\nYou'll be able to draft your team once the signup deadline closes and matchups are created.`)
      } else {
        setGlobalLoading(false)
        alert(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error('Error joining contest:', error)
      setGlobalLoading(false)
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
    setGlobalLoading(true, 'Leaving contest...')

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
        // Refresh the data
        await fetchTournaments()
        if (user) {
          await fetchUserContests(user.id)
        }
        setGlobalLoading(false)
        alert(data.message)
      } else {
        setGlobalLoading(false)
        alert(data.error || 'Failed to leave contest')
      }
    } catch (error) {
      console.error('Error leaving contest:', error)
      setGlobalLoading(false)
      alert('Failed to leave contest')
    } finally {
      setLeavingContest(null)
    }
  }

  const handleUnjoinContest = async (contestId: string) => {
    if (!user) return

    if (!confirm('Are you sure you want to unjoin from this contest? You can join again before the signup deadline.')) {
      return
    }

    setUnjoiningContest(contestId)
    setGlobalLoading(true, 'Leaving contest...')

    try {
      const response = await fetch(`/api/contests/${contestId}/unjoin`, {
        method: 'DELETE',
        headers: {
          'x-user-email': user.email,
        },
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh data
        await fetchTournaments()
        await fetchUserContests(user.id)
        setGlobalLoading(false)
        alert('✓ ' + data.message)
      } else {
        setGlobalLoading(false)
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error unjoining contest:', error)
      setGlobalLoading(false)
      alert('Failed to unjoin contest')
    } finally {
      setUnjoiningContest(null)
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary-500 rounded-full flex items-center justify-center">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-white">IPL DFS</h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <button
                onClick={() => window.location.href = '/coin-vault'}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-2.5 sm:px-5 py-2.5 rounded-lg transition-colors shadow-md font-semibold"
                title="Coin Vault"
              >
                <Coins className="h-5 w-5" />
                <span className="hidden sm:inline">Coin Vault</span>
              </button>
              {leaderboardTournamentId && (
                <button
                  onClick={() => window.location.href = `/leaderboard/${leaderboardTournamentId}`}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-2.5 sm:px-5 py-2.5 rounded-lg transition-colors shadow-md font-semibold"
                  title="Leaderboard"
                >
                  <Trophy className="h-5 w-5" />
                  <span className="hidden sm:inline">Leaderboard</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-2.5 sm:px-5 py-2.5 rounded-lg transition-colors shadow-md font-semibold"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
              {/* Push Notification Bell */}
              {permission !== 'unsupported' && (
                <button
                  onClick={() => {
                    if (isSubscribed) {
                      unsubscribe();
                    } else {
                      if (user?.id) subscribe(user.id);
                    }
                  }}
                  disabled={pushLoading}
                  title={isSubscribed ? 'Disable notifications' : 'Enable notifications'}
                  className={`p-2.5 rounded-lg transition-colors shadow-md ${
                    isSubscribed
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : permission === 'denied'
                      ? 'bg-gray-500 cursor-not-allowed text-gray-300'
                      : 'bg-white hover:bg-gray-100 text-primary-800'
                  }`}
                >
                  {isSubscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Push Notification Opt-in Banner */}
        {!dismissedPushBanner && !isSubscribed && permission !== 'denied' && permission !== 'unsupported' && (
          <div className="mb-4 flex items-center justify-between gap-4 bg-indigo-600 text-white rounded-xl px-5 py-4 shadow-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Stay in the game — enable notifications</p>
                <p className="text-xs text-indigo-200 mt-0.5">Get alerted when your draft opens, contest goes live, or results are in.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  if (user?.id) subscribe(user.id);
                  setDismissedPushBanner(true);
                  localStorage.setItem('pushBannerDismissed', '1');
                }}
                disabled={pushLoading}
                className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors"
              >
                {pushLoading ? 'Enabling…' : 'Enable'}
              </button>
              <button
                onClick={() => {
                  setDismissedPushBanner(true);
                  localStorage.setItem('pushBannerDismissed', '1');
                }}
                className="text-indigo-200 hover:text-white text-xl font-bold leading-none px-1"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Draft Notification Banners */}
        {(() => {
          const alerts = userContests
            .flatMap(uc => {
              if (!uc.matchup || dismissedAlerts.has(uc.matchup.id + '_alert')) return []
              const game = uc.contest.iplGame
              const matchTitle = `${game.team1.shortName} vs ${game.team2.shortName}`
              const tournamentName = game.tournament.name
              const coinValue = uc.contest.coinValue
              const opponentName = uc.matchup.opponentUsername || 'your opponent'
              const matchupId = uc.matchup.id

              // �/⏳ Alert 1: Toss done, draft in progress — split by whose turn it is
              if (
                uc.contest.status === 'DRAFT_PHASE' &&
                uc.matchup.status === 'DRAFTING' &&
                uc.matchup.firstPickUser !== null &&
                uc.matchup.draftPicksCount < 14
              ) {
                const isUser1 = uc.id === uc.matchup.user1Id
                const firstPickIsUser1 = uc.matchup.firstPickUser?.startsWith('user1') ?? false
                const firstPickIsMe = (firstPickIsUser1 && isUser1) || (!firstPickIsUser1 && !isUser1)
                const isMyTurn = (uc.matchup.draftPicksCount % 2 === 0) === firstPickIsMe
                const pickNumber = uc.matchup.draftPicksCount + 1
                const type = isMyTurn ? 'my-turn' : 'started'
                return [{ type, matchupId, matchTitle, tournamentName, coinValue, opponentName, contestMatchupId: uc.matchup.id, pickNumber }]
              }

              // 🟡 Alert 2: Draft window open, no one in yet
              if (
                uc.contest.status === 'DRAFT_PHASE' &&
                uc.matchup.status === 'DRAFTING' &&
                (uc.matchup.firstPickUser === null || uc.matchup.firstPickUser === undefined) &&
                uc.matchup.draftPicksCount === 0
              ) {
                return [{ type: 'open', matchupId, matchTitle, tournamentName, coinValue, opponentName, contestMatchupId: uc.matchup.id }]
              }

              // 🔵 Alert 3: Opponent matched, draft not open yet
              if (
                (uc.contest.status === 'SIGNUP_OPEN' || uc.contest.status === 'SIGNUP_CLOSED') &&
                uc.matchup !== null
              ) {
                return [{ type: 'matched', matchupId, matchTitle, tournamentName, coinValue, opponentName, contestMatchupId: uc.matchup.id }]
              }

              return []
            })
            // Sort: started first, then open, then matched
            .sort((a, b) => {
              const order = { 'my-turn': 0, started: 1, open: 2, matched: 3 }
              return order[a.type as keyof typeof order] - order[b.type as keyof typeof order]
            })

          if (alerts.length === 0) return null

          return (
            <div className="mb-6 space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.contestMatchupId + '_' + alert.type}
                  className={`rounded-xl border px-5 py-4 flex items-start justify-between gap-4 shadow-sm ${
                    alert.type === 'my-turn'
                      ? 'bg-green-50 border-green-400'
                      : alert.type === 'started'
                      ? 'bg-gray-50 border-gray-300'
                      : alert.type === 'open'
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-blue-50 border-blue-300'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-xl mt-0.5">
                      {alert.type === 'my-turn' ? '🟢' : alert.type === 'started' ? '⏳' : alert.type === 'open' ? '⚡' : '🎯'}
                    </span>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${
                        alert.type === 'my-turn' ? 'text-green-800' : alert.type === 'started' ? 'text-gray-700' : alert.type === 'open' ? 'text-amber-800' : 'text-blue-800'
                      }`}>
                        {alert.type === 'my-turn' && "It's your turn to pick!"}
                        {alert.type === 'started' && 'Draft in progress'}
                        {alert.type === 'open' && 'Your draft window is open!'}
                        {alert.type === 'matched' && 'Opponent matched!'}
                      </p>
                      <p className={`text-sm mt-0.5 ${
                        alert.type === 'my-turn' ? 'text-green-700' : alert.type === 'started' ? 'text-gray-600' : alert.type === 'open' ? 'text-amber-700' : 'text-blue-700'
                      }`}>
                        {alert.matchTitle} &bull; {alert.tournamentName} &bull; {alert.coinValue} Coin Contest
                      </p>
                      <p className={`text-sm mt-1 ${
                        alert.type === 'my-turn' ? 'text-green-600' : alert.type === 'started' ? 'text-gray-500' : alert.type === 'open' ? 'text-amber-600' : 'text-blue-600'
                      }`}>
                        {alert.type === 'my-turn' && `Pick #${(alert as any).pickNumber} vs ${alert.opponentName} — don't keep them waiting!`}
                        {alert.type === 'started' && `${alert.opponentName} is picking now... (Pick #${(alert as any).pickNumber})`}
                        {alert.type === 'open' && `Be the first to enter the draft room vs ${alert.opponentName}.`}
                        {alert.type === 'matched' && `You'll be facing ${alert.opponentName} — draft opens soon.`}
                      </p>
                    </div>
                    {(alert.type === 'my-turn' || alert.type === 'started' || alert.type === 'open') && (
                      <button
                        onClick={() => window.location.href = `/draft/${alert.matchupId}`}
                        className={`shrink-0 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${
                          alert.type === 'my-turn'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : alert.type === 'started'
                            ? 'bg-gray-400 hover:bg-gray-500 text-white'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                      >
                        {alert.type === 'my-turn' ? 'Pick Now →' : alert.type === 'started' ? 'Watch →' : 'Go Draft →'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setDismissedAlerts(prev => new Set(prev).add(alert.contestMatchupId + '_alert'))}
                    className={`shrink-0 text-lg font-bold leading-none mt-0.5 ${
                      alert.type === 'my-turn' ? 'text-green-400 hover:text-green-600' : alert.type === 'started' ? 'text-gray-400 hover:text-gray-600' : alert.type === 'open' ? 'text-amber-400 hover:text-amber-600' : 'text-blue-400 hover:text-blue-600'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )
        })()}

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
                <button 
                  onClick={openEditProfile}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
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
                  <p className="text-2xl font-bold text-gray-900">{user.totalWins}</p>
                  <p className="text-xs text-gray-600">Wins</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{user.winPercentage.toFixed(0)}%</p>
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
              <button
                onClick={() => { setActiveTab('spectate'); fetchSpectateData(); }}
                className={`pb-4 px-4 font-semibold transition-colors relative ${
                  activeTab === 'spectate'
                    ? 'text-secondary-600 border-b-2 border-secondary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👁 Spectate
              </button>
            </div>

            {/* Available Contests Tab */}
            {activeTab === 'available' && (
              <div className="space-y-6">
                {(() => {
                  // Filter tournaments and games to only show those with available contests
                  const availableTournaments = tournaments
                    .filter(tournament => tournament.games && tournament.games.length > 0)
                    .map(tournament => ({
                      ...tournament,
                      games: tournament.games.filter(game => {
                        // Only include games that have at least one available contest
                        if (!game.contests || game.contests.length === 0) return false;
                        if (!game.signupDeadline) return false;
                        
                        const now = new Date();
                        const signupDeadline = new Date(game.signupDeadline);
                        
                        if (isNaN(signupDeadline.getTime())) return false;
                        
                        // Check if this game has any contests that are open for signup
                        const availableContests = game.contests.filter(contest => 
                          contest.status === 'SIGNUP_OPEN'
                        );
                        
                        // Show games if they have SIGNUP_OPEN contests OR if deadline hasn't passed
                        // This ensures reopened contests are visible even if original deadline passed
                        if (availableContests.length > 0) return true;
                        
                        // If no open contests, only show if deadline hasn't passed
                        return signupDeadline > now;
                      })
                    }))
                    .filter(tournament => tournament.games.length > 0); // Remove tournaments with no available games

                  if (availableTournaments.length === 0) {
                    return (
                      <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                        <Trophy className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-600">No contests available for signup</p>
                        <p className="text-gray-500 text-sm mt-2">Check back later for new contests</p>
                      </div>
                    );
                  }

                  return availableTournaments.map((tournament) => (
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
                                  <span className="text-gray-600 text-sm font-bold">vs</span>
                                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                                    <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: game.team2.color }}></div>
                                    <span className="font-bold text-sm text-gray-900">{game.team2.shortName}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <Clock className="h-3 w-3" />
                                    <span className="font-medium">Match Start: {new Date(game.gameDate).toLocaleString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric',
                                      hour: 'numeric', 
                                      minute: '2-digit',
                                      hour12: true,
                                      timeZoneName: 'short'
                                    })}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium">Signups close: {new Date(game.signupDeadline).toLocaleString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric', 
                                      minute: '2-digit',
                                      hour12: true,
                                      timeZoneName: 'short'
                                    })}</span>
                                    {(() => {
                                      const now = new Date();
                                      const signupDeadline = new Date(game.signupDeadline);
                                      const hasOpenContests = game.contests?.some(c => c.status === 'SIGNUP_OPEN');
                                      
                                      if (signupDeadline <= now && hasOpenContests) {
                                        return (
                                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            📢 Reopened
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </div>
                              </div>

                              {(() => {
                                // Filter contests to only show those available for signup
                                if (!game.contests || game.contests.length === 0) {
                                  return null; // This shouldn't happen due to our filtering above
                                }
                                
                                const now = new Date();
                                const signupDeadline = new Date(game.signupDeadline);
                                
                                // Filter contests - show all SIGNUP_OPEN contests
                                // If deadline has passed, admin may have manually reopened signups
                                const availableContests = game.contests.filter(contest => 
                                  contest.status === 'SIGNUP_OPEN'
                                );
                                
                                return (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Available Contests:</p>
                                    <div className={`grid gap-2 ${
                                      availableContests.length === 1 
                                        ? 'grid-cols-1' 
                                        : availableContests.length === 2 
                                        ? 'grid-cols-2' 
                                        : 'grid-cols-3'
                                    }`}>
                                      {availableContests.map((contest) => {
                                        // Check if user has already joined this contest
                                        const hasJoined = userContests.some(
                                          uc => uc.contest.id === contest.id
                                        );
                                        
                                        return (
                                          <div key={contest.id} className="relative">
                                            <button 
                                              onClick={() => !hasJoined && handleJoinContest(contest.id, game.id)}
                                              disabled={joiningContest === contest.id || hasJoined || unjoiningContest === contest.id}
                                              className={`w-full flex flex-col items-center justify-center gap-1 px-4 py-3 border-2 rounded-lg transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed ${
                                                hasJoined
                                                  ? 'bg-gradient-to-br from-green-400 to-green-500 border-green-600 text-white cursor-default'
                                                  : 'bg-gradient-to-br from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 border-yellow-600 text-gray-900'
                                              }`}
                                            >
                                              <span className={`font-bold text-base ${hasJoined ? 'text-white' : 'text-gray-900'}`}>
                                                {(() => {
                                                  const type = contest.contestType;
                                                  return type === 'HIGH_ROLLER' ? 'High Roller (100)' : 
                                                         type === 'REGULAR' ? 'Regular (50)' : 
                                                         type === 'LOW_STAKES' ? 'Low Stakes (25)' : 
                                                         `${contest.coinValue} Coins`;
                                                })()} 
                                              </span>
                                              <span className={`text-xs ${hasJoined ? 'text-green-100' : 'text-gray-800'}`}>
                                                {contest._count.signups}/{contest.maxParticipants} joined
                                              </span>
                                              {joiningContest === contest.id ? (
                                                <span className="text-xs text-gray-900 font-medium">Joining...</span>
                                              ) : unjoiningContest === contest.id ? (
                                                <span className="text-xs text-white font-medium">Leaving...</span>
                                              ) : hasJoined ? (
                                                <span className="text-xs font-bold text-white flex items-center gap-1">
                                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                  </svg>
                                                  JOINED
                                                </span>
                                              ) : (
                                                <span className="text-xs font-bold text-gray-900">JOIN NOW</span>
                                              )}
                                            </button>
                                            {hasJoined && unjoiningContest !== contest.id && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleUnjoinContest(contest.id);
                                                }}
                                                className="mt-1 w-full px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded border border-red-600 transition-colors"
                                              >
                                                ✕ Unjoin
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()} 
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ));
                })()} 
              </div>
            )}

            {/* My Contests Tab */}
            {activeTab === 'my-contests' && (
              <div className="space-y-6">
                {/* Contest Sub-tabs — horizontally scrollable so all 4 always fit on small screens */}
                {(() => {
                  const upcomingCount = userContests.filter(c =>
                    (c.contest.status === 'SIGNUP_OPEN' || c.contest.status === 'SIGNUP_CLOSED' || c.contest.status === 'DRAFT_PHASE') &&
                    !(c.matchup && c.matchup.status === 'COMPLETED')
                  ).length;
                  const draftedCount = userContests.filter(c =>
                    (c.contest.status === 'DRAFT_PHASE' || c.contest.status === 'ACTIVE') &&
                    c.matchup && c.matchup.status === 'COMPLETED'
                  ).length;
                  const activeCount = userContests.filter(c =>
                    c.contest.status === 'LIVE' || c.contest.status === 'ACTIVE'
                  ).length;
                  const completedCount = userContests.filter(c =>
                    c.contest.status === 'COMPLETED'
                  ).length;
                  const tabs = [
                    { key: 'upcoming',  label: 'Upcoming',  icon: <Clock className="h-4 w-4" />,  count: upcomingCount,  activeCls: 'border-blue-500 text-blue-700',   badgeCls: 'bg-blue-100 text-blue-800'    },
                    { key: 'drafted',   label: 'Drafted',   icon: <Users className="h-4 w-4" />,  count: draftedCount,   activeCls: 'border-indigo-500 text-indigo-700', badgeCls: 'bg-indigo-100 text-indigo-800' },
                    { key: 'active',    label: 'Active',    icon: <Zap className="h-4 w-4" />,    count: activeCount,    activeCls: 'border-green-500 text-green-700',  badgeCls: 'bg-green-100 text-green-800'  },
                    { key: 'completed', label: 'Completed', icon: <Trophy className="h-4 w-4" />, count: completedCount, activeCls: 'border-purple-500 text-purple-700', badgeCls: 'bg-purple-100 text-purple-800' },
                  ] as const;
                  return (
                    <div className="flex border-b border-gray-200 bg-white rounded-t-lg overflow-x-auto scrollbar-hide">
                      {tabs.map(tab => {
                        const isActive = contestSubTab === tab.key;
                        return (
                          <button
                            key={tab.key}
                            onClick={() => setContestSubTab(tab.key)}
                            className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 px-2 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                              isActive ? tab.activeCls : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              {tab.icon}
                              <span>{tab.label}</span>
                            </div>
                            {tab.count > 0 && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${isActive ? tab.badgeCls : 'bg-gray-100 text-gray-500'}`}>
                                {tab.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Tournament Filter */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Tournament</label>
                  <select
                    value={myContestsTournamentFilter}
                    onChange={(e) => setMyContestsTournamentFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="all">All Tournaments</option>
                    {/* Show unique tournaments from user's contests */}
                    {Array.from(new Set(userContests.map(uc => uc.contest.iplGame.tournament.id)))
                      .map(tournamentId => {
                        const tournament = userContests.find(uc => uc.contest.iplGame.tournament.id === tournamentId)?.contest.iplGame.tournament;
                        return tournament ? (
                          <option key={tournament.id} value={tournament.id}>
                            {tournament.name}
                          </option>
                        ) : null;
                      })}
                  </select>
                </div>

                {/* Contest Content based on sub-tab */}
                <div className="space-y-4">
                  {(() => {
                    let filteredContests = userContests
                    
                    // Filter by tournament first
                    if (myContestsTournamentFilter !== 'all') {
                      filteredContests = filteredContests.filter(contest => 
                        contest.contest.iplGame.tournament.id === myContestsTournamentFilter
                      )
                    }
                    
                    // Then filter by status based on sub-tab
                    if (contestSubTab === 'upcoming') {
                      filteredContests = filteredContests.filter(contest => 
                        // Upcoming: Contests not yet started by admin (signup and draft phase)
                        // Exclude contests where draft is already complete (matchup.status === COMPLETED
                        // is the source of truth — handles bench-waived drafts with < 14 picks too)
                        (contest.contest.status === 'SIGNUP_OPEN' || 
                        contest.contest.status === 'SIGNUP_CLOSED' ||
                        contest.contest.status === 'DRAFT_PHASE') &&
                        !(contest.matchup && contest.matchup.status === 'COMPLETED')
                      )
                    } else if (contestSubTab === 'drafted') {
                      filteredContests = filteredContests.filter(contest => 
                        // Drafted: Draft complete, waiting for admin to activate
                        // Use matchup.status === COMPLETED as source of truth (handles bench waivers)
                        (contest.contest.status === 'DRAFT_PHASE' || contest.contest.status === 'ACTIVE') && 
                        contest.matchup && 
                        contest.matchup.status === 'COMPLETED'
                      )
                    } else if (contestSubTab === 'active') {
                      filteredContests = filteredContests.filter(contest => 
                        // Active: Contest has been started by admin (LIVE or ACTIVE status)
                        contest.contest.status === 'LIVE' || contest.contest.status === 'ACTIVE'
                      )
                    } else if (contestSubTab === 'completed') {
                      filteredContests = filteredContests.filter(contest => 
                        // Completed: Contest has been ended by admin
                        contest.contest.status === 'COMPLETED'
                      )
                    }

                    if (filteredContests.length === 0) {
                      return (
                        <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                          <div className="h-12 w-12 mx-auto mb-4">
                            {contestSubTab === 'upcoming' && <Clock className="h-12 w-12 text-gray-500" />}
                            {contestSubTab === 'drafted' && <Users className="h-12 w-12 text-gray-500" />}
                            {contestSubTab === 'active' && <Zap className="h-12 w-12 text-gray-500" />}
                            {contestSubTab === 'completed' && <Trophy className="h-12 w-12 text-gray-500" />}
                          </div>
                          <p className="text-gray-600 mb-2">
                            {contestSubTab === 'upcoming' && 'No upcoming contests'}
                            {contestSubTab === 'drafted' && 'No drafted contests'}
                            {contestSubTab === 'active' && 'No active contests'}
                            {contestSubTab === 'completed' && 'No completed contests yet'}
                          </p>
                          {contestSubTab === 'upcoming' && (
                            <button
                              onClick={() => setActiveTab('available')}
                              className="text-secondary-600 hover:text-secondary-700 font-semibold"
                            >
                              Browse available contests →
                            </button>
                          )}
                        </div>
                      )
                    }

                    // Completed tab: group by game with collapsible headers + compact inner cards
                    if (contestSubTab === 'completed') {
                      const gameGroups = filteredContests
                        .sort((a, b) => new Date(b.contest.iplGame.gameDate).getTime() - new Date(a.contest.iplGame.gameDate).getTime())
                        .reduce((groups: Record<string, { game: any; signups: any[] }>, signup) => {
                          const gameId = signup.contest.iplGame.id
                          if (!groups[gameId]) groups[gameId] = { game: signup.contest.iplGame, signups: [] }
                          groups[gameId].signups.push(signup)
                          return groups
                        }, {})

                      return Object.values(gameGroups).map((group: any) => {
                        const isExpanded = expandedCompletedGames.has(group.game.id)
                        const wins = group.signups.filter((s: any) => s.matchup && s.matchup.myScore !== undefined && s.matchup.myScore > s.matchup.opponentScore).length
                        const losses = group.signups.filter((s: any) => s.matchup && s.matchup.myScore !== undefined && s.matchup.myScore < s.matchup.opponentScore).length
                        return (
                          <div key={group.game.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                            {/* Game header — click to expand/collapse */}
                            <button
                              onClick={() => setExpandedCompletedGames(prev => {
                                const next = new Set(prev)
                                if (next.has(group.game.id)) next.delete(group.game.id)
                                else next.add(group.game.id)
                                return next
                              })}
                              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 p-3 text-left"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-lg">
                                  <div className="w-4 h-4 rounded-full border border-white/60" style={{ backgroundColor: group.game.team1.color }}></div>
                                  <span className="font-bold text-xs text-white">{group.game.team1.shortName}</span>
                                </div>
                                <span className="text-white/70 text-xs font-bold">vs</span>
                                <div className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-lg">
                                  <div className="w-4 h-4 rounded-full border border-white/60" style={{ backgroundColor: group.game.team2.color }}></div>
                                  <span className="font-bold text-xs text-white">{group.game.team2.shortName}</span>
                                </div>
                                <span className="text-white/60 text-xs ml-1">
                                  {new Date(group.game.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="text-white/60 text-xs">·</span>
                                <span className="text-white/80 text-xs">{group.signups.length} contest{group.signups.length !== 1 ? 's' : ''}</span>
                                {(wins > 0 || losses > 0) && (
                                  <>
                                    <span className="text-green-300 text-xs font-bold ml-1">{wins}W</span>
                                    <span className="text-red-300 text-xs font-bold">{losses}L</span>
                                  </>
                                )}
                                <span className="ml-auto text-white/80">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </span>
                              </div>
                            </button>

                            {/* Compact contest rows — only shown when expanded */}
                            {isExpanded && (
                              <div className="divide-y divide-gray-100">
                                {group.signups.map((signup: any) => {
                                  const myScore = signup.matchup?.myScore
                                  const oppScore = signup.matchup?.opponentScore
                                  const hasScores = myScore !== undefined && oppScore !== undefined
                                  const iWon = hasScores && myScore > oppScore
                                  const iLost = hasScores && myScore < oppScore
                                  return (
                                    <div key={signup.id} className="flex items-center gap-3 px-3 py-2.5">
                                      {/* Contest type + coin value */}
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-semibold text-gray-800">
                                          {signup.contest.contestType === 'HIGH_ROLLER' ? 'High Roller (100)' :
                                           signup.contest.contestType === 'REGULAR' ? 'Regular (50)' :
                                           signup.contest.contestType === 'LOW_STAKES' ? 'Low Stakes (25)' :
                                           signup.contest.contestType}
                                        </div>
                                        <div className="text-[10px] text-gray-400">{signup.contest.coinValue} coins/pt · vs {signup.matchup?.opponent?.name ?? '—'}</div>
                                      </div>
                                      {/* Scores */}
                                      {hasScores ? (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className={`text-sm font-black ${iWon ? 'text-green-700' : iLost ? 'text-red-700' : 'text-gray-700'}`}>
                                            ⭐ {myScore.toFixed(1)}
                                          </span>
                                          <span className="text-gray-400 text-xs font-bold">vs</span>
                                          <span className={`text-sm font-black ${iLost ? 'text-green-700' : iWon ? 'text-red-700' : 'text-gray-700'}`}>
                                            ⭐ {oppScore.toFixed(1)}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="text-xs text-gray-400 shrink-0">No scores yet</div>
                                      )}
                                      {/* Win/Loss badge */}
                                      {hasScores && myScore !== oppScore && (
                                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${iWon ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {iWon ? '🎉 Won' : '😔 Lost'}
                                        </span>
                                      )}
                                      {/* View Scores button */}
                                      {signup.matchup?.status === 'COMPLETED' && (
                                        <button
                                          onClick={() => window.location.href = `/scores/${signup.matchup?.id}?from=completed`}
                                          className="shrink-0 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                                        >
                                          View Scores
                                        </button>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })
                    }

                    return filteredContests
                      .sort((a, b) => {
                        // Sort by game date for better organization
                        const dateA = new Date(a.contest.iplGame.gameDate)
                        const dateB = new Date(b.contest.iplGame.gameDate)
                        return dateA.getTime() - dateB.getTime() // Earliest first for upcoming/active
                      })
                      .map((signup) => (
                    <div key={`${signup.id}-${signup.matchup?.id ?? 'none'}`} className="bg-white rounded-lg shadow border border-gray-200 p-3">
                      {/* Compact Header with Team Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                            <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: signup.contest.iplGame.team1.color }}></div>
                            <span className="font-bold text-sm text-gray-900">{signup.contest.iplGame.team1.shortName}</span>
                          </div>
                          <span className="text-gray-600 text-sm font-bold">vs</span>
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
                          <span className="font-semibold text-sm text-gray-900">
                            {signup.contest.contestType === 'HIGH_ROLLER' ? 'High Roller (100)' : 
                             signup.contest.contestType === 'REGULAR' ? 'Regular (50)' : 
                             signup.contest.contestType === 'LOW_STAKES' ? 'Low Stakes (25)' : 
                             signup.contest.contestType}
                          </span>
                          <span className="text-xs text-gray-600">{signup.contest.coinValue} coins/pt</span>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{new Date(signup.contest.iplGame.gameDate).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true
                          })}</div>
                          <div className="text-orange-600 text-[10px]">
                            Signup: {new Date(signup.contest.iplGame.signupDeadline).toLocaleString('en-US', { 
                              month: 'numeric', 
                              day: 'numeric',
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Status - Only show for upcoming/drafted tabs, not active/completed */}
                      {contestSubTab !== 'active' && (
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
                      )}

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
                          {/* Only show won/lost status in drafted tab, not in active tab where scores can still change */}
                          {contestSubTab !== 'active' && signup.matchup.myScore !== signup.matchup.opponentScore && (
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
                          contestSubTab === 'drafted' ? (
                            <button 
                              onClick={() => {
                                setSelectedDraftedContest(signup)
                                setShowDraftedTeamsModal(true)
                              }}
                              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                            >
                              View Drafted Teams
                            </button>
                          ) : (
                            <button 
                              onClick={() => window.location.href = `/scores/${signup.matchup?.id}?from=${contestSubTab}`}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                            >
                              View Scores
                            </button>
                          )
                        ) : (
                          <button 
                            disabled={
                              !signup.matchup || 
                              (signup.matchup.status !== 'DRAFTING' && 
                               signup.matchup.status !== 'COMPLETED' &&
                               new Date() <= new Date(signup.contest.iplGame.signupDeadline))
                            }
                            onClick={() => window.location.href = `/draft/${signup.matchup?.id}`}
                            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                              signup.matchup && (
                                signup.matchup.status === 'DRAFTING' || 
                                signup.matchup.status === 'COMPLETED' ||
                                new Date() > new Date(signup.contest.iplGame.signupDeadline)
                              )
                                ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                            title={
                              !signup.matchup 
                                ? 'Waiting for matchup' 
                                : signup.matchup.status !== 'DRAFTING' && 
                                  signup.matchup.status !== 'COMPLETED' &&
                                  new Date() <= new Date(signup.contest.iplGame.signupDeadline)
                                ? 'Draft will open after signup deadline or when admin opens it'
                                : 'Click to draft your team'
                            }
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
                  })()}
                </div>
              </div>
            )}

            {/* Spectate Tab */}
            {activeTab === 'spectate' && (
              <div className="space-y-4">
                {/* Header with refresh */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">👁 Live Matchups</h3>
                    <p className="text-sm text-gray-500">All active H2H contests — spectate any matchup</p>
                  </div>
                  <button
                    onClick={fetchSpectateData}
                    disabled={spectateLoading}
                    className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {spectateLoading ? '⟳ Loading...' : '↻ Refresh'}
                  </button>
                </div>

                {spectateLoading ? (
                  <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
                    <div className="text-gray-500">Loading active matchups...</div>
                  </div>
                ) : spectateData.length === 0 ? (
                  <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
                    <div className="text-4xl mb-3">👁</div>
                    <div className="text-lg font-semibold text-gray-700">No active contests right now</div>
                    <div className="text-sm text-gray-500 mt-1">Check back once a contest is set to LIVE or ACTIVE</div>
                  </div>
                ) : (() => {
                  // Group contests by game
                  const gameGroups = spectateData.reduce((groups: any, contest: any) => {
                    const gameId = contest.iplGame.id
                    if (!groups[gameId]) {
                      groups[gameId] = { game: contest.iplGame, contests: [] }
                    }
                    groups[gameId].contests.push(contest)
                    return groups
                  }, {} as Record<string, { game: any; contests: any[] }>)

                  return Object.values(gameGroups).map((group: any) => {
                    const isExpanded = expandedSpectateGames.has(group.game.id)
                    const totalMatchups = group.contests.reduce((n: number, c: any) => n + c.matchups.length, 0)
                    return (
                    <div key={group.game.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                      {/* Game header — click to expand/collapse */}
                      <button
                        onClick={() => setExpandedSpectateGames(prev => {
                          const next = new Set(prev)
                          if (next.has(group.game.id)) next.delete(group.game.id)
                          else next.add(group.game.id)
                          return next
                        })}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 p-3 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg">
                            <div className="w-5 h-5 rounded-full border-2 border-white" style={{ backgroundColor: group.game.team1.color }}></div>
                            <span className="font-bold text-sm text-white">{group.game.team1.shortName}</span>
                          </div>
                          <span className="text-white font-bold text-sm">vs</span>
                          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg">
                            <div className="w-5 h-5 rounded-full border-2 border-white" style={{ backgroundColor: group.game.team2.color }}></div>
                            <span className="font-bold text-sm text-white">{group.game.team2.shortName}</span>
                          </div>
                          <span className="text-white/70 text-xs">
                            {new Date(group.game.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-white/60 text-xs">
                            {group.contests.length} contest{group.contests.length !== 1 ? 's' : ''} · {totalMatchups} matchup{totalMatchups !== 1 ? 's' : ''}
                          </span>
                          <span className="ml-auto text-white/80">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </span>
                        </div>
                      </button>

                      {/* Contests — only shown when expanded */}
                      {isExpanded && <div className="divide-y divide-gray-100">
                        {group.contests.map((contest: any) => (
                          <div key={contest.id} className="p-3">
                            {/* Contest type label */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                {contest.contestType === 'HIGH_ROLLER' ? 'High Roller' :
                                 contest.contestType === 'REGULAR' ? 'Regular' :
                                 contest.contestType === 'LOW_STAKES' ? 'Low Stakes' :
                                 contest.contestType}
                              </span>
                              <span className="text-xs text-gray-500">{contest.coinValue} coins/pt</span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-500">{contest.matchups.length} matchup{contest.matchups.length !== 1 ? 's' : ''}</span>
                            </div>

                            {/* Matchup rows */}
                            {contest.matchups.length === 0 ? (
                              <div className="text-xs text-gray-400 italic py-1">No completed drafts yet</div>
                            ) : (
                              <div className="space-y-1.5">
                                {contest.matchups.map((matchup: any) => {
                                  const hasScores = matchup.user1Score > 0 || matchup.user2Score > 0
                                  const u1Wins = matchup.user1Score > matchup.user2Score
                                  const u2Wins = matchup.user2Score > matchup.user1Score
                                  return (
                                    <div key={matchup.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                      {/* User 1 */}
                                      <div className={`flex-1 text-right ${u1Wins && hasScores ? 'font-bold' : ''}`}>
                                        <div className="text-sm text-gray-900 truncate">{matchup.user1.user.name}</div>
                                        <div className="text-xs text-gray-500">@{matchup.user1.user.username}</div>
                                      </div>
                                      {/* Scores */}
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`text-sm font-black w-16 text-right ${u1Wins && hasScores ? 'text-green-700' : 'text-gray-700'}`}>
                                          {hasScores ? `⭐ ${matchup.user1Score.toFixed(1)}` : '–'}
                                        </span>
                                        <span className="text-gray-400 font-bold text-xs">vs</span>
                                        <span className={`text-sm font-black w-16 ${u2Wins && hasScores ? 'text-green-700' : 'text-gray-700'}`}>
                                          {hasScores ? `⭐ ${matchup.user2Score.toFixed(1)}` : '–'}
                                        </span>
                                      </div>
                                      {/* User 2 */}
                                      <div className={`flex-1 ${u2Wins && hasScores ? 'font-bold' : ''}`}>
                                        <div className="text-sm text-gray-900 truncate">{matchup.user2.user.name}</div>
                                        <div className="text-xs text-gray-500">@{matchup.user2.user.username}</div>
                                      </div>
                                      {/* Watch button */}
                                      <button
                                        onClick={() => window.location.href = `/scores/${matchup.id}?from=spectate`}
                                        className="shrink-0 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                                      >
                                        👁 Watch
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>}
                    </div>
                  )
                  })
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mt-6">
          <h3 className="text-lg font-bold text-primary-800 mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href="/how-to-play"
              className="flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-green-800">How to Play</div>
                  <div className="text-sm text-gray-600">Game guide & strategies</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-green-600 group-hover:translate-x-1 transition-transform" />
            </a>

            <a 
              href="/rules"
              className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-blue-800">Official Rules</div>
                  <div className="text-sm text-gray-600">Terms & regulations</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
            </a>

            <a 
              href="/scoring"
              className="flex items-center justify-between p-4 bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-xl hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="font-semibold text-orange-800">Scoring System</div>
                  <div className="text-sm text-gray-600">Points calculation</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-orange-600 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Edit Profile
              </h3>
              <button
                onClick={() => setShowEditProfile(false)}
                className="text-white hover:text-primary-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-auto">
              <div className="space-y-6">
                {/* Basic Information Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h4>
                  <div className="space-y-4">
                    {/* Name Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter your name"
                        required
                      />
                    </div>

                    {/* Phone Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    {/* Read-only fields info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Note:</strong> Username and email cannot be changed.
                      </p>
                      <div className="text-sm text-blue-700 space-y-1">
                        <div><strong>Username:</strong> {user?.username}</div>
                        <div><strong>Email:</strong> {user?.email}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                {/* Change Password Section */}
                <div>
                  <button
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    className="w-full flex items-center justify-between text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                  >
                    <span className="text-lg font-semibold text-gray-800">Change Password</span>
                    <span className="text-gray-600">{showPasswordSection ? '▲' : '▼'}</span>
                  </button>
                  
                  {showPasswordSection && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter current password"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter new password (min 6 characters)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Confirm new password"
                        />
                      </div>

                      <button
                        onClick={handleChangePassword}
                        disabled={savingProfile}
                        className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingProfile ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                {/* Update Security Questions Section */}
                <div>
                  <button
                    onClick={() => setShowSecuritySection(!showSecuritySection)}
                    className="w-full flex items-center justify-between text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                  >
                    <span className="text-lg font-semibold text-gray-800">Update Security Questions</span>
                    <span className="text-gray-600">{showSecuritySection ? '▲' : '▼'}</span>
                  </button>
                  
                  {showSecuritySection && (
                    <div className="mt-4 space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Important:</strong> These questions are used for password recovery. Make sure to remember your answers!
                        </p>
                      </div>

                      {/* Question 1 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Security Question 1 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={securityForm.securityQuestion1}
                          onChange={(e) => setSecurityForm({ ...securityForm, securityQuestion1: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2"
                          placeholder="e.g., What is your favorite color?"
                        />
                        <input
                          type="text"
                          value={securityForm.securityAnswer1}
                          onChange={(e) => setSecurityForm({ ...securityForm, securityAnswer1: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Your answer"
                        />
                      </div>

                      {/* Question 2 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Security Question 2 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={securityForm.securityQuestion2}
                          onChange={(e) => setSecurityForm({ ...securityForm, securityQuestion2: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2"
                          placeholder="e.g., What is your favorite sport?"
                        />
                        <input
                          type="text"
                          value={securityForm.securityAnswer2}
                          onChange={(e) => setSecurityForm({ ...securityForm, securityAnswer2: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Your answer"
                        />
                      </div>

                      {/* Question 3 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Security Question 3 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={securityForm.securityQuestion3}
                          onChange={(e) => setSecurityForm({ ...securityForm, securityQuestion3: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2"
                          placeholder="e.g., What is your favorite team?"
                        />
                        <input
                          type="text"
                          value={securityForm.securityAnswer3}
                          onChange={(e) => setSecurityForm({ ...securityForm, securityAnswer3: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Your answer"
                        />
                      </div>

                      {/* Password confirmation */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm Your Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={securityForm.password}
                          onChange={(e) => setSecurityForm({ ...securityForm, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter your password to confirm"
                        />
                      </div>

                      <button
                        onClick={handleUpdateSecurityQuestions}
                        disabled={savingProfile}
                        className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingProfile ? 'Updating...' : 'Update Security Questions'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex gap-3 rounded-b-lg">
              <button
                onClick={() => setShowEditProfile(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                Close
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile || !editForm.name.trim()}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingProfile ? 'Saving...' : 'Save Basic Info'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drafted Teams Modal */}
      {showDraftedTeamsModal && selectedDraftedContest && selectedDraftedContest.matchup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Drafted Teams
                </h3>
                <p className="text-sm text-indigo-50 mt-1">
                  {selectedDraftedContest.contest.iplGame.title} • {selectedDraftedContest.contest.contestType.replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDraftedTeamsModal(false)
                  setSelectedDraftedContest(null)
                }}
                className="text-white hover:text-indigo-100 transition text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="overflow-auto flex-1 p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* My Team */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                      👤
                    </div>
                    Your Team
                  </h3>
                  <div className="space-y-4">
                    {(() => {
                      const myPicks = selectedDraftedContest.matchup!.draftPicks
                        .filter(pick => pick.pickedByUserId === selectedDraftedContest.id)
                        .sort((a, b) => a.pickOrder - b.pickOrder)
                      
                      if (myPicks.length === 0) {
                        return <div className="text-sm text-gray-500 italic">No picks yet</div>
                      }
                      
                      const startingPlayers = myPicks.slice(0, 5)
                      const benchPlayers = myPicks.slice(5)
                      
                      return (
                        <>
                          {/* Starting 5 */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-sm font-semibold text-blue-700 uppercase tracking-wide">⭐ Starting 5</div>
                              <div className="flex-1 h-px bg-blue-300"></div>
                            </div>
                            <div className="space-y-2">
                              {startingPlayers.map((pick, idx) => (
                                <div key={pick.id} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-blue-200">
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{pick.player.name}</div>
                                    <div className="text-sm text-gray-600">{pick.player.role}</div>
                                  </div>
                                  <div className="text-xs text-blue-600 font-medium">Pick #{pick.pickOrder}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Bench Players */}
                          {benchPlayers.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">🪑 Bench</div>
                                <div className="flex-1 h-px bg-gray-300"></div>
                              </div>
                              <div className="space-y-2">
                                {benchPlayers.map((pick, idx) => (
                                  <div key={pick.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-300">
                                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                      {idx + 6}
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-800">{pick.player.name}</div>
                                      <div className="text-sm text-gray-500">{pick.player.role}</div>
                                    </div>
                                    <div className="text-xs text-gray-500 font-medium">Pick #{pick.pickOrder}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Opponent Team */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-200">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                      🎯
                    </div>
                    {selectedDraftedContest.matchup!.opponentUsername || 'Opponent'}'s Team
                  </h3>
                  <div className="space-y-4">
                    {(() => {
                      const opponentPicks = selectedDraftedContest.matchup!.draftPicks
                        .filter(pick => pick.pickedByUserId !== selectedDraftedContest.id)
                        .sort((a, b) => a.pickOrder - b.pickOrder)
                      
                      if (opponentPicks.length === 0) {
                        return <div className="text-sm text-gray-500 italic">No picks yet</div>
                      }
                      
                      const startingPlayers = opponentPicks.slice(0, 5)
                      const benchPlayers = opponentPicks.slice(5)
                      
                      return (
                        <>
                          {/* Starting 5 */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-sm font-semibold text-purple-700 uppercase tracking-wide">⭐ Starting 5</div>
                              <div className="flex-1 h-px bg-purple-300"></div>
                            </div>
                            <div className="space-y-2">
                              {startingPlayers.map((pick, idx) => (
                                <div key={pick.id} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-purple-200">
                                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{pick.player.name}</div>
                                    <div className="text-sm text-gray-600">{pick.player.role}</div>
                                  </div>
                                  <div className="text-xs text-purple-600 font-medium">Pick #{pick.pickOrder}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Bench Players */}
                          {benchPlayers.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">🪑 Bench</div>
                                <div className="flex-1 h-px bg-gray-300"></div>
                              </div>
                              <div className="space-y-2">
                                {benchPlayers.map((pick, idx) => (
                                  <div key={pick.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-300">
                                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                      {idx + 6}
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-800">{pick.player.name}</div>
                                      <div className="text-sm text-gray-500">{pick.player.role}</div>
                                    </div>
                                    <div className="text-xs text-gray-500 font-medium">Pick #{pick.pickOrder}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center rounded-b-lg">
              <div className="text-sm text-gray-600">
                Draft completed with {selectedDraftedContest.matchup!.draftPicksCount} picks
              </div>
              <button
                onClick={() => {
                  setShowDraftedTeamsModal(false)
                  setSelectedDraftedContest(null)
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}