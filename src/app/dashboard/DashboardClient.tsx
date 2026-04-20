"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Trophy, User, Phone, Mail, Calendar, LogOut, Settings, Target, Users, Zap, Clock, ChevronRight, ChevronDown, Ticket, Coins, Bell, BellOff, RefreshCw } from "lucide-react"
import { useLoading } from '@/contexts/LoadingContext'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { getEffectivePickSlots } from '@/lib/draftUtils'

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

const contestLabel = (type: string, coinValue: number, short = false): string => {
  if (type === 'HIGH_ROLLER') return short ? '100c' : 'High Roller (100c)'
  if (type === 'REGULAR')     return short ? '50c'  : 'Regular (50c)'
  if (type === 'LOW_STAKES')  return short ? '25c'  : 'Low Stakes (25c)'
  return short ? `${coinValue}c` : `${coinValue}🪙`
}

interface DashboardClientProps {
  initialTournaments: Tournament[]
  initialLeaderboardTournamentId: string | null
}

export default function DashboardClient({ initialTournaments, initialLeaderboardTournamentId }: DashboardClientProps) {
  const router = useRouter()
  const { setLoading: setGlobalLoading } = useLoading();
  const { permission, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [user, setUser] = useState<UserData | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>(initialTournaments)
  const [leaderboardTournamentId, setLeaderboardTournamentId] = useState<string | null>(initialLeaderboardTournamentId)
  const [userContests, setUserContests] = useState<UserContest[]>(() => {
    try {
      const cached = sessionStorage.getItem('dashUserContests')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [userContestsLoaded, setUserContestsLoaded] = useState(() => {
    try { return !!sessionStorage.getItem('dashUserContests') } catch { return false }
  })
  const [completedContests, setCompletedContests] = useState<any[]>(() => {
    try {
      const cached = sessionStorage.getItem('dashCompletedContests')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'available' | 'my-contests' | 'spectate'>('available')
  const [contestSubTab, setContestSubTab] = useState<'upcoming' | 'drafted' | 'active' | 'completed'>('upcoming')
  const [spectateData, setSpectateData] = useState<any[]>([])
  const [spectateLoading, setSpectateLoading] = useState(false)
  const [expandedSpectateGames, setExpandedSpectateGames] = useState<Set<string>>(new Set())
  const [expandedCompletedGames, setExpandedCompletedGames] = useState<Set<string>>(new Set())
  const [completedSearchQuery, setCompletedSearchQuery] = useState('')
  const [completedPage, setCompletedPage] = useState(1)
  const COMPLETED_GAMES_PER_PAGE = 5
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
  const [draftedTeamPicks, setDraftedTeamPicks] = useState<any[]>([])
  const [loadingDraftedPicks, setLoadingDraftedPicks] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try {
      const stored = typeof window !== 'undefined' ? sessionStorage.getItem('dismissedAlerts') : null
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set<string>()
    } catch { return new Set<string>() }
  })
  const [dismissedPushBanner, setDismissedPushBanner] = useState(false)
  const [showIosPwaGuide, setShowIosPwaGuide] = useState(false)
  const [dismissedIosBanner, setDismissedIosBanner] = useState(false)

  const STALE_MS = 2 * 60 * 1000 // 2 minutes
  const lastFetchedAt = useRef<number>(
    (() => { try { return parseInt(sessionStorage.getItem('dashLastFetch') ?? '0', 10) } catch { return 0 } })()
  )
  const completedLoadedRef = useRef<boolean>(
    (() => { try { return !!sessionStorage.getItem('dashCompletedContests') } catch { return false } })()
  )
  const [completedLoading, setCompletedLoading] = useState(false)
  const [isDashRefreshing, setIsDashRefreshing] = useState(false)

  const handleDashRefresh = async () => {
    if (!user) return
    setIsDashRefreshing(true)
    const fetches: Promise<any>[] = [
      fetchDashboardData(user.id),
      fetchTournaments(),
      fetchCompletedContests(user.id),
    ]
    await Promise.all(fetches)
    lastFetchedAt.current = Date.now()
    try { sessionStorage.setItem('dashLastFetch', String(lastFetchedAt.current)) } catch {}
    setIsDashRefreshing(false)
  }

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
    if (localStorage.getItem('iosPwaBannerDismissed') === '1') {
      setDismissedIosBanner(true)
    }

    // Detect iOS Safari (non-PWA) — notifications require Add to Home Screen
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
    if (isIos && !isStandalone) {
      setShowIosPwaGuide(true)
    }

    // Get user data from localStorage (simple auth for now)
    const userData = localStorage.getItem('currentUser')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      const now = Date.now()
      const lastFetch = lastFetchedAt.current
      const isStale = now - lastFetch > STALE_MS
      if (isStale) {
        // Fetch fresh user data + active contests in one round-trip
        fetchDashboardData(parsedUser.id)
        // Prefetch completed in background — so tab click is instant
        setCompletedLoading(true)
        fetchCompletedContests(parsedUser.id)
        lastFetchedAt.current = now
        try { sessionStorage.setItem('dashLastFetch', String(now)) } catch {}
      } else {
        // Data is fresh and userContests already restored from sessionStorage cache
        // But if completed was never cached, fetch it in the background now
        if (!completedLoadedRef.current) {
          setCompletedLoading(true)
          fetchCompletedContests(parsedUser.id)
        }
      }
    } else {
      // Redirect to login if no user data
      window.location.href = '/login'
    }
    setLoading(false)
  }, [])

  // Option A: silently resubscribe if permission is granted but subscription was lost
  // (common on iOS when the browser drops the SW subscription in the background)
  useEffect(() => {
    if (permission === 'granted' && !isSubscribed && !pushLoading && user?.id) {
      subscribe(user.id);
    }
  }, [permission, isSubscribed, pushLoading, user?.id]);

  // Fix C+D: bfcache restore uses staleness check (no full reload), visibilityChange uses combined fetch
  useEffect(() => {
    const refreshIfStale = (userId: string) => {
      if (Date.now() - lastFetchedAt.current < STALE_MS) return
      // Fix D: use combined endpoint (1 call) instead of fetchUserData + fetchUserContests (2 calls)
      fetchDashboardData(userId)
      fetchCompletedContests(userId)
      const now = Date.now()
      lastFetchedAt.current = now
      try { sessionStorage.setItem('dashLastFetch', String(now)) } catch {}
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      const userData = localStorage.getItem('currentUser')
      if (!userData) return
      refreshIfStale(JSON.parse(userData).id)
    }

    const handlePageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return
      // Fix C: bfcache restore — let the instant restore stand, only refetch if stale
      // Previously did window.location.reload() here which destroyed the bfcache benefit
      // and triggered a full server render + 2 API calls every time
      const userData = localStorage.getItem('currentUser')
      if (!userData) return
      refreshIfStale(JSON.parse(userData).id)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
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

  // Combined fetch: user profile + active contests in one request (2 calls → 1)
  const fetchDashboardData = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/dashboard?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        localStorage.setItem('currentUser', JSON.stringify(data.user))
        setUserContests(data.contests)
        try { sessionStorage.setItem('dashUserContests', JSON.stringify(data.contests)) } catch {}
        setUserContestsLoaded(true)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const fetchTournaments = async () => {
    try {
      const [dashRes, lbRes] = await Promise.all([
        fetch('/api/tournaments'),
        fetch('/api/tournaments?forLeaderboard=true'),
      ])
      if (dashRes.ok) setTournaments(await dashRes.json())
      if (lbRes.ok) {
        const lbData = await lbRes.json()
        if (lbData.length > 0) setLeaderboardTournamentId(lbData[0].id)
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error)
    }
  }

  const fetchUserContests = async (userId: string, excludeCompleted = false) => {
    try {
      const url = excludeCompleted
        ? `/api/user/contests?userId=${userId}&excludeCompleted=true`
        : `/api/user/contests?userId=${userId}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setUserContests(data)
        setUserContestsLoaded(true)
        if (!excludeCompleted) completedLoadedRef.current = true
      }
    } catch (error) {
      console.error('Error fetching user contests:', error)
    }
  }

  const fetchCompletedContests = async (userId: string) => {
    try {
      const res = await fetch(`/api/user/contests?userId=${userId}&completed=true`)
      if (res.ok) {
        const data = await res.json()
        setCompletedContests(data)
        try { sessionStorage.setItem('dashCompletedContests', JSON.stringify(data)) } catch {}
        completedLoadedRef.current = true
      }
    } catch (error) {
      console.error('Error fetching completed contests:', error)
    } finally {
      setCompletedLoading(false)
    }
  }

  // --- Memoised derivations ---

  const availableTournaments = useMemo(() =>
    tournaments
      .filter(t => t.games && t.games.length > 0)
      .map(t => ({
        ...t,
        games: t.games
          .filter(game => {
            if (!game.contests || game.contests.length === 0) return false
            if (!game.signupDeadline) return false
            const now = new Date()
            const deadline = new Date(game.signupDeadline)
            if (isNaN(deadline.getTime())) return false
            return game.contests.some(c => c.status === 'SIGNUP_OPEN' && deadline > now)
          })
          .sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime()),
      }))
      .filter(t => t.games.length > 0)
  , [tournaments])

  const subTabCounts = useMemo(() => ({
    upcoming:  userContests.filter(c =>
      (c.contest.status === 'SIGNUP_OPEN' || c.contest.status === 'SIGNUP_CLOSED' || c.contest.status === 'DRAFT_PHASE') &&
      !(c.matchup && c.matchup.status === 'COMPLETED')
    ).length,
    drafted: userContests.filter(c =>
      (c.contest.status === 'DRAFT_PHASE' || c.contest.status === 'ACTIVE') &&
      c.matchup && c.matchup.status === 'COMPLETED'
    ).length,
    active: userContests.filter(c =>
      c.contest.status === 'LIVE' || c.contest.status === 'ACTIVE'
    ).length,
    completed: completedContests.length,
  }), [userContests, completedContests])

  const alertsData = useMemo(() =>
    userContests
      .flatMap(uc => {
        if (!uc.matchup || dismissedAlerts.has(uc.matchup.id + '_alert')) return []
        const game = uc.contest.iplGame
        const matchTitle = `${game.team1.shortName} vs ${game.team2.shortName}`
        const tournamentName = game.tournament.name
        const coinValue = uc.contest.coinValue
        const opponentName = uc.matchup.opponentUsername || 'your opponent'
        const matchupId = uc.matchup.id
        if (
          uc.contest.status === 'DRAFT_PHASE' &&
          uc.matchup.status === 'DRAFTING' &&
          uc.matchup.firstPickUser !== null &&
          uc.matchup.draftPicksCount < 14
        ) {
          const effectiveSlots = getEffectivePickSlots(uc.matchup.firstPickUser, uc.matchup.user1Id, uc.matchup.user2Id)
          const nextPickerSignupId = effectiveSlots[uc.matchup.draftPicksCount] ?? null
          const isMyTurn = nextPickerSignupId === uc.id
          const pickNumber = uc.matchup.draftPicksCount + 1
          const type = isMyTurn ? 'my-turn' : 'started'
          return [{ type, matchupId, matchTitle, tournamentName, coinValue, opponentName, contestMatchupId: uc.matchup.id, pickNumber }]
        }
        if (
          uc.contest.status === 'DRAFT_PHASE' &&
          uc.matchup.status === 'DRAFTING' &&
          (uc.matchup.firstPickUser === null || uc.matchup.firstPickUser === undefined) &&
          uc.matchup.draftPicksCount === 0
        ) {
          return [{ type: 'open', matchupId, matchTitle, tournamentName, coinValue, opponentName, contestMatchupId: uc.matchup.id }]
        }
        if (
          (uc.contest.status === 'SIGNUP_OPEN' || uc.contest.status === 'SIGNUP_CLOSED') &&
          uc.matchup !== null
        ) {
          return [{ type: 'matched', matchupId, matchTitle, tournamentName, coinValue, opponentName, contestMatchupId: uc.matchup.id }]
        }
        return []
      })
      .sort((a, b) => {
        const order = { 'my-turn': 0, started: 1, open: 2, matched: 3 }
        return order[a.type as keyof typeof order] - order[b.type as keyof typeof order]
      })
  , [userContests, dismissedAlerts])

  // Memoised completed tab grouping / filtering / pagination
  const completedGroups = useMemo(() => {
    let filtered = completedContests
    if (myContestsTournamentFilter !== 'all') {
      filtered = filtered.filter((c: any) => c.contest?.iplGame?.tournament?.id === myContestsTournamentFilter)
    }
    const grouped = filtered
      .slice()
      .sort((a: any, b: any) => new Date(b.contest.iplGame.gameDate).getTime() - new Date(a.contest.iplGame.gameDate).getTime())
      .reduce((groups: Record<string, { game: any; signups: any[] }>, signup: any) => {
        const gameId = signup.contest.iplGame.id
        if (!groups[gameId]) groups[gameId] = { game: signup.contest.iplGame, signups: [] }
        groups[gameId].signups.push(signup)
        return groups
      }, {})
    const allGroupsArray: any[] = Object.values(grouped)
    const searchLower = completedSearchQuery.toLowerCase().trim()
    const filteredGroups = searchLower
      ? allGroupsArray.filter((g: any) =>
          g.game.team1.shortName.toLowerCase().includes(searchLower) ||
          g.game.team1.name?.toLowerCase().includes(searchLower) ||
          g.game.team2.shortName.toLowerCase().includes(searchLower) ||
          g.game.team2.name?.toLowerCase().includes(searchLower)
        )
      : allGroupsArray
    const totalPages = Math.ceil(filteredGroups.length / COMPLETED_GAMES_PER_PAGE)
    const safePage = Math.min(completedPage, Math.max(1, totalPages))
    const pagedGroups = filteredGroups.slice((safePage - 1) * COMPLETED_GAMES_PER_PAGE, safePage * COMPLETED_GAMES_PER_PAGE)
    return { pagedGroups, filteredGroups, totalPages, safePage }
  }, [completedContests, myContestsTournamentFilter, completedSearchQuery, completedPage, COMPLETED_GAMES_PER_PAGE])

  // Tournament filter options — scoped to current sub-tab's data source
  const tournamentOptions = useMemo(() => {
    const source: any[] = contestSubTab === 'completed' ? completedContests : userContests
    const seen = new Set<string>()
    return source.reduce((acc: any[], uc: any) => {
      const t = uc.contest?.iplGame?.tournament
      if (t && !seen.has(t.id)) { seen.add(t.id); acc.push(t) }
      return acc
    }, [])
  }, [userContests, completedContests, contestSubTab])

  const handleSubTabClick = (key: 'upcoming' | 'drafted' | 'active' | 'completed') => {
    setContestSubTab(key)
    // Fetch if not loaded yet, or if loaded but data is empty (stale/failed cache)
    if (key === 'completed' && !completedLoading && (!completedLoadedRef.current || completedContests.length === 0)) {
      const uid = user?.id ?? (() => {
        try { return JSON.parse(localStorage.getItem('currentUser') ?? '{}').id } catch { return null }
      })()
      if (!uid) return
      setCompletedLoading(true)
      fetchCompletedContests(uid)
    }
  }

  // ---

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
    router.push('/')
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
        // Patch signup count in local state — no need to re-fetch the edge-cached tournaments API
        setTournaments(prev => prev.map(t => ({
          ...t,
          games: t.games.map(g => ({
            ...g,
            contests: g.contests.map(c =>
              c.id === contestId
                ? { ...c, totalSignups: c.totalSignups + 1, _count: { ...c._count, signups: c._count.signups + 1 } }
                : c
            ),
          })),
        })))
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
        // Find the contest from userContests to get its ID for the local patch
        const leaving = userContests.find(uc => uc.id === signupId)
        if (leaving) {
          const cid = leaving.contest.id
          setTournaments(prev => prev.map(t => ({
            ...t,
            games: t.games.map(g => ({
              ...g,
              contests: g.contests.map(c =>
                c.id === cid
                  ? { ...c, totalSignups: Math.max(0, c.totalSignups - 1), _count: { ...c._count, signups: Math.max(0, c._count.signups - 1) } }
                  : c
              ),
            })),
          })))
        }
        if (user) {
          await fetchUserContests(user.id, true)
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
        // Patch signup count in local state
        setTournaments(prev => prev.map(t => ({
          ...t,
          games: t.games.map(g => ({
            ...g,
            contests: g.contests.map(c =>
              c.id === contestId
                ? { ...c, totalSignups: Math.max(0, c.totalSignups - 1), _count: { ...c._count, signups: Math.max(0, c._count.signups - 1) } }
                : c
            ),
          })),
        })))
        // Refresh data
        await fetchUserContests(user.id, true)
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
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Push Notification Bell — first */}
              {permission !== 'unsupported' ? (
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
                  className={`p-3 rounded-lg transition-colors shadow-md ${
                    isSubscribed
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : permission === 'denied'
                      ? 'bg-gray-500 cursor-not-allowed text-gray-300'
                      : 'bg-white hover:bg-gray-100 text-primary-800'
                  }`}
                >
                  {isSubscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                </button>
              ) : showIosPwaGuide ? (
                /* iOS Safari: bell icon tapping toggles the guide banner */
                <button
                  onClick={() => setDismissedIosBanner(d => !d)}
                  title="Add to Home Screen to enable notifications"
                  className="p-3 rounded-lg transition-colors shadow-md bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <BellOff className="h-5 w-5" />
                </button>
              ) : null}
              <button
                onClick={() => router.push('/coin-vault')}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 sm:px-5 py-3 rounded-lg transition-colors shadow-md font-semibold"
                title="Coin Vault"
              >
                <Coins className="h-5 w-5" />
                <span className="hidden sm:inline">Coin Vault</span>
              </button>
              {leaderboardTournamentId && (
                <button
                  onClick={() => router.push(`/leaderboard/${leaderboardTournamentId}`)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-5 py-3 rounded-lg transition-colors shadow-md font-semibold"
                  title="Leaderboard"
                >
                  <Trophy className="h-5 w-5" />
                  <span className="hidden sm:inline">Leaderboard</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-5 py-3 rounded-lg transition-colors shadow-md font-semibold"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* iOS PWA Guide Banner — shown on iPhone/iPad Safari (non-standalone) */}
        {showIosPwaGuide && !dismissedIosBanner && (
          <div className="mb-4 flex items-center justify-between gap-4 bg-orange-500 text-white rounded-xl px-5 py-4 shadow-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">📱 Enable notifications on iPhone</p>
                <p className="text-xs text-orange-100 mt-0.5">
                  Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, then open the app from your Home Screen and enable notifications.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setDismissedIosBanner(true);
                localStorage.setItem('iosPwaBannerDismissed', '1');
              }}
              className="text-orange-200 hover:text-white text-xl font-bold leading-none px-1 flex-shrink-0"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        )}

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
        {!userContestsLoaded ? (
          // Skeleton shimmer while active contests load
          <div className="mb-6 space-y-3">
            <div className="rounded-xl border border-gray-200 px-5 py-4 bg-gray-50 animate-pulse h-16" />
          </div>
        ) : (() => {
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
                const effectiveSlots = getEffectivePickSlots(uc.matchup.firstPickUser, uc.matchup.user1Id, uc.matchup.user2Id)
                const nextPickerSignupId = effectiveSlots[uc.matchup.draftPicksCount] ?? null
                const isMyTurn = nextPickerSignupId === uc.id
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
                        onClick={() => router.push(`/draft/${alert.matchupId}`)}
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
                    onClick={() => setDismissedAlerts(prev => {
                      const next = new Set(prev).add(alert.contestMatchupId + '_alert')
                      try { sessionStorage.setItem('dismissedAlerts', JSON.stringify([...next])) } catch {}
                      return next
                    })}
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

        {/* Profile Strip — full width, horizontal */}
        <div className="bg-white rounded-xl shadow border border-gray-100 px-4 py-3 md:px-6 md:py-4 flex items-center gap-4 md:gap-6">
          <div className="w-11 h-11 md:w-14 md:h-14 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center shrink-0">
            <User className="h-5 w-5 md:h-7 md:w-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm md:text-xl font-bold text-primary-800 truncate">{user.name}</h2>
            <p className="text-xs md:text-sm text-gray-500">@{user.username}</p>
          </div>
          <div className="flex gap-4 md:gap-8 text-center shrink-0">
            <div>
              <p className="text-sm md:text-xl font-bold text-primary-800">{user.totalMatches}</p>
              <p className="text-[10px] md:text-xs text-gray-500">Matches</p>
            </div>
            <div>
              <p className="text-sm md:text-xl font-bold text-gray-900">{user.totalWins}</p>
              <p className="text-[10px] md:text-xs text-gray-500">Wins</p>
            </div>
            <div>
              <p className="text-sm md:text-xl font-bold text-gray-900">{user.winPercentage.toFixed(0)}%</p>
              <p className="text-[10px] md:text-xs text-gray-500">Win%</p>
            </div>
          </div>
          <button
            onClick={openEditProfile}
            className="shrink-0 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 md:p-3 rounded-lg transition-colors"
            title="Edit Profile"
          >
            <Settings className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>

        {/* Main Content — full width */}
        <div className="space-y-6">
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
                My Contests
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
                {availableTournaments.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                      <Trophy className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-600">No contests available for signup</p>
                      <p className="text-gray-500 text-sm mt-2">Check back later for new contests</p>
                    </div>
                ) : availableTournaments.map((tournament) => (
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
                      <div className="p-3 md:p-5 space-y-2 md:space-y-4">
                        {tournament.games.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No upcoming games</p>
                        ) : (
                          tournament.games.map((game) => (
                            <div key={game.id} className="border border-gray-200 rounded-lg p-2.5 md:p-4 hover:border-secondary-300 transition-colors bg-white">
                              {/* Compact Game Info */}
                              <div className="flex items-center justify-between mb-2 md:mb-3">
                                <div className="flex items-center gap-2 md:gap-3">
                                  <div className="flex items-center gap-1.5 md:gap-2 bg-gray-100 px-2 md:px-3 py-1.5 md:py-2 rounded-lg">
                                    <div className="w-5 h-5 md:w-7 md:h-7 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: game.team1.color }}></div>
                                    <span className="font-bold text-sm md:text-lg text-gray-900">{game.team1.shortName}</span>
                                  </div>
                                  <span className="text-gray-500 text-xs md:text-sm font-bold">vs</span>
                                  <div className="flex items-center gap-1.5 md:gap-2 bg-gray-100 px-2 md:px-3 py-1.5 md:py-2 rounded-lg">
                                    <div className="w-5 h-5 md:w-7 md:h-7 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: game.team2.color }}></div>
                                    <span className="font-bold text-sm md:text-lg text-gray-900">{game.team2.shortName}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-1 text-xs md:text-sm text-gray-500">
                                    <Clock className="h-3 w-3 md:h-4 md:w-4" />
                                    <span>{new Date(game.gameDate).toLocaleString('en-US', { 
                                      month: 'short', day: 'numeric',
                                      hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short'
                                    })}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs md:text-sm text-orange-500 mt-0.5">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Closes: {new Date(game.signupDeadline).toLocaleString('en-US', { 
                                      month: 'short', day: 'numeric',
                                      hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short'
                                    })}</span>
                                    {(() => {
                                      const now = new Date();
                                      const signupDeadline = new Date(game.signupDeadline);
                                      const hasOpenContests = game.contests?.some(c => c.status === 'SIGNUP_OPEN');
                                      if (signupDeadline <= now && hasOpenContests) {
                                        return <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">📢 Reopened</span>;
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
                                
                                // Filter contests — only show SIGNUP_OPEN contests where deadline hasn't passed
                                const availableContests = game.contests.filter(contest => 
                                  contest.status === 'SIGNUP_OPEN' && new Date(game.signupDeadline) > now
                                );
                                
                                return (
                                  <div className="space-y-1.5 md:space-y-2">
                                    <p className="text-xs md:text-sm font-semibold text-gray-600">Available Contests:</p>
                                    <div className={`grid gap-2 md:gap-3 ${
                                      availableContests.length === 1
                                        ? 'grid-cols-1'
                                        : availableContests.length === 2
                                        ? 'grid-cols-2'
                                        : 'grid-cols-3'
                                    }`}>
                                      {availableContests.map((contest) => {
                                        // Count how many times user has joined this contest
                                        const entryCount = userContests.filter(
                                          uc => uc.contest.id === contest.id
                                        ).length;
                                        const hasJoined = entryCount > 0;
                                        const canJoinAgain = entryCount > 0 && entryCount < 5 && contest.status === 'SIGNUP_OPEN' && new Date() <= new Date(game.signupDeadline);
                                        
                                        return (
                                          <div key={contest.id} className="relative">
                                            {!userContestsLoaded ? (
                                              // Skeleton while user join-state is loading — prevents accidental double-join
                                              <div className="w-full flex items-center justify-between gap-1.5 px-2.5 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg bg-gray-100 animate-pulse">
                                                <div className="flex flex-col gap-1.5 flex-1">
                                                  <div className="h-3 bg-gray-300 rounded w-3/4" />
                                                  <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                                                </div>
                                                <div className="h-5 w-10 bg-gray-300 rounded shrink-0" />
                                              </div>
                                            ) :
                                            hasJoined ? (
                                              /* Split button: joined (left) + unjoin (right) */
                                              <div className={`w-full flex items-stretch border-2 rounded-lg overflow-hidden shadow-sm border-green-600`}>
                                                {/* Left: joined info */}
                                                <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5 px-2 md:px-4 py-2 md:py-3 bg-gradient-to-br from-green-400 to-green-500">
                                                  <div className="flex flex-col items-start min-w-0 overflow-hidden">
                                                    <span className="font-bold text-sm md:text-base text-white leading-tight w-full truncate">
                                                      <span className="md:hidden">{contestLabel(contest.contestType, contest.coinValue, true)}</span>
                                                      <span className="hidden md:inline">{contestLabel(contest.contestType, contest.coinValue)}</span>
                                                    </span>
                                                    <span className="text-xs md:text-sm text-green-100 leading-tight">
                                                      {contest._count.signups}/{contest.maxParticipants}
                                                    </span>
                                                  </div>
                                                  <div className="flex flex-col items-end shrink-0">
                                                    <span className="text-sm md:text-base font-bold text-white">
                                                      {unjoiningContest === contest.id ? '...' : '✓ In'}
                                                    </span>
                                                    {entryCount > 1 && (
                                                      <span className="text-xs md:text-xs text-green-100 font-semibold">
                                                        {entryCount} entries
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                {/* Divider */}
                                                <div className="w-px bg-green-600/40" />
                                                {/* Middle: Join Again button (if < 5 entries and still open) */}
                                                {canJoinAgain && (
                                                  <>
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); handleJoinContest(contest.id, game.id); }}
                                                      disabled={joiningContest === contest.id}
                                                      className="shrink-0 flex items-center justify-center px-2 md:px-3 bg-yellow-400 hover:bg-yellow-500 transition-colors disabled:opacity-50 border-l border-green-600/40"
                                                      title={`Add entry #${entryCount + 1} (max 5)`}
                                                    >
                                                      <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                                                        {joiningContest === contest.id ? '...' : '+1'}
                                                      </span>
                                                    </button>
                                                    <div className="w-px bg-green-600/40" />
                                                  </>
                                                )}
                                                {/* Right: unjoin strip */}
                                                {new Date() > new Date(game.signupDeadline) ? (
                                                  <div className="flex items-center justify-center px-2 md:px-3 bg-green-500/60">
                                                    <span className="text-[9px] md:text-sm text-green-100">🔒</span>
                                                  </div>
                                                ) : (
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); handleUnjoinContest(contest.id); }}
                                                    disabled={unjoiningContest === contest.id}
                                                    className="shrink-0 flex items-center justify-center px-2.5 md:px-6 bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                                                    title={entryCount > 1 ? `Remove latest entry (${entryCount} → ${entryCount - 1})` : 'Leave contest'}
                                                  >
                                                    <span className="text-sm md:hidden font-bold text-white">✕</span>
                                                    <span className="hidden md:inline text-sm font-bold text-white">
                                                      {unjoiningContest === contest.id ? '...' : 'Unjoin'}
                                                    </span>
                                                  </button>
                                                )}
                                              </div>
                                            ) : (
                                              /* Not joined: normal join button */
                                              <button
                                                onClick={() => handleJoinContest(contest.id, game.id)}
                                                disabled={joiningContest === contest.id}
                                                className="w-full flex items-center justify-between gap-1.5 px-2.5 md:px-4 py-2 md:py-3 border-2 border-yellow-600 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                              >
                                                <div className="flex flex-col items-start min-w-0 overflow-hidden">
                                                  <span className="font-bold text-sm md:text-base text-gray-900 leading-tight w-full truncate">
                                                    <span className="md:hidden">{contestLabel(contest.contestType, contest.coinValue, true)}</span>
                                                    <span className="hidden md:inline">{contestLabel(contest.contestType, contest.coinValue)}</span>
                                                  </span>
                                                  <span className="text-xs md:text-sm text-gray-600 leading-tight">
                                                    {contest._count.signups}/{contest.maxParticipants}
                                                  </span>
                                                </div>
                                                <span className="text-sm md:text-base font-bold text-gray-900 shrink-0">
                                                  {joiningContest === contest.id ? '...' : 'Join'}
                                                </span>
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
                ))}
              </div>
            )}

            {/* My Contests Tab */}
            {activeTab === 'my-contests' && (
              <div className="space-y-6">
                {/* Contest Sub-tabs — horizontally scrollable so all 4 always fit on small screens */}
                {(() => {
                  const tabs = [
                    { key: 'upcoming'  as const, label: 'Upcoming',  icon: <Clock className="h-4 w-4" />,  count: subTabCounts.upcoming,  activeCls: 'border-blue-500 text-blue-700',    badgeCls: 'bg-blue-100 text-blue-800'    },
                    { key: 'drafted'   as const, label: 'Drafted',   icon: <Users className="h-4 w-4" />,  count: subTabCounts.drafted,   activeCls: 'border-indigo-500 text-indigo-700', badgeCls: 'bg-indigo-100 text-indigo-800' },
                    { key: 'active'    as const, label: 'Active',    icon: <Zap className="h-4 w-4" />,    count: subTabCounts.active,    activeCls: 'border-green-500 text-green-700',   badgeCls: 'bg-green-100 text-green-800'  },
                    { key: 'completed' as const, label: 'Completed', icon: <Trophy className="h-4 w-4" />, count: subTabCounts.completed, activeCls: 'border-purple-500 text-purple-700',  badgeCls: 'bg-purple-100 text-purple-800' },
                  ]
                  return (
                    <div className="flex border-b border-gray-200 bg-white rounded-t-lg overflow-x-auto scrollbar-hide">
                      {tabs.map(tab => {
                        const isActive = contestSubTab === tab.key;
                        return (
                          <button
                            key={tab.key}
                            onClick={() => handleSubTabClick(tab.key)}
                            className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 px-2 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                              isActive ? tab.activeCls : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              {tab.icon}
                              <span>{tab.label}</span>
                            </div>
                            {tab.count > 0 && (
                              <span className={`text-[10px] md:text-xs px-1.5 py-0.5 rounded-full font-bold leading-none ${isActive ? tab.badgeCls : 'bg-gray-100 text-gray-500'}`}>
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
                    {tournamentOptions.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Contest Content based on sub-tab */}
                <div className="space-y-4">
                  {(() => {
                    // Completed tab uses its own dedicated state + memoised groups
                    if (contestSubTab === 'completed') {
                      if (completedLoading) {
                        return (
                          <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">Loading completed contests...</p>
                          </div>
                        )
                      }
                      if (completedContests.length === 0 && completedLoadedRef.current) {
                        return (
                          <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                            <Trophy className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-600">No completed contests yet</p>
                          </div>
                        )
                      }
                      const { pagedGroups, filteredGroups, totalPages, safePage } = completedGroups
                      return (
                        <>
                          {/* Search bar */}
                          <div className="relative mb-3">
                            <input
                              type="text"
                              placeholder="Search by team (e.g. MI, RCB...)"
                              value={completedSearchQuery}
                              onChange={e => { setCompletedSearchQuery(e.target.value); setCompletedPage(1) }}
                              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
                            {completedSearchQuery && (
                              <button onClick={() => { setCompletedSearchQuery(''); setCompletedPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                            )}
                          </div>
                          {pagedGroups.map((group: any) => {
                            const isExpanded = expandedCompletedGames.has(group.game.id)
                            const wins = group.signups.filter((s: any) => s.matchup && s.matchup.myScore !== undefined && s.matchup.myScore > s.matchup.opponentScore).length
                            const losses = group.signups.filter((s: any) => s.matchup && s.matchup.myScore !== undefined && s.matchup.myScore < s.matchup.opponentScore).length
                            return (
                              <div key={group.game.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                                <button
                                  onClick={() => setExpandedCompletedGames(prev => {
                                    const next = new Set(prev)
                                    if (next.has(group.game.id)) next.delete(group.game.id)
                                    else next.add(group.game.id)
                                    return next
                                  })}
                                  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 p-3 md:p-4 text-left"
                                >
                                  <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                                    <div className="flex items-center gap-1.5 md:gap-2 bg-white/20 px-2 md:px-3 py-1 md:py-1.5 rounded-lg">
                                      <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border border-white/60" style={{ backgroundColor: group.game.team1.color }}></div>
                                      <span className="font-bold text-xs md:text-sm text-white">{group.game.team1.shortName}</span>
                                    </div>
                                    <span className="text-white/70 text-xs md:text-sm font-bold">vs</span>
                                    <div className="flex items-center gap-1.5 md:gap-2 bg-white/20 px-2 md:px-3 py-1 md:py-1.5 rounded-lg">
                                      <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border border-white/60" style={{ backgroundColor: group.game.team2.color }}></div>
                                      <span className="font-bold text-xs md:text-sm text-white">{group.game.team2.shortName}</span>
                                    </div>
                                    <span className="text-white/60 text-xs md:text-sm ml-1">
                                      {new Date(group.game.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="text-white/60 text-xs md:text-sm">·</span>
                                    <span className="text-white/80 text-xs md:text-sm">{group.signups.length} contest{group.signups.length !== 1 ? 's' : ''}</span>
                                    {(wins > 0 || losses > 0) && (
                                      <>
                                        <span className="text-green-300 text-xs md:text-sm font-bold ml-1">{wins}W</span>
                                        <span className="text-red-300 text-xs md:text-sm font-bold">{losses}L</span>
                                      </>
                                    )}
                                    <span className="ml-auto text-white/80">
                                      {isExpanded ? <ChevronDown className="h-4 w-4 md:h-5 md:w-5" /> : <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />}
                                    </span>
                                  </div>
                                </button>
                                {isExpanded && (
                                  <div className="divide-y divide-gray-100">
                                    {group.signups.map((signup: any) => {
                                      const myScore = signup.matchup?.myScore
                                      const oppScore = signup.matchup?.opponentScore
                                      const hasScores = myScore !== undefined && oppScore !== undefined
                                      const iWon = hasScores && myScore > oppScore
                                      const iLost = hasScores && myScore < oppScore
                                      const coinVal = signup.contest.coinValue
                                      const oppName = signup.matchup?.opponentUsername ?? '\u2014'
                                      return (
                                        <div key={signup.id} className="flex items-center gap-2 md:gap-4 px-3 md:px-5 py-1.5 md:py-3">
                                          <div className={`w-1 md:w-1.5 self-stretch rounded-full shrink-0 ${iWon ? 'bg-green-400' : iLost ? 'bg-red-400' : 'bg-gray-200'}`} />
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                              <span className="text-[11px] md:text-sm font-bold text-gray-800">{coinVal}🪙</span>
                                              <span className="text-[10px] md:text-sm text-gray-400">vs @{oppName}</span>
                                              {hasScores && myScore !== oppScore && (
                                                <span className={`text-[9px] md:text-xs font-bold px-1.5 py-0.5 rounded-full ${iWon ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                  {iWon ? 'WON' : 'LOST'}
                                                </span>
                                              )}
                                            </div>
                                            {hasScores && (
                                              <div className="text-[10px] md:text-sm font-mono text-gray-500 mt-0.5">
                                                <span className={iWon ? 'text-green-700 font-bold' : iLost ? 'text-red-700' : ''}>{myScore.toFixed(1)}</span>
                                                <span className="text-gray-300 mx-1">–</span>
                                                <span className={iLost ? 'text-green-700 font-bold' : iWon ? 'text-red-700' : ''}>{oppScore.toFixed(1)}</span>
                                              </div>
                                            )}
                                            {!hasScores && <div className="text-[10px] md:text-sm text-gray-400 mt-0.5">No scores yet</div>}
                                          </div>
                                          {signup.matchup?.status === 'COMPLETED' && (
                                            <button
                                              onClick={() => router.push(`/scores/${signup.matchup?.id}?from=completed`)}
                                              className="shrink-0 bg-green-500 hover:bg-green-600 text-white px-2 md:px-4 py-1 md:py-2 rounded text-[10px] md:text-sm font-semibold transition-colors"
                                            >
                                              Scores →
                                            </button>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          {filteredGroups.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">No games found{completedSearchQuery ? ` for "${completedSearchQuery}"` : ''}</div>
                          )}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-200">
                              <button onClick={() => setCompletedPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight className="h-4 w-4 rotate-180" /> Prev
                              </button>
                              <span className="text-xs text-gray-500 font-medium">Page {safePage} of {totalPages} · {filteredGroups.length} game{filteredGroups.length !== 1 ? 's' : ''}</span>
                              <button onClick={() => setCompletedPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                Next <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </>
                      )
                    }

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
                        // Must also have a matchup — guards against stale signups where admin
                        // deleted the matchup but the signup was not cleaned up
                        (contest.contest.status === 'LIVE' || contest.contest.status === 'ACTIVE') &&
                        contest.matchup !== null
                      )
                    }

                    if (filteredContests.length === 0) {
                      return (
                        <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                          <div className="h-12 w-12 mx-auto mb-4">
                            {contestSubTab === 'upcoming' && <Clock className="h-12 w-12 text-gray-500" />}
                            {contestSubTab === 'drafted' && <Users className="h-12 w-12 text-gray-500" />}
                            {contestSubTab === 'active' && <Zap className="h-12 w-12 text-gray-500" />}
                          </div>
                          <p className="text-gray-600 mb-2">
                            {contestSubTab === 'upcoming' && 'No upcoming contests'}
                            {contestSubTab === 'drafted' && 'No drafted contests'}
                            {contestSubTab === 'active' && 'No active contests'}
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

                    // Sort upcoming/active/drafted by game date
                    return filteredContests
                      .sort((a, b) => {
                        // Sort by game date for better organization
                        const dateA = new Date(a.contest.iplGame.gameDate)
                        const dateB = new Date(b.contest.iplGame.gameDate)
                        return dateA.getTime() - dateB.getTime() // Earliest first for upcoming/active
                      })
                      .map((signup) => (
                    <div key={`${signup.id}-${signup.matchup?.id ?? 'none'}`} className="bg-white rounded-lg shadow border border-gray-200 p-3 md:p-5">
                      {/* Compact Header with Team Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 md:py-2 bg-gray-100 rounded-lg">
                            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: signup.contest.iplGame.team1.color }}></div>
                            <span className="font-bold text-sm md:text-base text-gray-900">{signup.contest.iplGame.team1.shortName}</span>
                          </div>
                          <span className="text-gray-500 text-xs md:text-sm font-bold">vs</span>
                          <div className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 md:py-2 bg-gray-100 rounded-lg">
                            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: signup.contest.iplGame.team2.color }}></div>
                            <span className="font-bold text-sm md:text-base text-gray-900">{signup.contest.iplGame.team2.shortName}</span>
                          </div>
                          {/* Contest type + coin inline on mobile */}
                          <span className="text-xs text-gray-500 ml-1 hidden xs:inline">
                            {contestLabel(signup.contest.contestType, signup.contest.coinValue, true)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 xs:hidden">
                            {contestLabel(signup.contest.contestType, signup.contest.coinValue, true)}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            signup.contest.iplGame.status === 'LIVE' ? 'bg-red-100 text-red-700' :
                            signup.contest.iplGame.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {signup.contest.iplGame.status}
                          </span>
                        </div>
                      </div>

                      {/* Contest Info — single compact line */}
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2 px-1">
                        <span className="font-medium text-gray-700">
                          {contestLabel(signup.contest.contestType, signup.contest.coinValue)}
                          <span className="text-gray-400 font-normal"> · {signup.contest.coinValue} coins/pt</span>
                        </span>
                        <span>
                          {new Date(signup.contest.iplGame.gameDate).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short'
                          })}
                        </span>
                      </div>

                      {/* Status - Only show for upcoming/drafted tabs, not active/completed */}
                      {contestSubTab !== 'active' && (
                        <div className={`rounded px-2 py-1.5 mb-2 text-xs font-medium ${
                          signup.matchup 
                            ? signup.matchup.status === 'DRAFTING' 
                              ? 'bg-blue-50 border border-blue-200 text-blue-800' 
                              : 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                        }`}>
                          {signup.matchup ? (
                            signup.matchup.status === 'DRAFTING' ? (
                              <>✍️ Drafting vs {signup.matchup.opponentUsername ?? signup.matchup.opponent?.name ?? 'opponent'}</>
                            ) : signup.matchup.status === 'COMPLETED' ? (
                              <>✅ Draft Complete — Ready for game</>
                            ) : (
                              <>⏳ Matched with {signup.matchup.opponentUsername ?? signup.matchup.opponent?.name ?? 'opponent'} — Draft starting soon</>
                            )
                          ) : (
                            <>⏳ Waiting for matchup assignment</>
                          )}
                        </div>
                      )}

                      {/* Scores - Only show for active/completed tabs, not drafted (no live stats yet) */}
                      {contestSubTab !== 'drafted' && signup.matchup?.status === 'COMPLETED' && signup.matchup.myScore !== undefined && (
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
                              <div className="text-xs text-gray-600 mb-1">{signup.matchup.opponentUsername ?? signup.matchup.opponent?.name ?? 'Opponent'}</div>
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
                              onClick={async () => {
                                setSelectedDraftedContest(signup)
                                setShowDraftedTeamsModal(true)
                                setDraftedTeamPicks([])
                                setLoadingDraftedPicks(true)
                                try {
                                  const res = await fetch(`/api/draft/${signup.matchup?.id}/poll`)
                                  if (res.ok) {
                                    const data = await res.json()
                                    setDraftedTeamPicks(data.draftPicks ?? [])
                                  }
                                } catch {}
                                finally { setLoadingDraftedPicks(false) }
                              }}
                              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white px-3 md:px-5 py-1.5 md:py-2.5 rounded text-xs md:text-sm font-medium transition-colors"
                            >
                              View Drafted Teams
                            </button>
                          ) : (
                            <button 
                              onClick={() => router.push(`/scores/${signup.matchup?.id}?from=${contestSubTab}`)}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 md:px-5 py-1.5 md:py-2.5 rounded text-xs md:text-sm font-medium transition-colors"
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
                            onClick={() => router.push(`/draft/${signup.matchup?.id}`)}
                            className={`flex-1 px-3 md:px-5 py-1.5 md:py-2.5 rounded text-xs md:text-sm font-medium transition-colors ${
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
                          new Date() > new Date(signup.contest.iplGame.signupDeadline) ? (
                            <span className="flex-1 text-center text-xs text-gray-400 font-medium py-1.5">
                              🔒 Deadline Passed
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleLeaveContest(signup.id)}
                              disabled={leavingContest === signup.id}
                              className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-3 md:px-5 py-1.5 md:py-2.5 rounded text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {leavingContest === signup.id ? 'Leaving...' : 'Leave Contest'}
                            </button>
                          )
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
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-lg shrink-0">
                            <div className="w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: group.game.team1.color }}></div>
                            <span className="font-bold text-sm text-white">{group.game.team1.shortName}</span>
                          </div>
                          <span className="text-white font-bold text-xs shrink-0">vs</span>
                          <div className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-lg shrink-0">
                            <div className="w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: group.game.team2.color }}></div>
                            <span className="font-bold text-sm text-white">{group.game.team2.shortName}</span>
                          </div>
                          <span className="hidden sm:inline text-white/70 text-xs shrink-0">
                            {new Date(group.game.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="hidden sm:inline text-white/60 text-xs min-w-0 truncate">
                            {group.contests.length} contest{group.contests.length !== 1 ? 's' : ''} · {totalMatchups} matchup{totalMatchups !== 1 ? 's' : ''}
                          </span>
                          <span className="sm:hidden text-white/60 text-xs min-w-0 truncate">
                            {totalMatchups} matchup{totalMatchups !== 1 ? 's' : ''}
                          </span>
                          <span className="ml-auto text-white/80 shrink-0">
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
                                {contestLabel(contest.contestType, contest.coinValue)}
                              </span>
                              <span className="text-xs text-gray-500">{contest.coinValue} coins/pt</span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-500">{contest.matchups.length} matchup{contest.matchups.length !== 1 ? 's' : ''}</span>
                            </div>

                            {/* Matchup rows */}
                            {contest.matchups.length === 0 ? (
                              <div className="text-xs text-gray-400 italic py-1">No completed drafts yet</div>
                            ) : (
                              <div className="space-y-2">
                                {contest.matchups.map((matchup: any) => {
                                  const hasScores = matchup.user1Score > 0 || matchup.user2Score > 0
                                  const u1Wins = matchup.user1Score > matchup.user2Score
                                  const u2Wins = matchup.user2Score > matchup.user1Score
                                  return (
                                    <div key={matchup.id} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1.5">
                                      {/* Names + scores row */}
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {/* User 1 (right-aligned) */}
                                        <div className={`min-w-0 flex-1 text-right ${u1Wins && hasScores ? 'font-bold' : ''}`}>
                                          <div className="text-xs sm:text-sm text-gray-900 truncate">{matchup.user1.user.name}</div>
                                          <div className="text-[10px] sm:text-xs text-gray-500 truncate">@{matchup.user1.user.username}</div>
                                        </div>
                                        {/* Scores */}
                                        <div className="flex items-center gap-0.5 shrink-0 px-1">
                                          <span className={`text-xs sm:text-sm font-black w-10 sm:w-14 text-right tabular-nums ${u1Wins && hasScores ? 'text-green-700' : 'text-gray-700'}`}>
                                            {hasScores ? matchup.user1Score.toFixed(1) : '–'}
                                          </span>
                                          <span className="text-gray-400 font-bold text-[10px] px-0.5">vs</span>
                                          <span className={`text-xs sm:text-sm font-black w-10 sm:w-14 tabular-nums ${u2Wins && hasScores ? 'text-green-700' : 'text-gray-700'}`}>
                                            {hasScores ? matchup.user2Score.toFixed(1) : '–'}
                                          </span>
                                        </div>
                                        {/* User 2 (left-aligned) */}
                                        <div className={`min-w-0 flex-1 ${u2Wins && hasScores ? 'font-bold' : ''}`}>
                                          <div className="text-xs sm:text-sm text-gray-900 truncate">{matchup.user2.user.name}</div>
                                          <div className="text-[10px] sm:text-xs text-gray-500 truncate">@{matchup.user2.user.username}</div>
                                        </div>
                                      </div>
                                      {/* Watch button — always on its own row so it's never clipped */}
                                      <div className="flex justify-end">
                                        <button
                                          onClick={() => router.push(`/scores/${matchup.id}?from=spectate`)}
                                          className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold px-4 py-1 rounded-lg transition-colors"
                                        >
                                          👁 Watch
                                        </button>
                                      </div>
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

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mt-6 px-4 py-3 md:p-6">
          <h3 className="text-sm md:text-lg font-bold text-primary-800 mb-3 md:mb-4">Quick Links</h3>
          {/* Mobile: compact icon pills in a row | Desktop: original large cards */}
          <div className="flex gap-2 md:hidden">
            <a href="/how-to-play" className="flex-1 flex flex-col items-center gap-1 py-2.5 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors">
              <Target className="h-5 w-5 text-green-600" />
              <span className="text-[11px] font-semibold text-green-800 text-center leading-tight">How to Play</span>
            </a>
            <a href="/rules" className="flex-1 flex flex-col items-center gap-1 py-2.5 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
              <Settings className="h-5 w-5 text-blue-600" />
              <span className="text-[11px] font-semibold text-blue-800 text-center leading-tight">Rules</span>
            </a>
            <a href="/scoring" className="flex-1 flex flex-col items-center gap-1 py-2.5 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors">
              <Zap className="h-5 w-5 text-orange-600" />
              <span className="text-[11px] font-semibold text-orange-800 text-center leading-tight">Scoring</span>
            </a>
          </div>
          <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-2 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Drafted Teams
                </h3>
                <p className="text-[10px] text-indigo-100 mt-0.5">
                  {selectedDraftedContest.contest.iplGame.title ?? selectedDraftedContest.contest.iplGame.id} • {selectedDraftedContest.contest.contestType?.replace('_', ' ') ?? ''}
                </p>
              </div>
              <button
                onClick={() => { setShowDraftedTeamsModal(false); setSelectedDraftedContest(null) }}
                className="text-white hover:text-indigo-100 text-2xl font-bold leading-none"
              >×</button>
            </div>

            {/* Body — comparison table */}
            <div className="overflow-y-auto">
              {loadingDraftedPicks ? (
                <div className="flex items-center justify-center h-24 text-xs text-gray-400">Loading picks...</div>
              ) : (() => {
                const myPicks = draftedTeamPicks
                  .filter(p => p.pickedByUserId === selectedDraftedContest.id)
                  .sort((a: any, b: any) => a.pickOrder - b.pickOrder)
                const oppPicks = draftedTeamPicks
                  .filter(p => p.pickedByUserId !== selectedDraftedContest.id)
                  .sort((a: any, b: any) => a.pickOrder - b.pickOrder)

                if (myPicks.length === 0 && oppPicks.length === 0) {
                  return <div className="flex items-center justify-center h-24 text-xs text-gray-400 italic">No picks yet</div>
                }

                const maxLen = Math.max(myPicks.length, oppPicks.length)
                const rows = Array.from({ length: maxLen }, (_, i) => ({ my: myPicks[i], opp: oppPicks[i], num: i + 1 }))
                const starterRows = rows.slice(0, 5)
                const benchRows = rows.slice(5)

                const renderCell = (pick: typeof myPicks[0] | undefined) =>
                  pick ? (
                    <div className="flex-1 min-w-0 px-1.5">
                      <div className="text-[11px] font-semibold text-gray-900 truncate leading-tight">{pick.player.name}</div>
                      <div className="text-[9px] text-gray-400 leading-none">{pick.player.role.replace('_', ' ')}</div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 px-1.5 text-[10px] text-gray-300 italic">—</div>
                  )

                return (
                  <>
                    {/* Column headers */}
                    <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                      <div className="w-6 shrink-0" />
                      <div className="flex-1 text-[9px] font-bold text-blue-600 uppercase tracking-wide px-1.5">👤 Your Team</div>
                      <div className="w-px self-stretch bg-gray-300 shrink-0" />
                      <div className="flex-1 text-[9px] font-bold text-purple-600 uppercase tracking-wide px-1.5">🎯 {selectedDraftedContest.matchup!.opponentUsername || 'Opponent'}</div>
                    </div>

                    {/* Starting 5 */}
                    <div className="px-2 py-1 text-[9px] font-bold text-amber-700 bg-amber-50 border-b border-amber-100">⭐ Starting 5</div>
                    {starterRows.map(({ my, opp, num }) => (
                      <div key={num} className="flex items-center gap-1 px-2 py-2 border-b border-gray-100">
                        <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0">{num}</div>
                        {renderCell(my)}
                        <div className="w-px self-stretch bg-gray-200 shrink-0" />
                        {renderCell(opp)}
                      </div>
                    ))}

                    {/* Bench */}
                    {benchRows.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[9px] font-bold text-gray-600 bg-gray-100 border-b border-gray-200">🪑 Bench</div>
                        {benchRows.map(({ my, opp, num }) => (
                          <div key={num} className="flex items-center gap-1 px-2 py-2 border-b border-gray-100">
                            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0">{num}</div>
                            {renderCell(my)}
                            <div className="w-px self-stretch bg-gray-200 shrink-0" />
                            {renderCell(opp)}
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center shrink-0">
              <span className="text-xs text-gray-500">{selectedDraftedContest.matchup!.draftPicksCount} picks total</span>
              <button
                onClick={() => { setShowDraftedTeamsModal(false); setSelectedDraftedContest(null) }}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition text-xs font-medium"
              >Close</button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Refresh Button */}
      {user && (
        <button
          onClick={handleDashRefresh}
          disabled={isDashRefreshing}
          className="fixed bottom-6 right-4 z-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-70 text-white font-semibold px-5 py-3 rounded-full shadow-2xl transition-all"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className={`h-5 w-5 ${isDashRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm">{isDashRefreshing ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      )}
    </div>
  )
}