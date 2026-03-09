"use client"

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Trophy, Users, Zap, Target, ArrowRight, CheckCircle } from "lucide-react";

function HomeContent() {
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setShowSuccess(true);
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-cricket-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
            <CheckCircle className="h-6 w-6" />
            <div>
              <div className="font-semibold">Registration Successful! 🏏</div>
              <div className="text-sm opacity-90">You can now sign in to start playing IPL DFS</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-500/20 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              IPL <span className="text-secondary-400">DFS</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-900 mb-8 max-w-3xl mx-auto">
              Fantasy Cricket Head-to-Head
            </p>
            <p className="text-lg text-blue-900 mb-12 max-w-2xl mx-auto">
              Compete with your friends in Indian Premier League Daily Fantasy Sports. 
              Build your dream team, challenge your friends, and prove who knows cricket best!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup" 
                className="bg-secondary-500 hover:bg-secondary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
              >
                Start Playing
                <ArrowRight className="inline ml-2 h-5 w-5" />
              </Link>
              <Link 
                href="/login" 
                className="border-2 border-white text-white hover:bg-white hover:text-primary-800 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-800 mb-4">
              Why Play IPL DFS?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the thrill of fantasy cricket with real-time competition
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-primary-800 mb-2">Head-to-Head</h3>
              <p className="text-gray-600">Challenge your friends directly in 1v1 fantasy matchups</p>
            </div>

            {/* Feature 2 */}
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-cricket-500 to-cricket-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-primary-800 mb-2">Live Scoring</h3>
              <p className="text-gray-600">Real-time updates during IPL matches</p>
            </div>

            {/* Feature 3 */}
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-primary-800 mb-2">Friend Challenges</h3>
              <p className="text-gray-600">Invite friends and create private contests</p>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="py-20 bg-gradient-to-r from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-800 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">Get started in 3 simple steps</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-xl font-semibold text-primary-800 mb-4">Create Your Team</h3>
              <p className="text-gray-600">Select your best 11 players from upcoming IPL matches to build your dream team</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-secondary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-xl font-semibold text-primary-800 mb-4">Challenge Friends</h3>
              <p className="text-gray-600">Create head-to-head contests and invite your friends to compete against your team</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-secondary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-xl font-semibold text-primary-800 mb-4">Watch & Win</h3>
              <p className="text-gray-600">Follow live scores during the match and see who wins the head-to-head</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-secondary-400 mb-4">IPL DFS</h3>
              <p className="text-gray-300">
                The ultimate fantasy cricket platform for IPL enthusiasts.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <Link href="/how-to-play" className="block text-gray-300 hover:text-white">How to Play</Link>
                <Link href="/rules" className="block text-gray-300 hover:text-white">Rules</Link>
                <Link href="/scoring" className="block text-gray-300 hover:text-white">Scoring</Link>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <div className="space-y-2">
                <Link href="/contact" className="block text-gray-300 hover:text-white">Contact Us</Link>
                <Link href="/privacy" className="block text-gray-300 hover:text-white">Privacy Policy</Link>
                <Link href="/terms" className="block text-gray-300 hover:text-white">Terms of Service</Link>
                <Link href="/admin/login" className="block text-gray-300 hover:text-secondary-400 border-t border-gray-700 pt-2 mt-4">
                  🛡️ Admin Portal
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2026 IPL DFS. All rights reserved. Built for cricket fans, by cricket fans.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
