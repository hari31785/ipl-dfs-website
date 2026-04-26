"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Shield, Users, Trophy, AlertCircle, CheckCircle, Scale, Clock, Target, Coins } from "lucide-react"

export default function RulesPage() {
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
              IPL DFS Rules & Regulations
            </h1>
            <p className="text-xl text-secondary-200">
              Official rules governing our fantasy cricket platform
            </p>
          </div>

          <div className="space-y-8">
            {/* Contest Rules */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Trophy className="h-6 w-6 mr-3 text-secondary-500" />
                Contest Rules
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Team Formation</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Each team must consist of exactly 5 main players + 2 substitute players (7 total)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Players can be selected from any IPL teams participating in the contest match</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>No restrictions on role distribution (can select any combination of batsmen, bowlers, all-rounders, wicket-keepers)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Team selection is done through a snake draft format</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Substitute players automatically replace main players flagged as DNP (Did Not Play)</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Draft Process</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Snake draft format: alternating picks between opponents</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>First pick is decided based on a coin flip</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Each player drafts 7 players total: 5 main players + 2 substitutes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>First picker gets picks: 1st, 4th, 5th, 8th, 9th, 12th, 13th</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Second picker gets picks: 2nd, 3rd, 6th, 7th, 10th, 11th, 14th</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Draft must be completed before the match starts</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Contest Format</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Head-to-head contests only (1 vs 1)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Random opponent matching system</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Winner gets points-based rewards</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>In case of a tie, no coins are transferred between players</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Scoring Rules */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Target className="h-6 w-6 mr-3 text-secondary-500" />
                Official Scoring System
              </h2>
              
              <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-6 mb-6">
                <p className="text-gray-700 text-center font-medium">
                  Our scoring system is based exclusively on official IPL match statistics
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="text-2xl mb-2">🏏</div>
                  <h4 className="font-bold text-primary-800 mb-2">Batting</h4>
                  <div className="text-green-700 font-bold text-lg">1 Point per Run</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                  <div className="text-2xl mb-2">🎯</div>
                  <h4 className="font-bold text-primary-800 mb-2">Bowling</h4>
                  <div className="text-blue-700 font-bold text-lg">20 Points per Wicket</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border border-orange-200">
                  <div className="text-2xl mb-2">🧤</div>
                  <h4 className="font-bold text-primary-800 mb-2">Fielding</h4>
                  <div className="text-orange-700 font-bold text-lg">5 Points Each</div>
                  <div className="text-xs text-gray-600 mt-1">Catch, Run Out, Stumping</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-primary-500">
                <h4 className="font-bold text-primary-800 mb-2">Important Scoring Notes</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Points are awarded based on actual match performance only</li>
                  <li>• No bonus points for milestones (50s, 100s, hat-tricks, etc.)</li>
                  <li>• No negative points for poor performance</li>
                  <li>• Statistics are sourced from official IPL data</li>
                  <li>• Points are final once match statistics are updated</li>
                  <li className="font-semibold text-orange-700">• Points accrued in any Super Over will <span className="underline font-bold uppercase">not</span> count towards final scores</li>
                </ul>
              </div>
            </div>

            {/* Player Eligibility */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Users className="h-6 w-6 mr-3 text-secondary-500" />
                Player Eligibility & Substitutions
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Eligible Players</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>All players registered in the current IPL tournament are eligible</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Players must be part of the playing XI to earn points</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Substitute (bench) players earn points <strong>only if they are moved into the starting 5</strong> to replace a DNP main player — bench players who are not promoted score 0 points</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Substitute Player Rules</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Each team drafts 2 substitute players in addition to 5 main players</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Substitutes automatically replace main players flagged as DNP (Did Not Play)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>Substitution order is determined by draft order (earlier drafted subs used first)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>A player earns points based on <strong>their own performance only</strong> — a player must be part of the playing XI to score</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>The IPL allows up to 12 active players (11 starters + 1 Impact Sub) — any of these 12 who appeared in the match will have their points counted toward your total</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Non-Playing Scenarios</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>If a drafted player doesn't play and isn't substituted, they score 0 points</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>Injuries (including concussions) during the match do <strong>not</strong> allow draft modifications — your drafted lineup is locked once the match begins</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>A player who was part of the <strong>starting XI or came on as an Impact Sub</strong> and then gets injured or suffers a concussion is <strong>not eligible to be marked as DNP</strong> — they participated in the match and any points they scored stand</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>Rain-affected or shortened matches: all participating player points count</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>Match cancellations result in all contests being voided and coins refunded</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Fair Play */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Shield className="h-6 w-6 mr-3 text-secondary-500" />
                Fair Play & Conduct
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Prohibited Activities</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>Creating multiple accounts to gain unfair advantages</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>Collusion with other players</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>Use of automated tools or bots</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>Sharing account credentials</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Penalties</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <Scale className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                      <span>First violation: Warning and contest forfeiture</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Scale className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                      <span>Repeated violations: Temporary account suspension</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Scale className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                      <span>Serious violations: Permanent account termination</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contest Timing */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Clock className="h-6 w-6 mr-3 text-secondary-500" />
                Contest Timing & Deadlines
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Registration Deadlines</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>Contest registration closes 15 minutes before match start time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>Draft must be completed before match start time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>No changes allowed once draft is complete</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Results & Payouts</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Results are processed within 2 hours of match completion</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Coin rewards are automatically credited to winner's account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Contest statistics are immediately available after processing</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* League Fee — hidden for now */}
            {false && <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Coins className="h-6 w-6 mr-3 text-secondary-500" />
                League Fee
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <p className="text-gray-700 text-sm">
                    IPL DFS charges a <strong>10% League Fee</strong> on winnings to cover hosting, platform maintenance, and prize administration.
                    VC won or lost in a matchup is determined by the <strong>difference in fantasy points</strong> between the two players — there is no fixed pot.
                  </p>
                </div>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>The amount of V̶₵ transferred is based on the <strong>points difference</strong> between you and your opponent</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>The League Fee is <strong>10% of the V̶₵ won</strong>, deducted from the winner automatically at settlement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>The League Fee is charged <strong>only to the winner</strong> — the losing player pays no fee</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Example: If the points difference earns you <strong>100 V̶₵</strong>, you receive <strong>90 V̶₵</strong> after the 10% fee</span>
                  </li>
                </ul>
              </div>
            </div>}

            {/* Disputes */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Scale className="h-6 w-6 mr-3 text-secondary-500" />
                Disputes & Support
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Scoring Disputes</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>All disputes must be submitted within 24 hours of contest completion</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Scoring is based on official IPL statistics only</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Platform admin decisions on scoring disputes are final</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Technical Issues</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>Report technical issues immediately through support channels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>Platform downtime may result in contest cancellation and refunds</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span>No liability for user connectivity issues during draft or gameplay</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="bg-gradient-to-br from-primary-800 to-primary-900 rounded-2xl p-8 text-white shadow-xl">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Shield className="h-6 w-6 mr-3 text-secondary-400" />
                Agreement & Compliance
              </h2>
              
              <div className="space-y-4 text-secondary-100">
                <p>
                  By participating in IPL DFS contests, you agree to abide by all rules and regulations outlined above.
                </p>
                <p>
                  These rules may be updated periodically. Users will be notified of significant changes via platform announcements.
                </p>
                <p>
                  For questions about these rules or to report violations, please contact our support team.
                </p>
              </div>

              {!isLoggedIn && (
                <div className="mt-8 text-center">
                  <Link 
                    href="/login" 
                    className="bg-secondary-500 hover:bg-secondary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl inline-flex items-center"
                  >
                    Accept Rules & Start Playing
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