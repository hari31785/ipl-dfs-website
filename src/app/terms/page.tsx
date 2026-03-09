"use client"

import Link from "next/link"
import { ArrowLeft, Scale, FileText, Shield, AlertTriangle, CheckCircle, Gavel } from "lucide-react"

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="inline-flex items-center text-white hover:text-secondary-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
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
              Terms of Service
            </h1>
            <p className="text-xl text-secondary-200">
              Legal terms governing your use of IPL DFS
            </p>
            <div className="text-secondary-300 text-sm mt-4">
              Last Updated: March 9, 2026
            </div>
          </div>

          <div className="space-y-8">
            {/* Introduction */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <FileText className="h-6 w-6 mr-3 text-secondary-500" />
                Agreement to Terms
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <p>
                  Welcome to IPL DFS ("we," "our," or "us"). These Terms of Service ("Terms") govern your 
                  access to and use of our fantasy cricket platform, including our website, mobile applications, 
                  and related services (collectively, the "Service").
                </p>
                <p>
                  By accessing or using our Service, you agree to be bound by these Terms. If you disagree 
                  with any part of these terms, then you may not access the Service.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-semibold">
                    Please read these Terms carefully before using our Service.
                  </p>
                </div>
              </div>
            </div>

            {/* Eligibility */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <CheckCircle className="h-6 w-6 mr-3 text-secondary-500" />
                Eligibility
              </h2>
              
              <div className="space-y-4">
                <h3 className="font-bold text-primary-800 mb-3">Age Requirements</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>You must be at least 18 years of age to use our Service</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>You must have the legal capacity to enter into binding agreements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>You must not be restricted from using the Service under applicable laws</span>
                  </li>
                </ul>

                <h3 className="font-bold text-primary-800 mb-3">Account Requirements</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>One account per person - multiple accounts are prohibited</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>You must provide accurate and complete information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>You are responsible for maintaining account security</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Use of Service */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6">
                Use of Service
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Permitted Use</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Create and participate in fantasy cricket contests</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Interact with other users in a respectful manner</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Use the Service for personal, non-commercial purposes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Access publicly available features and content</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Prohibited Conduct</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                      <span>Creating multiple accounts or sharing accounts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                      <span>Using automated tools, bots, or scripts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                      <span>Attempting to gain unauthorized access to other accounts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                      <span>Manipulating or exploiting system vulnerabilities</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                      <span>Harassment, abuse, or inappropriate communication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                      <span>Violating intellectual property rights</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contest Rules */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Scale className="h-6 w-6 mr-3 text-secondary-500" />
                Contest Rules and Fair Play
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Contest Participation</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• All contest rules as detailed in our Rules page apply</li>
                    <li>• Teams are locked after draft completion - no modifications allowed</li>
                    <li>• Scoring is based exclusively on official IPL statistics</li>
                    <li>• Contest results are final once officially processed</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Fair Play Policy</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 font-semibold mb-2">Zero Tolerance for:</p>
                    <ul className="space-y-1 text-red-700 text-sm">
                      <li>• Collusion between users in contests</li>
                      <li>• Using inside information not publicly available</li>
                      <li>• Creating multiple accounts for unfair advantage</li>
                      <li>• Any form of cheating or manipulation</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Dispute Resolution</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• All disputes must be submitted within 24 hours of contest completion</li>
                    <li>• Our support team reviews disputes using official data sources</li>
                    <li>• Admin decisions on scoring and rule interpretations are final</li>
                    <li>• Repeated frivolous disputes may result in account restrictions</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Intellectual Property */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6">
                Intellectual Property Rights
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Our Rights</h3>
                  <p>
                    The Service and its original content, features, and functionality are and will remain 
                    the exclusive property of IPL DFS and its licensors. The Service is protected by 
                    copyright, trademark, and other laws.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Your Rights</h3>
                  <p>
                    You retain ownership of any content you submit to the Service. By submitting content, 
                    you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, 
                    and display such content in connection with the Service.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Third-Party Content</h3>
                  <p>
                    IPL player names, team names, logos, and statistics are the property of their 
                    respective owners. We use such content under fair use principles for fantasy 
                    sports purposes only.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy and Data */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Shield className="h-6 w-6 mr-3 text-secondary-500" />
                Privacy and Data Protection
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <p>
                  Your privacy is important to us. Our collection and use of personal information is 
                  governed by our Privacy Policy, which is incorporated into these Terms by reference.
                </p>
                <p>
                  By using the Service, you consent to the collection and use of information as 
                  outlined in our Privacy Policy.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800">
                    <strong>Important:</strong> Please review our <Link href="/privacy" className="underline">Privacy Policy</Link> 
                    to understand how we handle your personal information.
                  </p>
                </div>
              </div>
            </div>

            {/* Disclaimers and Limitations */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6">
                Disclaimers and Limitations of Liability
              </h2>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-bold text-yellow-800 mb-2">Service Disclaimer</h3>
                  <p className="text-yellow-700 text-sm">
                    The Service is provided "as is" and "as available" without warranties of any kind, 
                    either express or implied. We do not guarantee that the Service will be uninterrupted, 
                    error-free, or completely secure.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Limitation of Liability</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• We are not liable for any indirect, incidental, or consequential damages</li>
                    <li>• Our total liability is limited to the amount you paid us in the last 12 months</li>
                    <li>• We are not responsible for technical issues, server downtime, or data loss</li>
                    <li>• Fantasy sports involve skill and chance - we cannot guarantee winnings</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">External Dependencies</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• We rely on official IPL data sources for scoring accuracy</li>
                    <li>• Match cancellations or postponements are beyond our control</li>
                    <li>• Internet connectivity and device compatibility are user responsibilities</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Termination */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6">
                Account Termination
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Termination by You</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• You may delete your account at any time</li>
                    <li>• Contact support for complete account removal</li>
                    <li>• Outstanding contests will be completed</li>
                    <li>• Coin balances may be forfeited upon deletion</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Termination by Us</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• We may suspend or terminate accounts for violations</li>
                    <li>• Serious violations may result in immediate termination</li>
                    <li>• We may terminate the Service with 30 days notice</li>
                    <li>• Appeal process available for account actions</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-800 text-sm">
                  <strong>Effect of Termination:</strong> Upon termination, your right to use the Service 
                  ceases immediately. Provisions regarding intellectual property, disclaimers, and 
                  limitations of liability survive termination.
                </p>
              </div>
            </div>

            {/* Governing Law */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Gavel className="h-6 w-6 mr-3 text-secondary-500" />
                Governing Law and Disputes
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Applicable Law</h3>
                  <p>
                    These Terms are governed by and construed in accordance with the laws of India, 
                    without regard to conflict of law principles.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Dispute Resolution Process</h3>
                  <ol className="space-y-2 list-decimal list-inside text-sm">
                    <li><strong>Direct Resolution:</strong> Contact our support team first</li>
                    <li><strong>Mediation:</strong> Attempt good faith mediation if direct resolution fails</li>
                    <li><strong>Arbitration:</strong> Binding arbitration for unresolved disputes</li>
                    <li><strong>Jurisdiction:</strong> Courts of Mumbai, India for any legal proceedings</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Changes to Terms */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6">
                Changes to These Terms
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <p>
                  We reserve the right to modify or replace these Terms at any time. If a revision 
                  is material, we will provide at least 30 days notice prior to any new terms taking effect.
                </p>
                <p>
                  When we update these Terms, we will:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Update the "Last Updated" date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Notify registered users via email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Post announcements on our platform</span>
                  </li>
                </ul>
                <p>
                  Your continued use of the Service after changes become effective constitutes 
                  acceptance of the new Terms.
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gradient-to-br from-primary-800 to-primary-900 rounded-2xl p-8 text-white shadow-xl">
              <h2 className="text-2xl font-bold mb-6">
                Questions About These Terms?
              </h2>
              
              <div className="space-y-4 text-secondary-100">
                <p>
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="space-y-2">
                    <div><strong>Email:</strong> legal@ipldfs.com</div>
                    <div><strong>Subject Line:</strong> Terms of Service Question</div>
                    <div><strong>General Support:</strong> support@ipldfs.com</div>
                  </div>
                </div>
                <p className="text-sm">
                  We will do our best to respond to all inquiries within 48 hours.
                </p>
              </div>

              <div className="mt-8 text-center">
                <Link 
                  href="/contact" 
                  className="bg-secondary-500 hover:bg-secondary-600 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl inline-flex items-center"
                >
                  Contact Support
                  <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}