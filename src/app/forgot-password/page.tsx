"use client"

import { useState } from 'react'
import { Key, User, Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PasswordResetPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    username?: string
    password?: string
    name?: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!emailOrUsername.trim()) {
      setResult({
        success: false,
        message: 'Please enter your email or username'
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrUsername: emailOrUsername.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          username: data.username,
          password: data.password,
          name: data.name
        })
      } else {
        setResult({
          success: false,
          message: data.message
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyPassword = () => {
    if (result?.password) {
      navigator.clipboard.writeText(result.password)
      alert('Password copied to clipboard!')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Key className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Recovery</h1>
          <p className="text-gray-600 text-sm">
            Enter your email or username to retrieve your password
          </p>
        </div>

        {!result?.success ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700 mb-2">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="emailOrUsername"
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="Enter email or username"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Retrieving...' : 'Retrieve Password'}
            </button>

            {result && !result.success && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{result.message}</p>
              </div>
            )}
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">Password Found!</h3>
              <p className="text-green-700 text-sm mb-4">
                Here are your login details:
              </p>
              
              <div className="bg-white p-4 rounded-lg border space-y-3">
                <div className="text-left">
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <p className="font-medium text-gray-900">{result.name || 'N/A'}</p>
                </div>
                <div className="text-left">
                  <label className="block text-xs text-gray-500 mb-1">Username</label>
                  <p className="font-medium text-gray-900">@{result.username}</p>
                </div>
                <div className="text-left">
                  <label className="block text-xs text-gray-500 mb-1">Password</label>
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                    <span className="font-mono text-sm">{result.password}</span>
                    <button
                      onClick={copyPassword}
                      className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 bg-blue-50 rounded transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link 
                href="/login"
                className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go to Login
              </Link>
              <button
                onClick={() => {
                  setResult(null)
                  setEmailOrUsername('')
                }}
                className="block w-full text-gray-600 py-2 hover:text-gray-800 transition-colors"
              >
                Reset Another Password
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}