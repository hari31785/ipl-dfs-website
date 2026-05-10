"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, Mail, Lock, Trophy, ArrowRight } from "lucide-react"

export default function LoginContent() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Login failed")
        setIsLoading(false)
        return
      }

      localStorage.setItem('currentUser', JSON.stringify(data.user))
      window.location.href = "/dashboard"
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-full mb-4">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 mb-2">Welcome Back</h1>
          <p className="text-sm sm:text-base text-gray-600">Sign in to your IPL DFS account</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary-800 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                <input
                  id="email" name="email" type="email" required
                  value={formData.email} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition-colors text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter your email"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary-800 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                <input
                  id="password" name="password" type={showPassword ? "text" : "password"} required
                  value={formData.password} onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition-colors text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter your password"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-500 hover:text-gray-700">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full bg-secondary-500 hover:bg-secondary-600 disabled:bg-secondary-300 text-white py-3.5 px-4 rounded-lg font-semibold transition-colors focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 outline-none flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"
            >
              {isLoading ? "Signing In..." : (<>Sign In <ArrowRight className="h-5 w-5" /></>)}
            </button>

            <div className="text-center mt-4">
              <Link href="/forgot-password" className="text-sm text-blue-900 hover:text-blue-950 font-semibold underline transition-colors">
                Forgot your password?
              </Link>
            </div>
          </form>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-center text-sm text-gray-700 font-semibold mb-3">New to IPL DFS?</p>
            <Link href="/signup" className="block w-full text-center bg-primary-800 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              Create an Account
            </Link>
          </div>

          <div className="text-center mt-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              <ArrowRight className="h-4 w-4 rotate-180" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
