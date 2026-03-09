"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, User, Trophy, Phone } from "lucide-react"

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [usernameError, setUsernameError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value

    // Format phone number automatically
    if (e.target.name === 'phone') {
      // Remove all non-digits
      const digits = value.replace(/\D/g, '')
      // Format as XXX-XXX-XXXX
      if (digits.length >= 6) {
        value = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
      } else if (digits.length >= 3) {
        value = `${digits.slice(0, 3)}-${digits.slice(3)}`
      } else {
        value = digits
      }
    }

    setFormData(prev => ({
      ...prev,
      [e.target.name]: value
    }))

    // Clear username error when user starts typing
    if (e.target.name === 'username') {
      setUsernameError("")
    }
  }

  // Check username availability
  const checkUsername = async (username: string) => {
    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters")
      return
    }
    
    try {
      const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`)
      const data = await response.json()
      
      if (!data.available) {
        setUsernameError("Username is already taken")
      } else {
        setUsernameError("")
      }
    } catch (error) {
      // Don't show error for network issues during typing
    }
  }

  const handleUsernameBlur = () => {
    if (formData.username) {
      checkUsername(formData.username)
    }
  }

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^\d{3}-\d{3}-\d{4}$/
    return phoneRegex.test(phone)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      setError("Phone number must be in format 111-111-1111")
      setIsLoading(false)
      return
    }

    if (usernameError) {
      setError("Please fix the username error before submitting")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Something went wrong")
        setIsLoading(false)
        return
      }

      // Redirect to home page with success message
      router.push("/?registered=true")
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-full mb-4">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary-800 mb-2">
            Join IPL DFS
          </h1>
          <p className="text-gray-600">
            Create your account and start playing fantasy cricket
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-primary-800 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition-colors text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter your full name"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-primary-800 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={handleUsernameBlur}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition-colors text-gray-900 bg-white placeholder-gray-500 ${
                    usernameError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Choose a unique username"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />
              </div>
              {usernameError && (
                <p className="mt-1 text-sm text-red-600">{usernameError}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary-800 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition-colors text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter your email"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-primary-800 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition-colors text-gray-900 bg-white placeholder-gray-500"
                  placeholder="123-456-7890"
                  maxLength={12}
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Format: 123-456-7890</p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary-800 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition-colors text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Create a strong password"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary-800 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition-colors text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Confirm your password"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-secondary-500 hover:bg-secondary-600 disabled:bg-secondary-300 text-white py-3 px-4 rounded-lg font-semibold transition-colors focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 outline-none"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            disabled
            className="w-full border border-gray-300 text-gray-400 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google Sign-up (Coming Soon)
          </button>

          {/* Sign In Link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-secondary-600 hover:text-secondary-700 font-semibold">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}