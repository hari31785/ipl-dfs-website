"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Shield, Users, Trophy, AlertCircle, CheckCircle, Scale, Clock, Target } from "lucide-react"

export default function RulesContent() {
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">IPL DFS Rules & Regulations</h1>
            <p className="text-xl text-secondary-200">Official rules governing our fantasy cricket platform</p>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Trophy className="h-6 w-6 mr-3 text-secondary-500" />Contest Rules
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Team Formation</h3>
                  <ul className="space-y-2 text-gray-700">
                    {[
                      "Each team must consist of exactly 5 main players + 2 substitute players (7 total)",
                      "Players can be selected from any IPL teams participating in the contest match",
                      "No restrictions on role distribution (can select any combination of batsmen, bowlers, all-rounders, wicket-keepers)",
                      "Team selection is done through a snake draft format",
                      "Substitute players automatically replace main players flagged as DNP (Did Not Play)",
                    ].map(text => (
                      <li key={text} className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Draft Process</h3>
                  <ul className="space-y-2 text-gray-700">
                    {[
                      "Snake draft format: alternating picks between opponents",
                      "First pick is decided based on a coin flip",
                      "Each player drafts 7 players total: 5 main players + 2 substitutes",
                      "First picker gets picks: 1st, 4th, 5th, 8th, 9th, 12th, 13th",
                      "Second picker gets picks: 2nd, 3rd, 6th, 7th, 10th, 11th, 14th",
                      "Draft must be completed before the match starts",
                    ].map(text => (
                      <li key={text} className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Contest Format</h3>
                  <ul className="space-y-2 text-gray-700">
                    {[
                      "Head-to-head contests only (1 vs 1)",
                      "Random opponent matching system",
                      "Winner gets points-based rewards",
                      "In case of a tie, no coins are transferred between players",
                    ].map(text => (
                      <li key={text} className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Target className="h-6 w-6 mr-3 text-secondary-500" />Official Scoring System
              </h2>
              <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-6 mb-6">
                <p className="text-gray-700 text-center font-medium">Our scoring system is based exclusively on official IPL match statistics</p>
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
                  <li className="font-semibold text-red-700">• <span className="underline font-bold uppercase">Match Abandonment:</span> If any team is forced to play less than 15 overs due to rain or other unforeseen issues (not due to being all out), the match will be abandoned and all contests voided with coins refunded</li>
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl border-l-4 border-amber-500">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <span className="text-3xl mr-3">🎖️</span>Captain Mode (Optional 2× Bonus)
              </h2>
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 mb-6 border-2 border-amber-300">
                <p className="text-gray-800 font-semibold text-center text-lg">Double your star player's points — if both users agree!</p>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3 text-lg">How Captain Mode Works</h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-3">
                      <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                      <div><strong>Opt-In During Draft:</strong> When you enter the draft room, you'll see a modal asking if you want to enable Captain Mode. Both users must agree.</div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                      <div><strong>Complete Your Draft:</strong> Pick your 5 starters + 2 bench players as usual through the snake draft.</div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                      <div><strong>Select Your Captain:</strong> After the draft completes, choose ONE of your 5 starters as your captain. This player's points will count <strong className="text-amber-700">×2 (doubled)</strong>.</div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                      <div><strong>Captain Bonus Applied:</strong> During scoring, your captain's performance is automatically doubled. If your captain scores 60 points, you get 120 points!</div>
                    </li>
                  </ul>
                </div>
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
                  <h3 className="font-bold text-red-800 mb-3 text-lg flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />⚠️ CRITICAL: Must Pick Captain After Opt-In
                  </h3>
                  <ul className="space-y-2 text-red-900">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div><strong>If you opt in to Captain Mode but do NOT select a captain pick:</strong> You will receive <strong className="underline">NO 2× bonus</strong> on any of your players — all your players score normal (1×) points.</div>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div><strong>Your opponent WILL still get their captain bonus</strong> if they picked one. This puts you at a massive disadvantage!</div>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div><strong>Captain selection is YOUR responsibility.</strong> Always pick your captain immediately after the draft completes if you opted in.</div>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Captain Mode Rules</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>Captain can only be selected from your 5 starting players (not bench)</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>If one user declines Captain Mode, it's disabled for the entire matchup</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>Captain pick cannot be changed once selected</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>If your captain is marked DNP, their substitute's points are NOT doubled</span></li>
                    <li className="flex items-start gap-2"><AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" /><span>Admin can manually enable Captain Mode and set captains for any matchup</span></li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center"><Target className="h-4 w-4 mr-2" />Strategy Tip</h4>
                  <p className="text-blue-800 text-sm">Choose a captain who has high scoring potential (batsmen with good form, or key bowlers on helpful pitches). The 2× multiplier can be the difference between winning and losing!</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Users className="h-6 w-6 mr-3 text-secondary-500" />Player Eligibility & Substitutions
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Eligible Players</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>All players registered in the current IPL tournament are eligible</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>Players must be part of the playing XI to earn points</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>Substitute (bench) players earn points <strong>only if they are moved into the starting 5</strong> to replace a DNP main player — bench players who are not promoted score 0 points</span></li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Substitute Player Rules</h3>
                  <ul className="space-y-2 text-gray-700">
                    {[
                      { icon: CheckCircle, color: "text-green-600", text: "Each team drafts 2 substitute players in addition to 5 main players" },
                      { icon: CheckCircle, color: "text-green-600", text: "Substitutes automatically replace main players flagged as DNP (Did Not Play)" },
                      { icon: AlertCircle, color: "text-blue-600", text: "Substitution order is determined by draft order (earlier drafted subs used first)" },
                      { icon: AlertCircle, color: "text-blue-600", text: "A player earns points based on their own performance only — a player must be part of the playing XI to score" },
                      { icon: AlertCircle, color: "text-blue-600", text: "The IPL allows up to 12 active players (11 starters + 1 Impact Sub) — any of these 12 who appeared in the match will have their points counted toward your total" },
                    ].map(({ icon: Icon, color, text }, i) => (
                      <li key={i} className="flex items-start gap-2"><Icon className={`h-4 w-4 ${color} mt-1 flex-shrink-0`} /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Non-Playing Scenarios</h3>
                  <ul className="space-y-2 text-gray-700">
                    {[
                      "If a drafted player doesn't play and isn't substituted, they score 0 points",
                      "Injuries (including concussions) during the match do not allow draft modifications — your drafted lineup is locked once the match begins",
                      "A player who was part of the starting XI or came on as an Impact Sub and then gets injured or suffers a concussion is not eligible to be marked as DNP — they participated in the match and any points they scored stand",
                      "Rain-affected or shortened matches: all participating player points count",
                      "Match cancellations result in all contests being voided and coins refunded",
                    ].map((text, i) => (
                      <li key={i} className="flex items-start gap-2"><AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Shield className="h-6 w-6 mr-3 text-secondary-500" />Fair Play & Conduct
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Prohibited Activities</h3>
                  <ul className="space-y-2 text-gray-700">
                    {["Creating multiple accounts to gain unfair advantages", "Collusion with other players", "Use of automated tools or bots", "Sharing account credentials"].map(text => (
                      <li key={text} className="flex items-start gap-2"><AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Penalties</h3>
                  <ul className="space-y-2 text-gray-700">
                    {["First violation: Warning and contest forfeiture", "Repeated violations: Temporary account suspension", "Serious violations: Permanent account termination"].map(text => (
                      <li key={text} className="flex items-start gap-2"><Scale className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Clock className="h-6 w-6 mr-3 text-secondary-500" />Contest Timing & Deadlines
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Registration Deadlines</h3>
                  <ul className="space-y-2 text-gray-700">
                    {["Contest registration closes 15 minutes before match start time", "Draft must be completed before match start time", "No changes allowed once draft is complete"].map(text => (
                      <li key={text} className="flex items-start gap-2"><Clock className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Results & Payouts</h3>
                  <ul className="space-y-2 text-gray-700">
                    {["Results are processed within 2 hours of match completion", "Coin rewards are automatically credited to winner's account", "Contest statistics are immediately available after processing"].map(text => (
                      <li key={text} className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Scale className="h-6 w-6 mr-3 text-secondary-500" />Disputes & Support
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Scoring Disputes</h3>
                  <ul className="space-y-2 text-gray-700">
                    {["All disputes must be submitted within 24 hours of contest completion", "Scoring is based on official IPL statistics only", "Platform admin decisions on scoring disputes are final"].map(text => (
                      <li key={text} className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Technical Issues</h3>
                  <ul className="space-y-2 text-gray-700">
                    {["Report technical issues immediately through support channels", "Platform downtime may result in contest cancellation and refunds", "No liability for user connectivity issues during draft or gameplay"].map(text => (
                      <li key={text} className="flex items-start gap-2"><AlertCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" /><span>{text}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-800 to-primary-900 rounded-2xl p-8 text-white shadow-xl">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Shield className="h-6 w-6 mr-3 text-secondary-400" />Agreement & Compliance
              </h2>
              <div className="space-y-4 text-secondary-100">
                <p>By participating in IPL DFS contests, you agree to abide by all rules and regulations outlined above.</p>
                <p>These rules may be updated periodically. Users will be notified of significant changes via platform announcements.</p>
                <p>For questions about these rules or to report violations, please contact our support team.</p>
              </div>
              {!isLoggedIn && (
                <div className="mt-8 text-center">
                  <Link href="/login" className="bg-secondary-500 hover:bg-secondary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl inline-flex items-center">
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
  )
}
