"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Users, Trophy, Zap, Target, Star, CheckCircle, AlertCircle } from "lucide-react"

export default function HowToPlayContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('currentUser')
    setIsLoggedIn(!!userData)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href={isLoggedIn ? "/dashboard" : "/"} className="inline-flex items-center text-white hover:text-secondary-400 transition-colors">
              <ArrowLeft className="h-5 w-5 mr-2" />
              {isLoggedIn ? "Back to Dashboard" : "Back to Home"}
            </Link>
          </div>
        </div>
      </div>

      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">How to Play IPL DFS</h1>
            <p className="text-xl text-blue-200 max-w-2xl mx-auto">Learn the basics of fantasy cricket and start competing in head-to-head contests</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Target className="h-6 w-6 mr-3 text-secondary-400" />Quick Start Guide
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: 1, title: "Create Your Team", desc: "Select your best 5 players from upcoming IPL matches" },
                { step: 2, title: "Join Contests", desc: "Enter head-to-head contests and compete against other players" },
                { step: 3, title: "Watch & Win", desc: "Follow live scores and see who wins the head-to-head" },
              ].map(({ step, title, desc }) => (
                <div key={step} className="text-center">
                  <div className="w-12 h-12 bg-secondary-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">{step}</div>
                  <h3 className="font-semibold text-white mb-2">{title}</h3>
                  <p className="text-blue-200 text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-12 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center">
              <Trophy className="h-6 w-6 mr-3 text-secondary-400" />Contest Flow: Join → Win
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { n: 1, color: "bg-green-500", emoji: "🎯", title: "Join Contest", desc: "Browse & join from dashboard" },
                { n: 2, color: "bg-blue-500", emoji: "📱", title: "Draft Opens", desc: "After signups close - check \"Your Contests\"" },
                { n: 3, color: "bg-purple-500", emoji: "🪙", title: "Coin Toss", desc: "Real time flip on draft page" },
                { n: 4, color: "bg-indigo-500", emoji: "🔄", title: "Snake Draft", desc: "Pick 7 players each" },
                { n: 5, color: "bg-orange-500", emoji: "✅", title: "Draft Complete", desc: "Teams finalized, wait for match" },
                { n: 6, color: "bg-yellow-600", emoji: "🏏", title: "Live Match", desc: "Players score points" },
                { n: 7, color: "bg-yellow-500 text-black", emoji: "📈", title: "Live Scoring", desc: "Track real-time progress" },
                { n: 8, color: "bg-red-500", emoji: "🏆", title: "Final Results", desc: "Winner gets coins" },
              ].map(({ n, color, emoji, title, desc }) => (
                <div key={n} className="bg-white/10 rounded-lg p-3 text-center">
                  <div className={`w-8 h-8 ${color} text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2`}>{n}</div>
                  <div className="text-xl mb-1">{emoji}</div>
                  <h3 className="font-bold text-white text-xs mb-1">{title}</h3>
                  <p className="text-blue-200 text-xs">{desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-r from-secondary-500/20 to-orange-500/20 rounded-lg p-4 border border-secondary-400/30">
              <div className="grid md:grid-cols-4 gap-3 text-center">
                {[
                  { label: "⏰ Total Time", val: "~3-4 hours" },
                  { label: "🎮 Draft Window", val: "Opens after signups close" },
                  { label: "⚡ Draft Duration", val: "15-30 mins" },
                  { label: "💰 Rewards", val: "Coins & leaderboard" },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div className="font-bold text-white text-xs">{label}</div>
                    <div className="text-blue-100 text-xs">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Users className="h-6 w-6 mr-3 text-secondary-500" />Team Building Rules
              </h2>
              <div className="space-y-4">
                {[
                  { title: "Select 5 Players and 2 Substitutes", desc: "Pick 5 players and 2 substitutes who will replace the main players in case they do not play." },
                  { title: "No Salary Cap", desc: "Unlike other fantasy platforms, there are no salary restrictions. Pick the best players you think will perform!" },
                  { title: "Both Teams", desc: "You can select players from both teams playing in the match." },
                  { title: "Player Roles", desc: "Choose from Batsmen, Bowlers, All-rounders, and Wicket-keepers based on your strategy." },
                ].map(({ title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                    <div><h4 className="font-semibold text-primary-800 mb-1">{title}</h4><p className="text-gray-600">{desc}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Zap className="h-6 w-6 mr-3 text-secondary-500" />Scoring System
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <div className="text-4xl mb-3">🏏</div>
                  <h4 className="font-bold text-primary-800 mb-3 text-lg">Batting</h4>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="font-bold text-green-700 text-xl">1 Point</div>
                    <div className="text-sm text-gray-600">per run scored</div>
                  </div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                  <div className="text-4xl mb-3">🎯</div>
                  <h4 className="font-bold text-primary-800 mb-3 text-lg">Bowling</h4>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="font-bold text-blue-700 text-xl">20 Points</div>
                    <div className="text-sm text-gray-600">per wicket taken</div>
                  </div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border-2 border-orange-200">
                  <div className="text-4xl mb-3">🧤</div>
                  <h4 className="font-bold text-primary-800 mb-3 text-lg">Fielding</h4>
                  <div className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="font-bold text-orange-700 text-xl">5 Points</div>
                    <div className="text-sm text-gray-600">per catch, run out, or stumping</div>
                  </div>
                </div>
              </div>
              <div className="mt-8 p-6 bg-gray-50 rounded-xl border-l-4 border-primary-500">
                <h4 className="font-bold text-primary-800 mb-3 flex items-center"><Trophy className="h-5 w-5 mr-2" />Scoring Formula</h4>
                <p className="text-gray-700 font-mono text-sm bg-white p-3 rounded border">
                  Total Points = (Runs × 1) + (Wickets × 20) + (Catches + Run Outs + Stumpings) × 5
                </p>
                <div className="mt-4 text-sm text-gray-600">
                  <strong>Example:</strong> A player who scores 45 runs, takes 2 wickets, and makes 1 catch would earn: (45 × 1) + (2 × 20) + (1 × 5) = <strong>90 points</strong>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-8 shadow-xl border-2 border-amber-400">
              <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center">
                <span className="text-3xl mr-3">🎖️</span>Captain Mode: Double Your Best Player!
              </h2>
              <div className="bg-white/80 rounded-xl p-6 mb-6 border border-amber-300">
                <p className="text-gray-800 text-center text-lg font-semibold">Choose ONE starter as your captain — their points count <span className="text-amber-700 font-black text-xl">×2 (DOUBLE)</span>!</p>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-amber-900 mb-4 text-lg">📋 How It Works (Step-by-Step)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-amber-500 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">1</span>
                        <h4 className="font-bold text-gray-800">Opt-In at Draft Start</h4>
                      </div>
                      <p className="text-gray-600 text-sm">When entering the draft room, a modal asks: "Add a Captain to your team?" — click "Yes, I'm in!"</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-amber-500 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">2</span>
                        <h4 className="font-bold text-gray-800">Both Users Must Agree</h4>
                      </div>
                      <p className="text-gray-600 text-sm">If your opponent also says yes, Captain Mode is ON. If either declines, it's OFF for both.</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-amber-500 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">3</span>
                        <h4 className="font-bold text-gray-800">Complete Your Draft</h4>
                      </div>
                      <p className="text-gray-600 text-sm">Pick your 5 starters + 2 bench through the normal snake draft process.</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-amber-500 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">4</span>
                        <h4 className="font-bold text-gray-800">Pick Your Captain</h4>
                      </div>
                      <p className="text-gray-600 text-sm">After draft ends, choose ONE of your 5 starters as captain. Their points will be doubled!</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-100 border-2 border-red-400 rounded-xl p-5">
                  <h3 className="font-bold text-red-900 mb-3 text-lg flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />⚠️ WARNING: Opt-In = You MUST Pick a Captain!
                  </h3>
                  <div className="space-y-3 text-red-900">
                    <p className="flex items-start gap-2">
                      <span className="text-red-600 font-bold text-lg flex-shrink-0">❌</span>
                      <span><strong>If you opt in but forget to pick a captain:</strong> You get <strong className="underline">NO 2× bonus</strong> on any player. All your players score regular (1×) points.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-red-600 font-bold text-lg flex-shrink-0">😟</span>
                      <span><strong>Your opponent WILL get their 2× bonus</strong> if they picked a captain — putting you at a huge disadvantage!</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-green-600 font-bold text-lg flex-shrink-0">✅</span>
                      <span><strong>Always select your captain immediately</strong> after the draft completes if Captain Mode is active.</span>
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-5 border border-amber-300">
                  <h4 className="font-bold text-gray-800 mb-3">💡 Example Calculation</h4>
                  <div className="space-y-2 text-gray-700">
                    <p>Your captain Virat Kohli scores: <strong>65 runs (65 pts) + 1 catch (5 pts) = 70 points</strong></p>
                    <p className="text-amber-700 font-bold text-lg">With Captain Bonus: 70 × 2 = <span className="text-2xl">140 points!</span></p>
                    <p className="text-sm text-gray-500 italic">That extra 70 points could decide the match!</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Star className="h-6 w-6 mr-3 text-secondary-500" />Coin Rewards
              </h2>
              <div className="space-y-4">
                {[
                  { title: "Winning Contests", desc: "Earn coins every time you win a head-to-head contest." },
                  { title: "Leaderboards", desc: "Climb the rankings and compete for top positions on the leaderboard." },
                  { title: "Daily Rewards", desc: "Log in daily and participate in contests to earn bonus coins." },
                ].map(({ title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                    <div><h4 className="font-semibold text-primary-800 mb-1">{title}</h4><p className="text-gray-600">{desc}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-8">
              <h2 className="text-2xl font-bold text-primary-800 mb-2 flex items-center">🔔 Enable Push Notifications</h2>
              <p className="text-gray-600 mb-6">Never miss a moment — get instant alerts when your draft opens, a contest goes live, or results are posted.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { emoji: "⚡", title: "Draft Opens", desc: "Get notified the moment your draft window becomes available so you can pick first.", bg: "bg-blue-50 border-blue-100" },
                  { emoji: "🏏", title: "Contest Goes Live", desc: "Know instantly when your match kicks off and scoring begins.", bg: "bg-green-50 border-green-100" },
                  { emoji: "🏆", title: "Results Are In", desc: "Find out if you won or lost as soon as scores are settled.", bg: "bg-orange-50 border-orange-100" },
                ].map(({ emoji, title, desc, bg }) => (
                  <div key={title} className={`rounded-xl p-4 border ${bg}`}>
                    <div className="text-2xl mb-2">{emoji}</div>
                    <h4 className="font-semibold text-primary-800 mb-1">{title}</h4>
                    <p className="text-gray-600 text-sm">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="font-semibold text-primary-800 mb-3">How to enable notifications:</h4>
                <div className="space-y-3">
                  {[
                    "Go to your <strong>Dashboard</strong> and look for the notification banner at the top, or click the <strong>🔔 bell icon</strong> in the header.",
                    "Click <strong>\"Enable Notifications\"</strong> and when your browser asks for permission, click <strong>Allow</strong>.",
                    "That's it! The bell icon will turn <strong>green</strong> when you're subscribed. You can unsubscribe anytime by clicking it again.",
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="bg-secondary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: text }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-2xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-6">Tips for Success</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { title: "Research Players", desc: "Study recent form, pitch conditions, and head-to-head records before selecting your team." },
                  { title: "Balance Your Team", desc: "Include both consistent performers and potential match-winners in your 5-player team." },
                  { title: "Follow Live Scores", desc: "Stay updated during matches to see how your players are performing in real-time." },
                  { title: "Learn from Results", desc: "Analyze your wins and losses to improve your player selection strategy." },
                ].map(({ title, desc }) => (
                  <div key={title} className="space-y-3">
                    <h4 className="font-semibold">{title}</h4>
                    <p className="text-secondary-100 text-sm">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!isLoggedIn && (
            <div className="text-center mt-12">
              <Link href="/login" className="bg-secondary-500 hover:bg-secondary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl inline-flex items-center">
                Start Playing Now
                <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
