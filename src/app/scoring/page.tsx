"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Target, TrendingUp, Calculator, Award, BarChart3, Zap, Trophy, CheckCircle } from "lucide-react"

export default function ScoringPage() {
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
              IPL DFS Scoring System
            </h1>
            <p className="text-xl text-secondary-200">
              Complete guide to how fantasy cricket points are calculated
            </p>
          </div>

          <div className="space-y-8">
            {/* Overview */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Target className="h-6 w-6 mr-3 text-secondary-500" />
                Scoring Overview
              </h2>
              
              <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-6 mb-6">
                <p className="text-gray-700 text-center font-medium text-lg">
                  Our scoring system is simple, transparent, and based entirely on official IPL match statistics
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <div className="text-5xl mb-4">🏏</div>
                  <h3 className="font-bold text-primary-800 text-xl mb-3">Batting Points</h3>
                  <div className="text-green-700 font-black text-3xl mb-2">1</div>
                  <div className="text-sm text-gray-600 font-medium">point per run scored</div>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="font-bold text-primary-800 text-xl mb-3">Bowling Points</h3>
                  <div className="text-blue-700 font-black text-3xl mb-2">20</div>
                  <div className="text-sm text-gray-600 font-medium">points per wicket taken</div>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border-2 border-orange-200">
                  <div className="text-5xl mb-4">🧤</div>
                  <h3 className="font-bold text-primary-800 text-xl mb-3">Fielding Points</h3>
                  <div className="text-orange-700 font-black text-3xl mb-2">5</div>
                  <div className="text-sm text-gray-600 font-medium">points per catch/run out/stumping</div>
                </div>
              </div>
            </div>

            {/* Detailed Scoring Breakdown */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <BarChart3 className="h-6 w-6 mr-3 text-secondary-500" />
                Detailed Scoring Breakdown
              </h2>
              
              <div className="space-y-8">
                {/* Batting */}
                <div>
                  <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      🏏
                    </div>
                    Batting Performance
                  </h3>
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-green-800 mb-3">How It Works</h4>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span>1 point for every run scored</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span>No bonus for boundaries or milestones</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span>No negative points for getting out</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span>Includes runs from extras (byes, leg-byes)</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-800 mb-3">Examples</h4>
                        <div className="space-y-2 text-sm">
                          <div className="bg-white rounded p-3 border border-green-300">
                            <div className="font-medium text-green-800">45 runs scored = 45 points</div>
                          </div>
                          <div className="bg-white rounded p-3 border border-green-300">
                            <div className="font-medium text-green-800">78 not out = 78 points</div>
                          </div>
                          <div className="bg-white rounded p-3 border border-green-300">
                            <div className="font-medium text-green-800">0 runs (duck) = 0 points</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bowling */}
                <div>
                  <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      🎯
                    </div>
                    Bowling Performance
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-3">How It Works</h4>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span>20 points for every wicket taken</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span>No bonus for maiden overs</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span>No bonus for multiple wickets</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span>No negative points for runs conceded</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-3">Examples</h4>
                        <div className="space-y-2 text-sm">
                          <div className="bg-white rounded p-3 border border-blue-300">
                            <div className="font-medium text-blue-800">1 wicket = 20 points</div>
                          </div>
                          <div className="bg-white rounded p-3 border border-blue-300">
                            <div className="font-medium text-blue-800">3 wickets = 60 points</div>
                          </div>
                          <div className="bg-white rounded p-3 border border-blue-300">
                            <div className="font-medium text-blue-800">No wickets = 0 points</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fielding */}
                <div>
                  <h3 className="text-xl font-bold text-orange-800 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                      🧤
                    </div>
                    Fielding Performance
                  </h3>
                  <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-orange-800 mb-3">How It Works</h4>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                            <span>5 points for each catch taken</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                            <span>5 points for each run out executed</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                            <span>5 points for each stumping</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                            <span>All fielding actions count equally</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-800 mb-3">Examples</h4>
                        <div className="space-y-2 text-sm">
                          <div className="bg-white rounded p-3 border border-orange-300">
                            <div className="font-medium text-orange-800">2 catches = 10 points</div>
                          </div>
                          <div className="bg-white rounded p-3 border border-orange-300">
                            <div className="font-medium text-orange-800">1 run out = 5 points</div>
                          </div>
                          <div className="bg-white rounded p-3 border border-orange-300">
                            <div className="font-medium text-orange-800">1 stumping = 5 points</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scoring Formula */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Calculator className="h-6 w-6 mr-3 text-secondary-500" />
                Official Scoring Formula
              </h2>
              
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-primary-800 mb-4 text-center">Complete Points Calculation</h3>
                <div className="font-mono text-lg bg-white p-4 rounded-lg border-2 border-primary-200 text-center">
                  <span className="text-primary-800 font-bold">Total Points = </span>
                  <span className="text-green-700">(Runs × 1)</span>
                  <span className="text-gray-500"> + </span>
                  <span className="text-blue-700">(Wickets × 20)</span>
                  <span className="text-gray-500"> + </span>
                  <span className="text-orange-700">(Fielding × 5)</span>
                </div>
                <div className="text-sm text-gray-600 text-center mt-2">
                  Where Fielding = Catches + Run Outs + Stumpings
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-primary-800 mb-3">Why This System?</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-secondary-500 flex-shrink-0" />
                      <span>Simple and easy to understand</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-secondary-500 flex-shrink-0" />
                      <span>Based on actual cricket performance</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-secondary-500 flex-shrink-0" />
                      <span>No complex bonus calculations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-secondary-500 flex-shrink-0" />
                      <span>Transparent and fair scoring</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-primary-800 mb-3">What's NOT Included</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 text-red-500 flex-shrink-0">✗</span>
                      <span>Bonus for boundaries (4s/6s)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 text-red-500 flex-shrink-0">✗</span>
                      <span>Milestone bonuses (50s, 100s)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 text-red-500 flex-shrink-0">✗</span>
                      <span>Negative points for dismissals</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 text-red-500 flex-shrink-0">✗</span>
                      <span>Economy rate considerations</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Scoring Examples */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <TrendingUp className="h-6 w-6 mr-3 text-secondary-500" />
                Real Player Examples
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <h4 className="font-bold text-green-800 mb-4">Example 1: Explosive Batsman</h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-green-300">
                      <div className="text-sm text-gray-600">Performance:</div>
                      <div className="font-medium text-green-800">85 runs, 0 wickets, 1 catch</div>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>• Batting: 85 × 1 = <span className="font-bold text-green-700">85 points</span></div>
                      <div>• Bowling: 0 × 20 = <span className="font-bold text-blue-700">0 points</span></div>
                      <div>• Fielding: 1 × 5 = <span className="font-bold text-orange-700">5 points</span></div>
                    </div>
                    <div className="border-t border-green-300 pt-3">
                      <div className="font-bold text-primary-800 text-lg">Total: 90 Points</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-4">Example 2: Strike Bowler</h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-blue-300">
                      <div className="text-sm text-gray-600">Performance:</div>
                      <div className="font-medium text-blue-800">12 runs, 3 wickets, 0 catches</div>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>• Batting: 12 × 1 = <span className="font-bold text-green-700">12 points</span></div>
                      <div>• Bowling: 3 × 20 = <span className="font-bold text-blue-700">60 points</span></div>
                      <div>• Fielding: 0 × 5 = <span className="font-bold text-orange-700">0 points</span></div>
                    </div>
                    <div className="border-t border-blue-300 pt-3">
                      <div className="font-bold text-primary-800 text-lg">Total: 72 Points</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-200">
                  <h4 className="font-bold text-orange-800 mb-4">Example 3: All-Rounder</h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-orange-300">
                      <div className="text-sm text-gray-600">Performance:</div>
                      <div className="font-medium text-orange-800">45 runs, 2 wickets, 2 catches</div>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>• Batting: 45 × 1 = <span className="font-bold text-green-700">45 points</span></div>
                      <div>• Bowling: 2 × 20 = <span className="font-bold text-blue-700">40 points</span></div>
                      <div>• Fielding: 2 × 5 = <span className="font-bold text-orange-700">10 points</span></div>
                    </div>
                    <div className="border-t border-orange-300 pt-3">
                      <div className="font-bold text-primary-800 text-lg">Total: 95 Points</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <h4 className="font-bold text-purple-800 mb-4">Example 4: Wicket-Keeper</h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-purple-300">
                      <div className="text-sm text-gray-600">Performance:</div>
                      <div className="font-medium text-purple-800">38 runs, 0 wickets, 3 catches, 1 stumping</div>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>• Batting: 38 × 1 = <span className="font-bold text-green-700">38 points</span></div>
                      <div>• Bowling: 0 × 20 = <span className="font-bold text-blue-700">0 points</span></div>
                      <div>• Fielding: 4 × 5 = <span className="font-bold text-orange-700">20 points</span></div>
                    </div>
                    <div className="border-t border-purple-300 pt-3">
                      <div className="font-bold text-primary-800 text-lg">Total: 58 Points</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Award className="h-6 w-6 mr-3 text-secondary-500" />
                Important Scoring Notes
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-primary-800 mb-3">Data Sources</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>All statistics sourced from official IPL data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Points calculated immediately after match completion</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Final statistics are verified and locked</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-primary-800 mb-3">Special Scenarios</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Rain-affected matches: all participating player points count</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Super over performances count towards total</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Substitute player points count if they participate</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="bg-gradient-to-br from-primary-800 to-primary-900 rounded-2xl p-8 text-white shadow-xl">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Trophy className="h-6 w-6 mr-3 text-secondary-400" />
                Ready to Test Your Knowledge?
              </h2>
              
              <div className="space-y-4 text-secondary-100 mb-8">
                <p>
                  Now that you understand our scoring system, you're ready to draft your fantasy cricket teams and compete!
                </p>
                <p>
                  Remember: the key to success is balancing players who can contribute across multiple areas - batting, bowling, and fielding.
                </p>
              </div>

              {!isLoggedIn && (
                <div className="text-center">
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
      </div>
    </div>
  );
}