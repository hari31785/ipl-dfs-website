"use client"

import Link from "next/link"
import { ArrowLeft, Mail, MessageSquare, Phone, MapPin, Clock, Send } from "lucide-react"

export default function ContactPage() {
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
              Contact Us
            </h1>
            <p className="text-xl text-secondary-200">
              Get in touch with the IPL DFS team
            </p>
          </div>

          <div className="space-y-8">
            {/* Contact Methods */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <MessageSquare className="h-6 w-6 mr-3 text-secondary-500" />
                How to Reach Us
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-6 border border-primary-200">
                  <div className="flex items-center mb-4">
                    <Mail className="h-8 w-8 text-primary-600 mr-3" />
                    <h3 className="text-xl font-bold text-primary-800">Email Support</h3>
                  </div>
                  <p className="text-gray-700 mb-4">
                    For general inquiries, technical support, and account issues
                  </p>
                  <a 
                    href="mailto:support@ipldfs.com" 
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    support@ipldfs.com
                  </a>
                </div>

                <div className="bg-gradient-to-br from-secondary-50 to-orange-50 rounded-xl p-6 border border-secondary-200">
                  <div className="flex items-center mb-4">
                    <MessageSquare className="h-8 w-8 text-secondary-600 mr-3" />
                    <h3 className="text-xl font-bold text-primary-800">Live Chat</h3>
                  </div>
                  <p className="text-gray-700 mb-4">
                    Available during IPL season for real-time assistance
                  </p>
                  <span className="text-secondary-600 font-semibold">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>

            {/* Support Hours */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Clock className="h-6 w-6 mr-3 text-secondary-500" />
                Support Hours
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-primary-800 mb-4">Regular Season</h3>
                  <div className="space-y-2 text-gray-700">
                    <div className="flex justify-between">
                      <span>Monday - Friday</span>
                      <span className="font-semibold">9:00 AM - 6:00 PM IST</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturday - Sunday</span>
                      <span className="font-semibold">10:00 AM - 4:00 PM IST</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bold text-primary-800 mb-4">IPL Season</h3>
                  <div className="space-y-2 text-gray-700">
                    <div className="flex justify-between">
                      <span>All Days</span>
                      <span className="font-semibold">8:00 AM - 11:00 PM IST</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      Extended hours during match days for draft and scoring support
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6">
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-6">
                <div className="border-l-4 border-primary-500 pl-6">
                  <h3 className="font-bold text-primary-800 mb-2">How do I report a scoring issue?</h3>
                  <p className="text-gray-700">
                    Email us at support@ipldfs.com with your contest details and the specific player(s) in question. 
                    Include your username and contest ID for faster resolution.
                  </p>
                </div>

                <div className="border-l-4 border-primary-500 pl-6">
                  <h3 className="font-bold text-primary-800 mb-2">What if I can't complete my draft?</h3>
                  <p className="text-gray-700">
                    If you experience technical difficulties during drafting, contact support immediately. 
                    We may be able to assist before the contest deadline.
                  </p>
                </div>

                <div className="border-l-4 border-primary-500 pl-6">
                  <h3 className="font-bold text-primary-800 mb-2">How are disputes resolved?</h3>
                  <p className="text-gray-700">
                    All disputes are reviewed by our support team using official IPL statistics. 
                    Decisions are typically made within 24 hours of receiving your request.
                  </p>
                </div>

                <div className="border-l-4 border-primary-500 pl-6">
                  <h3 className="font-bold text-primary-800 mb-2">Can I suggest new features?</h3>
                  <p className="text-gray-700">
                    Absolutely! We welcome feedback and feature suggestions. 
                    Send your ideas to support@ipldfs.com with "Feature Request" in the subject line.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6 flex items-center">
                <Send className="h-6 w-6 mr-3 text-secondary-500" />
                Send Us a Message
              </h2>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-primary-800 mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-primary-800 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary-800 mb-2">
                    Subject
                  </label>
                  <select className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none">
                    <option>Select a topic</option>
                    <option>Technical Support</option>
                    <option>Scoring Issue</option>
                    <option>Account Problem</option>
                    <option>Feature Request</option>
                    <option>General Inquiry</option>
                    <option>Billing Question</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary-800 mb-2">
                    Username (if applicable)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
                    placeholder="Your IPL DFS username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-primary-800 mb-2">
                    Message
                  </label>
                  <textarea
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none resize-none"
                    placeholder="Please describe your issue or question in detail..."
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="terms" className="w-4 h-4" />
                  <label htmlFor="terms" className="text-sm text-gray-700">
                    I agree to the <Link href="/privacy" className="text-primary-600 hover:text-primary-700">Privacy Policy</Link> and 
                    <Link href="/terms" className="text-primary-600 hover:text-primary-700 ml-1">Terms of Service</Link>
                  </label>
                </div>

                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
                >
                  Send Message
                </button>
              </form>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> This is a demo contact form. For actual support, please email support@ipldfs.com directly.
                </p>
              </div>
            </div>

            {/* Additional Resources */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-primary-800 mb-6">
                Additional Resources
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link 
                  href="/how-to-play"
                  className="block p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:shadow-lg transition-shadow"
                >
                  <h3 className="font-bold text-green-800 mb-2">How to Play Guide</h3>
                  <p className="text-sm text-gray-700">Complete guide on game rules and strategies</p>
                </Link>

                <Link 
                  href="/scoring"
                  className="block p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 hover:shadow-lg transition-shadow"
                >
                  <h3 className="font-bold text-blue-800 mb-2">Scoring System</h3>
                  <p className="text-sm text-gray-700">Detailed explanation of our point calculation</p>
                </Link>

                <Link 
                  href="/rules"
                  className="block p-6 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border border-orange-200 hover:shadow-lg transition-shadow"
                >
                  <h3 className="font-bold text-orange-800 mb-2">Official Rules</h3>
                  <p className="text-sm text-gray-700">Complete terms and regulations</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}