'use client';

import { useState, useEffect, use, useRef } from 'react';
import { ArrowLeft, Users, Trophy, Clock, Target, Coins } from 'lucide-react';
import { useLoading } from '@/contexts/LoadingContext';
import { parseFirstPickUser, getEffectivePickSlots } from '@/lib/draftUtils';

interface Player {
  id: string;
  name: string;
  role: string;
  iplTeam: {
    id: string;
    name: string;
    shortName: string;
    color: string;
  };
  stats?: {
    points: number;
    runs: number;
    wickets: number;
    catches: number;
  }[];
}

interface DraftPick {
  id: string;
  pickOrder: number;
  player: Player;
  pickedByUserId: string;
}

interface User {
  id: string;
  name: string;
  username: string;
}

interface Matchup {
  id: string;
  status: string;
  firstPickUser: string;
  user1: {
    id: string;
    user: User;
  };
  user2: {
    id: string;
    user: User;
  };
  contest: {
    id: string;
    contestType: string;
    coinValue: number;
    status: string;
    iplGame: {
      id: string;
      title: string;
      gameDate: string;
      signupDeadline: string;
      team1: {
        id: string;
        name: string;
        shortName: string;
        color: string;
      };
      team2: {
        id: string;
        name: string;
        shortName: string;
        color: string;
      };
    };
  };
  draftPicks: DraftPick[];
}

export default function DraftPage({ params }: { params: Promise<{ matchupId: string }> }) {
  const { matchupId } = use(params);
  const { setLoading: setGlobalLoading } = useLoading();
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [makingPick, setMakingPick] = useState(false);
  const [waivingBench, setWaivingBench] = useState(false);
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchName, setSearchName] = useState<string>('');
  const [playerStats, setPlayerStats] = useState<Record<string, number>>({});
  const [playerStatsMap, setPlayerStatsMap] = useState<Record<string, { points: number; runs: number; wickets: number; catches: number }>>({});
  const [isDraftingPhase, setIsDraftingPhase] = useState(false);
  const [playerGrades, setPlayerGrades] = useState<Record<string, { grade: string; weightedScore: number; matchesPlayed: number; matchesAppeared: number; recentMatches: { gameId: string; points: number; didNotPlay?: boolean; opponent: string; date: string }[] }>>({});
  const [showGrades, setShowGrades] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [statsModalPlayer, setStatsModalPlayer] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  
  // Toss states
  const [showToss, setShowToss] = useState(false);
  const [tossPhase, setTossPhase] = useState<'calling' | 'flipping' | 'result' | 'complete'>('calling');
  const [callingUser, setCallingUser] = useState<string | null>(null);
  const [userCall, setUserCall] = useState<'HEADS' | 'TAILS' | null>(null);
  const [coinResult, setCoinResult] = useState<'HEADS' | 'TAILS' | null>(null);
  const [tossWinner, setTossWinner] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  
  // Ref to store polling interval for toss result
  const tossPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Ref so the poll callback can always read the latest isMyTurn without being in its dep array
  const isMyTurnRef = useRef(false);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    fetchMatchupDetails(true);
  }, [matchupId]);

  // Check if we need to show the toss, or auto-dismiss it when the result arrives
  useEffect(() => {
    if (!matchup || !currentUser) return;

    // Toss hasn't happened yet — show toss UI
    if (matchup.status === 'DRAFTING' && !matchup.firstPickUser && tossPhase !== 'complete') {
      initiateToss();
      return;
    }

    // Toss result just came in via the main poll while waiting user is still on the "calling" screen
    if (matchup.firstPickUser && showToss && tossPhase === 'calling') {
      // Stop the dedicated toss poll — main poll already caught it
      if (tossPollingIntervalRef.current) {
        clearInterval(tossPollingIntervalRef.current);
        tossPollingIntervalRef.current = null;
      }
      // Show the result to the waiting user before closing
      const winnerUserId = matchup.firstPickUser === 'user1'
        ? matchup.user1.user.id
        : matchup.user2.user.id;
      setTossWinner(winnerUserId);
      setTossPhase('result');
      setTimeout(() => {
        setShowToss(false);
        setTossPhase('complete');
      }, 4000);
    }
  }, [matchup, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time polling for turn updates
  useEffect(() => {
    if (!matchup || !currentUser || matchup.draftPicks.length >= 14) return;

    const pollInterval = setInterval(() => {
      // Skip the DB hit entirely when it is our own turn — nothing to wait for
      if (!isMyTurnRef.current) fetchMatchupDetails();
    }, 6000); // Poll every 6 seconds; paused on own turn so effective server load halves again

    return () => clearInterval(pollInterval);
  }, [matchup, currentUser]);

  // Cleanup toss polling on unmount
  useEffect(() => {
    return () => {
      if (tossPollingIntervalRef.current) {
        clearInterval(tossPollingIntervalRef.current);
        tossPollingIntervalRef.current = null;
      }
    };
  }, []);

  const checkDraftAccess = () => {
    if (!matchup) return false;
    
    const matchupStatus = matchup.status;
    const contestStatus = matchup.contest.status;

    // Always allow if matchup is DRAFTING or COMPLETED
    if (matchupStatus === 'DRAFTING' || matchupStatus === 'COMPLETED') {
      return true;
    }

    // Allow WAITING_DRAFT matchups when the deadline has passed AND contest is
    // in a draftable state (covers custom matchups on SIGNUP_CLOSED contests)
    const signupDeadline = new Date(matchup.contest.iplGame.signupDeadline);
    const now = new Date();
    const isPastSignupDeadline = now > signupDeadline;
    const isDraftableContest =
      contestStatus === 'DRAFT_PHASE' ||
      contestStatus === 'SIGNUP_CLOSED';

    return isPastSignupDeadline && isDraftableContest;
  };

  const fetchMatchupDetails = async (autoFetchGrades = false) => {
    try {
      const response = await fetch(`/api/draft/${matchupId}`);
      if (response.ok) {
        const data = await response.json();
        setMatchup(data.matchup);
        setAvailablePlayers(data.availablePlayers);
        if (autoFetchGrades && data.matchup?.contest?.iplGame?.id) {
          const iplGameId = data.matchup.contest.iplGame.id;
          // Kick off stats fetch in background — cached at edge, only hits DB once per game
          fetch(`/api/draft/stats/${iplGameId}`)
            .then(r => r.json())
            .then((statsMap: Record<string, { points: number; runs: number; wickets: number; catches: number }>) => {
              setPlayerStatsMap(statsMap);
            })
            .catch(() => {/* silently fail */});
        }
      }
    } catch (error) {
      console.error('Error fetching matchup:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerGrades = async () => {
    if (!matchup?.contest?.iplGame?.id) return;
    
    setLoadingGrades(true);
    try {
      const response = await fetch(`/api/grades/calculate?iplGameId=${matchup.contest.iplGame.id}`);
      if (response.ok) {
        const data = await response.json();
        // Convert grades array to object keyed by playerId
        const gradesMap: Record<string, { grade: string; weightedScore: number; matchesPlayed: number; matchesAppeared: number; recentMatches: { gameId: string; points: number; didNotPlay?: boolean; opponent: string; date: string }[] }> = {};
        data.grades.forEach((g: any) => {
          gradesMap[g.playerId] = {
            grade: g.grade,
            weightedScore: g.weightedScore,
            matchesPlayed: g.matchesPlayed,
            matchesAppeared: g.matchesAppeared ?? g.matchesPlayed,
            recentMatches: g.recentMatches || []
          };
        });
        setPlayerGrades(gradesMap);
        setShowGrades(true);
      } else {
        console.error('Failed to fetch grades');
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setLoadingGrades(false);
    }
  };

  const getAvgPtsStyle = (score: number) => {
    if (score >= 60) return { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' };
    if (score >= 45) return { bg: 'bg-yellow-400', text: 'text-gray-900', border: 'border-yellow-500' };
    if (score >= 30) return { bg: 'bg-orange-400', text: 'text-white', border: 'border-orange-500' };
    return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' };
  };

  const handleDraftPick = async () => {
    if (!selectedPlayer || !currentUser) return;

    setMakingPick(true);
    setGlobalLoading(true, 'Making draft pick...');
    try {
      const response = await fetch(`/api/draft/${matchupId}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer,
          userId: currentUser.id
        })
      });

      if (response.ok) {
        setSelectedPlayer(null);
        await fetchMatchupDetails();
        setGlobalLoading(false);
      } else {
        const error = await response.json();
        setGlobalLoading(false);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error making pick:', error);
      setGlobalLoading(false);
      alert('Failed to make pick. Please try again.');
    } finally {
      setMakingPick(false);
    }
  };

  const initiateToss = async () => {
    if (!matchup || !currentUser) return;
    
    // Don't initiate if toss is already in progress, complete, or if firstPickUser is already set
    if (showToss || tossPhase === 'complete' || matchup.firstPickUser) {
      console.log('⚠️ Toss already initiated, complete, or firstPickUser already set, skipping...');
      return;
    }
    
    console.log('🎲 Initiating toss...');
    
    // Fetch the designated caller from the server (to ensure both users see the same caller)
    try {
      const response = await fetch(`/api/draft/${matchupId}/toss-caller`);
      if (response.ok) {
        const data = await response.json();
        setCallingUser(data.callingUserId);
        setShowToss(true);
        setTossPhase('calling');
        
        console.log(`📞 Calling user: ${data.callingUserName} (${data.callingUserId})`);
        console.log(`👤 Current user: ${currentUser.name} (${currentUser.id})`);
        
        // If this user is not the caller, start polling for toss result
        if (data.callingUserId !== currentUser.id) {
          console.log('⏳ This user is NOT calling - starting poll for result...');
          startPollingForTossResult();
        } else {
          console.log('📲 This user IS calling - waiting for their input...');
        }
      }
    } catch (error) {
      console.error('Error fetching toss caller:', error);
    }
  };

  const startPollingForTossResult = () => {
    console.log('🔄 Non-calling user: Starting to poll for toss result...');
    
    // Clear any existing interval
    if (tossPollingIntervalRef.current) {
      clearInterval(tossPollingIntervalRef.current);
    }
    
    tossPollingIntervalRef.current = setInterval(async () => {
      try {
        console.log('🔍 Polling for toss result...');
        const response = await fetch(`/api/draft/${matchupId}`);
        if (response.ok) {
          const data = await response.json();
          // Check if firstPickUser has been set (toss completed)
          if (data.matchup && data.matchup.firstPickUser) {
            console.log('✅ Toss result found! Winner picks first:', data.matchup.firstPickUser);
            
            // Clear the polling interval
            if (tossPollingIntervalRef.current) {
              clearInterval(tossPollingIntervalRef.current);
              tossPollingIntervalRef.current = null;
            }
            
            // Show the result to the waiting user before closing
            const winnerUserId = data.matchup.firstPickUser === 'user1'
              ? data.matchup.user1.user.id
              : data.matchup.user2.user.id;
            setTossWinner(winnerUserId);
            setTossPhase('result');

            // Update matchup data
            await fetchMatchupDetails();
            
            // Auto-dismiss after showing result
            setTimeout(() => {
              setShowToss(false);
              setTossPhase('complete');
            }, 4000);
          }
        }
      } catch (error) {
        console.error('Error polling for toss result:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Clean up after 120 seconds
    setTimeout(() => {
      if (tossPollingIntervalRef.current) {
        console.log('⏱️ Polling timeout - stopping after 120 seconds');
        clearInterval(tossPollingIntervalRef.current);
        tossPollingIntervalRef.current = null;
      }
    }, 120000);
  };

  const handleTossCall = async (call: 'HEADS' | 'TAILS') => {
    setUserCall(call);
    setTossPhase('flipping');
    setIsFlipping(true);

    // Simulate coin flip animation (3 seconds)
    setTimeout(async () => {
      // Generate random result
      const result: 'HEADS' | 'TAILS' = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
      setCoinResult(result);
      setIsFlipping(false);
      
      // Determine winner
      const won = call === result;
      const winnerId = won ? callingUser : (callingUser === matchup!.user1.user.id ? matchup!.user2.user.id : matchup!.user1.user.id);
      setTossWinner(winnerId);
      setTossPhase('result');

      // Send result to backend to update firstPickUser
      try {
        const firstPickUserValue = winnerId === matchup!.user1.user.id ? 'user1' : 'user2';
        
        const response = await fetch(`/api/draft/${matchupId}/toss`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstPickUser: firstPickUserValue,
            tossWinner: winnerId
          })
        });

        if (response.ok) {
          // Refresh matchup data
          await fetchMatchupDetails();
          
          // Auto-close toss modal after showing result
          setTimeout(() => {
            setShowToss(false);
            setTossPhase('complete');
          }, 4000);
        }
      } catch (error) {
        console.error('Error saving toss result:', error);
      }
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading draft...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Please login to access draft</div>
          <a href="/login" className="text-primary-600 underline">Go to Login</a>
        </div>
      </div>
    );
  }

  if (!matchup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Matchup not found</div>
          <a href="/dashboard" className="text-primary-600 underline">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  const isUser1 = matchup.user1.user.id === currentUser.id;
  const isUser2 = matchup.user2.user.id === currentUser.id;
  
  if (!isUser1 && !isUser2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">You are not part of this matchup</div>
          <div className="text-sm text-gray-600 mb-4">
            Your ID: {currentUser.id}<br/>
            User 1: {matchup.user1.user.username} ({matchup.user1.user.id})<br/>
            User 2: {matchup.user2.user.username} ({matchup.user2.user.id})
          </div>
          <a href="/dashboard" className="text-primary-600 underline">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  // Check if draft is accessible
  if (!checkDraftAccess()) {
    const signupDeadline = new Date(matchup.contest.iplGame.signupDeadline);
    const gameDate = new Date(matchup.contest.iplGame.gameDate);
    const now = new Date();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-xl text-orange-600 mb-4">🚫 Draft Not Available Yet</div>
          <div className="text-gray-700 mb-4">
            <p className="mb-2">The draft will be available after the signup deadline.</p>
            <p className="text-sm">Signup Deadline: {signupDeadline.toLocaleDateString()} at {signupDeadline.toLocaleTimeString()}</p>
            <p className="text-sm">Game Date: {gameDate.toLocaleDateString()} at {gameDate.toLocaleTimeString()}</p>
          </div>
          {now < signupDeadline && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-blue-800 text-sm">⏳ Please wait until after the signup deadline to access the draft.</p>
            </div>
          )}
          <a href="/dashboard" className="inline-block bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition-colors">Go to Dashboard</a>
        </div>
      </div>
    );
  }
  const mySignupId = isUser1 ? matchup.user1.id : matchup.user2.id;
  const opponentSignupId = isUser1 ? matchup.user2.id : matchup.user1.id;
  const opponent = isUser1 ? matchup.user2.user : matchup.user1.user;

  const myPicks = matchup.draftPicks.filter(p => p.pickedByUserId === mySignupId);
  const opponentPicks = matchup.draftPicks.filter(p => p.pickedByUserId === opponentSignupId);

  // Calculate total points for each team
  const myTotalPoints = myPicks.reduce((sum, pick) => {
    const playerPoints = playerStatsMap[pick.player.id]?.points ?? 0;
    return sum + playerPoints;
  }, 0);
  
  const opponentTotalPoints = opponentPicks.reduce((sum, pick) => {
    const playerPoints = playerStatsMap[pick.player.id]?.points ?? 0;
    return sum + playerPoints;
  }, 0);

  const currentPickOrder = matchup.draftPicks.length + 1;

  // Parse bench waiver state from firstPickUser encoding
  const { user1WaivedBench, user2WaivedBench, user1HalfWaived, user2HalfWaived } = parseFirstPickUser(matchup.firstPickUser);
  const myWaivedBench       = isUser1 ? user1WaivedBench : user2WaivedBench;  // 0 bench
  const opponentWaivedBench = isUser1 ? user2WaivedBench : user1WaivedBench;
  const myHalfWaived        = isUser1 ? user1HalfWaived  : user2HalfWaived;   // 1 bench
  const opponentHalfWaived  = isUser1 ? user2HalfWaived  : user1HalfWaived;
  const myEndedDraft        = myWaivedBench || myHalfWaived;
  const opponentEndedDraft  = opponentWaivedBench || opponentHalfWaived;

  // Effective pick sequence (waived bench slots removed)
  const effectiveSlots = getEffectivePickSlots(matchup.firstPickUser, matchup.user1.id, matchup.user2.id);
  const isMyTurn = effectiveSlots.length > 0 && currentPickOrder <= effectiveSlots.length && effectiveSlots[currentPickOrder - 1] === mySignupId;
  isMyTurnRef.current = isMyTurn; // keep ref in sync so poll interval can read it without re-subscribing
  const isDraftComplete = matchup.status === 'COMPLETED' || (effectiveSlots.length > 0 && matchup.draftPicks.length >= effectiveSlots.length);

  const handleWaiveBench = async () => {
    const confirmMsg = myPicks.length >= 6
      ? 'End your draft now?\n\nYou already have 1 bench sub — your final bench slot will be skipped.'
      : 'End your draft now?\n\nYour team will have only your 5 starters — no bench substitutes. If a starter is DNP, they score 0.';
    if (!confirm(confirmMsg)) return;
    setWaivingBench(true);
    try {
      const res = await fetch(`/api/draft/${matchupId}/waive-bench`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (res.ok) {
        await fetchMatchupDetails();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch {
      alert('Failed to skip bench picks. Please try again.');
    } finally {
      setWaivingBench(false);
    }
  };

  const sortedMyPicks = myPicks.slice().sort((a, b) => a.pickOrder - b.pickOrder);
  const sortedOppPicks = opponentPicks.slice().sort((a, b) => a.pickOrder - b.pickOrder);
  const roleAbbr = (role: string) =>
    role === 'ALL_ROUNDER' ? 'AR' :
    role === 'WICKET_KEEPER' ? 'WK' :
    role === 'BATSMAN' ? 'BAT' : 'BWL';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Toss Modal — hidden for the waiting user during 'calling' phase; shown for caller + flipping + result */}
      {showToss && !(tossPhase === 'calling' && callingUser !== currentUser.id) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border-4 border-cricket-600">
            {tossPhase === 'calling' && (
              <div className="text-center">
                <div className="mb-6">
                  <Coins className="h-20 w-20 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">🏏 Toss Time!</h2>
                  <p className="text-gray-600">
                    {callingUser === currentUser.id ? (
                      <span className="font-bold text-cricket-700">You get to call the toss!</span>
                    ) : (
                      <span>Waiting for <span className="font-bold">{callingUser === matchup?.user1.user.id ? matchup.user1.user.name : matchup?.user2.user.name}</span> to call...</span>
                    )}
                  </p>
                </div>
                
                {callingUser === currentUser.id && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700 mb-4">Choose heads or tails:</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleTossCall('HEADS')}
                        className="bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-bold py-6 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all border-2 border-yellow-700"
                      >
                        <div className="text-3xl mb-2">🪙</div>
                        <div className="text-lg">HEADS</div>
                      </button>
                      <button
                        onClick={() => handleTossCall('TAILS')}
                        className="bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white font-bold py-6 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all border-2 border-orange-700"
                      >
                        <div className="text-3xl mb-2">🪙</div>
                        <div className="text-lg">TAILS</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {tossPhase === 'flipping' && (
              <div className="text-center">
                <div className={`mb-6 ${isFlipping ? 'animate-spin' : ''}`}>
                  <Coins className="h-24 w-24 text-yellow-500 mx-auto" style={{ animationDuration: '0.3s' }} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Flipping the coin...</h2>
                <p className="text-gray-600">
                  Called: <span className="font-bold text-cricket-700">{userCall}</span>
                </p>
              </div>
            )}
            
            {tossPhase === 'result' && (
              <div className="text-center">
                <div className="mb-6">
                  <div className={`inline-block p-6 rounded-full mb-4 ${coinResult === 'HEADS' ? 'bg-yellow-100' : 'bg-orange-100'}`}>
                    <Coins className={`h-20 w-20 ${coinResult === 'HEADS' ? 'text-yellow-600' : 'text-orange-600'}`} />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    It's {coinResult}!
                  </h2>
                  <div className="mt-4 p-4 bg-cricket-50 rounded-lg border-2 border-cricket-200">
                    <p className="text-lg font-bold text-cricket-800">
                      {tossWinner === currentUser.id ? (
                        <>🎉 You won the toss! You pick first!</>
                      ) : (
                        <>{opponent.name} won the toss. They pick first.</>
                      )}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">Starting draft in a moment...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b-4 border-cricket-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <a
                href="/dashboard"
                className="flex items-center gap-1.5 text-black hover:text-cricket-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold text-sm sm:text-base">Back to Dashboard</span>
              </a>
              <div className="w-px h-6 sm:h-8 bg-black/30"></div>
              <div>
                <h1 className="text-base sm:text-xl md:text-2xl font-bold text-black">🏏 Snake Draft</h1>
                <div className="text-gray-800 text-xs mt-0.5 truncate max-w-[180px] sm:max-w-none">{matchup.contest.iplGame.title}</div>
                <div className="flex items-center gap-1.5 mt-0.5 md:hidden">
                  <span className="bg-secondary-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded">
                    {matchup.contest.coinValue}🪙
                  </span>
                  <span className="text-[10px] font-semibold text-gray-600">
                    {matchup.contest.contestType === 'HIGH_ROLLER' ? 'High Roller' :
                     matchup.contest.contestType === 'REGULAR' ? 'Regular' :
                     matchup.contest.contestType === 'LOW_STAKES' ? 'Low Stakes' :
                     matchup.contest.contestType}
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1">
              <div className="bg-gradient-to-r from-secondary-500 to-orange-600 px-4 py-2 rounded-lg shadow-md border border-black/30">
                <div className="text-primary-800 text-xs font-semibold uppercase tracking-wider">Contest Type</div>
                <div className="text-primary-800 font-black text-lg">{matchup.contest.coinValue} COINS</div>
              </div>
              <div className="text-black text-xs font-medium">Head-to-Head</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Matchup Info */}
        <div className="bg-white rounded-lg shadow border border-gray-200 px-3 py-2 sm:p-3 mb-3 sm:mb-4">
          <div className="flex items-center justify-between gap-2 sm:grid sm:grid-cols-3 sm:gap-3">
            <div className="flex-1 text-center py-1.5 px-2 sm:p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <div className="text-[10px] sm:text-xs font-semibold text-black uppercase tracking-wide mb-0.5 sm:mb-1">You</div>
              <div className="text-sm sm:text-lg font-bold text-black truncate">{currentUser.name}</div>
              <div className="text-[10px] sm:text-xs text-black truncate">@{currentUser.username}</div>
            </div>
            <div className="text-center flex items-center justify-center shrink-0 px-1">
              <div className="text-lg sm:text-2xl font-bold text-secondary-400">VS</div>
            </div>
            <div className="flex-1 text-center py-1.5 px-2 sm:p-3 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg">
              <div className="text-[10px] sm:text-xs font-semibold text-black uppercase tracking-wide mb-0.5 sm:mb-1">Opponent</div>
              <div className="text-sm sm:text-lg font-bold text-black truncate">{opponent.name}</div>
              <div className="text-[10px] sm:text-xs text-black truncate">@{opponent.username}</div>
            </div>
          </div>
        </div>

        {/* How To Play Section */}
        <div className="bg-white rounded-lg shadow border border-gray-200 mb-4">
          <div 
            onClick={() => setShowHowToPlay(!showHowToPlay)}
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg"
          >
            <h3 className="text-lg font-bold text-primary-800 flex items-center gap-2">
              📚 Draft FAQs
            </h3>
            <div className="text-gray-500 text-sm">
              {showHowToPlay ? '▲' : '▼'}
            </div>
          </div>
          
          {showHowToPlay && (
            <div className="space-y-4 text-gray-700 p-3 border-t border-gray-200">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">🪙 1. Toss Phase</h4>
                  <ul className="text-sm space-y-1 text-blue-700">
                    <li>• One player gets to call the toss (Heads or Tails)</li>
                    <li>• Winner of the toss picks first in the draft</li>
                    <li>• Toss happens automatically before draft begins</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">🔄 2. Snake Draft</h4>
                  <ul className="text-sm space-y-1 text-green-700">
                    <li>• Each player drafts 7 players total: 5 main players + 2 substitutes</li>
                    <li>• First picker gets picks: 1st, 4th, 5th, 8th, 9th, 12th, 13th</li>
                    <li>• Second picker gets picks: 2nd, 3rd, 6th, 7th, 10th, 11th, 14th</li>
                    <li>• Real-time turns with auto-refresh</li>
                  </ul>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">👥 3. Player Selection</h4>
                  <ul className="text-sm space-y-1 text-orange-700">
                    <li>• Filter by Team, Role, or search by name</li>
                    <li>• Click to select, then confirm your pick</li>
                    <li>• Can only pick from available players</li>
                    <li>• Consider role balance: Batsmen, Bowlers, All-rounders, Keepers</li>
                  </ul>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">📊 4. Player Grades</h4>
                  <ul className="text-sm space-y-1 text-purple-700">
                    <li>• Players are automatically sorted by avg points (highest first)</li>
                    <li>• ⭐ badge shows weighted avg pts from last 5 matches</li>
                    <li>• Green ≥60, Yellow ≥45, Orange ≥30, Red below 30</li>
                    <li>• Tap the <span className="inline-flex items-center px-1.5 rounded bg-purple-600 text-white font-bold text-xs">i</span> button next to the badge to see full match history</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-cricket-50 to-green-50 border border-cricket-200 rounded-lg p-4">
                <h4 className="font-bold text-cricket-800 mb-2 flex items-center gap-2">🏆 5. Winning Strategy</h4>
                <div className="grid md:grid-cols-2 gap-3 text-sm text-cricket-700">
                  <div>
                    <p className="font-medium mb-1">Team Composition:</p>
                    <ul className="space-y-1">
                      <li>• Balance batsmen and bowlers</li>
                      <li>• Include 1-2 all-rounders</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Player Performance:</p>
                    <ul className="space-y-1">
                      <li>• Higher avg pts = better recent form</li>
                      <li>• Consider both teams in the match</li>
                      <li>• Tap ℹ to see a player's last 5 games</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-sm text-gray-600 bg-gray-50 rounded p-3">
                💡 <strong>Pro Tip:</strong> Players are sorted by avg pts — pick from the top of the list for your starting 5, then fill substitutes with good value picks!
              </div>
            </div>
          )}
        </div>

        {/* Toss waiting banner — shown to the non-calling user while waiting for toss */}
        {showToss && tossPhase === 'calling' && callingUser !== currentUser.id && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="animate-pulse text-2xl">🪙</div>
              <div>
                <p className="font-bold text-yellow-800">Waiting for {opponent.name} to call the toss...</p>
                <p className="text-yellow-700 text-sm">Browse available players below while you wait — the draft will start automatically!</p>
              </div>
            </div>
            <a href="/dashboard" className="shrink-0 text-yellow-700 hover:text-yellow-900 text-sm font-semibold underline">← Dashboard</a>
          </div>
        )}

        {/* Draft Status */}
        {isDraftComplete ? (
          <div className="bg-gradient-to-r from-cricket-500 to-green-600 text-black rounded-lg px-3 py-2 mb-2 shadow-md">
            <p className="text-center font-bold text-sm flex items-center justify-center gap-2">
              <Trophy className="h-4 w-4" />
              Draft Complete! Good luck in the game!
            </p>
          </div>
        ) : (
          <div className={`border-2 rounded-lg px-3 py-2 mb-2 shadow-sm ${isMyTurn ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-cricket-600' : 'bg-indigo-50 border-indigo-400'}`}>
            <p className={`text-center font-bold text-sm flex items-center justify-center gap-1.5 ${isMyTurn ? 'text-orange-700' : 'text-indigo-700'}`}>
              {isMyTurn ? (
                <>
                  <Target className="h-4 w-4 text-secondary-400 shrink-0" />
                  Your Turn — Pick #{currentPickOrder}
                  <span className="animate-pulse bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full text-[10px] font-normal">🔴 LIVE</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 shrink-0" />
                  Waiting for {opponent.name} — Pick #{currentPickOrder}
                  <span className="animate-pulse bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-[10px] font-normal">Refreshing…</span>
                </>
              )}
            </p>
          </div>
        )}

        {/* ── Mobile-only team list (starters + bench) ── */}
        <div className="lg:hidden mb-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">

          {/* Column headers */}
          <div className="grid grid-cols-2">
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-green-700">
              <span className="text-[11px] font-bold text-white truncate">Your Team</span>
              <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 rounded-full ml-1 shrink-0">
                {myPicks.length}/{effectiveSlots.filter(s => s === mySignupId).length || 7}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-red-700 border-l border-white/20">
              <span className="text-[11px] font-bold text-white truncate">{opponent.name.split(' ')[0]}</span>
              <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 rounded-full ml-1 shrink-0">
                {opponentPicks.length}/{effectiveSlots.filter(s => s === opponentSignupId).length || 7}
              </span>
            </div>
          </div>

          {/* Starting 5 label */}
          <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200">
            <div className="px-2 py-0.5">
              <span className="text-[9px] font-bold text-green-700 uppercase tracking-wide">⚡ Starting 5</span>
            </div>
            <div className="px-2 py-0.5 border-l border-gray-200">
              <span className="text-[9px] font-bold text-red-700 uppercase tracking-wide">⚡ Starting 5</span>
            </div>
          </div>

          {/* Starter rows 1–5 */}
          {[0,1,2,3,4].map(i => {
            const myP = sortedMyPicks[i];
            const oppP = sortedOppPicks[i];
            return (
              <div key={i} className="grid grid-cols-2 border-b border-gray-100">
                <div className="px-2 py-1.5 flex items-center gap-1 min-w-0 bg-green-50/50">
                  <span className="text-[9px] font-bold text-green-700 w-4 shrink-0">{i+1}.</span>
                  {myP ? (
                    <>
                      <span className="text-[11px] font-semibold text-gray-800 truncate flex-1">{myP.player.name}</span>
                      <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 rounded shrink-0">{roleAbbr(myP.player.role)}</span>
                    </>
                  ) : (
                    <span className="text-[9px] text-gray-300 italic">empty</span>
                  )}
                </div>
                <div className="px-2 py-1.5 flex items-center gap-1 min-w-0 bg-red-50/50 border-l border-gray-200">
                  <span className="text-[9px] font-bold text-red-700 w-4 shrink-0">{i+1}.</span>
                  {oppP ? (
                    <>
                      <span className="text-[11px] font-semibold text-gray-800 truncate flex-1">{oppP.player.name}</span>
                      <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 rounded shrink-0">{roleAbbr(oppP.player.role)}</span>
                    </>
                  ) : (
                    <span className="text-[9px] text-gray-300 italic">empty</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Bench label */}
          <div className="grid grid-cols-2 bg-orange-50 border-y border-orange-100">
            <div className="px-2 py-0.5">
              <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wide">
                {myWaivedBench ? '✅ No Bench' : myHalfWaived ? '✅ 1 Sub' : '🪑 Bench'}
              </span>
            </div>
            <div className="px-2 py-0.5 border-l border-orange-100">
              <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wide">
                {opponentWaivedBench ? '✅ No Bench' : opponentHalfWaived ? '✅ 1 Sub' : '🪑 Bench'}
              </span>
            </div>
          </div>

          {/* Bench rows 6–7 */}
          {[5,6].map(i => {
            const myP = sortedMyPicks[i];
            const oppP = sortedOppPicks[i];
            return (
              <div key={i} className={`grid grid-cols-2 ${i === 5 ? 'border-b border-gray-100' : ''}`}>
                <div className="px-2 py-1.5 flex items-center gap-1 min-w-0 bg-orange-50/30">
                  {myWaivedBench || (myHalfWaived && i === 6) ? (
                    <span className="text-[9px] text-gray-300 italic pl-5">—</span>
                  ) : (
                    <>
                      <span className="text-[9px] font-bold text-orange-600 w-4 shrink-0">{i+1}.</span>
                      {myP ? (
                        <>
                          <span className="text-[11px] font-semibold text-gray-800 truncate flex-1">{myP.player.name}</span>
                          <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 rounded shrink-0">{roleAbbr(myP.player.role)}</span>
                        </>
                      ) : (
                        <span className="text-[9px] text-gray-300 italic">empty</span>
                      )}
                    </>
                  )}
                </div>
                <div className="px-2 py-1.5 flex items-center gap-1 min-w-0 bg-orange-50/30 border-l border-gray-200">
                  {opponentWaivedBench || (opponentHalfWaived && i === 6) ? (
                    <span className="text-[9px] text-gray-300 italic pl-5">—</span>
                  ) : (
                    <>
                      <span className="text-[9px] font-bold text-orange-600 w-4 shrink-0">{i+1}.</span>
                      {oppP ? (
                        <>
                          <span className="text-[11px] font-semibold text-gray-800 truncate flex-1">{oppP.player.name}</span>
                          <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 rounded shrink-0">{roleAbbr(oppP.player.role)}</span>
                        </>
                      ) : (
                        <span className="text-[9px] text-gray-300 italic">empty</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Your Picks — hidden on mobile (shown in summary above), visible on desktop */}
          <div className="hidden lg:block bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-green-800">Your Team</h3>
              <div className="flex items-center gap-2">
                {myWaivedBench && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">No bench</span>
                )}
                {myHalfWaived && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">1 sub</span>
                )}
                <span className="bg-green-800 text-white px-3 py-1 rounded-full font-bold text-sm">
                  {myPicks.length}/7
                </span>
              </div>
            </div>
            {myTotalPoints > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-cricket-500 to-green-600 rounded-xl">
                <div className="text-center">
                  <div className="text-black text-xs font-semibold uppercase tracking-wider opacity-90 mb-1">Total Score</div>
                  <div className="text-black font-black text-3xl">⭐ {myTotalPoints.toFixed(1)}</div>
                  <div className="text-black/90 text-xs mt-1">Fantasy Points</div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {myPicks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 italic">No picks yet</div>
              ) : (
                <>
                  {/* Starting 5 Section */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-green-600">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">5</span>
                      </div>
                      <h4 className="font-bold text-green-800 text-lg">Starting 5</h4>
                      <span className="text-sm text-green-600">({Math.min(myPicks.length, 5)}/5)</span>
                    </div>
                    {myPicks.slice(0, 5).map(pick => (
                      <div key={pick.id} className="mb-3 group relative bg-gradient-to-br from-green-50 via-emerald-50 to-white border-2 border-green-300 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-102">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-cricket-600 to-green-800 rounded-full flex items-center justify-center text-black font-black text-xl shadow-lg shrink-0">
                            {pick.pickOrder}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-xl text-black mb-2 leading-tight">{pick.player.name}</div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-black bg-green-200 px-2 py-1 rounded-md shadow-sm border border-green-400">
                                {pick.player.role}
                              </span>
                              <span 
                                className="text-xs font-bold px-2 py-1 rounded-md shadow-sm border-2" 
                                style={{ 
                                  backgroundColor: pick.player.iplTeam.color + '15', 
                                  color: 'black',
                                  borderColor: pick.player.iplTeam.color + '60'
                                }}
                              >
                                {pick.player.iplTeam.shortName}
                              </span>
                              {playerStatsMap[pick.player.id] && (
                                <span className="text-sm font-black text-black bg-gradient-to-r from-cricket-300 to-green-300 px-3 py-1.5 rounded-md shadow-md border-2 border-green-700">
                                  ⭐ {playerStatsMap[pick.player.id].points.toFixed(1)} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Substitutes Section */}
                  {myPicks.length > 5 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-orange-500">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">SUB</span>
                        </div>
                        <h4 className="font-bold text-orange-700 text-lg">Substitutes</h4>
                        <span className="text-sm text-orange-600">({myPicks.length - 5}/2)</span>
                      </div>
                      {myPicks.slice(5).map(pick => (
                        <div key={pick.id} className="mb-3 group relative bg-gradient-to-br from-orange-50 via-amber-50 to-white border-2 border-orange-300 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-102">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
                              {pick.pickOrder}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-xl text-black mb-2 leading-tight">{pick.player.name}</div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-black bg-orange-200 px-2 py-1 rounded-md shadow-sm border border-orange-400">
                                  {pick.player.role}
                                </span>
                                <span 
                                  className="text-xs font-bold px-2 py-1 rounded-md shadow-sm border-2" 
                                  style={{ 
                                    backgroundColor: pick.player.iplTeam.color + '15', 
                                    color: 'black',
                                    borderColor: pick.player.iplTeam.color + '60'
                                  }}
                                >
                                  {pick.player.iplTeam.shortName}
                                </span>
                                {playerStatsMap[pick.player.id] && (
                                  <span className="text-sm font-black text-black bg-gradient-to-r from-orange-300 to-amber-300 px-3 py-1.5 rounded-md shadow-md border-2 border-orange-600">
                                    ⭐ {playerStatsMap[pick.player.id].points.toFixed(1)} pts
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Available Players — full width on mobile (order-first), middle col on desktop */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 order-first lg:order-none col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-primary-800">Available Players</h3>
              <button
                onClick={fetchPlayerGrades}
                disabled={loadingGrades || !matchup}
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-semibold disabled:opacity-50 transition-colors"
                title={showGrades ? 'Refresh historical avg pts' : 'Load historical avg pts for all players'}
              >
                {loadingGrades ? '⟳ Loading...' : showGrades ? '↻ Refresh Avg Pts' : '📊 Load Avg Pts'}
              </button>
            </div>
            <p className="text-xs text-gray-400 -mt-3 mb-4">
              ⭐ badge = weighted avg pts · (Ng) = no. of recent games used
            </p>

            {/* Filters */}
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Filter by Team</label>
                  <select
                    value={filterTeam}
                    onChange={(e) => setFilterTeam(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:border-primary-500 focus:outline-none bg-white text-black"
                  >
                    <option value="all">All Teams</option>
                    {matchup && [
                      { id: matchup.contest.iplGame.team1.id, name: matchup.contest.iplGame.team1.shortName },
                      { id: matchup.contest.iplGame.team2.id, name: matchup.contest.iplGame.team2.shortName }
                    ].map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Filter by Role</label>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:border-primary-500 focus:outline-none bg-white text-black"
                  >
                    <option value="all">All Roles</option>
                    <option value="BATSMAN">Batsman</option>
                    <option value="BOWLER">Bowler</option>
                    <option value="ALL_ROUNDER">All-Rounder</option>
                    <option value="WICKET_KEEPER">Wicket-Keeper</option>
                  </select>
                </div>
              </div>
              
              {/* Search by Name */}
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Search by Name</label>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Type player name..."
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:border-primary-500 focus:outline-none bg-white"
                />
              </div>
              
              {(filterTeam !== 'all' || filterRole !== 'all' || searchName) && (
                <button
                  onClick={() => { setFilterTeam('all'); setFilterRole('all'); setSearchName(''); }}
                  className="text-xs font-semibold text-secondary-500 hover:text-secondary-600 underline mt-2"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
              {(() => {
                if (availablePlayers.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500 italic">
                      No available players remaining
                    </div>
                  );
                }
                
                const filteredPlayers = availablePlayers
                  .filter(player => {
                    // Team filter
                    if (filterTeam === 'all') return true;
                    return player.iplTeam.id === filterTeam;
                  })
                  .filter(player => {
                    // Role filter (case-insensitive)
                    if (filterRole === 'all') return true;
                    return player.role.toUpperCase() === filterRole.toUpperCase();
                  })
                  .filter(player => {
                    // Name search filter
                    if (!searchName) return true;
                    return player.name.toLowerCase().includes(searchName.toLowerCase());
                  })
                  .sort((a, b) => {
                    const aGrade = playerGrades[a.id];
                    const bGrade = playerGrades[b.id];
                    const aScore = aGrade && aGrade.matchesPlayed > 0 ? aGrade.weightedScore : -1;
                    const bScore = bGrade && bGrade.matchesPlayed > 0 ? bGrade.weightedScore : -1;
                    return bScore - aScore;
                  });
                
                if (filteredPlayers.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-lg mb-2">No players match your filters</div>
                      <div className="text-sm">Try adjusting your team, role, or name filters</div>
                    </div>
                  );
                }
                
                return filteredPlayers.map(player => {
                  const playerGrade = playerGrades[player.id];
                  const ptsStyle = playerGrade && playerGrade.matchesPlayed > 0 ? getAvgPtsStyle(playerGrade.weightedScore) : null;
                  
                  return (
                <div
                  key={player.id}
                  onClick={() => isMyTurn && !isDraftComplete && setSelectedPlayer(player.id)}
                  className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border-2 ${
                    selectedPlayer === player.id
                      ? 'bg-gradient-to-r from-secondary-100 to-orange-100 border-secondary-500 shadow-lg scale-105'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300 hover:shadow-md'
                  } ${!isMyTurn || isDraftComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-semibold text-sm text-black leading-tight mb-1">{player.name}</div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs font-semibold text-gray-700 bg-white px-1.5 py-0.5 rounded border border-gray-300 leading-none">
                      {player.role}
                    </span>
                    <span 
                      className="text-xs font-bold px-1.5 py-0.5 rounded border-2 leading-none" 
                      style={{ 
                        backgroundColor: player.iplTeam.color + '20', 
                        color: player.iplTeam.color,
                        borderColor: player.iplTeam.color + '40'
                      }}
                    >
                      {player.iplTeam.shortName}
                    </span>
                    {ptsStyle && (
                      <>
                        <span 
                          className={`text-xs font-bold px-1.5 py-0.5 rounded border-2 leading-none ${ptsStyle.bg} ${ptsStyle.text} ${ptsStyle.border}`}
                        >
                          ⭐ {playerGrade!.weightedScore} pts
                        </span>
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); setStatsModalPlayer(player.id); }}
                          className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs leading-none cursor-pointer select-none"
                          title="View match history"
                        >
                          i
                        </span>
                      </>
                    )}
                    {!showGrades && (
                      <span className="text-xs font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-dashed border-gray-300 leading-none">
                        — avg pts
                      </span>
                    )}
                    {showGrades && (!playerGrade || playerGrade.matchesPlayed === 0) && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 leading-none">
                        No data
                      </span>
                    )}
                  </div>
                </div>
                  );
                });
              })()}
            </div>
            {isMyTurn && !isDraftComplete && (
              <button
                onClick={handleDraftPick}
                disabled={!selectedPlayer || makingPick}
                className="w-full mt-6 bg-gradient-to-r from-secondary-500 to-orange-600 hover:from-secondary-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 text-black px-6 py-4 rounded-lg font-bold text-lg shadow-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {makingPick ? 'Drafting...' : selectedPlayer ? 'Confirm Pick' : 'Select a Player'}
              </button>
            )}
            {/* End My Draft button — visible after 5+ picks, but only before all 7 picks are made */}
            {!isDraftComplete && !myEndedDraft && myPicks.length >= 5 && myPicks.length < 7 && (
              <div className="mt-4 rounded-xl border-2 border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  {/* Pulsing dot to draw attention */}
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                  </span>
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                    {myPicks.length >= 6 ? 'Want to skip your last bench pick?' : 'Want to skip bench picks entirely?'}
                  </p>
                </div>
                <p className="text-xs text-red-600 mb-2.5 leading-snug">
                  {myPicks.length >= 6
                    ? 'You have 1 bench sub. End now to lock in your team — or keep drafting for your 2nd sub.'
                    : 'You can end your draft now with just your 5 starters. If a starter is DNP they score 0 with no backup.'}
                </p>
                <button
                  onClick={handleWaiveBench}
                  disabled={waivingBench}
                  className="w-full bg-transparent hover:bg-red-100 border-2 border-red-400 hover:border-red-500 text-red-600 hover:text-red-700 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {waivingBench
                    ? '⏳ Ending draft...'
                    : myPicks.length >= 6
                      ? '🏁 End My Draft — keep 1 bench sub'
                      : '🏁 End My Draft — play with 5 starters only'}
                </button>
              </div>
            )}
            {!isDraftComplete && myEndedDraft && (
              <div className="mt-3 text-center text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg py-2.5 font-medium">
                {myWaivedBench ? '✅ Draft ended — 5 starters locked in' : '✅ Draft ended — 5 starters + 1 sub locked in'}
              </div>
            )}
          </div>

          {/* Opponent Picks — hidden on mobile (shown in summary above), visible on desktop */}
          <div className="hidden lg:block bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-red-800">Opponent Team</h3>
              <div className="flex items-center gap-2">
                {opponentWaivedBench && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">No bench</span>
                )}
                {opponentHalfWaived && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">1 sub</span>
                )}
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold text-sm">
                  {opponentPicks.length}/7
                </span>
              </div>
            </div>
            {opponentTotalPoints > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-cricket-500 to-green-600 rounded-xl">
                <div className="text-center">
                  <div className="text-black text-xs font-semibold uppercase tracking-wider opacity-90 mb-1">Total Score</div>
                  <div className="text-black font-black text-3xl">⭐ {opponentTotalPoints.toFixed(1)}</div>
                  <div className="text-black/90 text-xs mt-1">Fantasy Points</div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {opponentPicks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 italic">No picks yet</div>
              ) : (
                <>
                  {/* Starting 5 Section */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-red-600">
                      <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">5</span>
                      </div>
                      <h4 className="font-bold text-red-800 text-lg">Starting 5</h4>
                      <span className="text-sm text-red-600">({Math.min(opponentPicks.length, 5)}/5)</span>
                    </div>
                    {opponentPicks.slice(0, 5).map(pick => (
                      <div key={pick.id} className="mb-3 group relative bg-gradient-to-br from-red-50 via-orange-50 to-white border-2 border-red-300 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-102">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center text-black font-black text-xl shadow-lg shrink-0">
                            {pick.pickOrder}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-xl text-black mb-2 leading-tight">{pick.player.name}</div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-black bg-red-100 px-2 py-1 rounded-md shadow-sm border border-red-300">
                                {pick.player.role}
                              </span>
                              <span
                                className="text-xs font-bold px-2 py-1 rounded-md shadow-sm border-2"
                                style={{
                                  backgroundColor: pick.player.iplTeam.color + '15',
                                  color: 'black',
                                  borderColor: pick.player.iplTeam.color + '60'
                                }}
                              >
                                {pick.player.iplTeam.shortName}
                              </span>
                              {playerStatsMap[pick.player.id] && (
                                <span className="text-sm font-black text-black bg-gradient-to-r from-cricket-300 to-green-300 px-3 py-1.5 rounded-md shadow-md border-2 border-green-700">
                                  ⭐ {playerStatsMap[pick.player.id].points.toFixed(1)} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Substitutes Section */}
                  {opponentPicks.length > 5 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-orange-500">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">SUB</span>
                        </div>
                        <h4 className="font-bold text-orange-700 text-lg">Substitutes</h4>
                        <span className="text-sm text-orange-600">({opponentPicks.length - 5}/2)</span>
                      </div>
                      {opponentPicks.slice(5).map(pick => (
                        <div key={pick.id} className="mb-3 group relative bg-gradient-to-br from-orange-50 via-amber-50 to-white border-2 border-orange-300 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-102">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
                              {pick.pickOrder}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-xl text-black mb-2 leading-tight">{pick.player.name}</div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-black bg-orange-200 px-2 py-1 rounded-md shadow-sm border border-orange-400">
                                  {pick.player.role}
                                </span>
                                <span
                                  className="text-xs font-bold px-2 py-1 rounded-md shadow-sm border-2"
                                  style={{
                                    backgroundColor: pick.player.iplTeam.color + '15',
                                    color: 'black',
                                    borderColor: pick.player.iplTeam.color + '60'
                                  }}
                                >
                                  {pick.player.iplTeam.shortName}
                                </span>
                                {playerStatsMap[pick.player.id] && (
                                  <span className="text-sm font-black text-black bg-gradient-to-r from-orange-300 to-amber-300 px-3 py-1.5 rounded-md shadow-md border-2 border-orange-600">
                                    ⭐ {playerStatsMap[pick.player.id].points.toFixed(1)} pts
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toss Modal — hidden for the waiting user during 'calling' phase; shown for caller + flipping + result */}
      {showToss && matchup && !(tossPhase === 'calling' && callingUser !== currentUser?.id) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            {tossPhase === 'calling' && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="text-6xl mb-4">🪙</div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Coin Toss</h2>
                  <p className="text-gray-600">
                    {callingUser === currentUser?.id 
                      ? "You get to call the toss!" 
                      : `${callingUser === matchup.user1.user.id ? matchup.user1.user.name : matchup.user2.user.name} is calling the toss...`}
                  </p>
                </div>
                
                {callingUser === currentUser?.id && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700 mb-4">Choose Heads or Tails:</p>
                    <button
                      onClick={() => handleTossCall('HEADS')}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                    >
                      👑 HEADS
                    </button>
                    <button
                      onClick={() => handleTossCall('TAILS')}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                    >
                      🎯 TAILS
                    </button>
                  </div>
                )}
              </div>
            )}

            {tossPhase === 'flipping' && (
              <div className="text-center">
                <div className="mb-6">
                  <div className={`text-8xl mb-4 ${isFlipping ? 'animate-spin' : ''}`}>
                    🪙
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Flipping...</h2>
                  <p className="text-gray-600">
                    Called: <span className="font-bold text-primary-600">{userCall}</span>
                  </p>
                </div>
              </div>
            )}

            {tossPhase === 'result' && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="text-8xl mb-4">{coinResult === 'HEADS' ? '👑' : '🎯'}</div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {coinResult}!
                  </h2>
                  <div className={`text-xl font-bold mb-4 ${tossWinner === currentUser?.id ? 'text-green-600' : 'text-red-600'}`}>
                    {tossWinner === currentUser?.id ? '🎉 You Won the Toss!' : '😔 You Lost the Toss'}
                  </div>
                  <p className="text-gray-700">
                    <span className="font-bold">
                      {tossWinner === matchup.user1.user.id ? matchup.user1.user.name : matchup.user2.user.name}
                    </span>
                    {' '}will pick first
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player Stats Modal */}
      {statsModalPlayer && (() => {
        const modalPlayer = availablePlayers.find(p => p.id === statsModalPlayer);
        const modalGrade = playerGrades[statsModalPlayer];
        if (!modalPlayer || !modalGrade) return null;
        const ptsStyle = getAvgPtsStyle(modalGrade.weightedScore);
        return (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setStatsModalPlayer(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-black text-lg text-gray-900">{modalPlayer.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-gray-500">{modalPlayer.role}</span>
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: modalPlayer.iplTeam.color + '20', color: modalPlayer.iplTeam.color }}
                    >
                      {modalPlayer.iplTeam.shortName}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-black px-3 py-1.5 rounded-lg border-2 ${ptsStyle.bg} ${ptsStyle.text} ${ptsStyle.border}`}>
                    ⭐ {modalGrade.weightedScore} avg pts
                  </span>
                  <button
                    onClick={() => setStatsModalPlayer(null)}
                    className="text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Table */}
              {modalGrade.recentMatches.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">#</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Opponent</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Date</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalGrade.recentMatches.map((m, i) => (
                        <tr key={m.gameId} className={m.didNotPlay ? 'bg-gray-100 opacity-60' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-4 py-2.5 font-semibold text-gray-800">
                            vs {m.opponent}
                            {m.didNotPlay && <span className="ml-1.5 text-xs font-bold bg-gray-300 text-gray-600 px-1.5 py-0.5 rounded">DNP</span>}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{m.date}</td>
                          <td className="px-4 py-2.5 text-right">
                            {m.didNotPlay ? (
                              <span className="text-xs text-gray-400 italic">—</span>
                            ) : (
                              <span className={`font-black text-sm ${m.points >= 60 ? 'text-green-600' : m.points >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                                {m.points}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td colSpan={3} className="px-4 py-2.5 font-bold text-gray-700 text-xs uppercase tracking-wide">
                          Weighted Avg
                          {modalGrade.matchesAppeared > modalGrade.matchesPlayed && (
                            <span className="ml-1 text-gray-400 font-normal normal-case">(played {modalGrade.matchesPlayed}g)</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-base text-purple-700">{modalGrade.weightedScore}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 italic text-sm">No match data available</div>
              )}

              <p className="text-xs text-gray-400 mt-3 text-center">Last 5 appearances · DNP rows excluded from avg · newer games weighted higher</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
