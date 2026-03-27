"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Users, Trophy, Zap, Target, Star, CheckCircle } from "lucide-react"

export default function HowToPlayPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('currentUser')
    setIsLoggedIn(!!userData)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href={isLoggedIn ? "/dashboard" : "/"}
              className="inline-flex items-center text-white hover:text-secondary-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {isLoggedIn ? "Back to Dashboard" : "Back to Home"}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How to Play IPL DFS
            </h1>
            <p className="text-xl text-blue-200 max-w-2xl mx-auto">
              Learn the basics of fantasy cricket and start competing in head-to-head contests
            </p>
          </div>

          {/* Quick Start Guide */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Target className="h-6 w-6 mr-3 text-secondary-400" />
              Quick Start Guide
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-secondary-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">1</div>
                <h3 className="font-semibold text-white mb-2">Create Your Team</h3>
                <p className="text-blue-200 text-sm">Select your best 5 players from upcoming IPL matches</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-secondary-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">2</div>
                <h3 className="font-semibold text-white mb-2">Join Contests</h3>
                <p className="text-blue-200 text-sm">Enter head-to-head contests and compete against other players</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-secondary-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">3</div>
                <h3 className="font-semibold text-white mb-2">Watch & Win</h3>
                <p className="text-blue-200 text-sm">Follow live scores and see who wins the head-to-head</p>
              </div>
            </div>
          </div>

          {/* Detailed Rules */}
          <div className="space-y-8">
            {/* Team Building */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Users className="h-6 w-6 mr-3 text-secondary-500" />
                Team Building Rules
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-primary-800 mb-1">Select 5 Players and 2 Substitutes</h4>
                    <p className="text-gray-600">Pick 5 players and 2 substitutes who will replace the main players in case they do not play.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-primary-800 mb-1">No Salary Cap</h4>
                    <p className="text-gray-600">Unlike other fantasy platforms, there are no salary restrictions. Pick the best players you think will perform!</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-primary-800 mb-1">Both Teams</h4>
                    <p className="text-gray-600">You can select players from both teams playing in the match.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-primary-800 mb-1">Player Roles</h4>
                    <p className="text-gray-600">Choose from Batsmen, Bowlers, All-rounders, and Wicket-keepers based on your strategy.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contest Types */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Trophy className="h-6 w-6 mr-3 text-secondary-500" />
                Contest Format
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-primary-800 mb-2">Head-to-Head</h4>
                  <p className="text-gray-600 text-sm">Compete directly against one other player. Winner takes the prize!</p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-primary-800 mb-2">Random Opponents</h4>
                  <p className="text-gray-600 text-sm">Join contests and get matched with players of similar skill level.</p>
                </div>
              </div>
            </div>

            {/* Scoring System */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Zap className="h-6 w-6 mr-3 text-secondary-500" />
                Scoring System
              </h2>
              
              <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-6 mb-6">
                <p className="text-gray-700 text-center font-medium">
                  Our scoring system is simple and straightforward - no complex bonuses or penalties!
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <div className="text-4xl mb-3">🏏</div>
                  <h4 className="font-bold text-primary-800 mb-3 text-lg">Batting</h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="font-bold text-green-700 text-xl">1 Point</div>
                      <div className="text-sm text-gray-600">per run scored</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                  <div className="text-4xl mb-3">🎯</div>
                  <h4 className="font-bold text-primary-800 mb-3 text-lg">Bowling</h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="font-bold text-blue-700 text-xl">20 Points</div>
                      <div className="text-sm text-gray-600">per wicket taken</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border-2 border-orange-200">
                  <div className="text-4xl mb-3">🧤</div>
                  <h4 className="font-bold text-primary-800 mb-3 text-lg">Fielding</h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-orange-200">
                      <div className="font-bold text-orange-700 text-xl">5 Points</div>
                      <div className="text-sm text-gray-600">per catch, run out, or stumping</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-gray-50 rounded-xl border-l-4 border-primary-500">
                <h4 className="font-bold text-primary-800 mb-3 flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Scoring Formula
                </h4>
                <p className="text-gray-700 font-mono text-sm bg-white p-3 rounded border">
                  Total Points = (Runs × 1) + (Wickets × 20) + (Catches + Run Outs + Stumpings) × 5
                </p>
                <div className="mt-4 text-sm text-gray-600">
                  <strong>Example:</strong> A player who scores 45 runs, takes 2 wickets, and makes 1 catch would earn:
                  (45 × 1) + (2 × 20) + (1 × 5) = <strong>90 points</strong>
                </div>
              </div>
            </div>

            {/* Coin System */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Star className="h-6 w-6 mr-3 text-secondary-500" />
                Coin Rewards
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-primary-800 mb-1">Winning Contests</h4>
                    <p className="text-gray-600">Earn coins every time you win a head-to-head contest.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-primary-800 mb-1">Leaderboards</h4>
                    <p className="text-gray-600">Climb the rankings and compete for top positions on the leaderboard.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-primary-800 mb-1">Daily Rewards</h4>
                    <p className="text-gray-600">Log in daily and participate in contests to earn bonus coins.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips for Success */}
            <div className="bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-2xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-6">Tips for Success</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold">Research Players</h4>
                  <p className="text-secondary-100 text-sm">Study recent form, pitch conditions, and head-to-head records before selecting your team.</p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Balance Your Team</h4>
                  <p className="text-secondary-100 text-sm">Include both consistent performers and potential match-winners in your 5-player team.</p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Follow Live Scores</h4>
                  <p className="text-secondary-100 text-sm">Stay updated during matches to see how your players are performing in real-time.</p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Learn from Results</h4>
                  <p className="text-secondary-100 text-sm">Analyze your wins and losses to improve your player selection strategy.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action - Only show for non-logged-in users */}
          {!isLoggedIn && (
            <div className="text-center mt-12">
              <Link 
                href="/login" 
                className="bg-secondary-500 hover:bg-secondary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl inline-flex items-center"
              >
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