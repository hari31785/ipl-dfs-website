"use client"

import { useState } from 'react'
import { Key, User, Eye, EyeOff, ShieldQuestion, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SecurityQuestion {
  question: string
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: Enter username/email, 2: Answer questions, 3: Reset password
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [securityQuestions, setSecurityQuestions] = useState<SecurityQuestion[]>([])
  const [selectedQuestion, setSelectedQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Submitting forgot password request for:', emailOrUsername)
      const response = await fetch('/api/auth/forgot-password/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: emailOrUsername.trim() })
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok) {
        setSecurityQuestions(data.questions)
        setUserId(data.userId)
        setStep(2)
      } else {
        setError(data.message || 'User not found')
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      setError(`Network error: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Verifying security answer for userId:', userId)
      const response = await fetch('/api/auth/forgot-password/verify-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          question: selectedQuestion,
          answer: answer.trim()
        })
      })

      console.log('Verify answer response status:', response.status)
      const data = await response.json()
      console.log('Verify answer response data:', data)

      if (response.ok) {
        setStep(3)
      } else {
        setError(data.message || 'Incorrect answer')
      }
    } catch (error) {
      console.error('Verify answer error:', error)
      setError(`Network error: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    try {
      console.log('Resetting password for userId:', userId)
      const response = await fetch('/api/auth/forgot-password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          newPassword
        })
      })

      console.log('Reset password response status:', response.status)
      const data = await response.json()
      console.log('Reset password response data:', data)

      if (response.ok) {
        // Success! Redirect to login
        setTimeout(() => {
          router.push('/login?reset=success')
        }, 2000)
      } else {
        setError(data.message || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Reset password error:', error)
      setError(`Network error: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mb-4">
            <Key className="h-8 w-8 text-secondary-600" />
          </div>
          <h1 className="text-2xl font-bold text-primary-800 mb-2">Forgot Password</h1>
          <p className="text-gray-600 text-sm">
            {step === 1 && "Enter your email or username to get started"}
            {step === 2 && "Answer a security question to verify your identity"}
            {step === 3 && "Create your new password"}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-between mb-8">
          <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-secondary-500' : 'bg-gray-200'}`} />
          <div className="w-2" />
          <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-secondary-500' : 'bg-gray-200'}`} />
          <div className="w-2" />
          <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-secondary-500' : 'bg-gray-200'}`} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Enter Email/Username */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <div>
              <label htmlFor="emailOrUsername" className="block text-sm font-medium text-primary-800 mb-2">
                Email or Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="emailOrUsername"
                  type="text"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none text-gray-900"
                  placeholder="Enter your email or username"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-secondary-500 hover:bg-secondary-600 disabled:bg-secondary-300 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              {loading ? "Checking..." : "Continue"}
            </button>

            <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </form>
        )}

        {/* Step 2: Answer Security Question */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <ShieldQuestion className="h-5 w-5 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Select one of your security questions and provide the answer to verify your identity.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="question" className="block text-sm font-medium text-primary-800 mb-2">
                Select Security Question
              </label>
              <select
                id="question"
                required
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none text-gray-900"
              >
                <option value="">Choose a question...</option>
                {securityQuestions.map((q, index) => (
                  <option key={index} value={q.question}>
                    {q.question}
                  </option>
                ))}
              </select>
            </div>

            {selectedQuestion && (
              <div>
                <label htmlFor="answer" className="block text-sm font-medium text-primary-800 mb-2">
                  Your Answer
                </label>
                <input
                  id="answer"
                  type="text"
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none text-gray-900"
                  placeholder="Enter your answer"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedQuestion}
              className="w-full bg-secondary-500 hover:bg-secondary-600 disabled:bg-secondary-300 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              {loading ? "Verifying..." : "Verify Answer"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Start Over
            </button>
          </form>
        )}

        {/* Step 3: Reset Password */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="space-y-6">
            {loading && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Identity verified! Password reset successful. Redirecting...
              </div>
            )}

            {!loading && (
              <>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-primary-800 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none text-gray-900"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary-800 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none text-gray-900"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-secondary-500 hover:bg-secondary-600 disabled:bg-secondary-300 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
                >
                  Reset Password
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
