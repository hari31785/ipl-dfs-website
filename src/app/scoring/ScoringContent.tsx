"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Target, TrendingUp, Calculator, Award, BarChart3, Zap, Trophy, CheckCircle } from "lucide-react"

export default function ScoringContent() {
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">IPL DFS Scoring System</h1>
            <p className="text-xl text-secondary-200">Complete guide to how fantasy cricket points are calculated</p>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Target className="h-6 w-6 mr-3 text-secondary-500" />Scoring Overview
              </h2>
              <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-6 mb-6">
                <p className="text-gray-700 text-center font-medium text-lg">Our scoring system is simple, transparent, and based entirely on official IPL match statistics</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { emoji: "🏏", title: "Batting Points", pts: "1", unit: "point per run scored", bg: "from-green-50 to-emerald-50", border: "border-green-200", color: "text-green-700" },
                  { emoji: "🎯", title: "Bowling Points", pts: "20", unit: "points per wicket taken", bg: "from-blue-50 to-cyan-50", border: "border-blue-200", color: "text-blue-700" },
                  { emoji: "🧤", title: "Fielding Points", pts: "5", unit: "points per catch/run out/stumping", bg: "from-orange-50 to-yellow-50", border: "border-orange-200", color: "text-orange-700" },
                ].map(({ emoji, title, pts, unit, bg, border, color }) => (
                  <div key={title} className={`text-center p-6 bg-gradient-to-br ${bg} rounded-xl border-2 ${border}`}>
                    <div className="text-5xl mb-4">{emoji}</div>
                    <h3 className="font-bold text-primary-800 text-xl mb-3">{title}</h3>
                    <div className={`${color} font-black text-3xl mb-2`}>{pts}</div>
                    <div className="text-sm text-gray-600 font-medium">{unit}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <BarChart3 className="h-6 w-6 mr-3 text-secondary-500" />Detailed Scoring Breakdown
              </h2>
              <div className="space-y-8">
                {[
                  {
                    emoji: "🏏", title: "Batting Performance", color: "green",
                    howItWorks: ["1 point for every run scored", "No bonus for boundaries or milestones", "No negative points for getting out", "Includes runs from extras (byes, leg-byes)"],
                    examples: ["45 runs scored = 45 points", "78 not out = 78 points", "0 runs (duck) = 0 points"],
                  },
                  {
                    emoji: "🎯", title: "Bowling Performance", color: "blue",
                    howItWorks: ["20 points for every wicket taken", "No bonus for maiden overs", "No bonus for multiple wickets", "No negative points for runs conceded"],
                    examples: ["1 wicket = 20 points", "3 wickets = 60 points", "No wickets = 0 points"],
                  },
                  {
                    emoji: "🧤", title: "Fielding Performance", color: "orange",
                    howItWorks: ["5 points for each catch taken", "5 points for each run out executed", "5 points for each stumping", "All fielding actions count equally"],
                    examples: ["2 catches = 10 points", "1 run out = 5 points", "1 stumping = 5 points"],
                  },
                ].map(({ emoji, title, color, howItWorks, examples }) => (
                  <div key={title}>
                    <h3 className={`text-xl font-bold text-${color}-800 mb-4 flex items-center`}>
                      <div className={`w-8 h-8 bg-${color}-100 rounded-full flex items-center justify-center mr-3`}>{emoji}</div>
                      {title}
                    </h3>
                    <div className={`bg-${color}-50 rounded-lg p-6 border border-${color}-200`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className={`font-semibold text-${color}-800 mb-3`}>How It Works</h4>
                          <ul className="space-y-2 text-sm text-gray-700">
                            {howItWorks.map(text => (
                              <li key={text} className="flex items-center gap-2"><CheckCircle className={`h-4 w-4 text-${color}-600 flex-shrink-0`} /><span>{text}</span></li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className={`font-semibold text-${color}-800 mb-3`}>Examples</h4>
                          <div className="space-y-2 text-sm">
                            {examples.map(ex => (
                              <div key={ex} className={`bg-white rounded p-3 border border-${color}-300`}>
                                <div className={`font-medium text-${color}-800`}>{ex}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Calculator className="h-6 w-6 mr-3 text-secondary-500" />Official Scoring Formula
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
                <div className="text-sm text-gray-600 text-center mt-2">Where Fielding = Catches + Run Outs + Stumpings</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-primary-800 mb-3">Why This System?</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {["Simple and easy to understand", "Based on actual cricket performance", "No complex bonus calculations", "Transparent and fair scoring"].map(text => (
                      <li key={text} className="flex items-center gap-2"><Zap className="h-4 w-4 text-secondary-500 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-primary-800 mb-3">What&apos;s NOT Included</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {["Bonus for boundaries (4s/6s)", "Milestone bonuses (50s, 100s)", "Negative points for dismissals", "Economy rate considerations"].map(text => (
                      <li key={text} className="flex items-center gap-2"><span className="text-red-500 flex-shrink-0">✗</span><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <TrendingUp className="h-6 w-6 mr-3 text-secondary-500" />Real Player Examples
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { title: "Example 1: Explosive Batsman", runs: 85, wickets: 0, fielding: 1, total: 90, bg: "from-green-50 to-emerald-50", border: "border-green-200", color: "green" },
                  { title: "Example 2: Strike Bowler", runs: 12, wickets: 3, fielding: 0, total: 72, bg: "from-blue-50 to-cyan-50", border: "border-blue-200", color: "blue" },
                  { title: "Example 3: All-Rounder", runs: 45, wickets: 2, fielding: 2, total: 95, bg: "from-orange-50 to-yellow-50", border: "border-orange-200", color: "orange" },
                  { title: "Example 4: Wicket-Keeper", runs: 38, wickets: 0, fielding: 4, total: 58, bg: "from-purple-50 to-pink-50", border: "border-purple-200", color: "purple" },
                ].map(({ title, runs, wickets, fielding, total, bg, border, color }) => (
                  <div key={title} className={`bg-gradient-to-br ${bg} rounded-xl p-6 border ${border}`}>
                    <h4 className={`font-bold text-${color}-800 mb-4`}>{title}</h4>
                    <div className="space-y-3">
                      <div className={`bg-white rounded-lg p-3 border border-${color}-300`}>
                        <div className="text-sm text-gray-600">Performance:</div>
                        <div className={`font-medium text-${color}-800`}>{runs} runs, {wickets} wickets, {fielding} catch{fielding !== 1 ? 'es' : ''}</div>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>• Batting: {runs} × 1 = <span className="font-bold text-green-700">{runs} points</span></div>
                        <div>• Bowling: {wickets} × 20 = <span className="font-bold text-blue-700">{wickets * 20} points</span></div>
                        <div>• Fielding: {fielding} × 5 = <span className="font-bold text-orange-700">{fielding * 5} points</span></div>
                      </div>
                      <div className={`border-t border-${color}-300 pt-3`}>
                        <div className="font-bold text-primary-800 text-lg">Total: {total} Points</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Award className="h-6 w-6 mr-3 text-secondary-500" />Important Scoring Notes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-primary-800 mb-3">Data Sources</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {["All statistics sourced from official IPL data", "Points calculated immediately after match completion", "Final statistics are verified and locked"].map(text => (
                      <li key={text} className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-primary-800 mb-3">Special Scenarios</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {["Rain-affected matches: all participating player points count", "Super over performances count towards total", "Substitute player points count if they participate"].map(text => (
                      <li key={text} className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-800 to-primary-900 rounded-2xl p-8 text-white shadow-xl">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Trophy className="h-6 w-6 mr-3 text-secondary-400" />Ready to Test Your Knowledge?
              </h2>
              <div className="space-y-4 text-secondary-100 mb-8">
                <p>Now that you understand our scoring system, you&apos;re ready to draft your fantasy cricket teams and compete!</p>
                <p>Remember: the key to success is balancing players who can contribute across multiple areas - batting, bowling, and fielding.</p>
              </div>
              {!isLoggedIn && (
                <div className="text-center">
                  <Link href="/login" className="bg-secondary-500 hover:bg-secondary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl inline-flex items-center">
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
  )
}
