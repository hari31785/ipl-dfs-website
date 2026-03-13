"use client"

import Link from "next/link"
import { ArrowLeft, Shield, Eye, Lock, Database, Cookie, UserCheck } from "lucide-react"

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-xl text-secondary-200">
              How we collect, use, and protect your information
            </p>
            <div className="text-secondary-300 text-sm mt-4">
              Last Updated: March 9, 2026
            </div>
          </div>

          <div className="space-y-8">
            {/* Introduction */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Shield className="h-6 w-6 mr-3 text-secondary-500" />
                Introduction
              </h2>
              
              <div className="prose text-gray-700 space-y-4">
                <p>
                  At IPL DFS ("we," "our," or "us"), we are committed to protecting your privacy and ensuring 
                  the security of your personal information. This Privacy Policy explains how we collect, use, 
                  disclose, and safeguard your information when you use our fantasy cricket platform.
                </p>
                <p>
                  By using our service, you consent to the data practices described in this policy. 
                  If you do not agree with the practices described in this policy, please do not use our service.
                </p>
              </div>
            </div>

            {/* Information We Collect */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Database className="h-6 w-6 mr-3 text-secondary-500" />
                Information We Collect
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-primary-800 mb-4">Personal Information You Provide</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <UserCheck className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span><strong>Account Information:</strong> Username, email address, and password</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <UserCheck className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span><strong>Profile Information:</strong> Display name and optional profile details</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <UserCheck className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span><strong>Communication:</strong> Messages you send through our contact forms or support channels</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary-800 mb-4">Automatically Collected Information</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <Eye className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span><strong>Usage Data:</strong> Pages visited, features used, time spent on platform</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Eye className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span><strong>Device Information:</strong> Browser type, operating system, IP address</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Eye className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span><strong>Game Data:</strong> Draft selections, contest participation, scoring history</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary-800 mb-4">Cookies and Tracking Technologies</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <Cookie className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                      <span><strong>Essential Cookies:</strong> Required for login, session management, and security</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Cookie className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                      <span><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Cookie className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                      <span><strong>Preference Cookies:</strong> Remember your settings and preferences</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* How We Use Information */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6">
                How We Use Your Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-primary-800">Service Operation</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Provide and maintain our fantasy cricket platform</li>
                    <li>• Process contest entries and calculate scores</li>
                    <li>• Manage user accounts and authentication</li>
                    <li>• Enable communication between users during drafts</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-primary-800">Communication</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Send important service announcements</li>
                    <li>• Provide customer support</li>
                    <li>• Notify about contest results and updates</li>
                    <li>• Respond to your inquiries and feedback</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-primary-800">Platform Improvement</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Analyze usage patterns and user behavior</li>
                    <li>• Improve features and user experience</li>
                    <li>• Develop new fantasy cricket features</li>
                    <li>• Optimize platform performance and security</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-primary-800">Legal Compliance</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Comply with applicable laws and regulations</li>
                    <li>• Protect against fraud and abuse</li>
                    <li>• Enforce our terms of service</li>
                    <li>• Respond to legal requests when required</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Information Sharing */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6">
                Information Sharing and Disclosure
              </h2>
              
              <div className="space-y-6">
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <h3 className="font-bold text-green-800 mb-3">What We DON'T Share</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• We do not sell your personal information to third parties</li>
                    <li>• We do not share your email address with advertisers</li>
                    <li>• We do not disclose your private messages or communications</li>
                    <li>• We do not provide your account details to other users</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Limited Sharing Scenarios</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <Lock className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                      <span><strong>Service Providers:</strong> Trusted third parties who help us operate our platform (hosting, analytics, customer support)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                      <span><strong>Legal Requirements:</strong> When required by law, court order, or to protect our rights and safety</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                      <span><strong>Business Transfer:</strong> In case of merger, acquisition, or sale of business assets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                      <span><strong>Public Information:</strong> Usernames, contest results, and leaderboards are publicly visible</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Security */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Lock className="h-6 w-6 mr-3 text-secondary-500" />
                Data Security
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <p>
                  We implement industry-standard security measures to protect your personal information, including:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Encryption of data in transit and at rest</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Secure authentication and session management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Regular security audits and monitoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Access controls and employee training</span>
                  </li>
                </ul>
                <p className="text-sm bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <strong>Important:</strong> No method of transmission over the internet is 100% secure. 
                  While we strive to protect your information, we cannot guarantee absolute security.
                </p>
              </div>
            </div>

            {/* Your Rights */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6">
                Your Rights and Choices
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Account Control</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Update your profile information</li>
                    <li>• Change your password and security settings</li>
                    <li>• Download your contest and scoring history</li>
                    <li>• Delete your account and associated data</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-primary-800 mb-3">Communication Preferences</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Opt out of promotional emails</li>
                    <li>• Control notification settings</li>
                    <li>• Manage cookie preferences</li>
                    <li>• Request information about your data</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>To exercise your rights:</strong> Email us at lansingipldfs@gmail.com or contact us through 
                  our support channel. We will respond within 30 days of receiving your request.
                </p>
              </div>
            </div>

            {/* Children's Privacy */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6">
                Children's Privacy
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <p>
                  Our service is not intended for children under the age of 18. We do not knowingly collect 
                  personal information from children under 18. If we become aware that a child under 18 has 
                  provided us with personal information, we will delete such information immediately.
                </p>
                <p>
                  If you are a parent or guardian and believe your child has provided personal information 
                  to us, please contact us at lansingipldfs@gmail.com.
                </p>
              </div>
            </div>

            {/* Policy Updates */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6">
                Changes to This Policy
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <p>
                  We may update this Privacy Policy from time to time to reflect changes in our practices 
                  or applicable laws. When we make significant changes, we will:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Post the updated policy on our website</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Update the "Last Updated" date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Notify you via email if you have an account with us</span>
                  </li>
                </ul>
                <p>
                  Your continued use of our service after changes become effective constitutes acceptance 
                  of the updated policy.
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gradient-to-br from-primary-800 to-primary-900 rounded-2xl p-8 text-white shadow-xl">
              <h2 className="text-2xl font-bold mb-6">
                Questions About This Policy?
              </h2>
              
              <div className="space-y-4 text-secondary-100">
                <p>
                  If you have any questions about this Privacy Policy or our data practices, 
                  please don't hesitate to contact us:
                </p>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="space-y-2">
                    <div><strong>Email:</strong> lansingipldfs@gmail.com</div>
                    <div><strong>Subject Line:</strong> Privacy Policy Question</div>
                    <div><strong>Response Time:</strong> Within 48 hours</div>
                  </div>
                </div>
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