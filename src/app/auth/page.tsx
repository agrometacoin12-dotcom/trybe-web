'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import * as cognito from '@/lib/aws/cognito'

type AuthMode = 'signin' | 'signup' | 'verify' | 'forgot' | 'reset'

export default function AuthPage() {
  const router = useRouter()
  const { signIn, signUp, confirmSignUp, isLoading, error, clearError, pendingEmail, isAuthenticated } = useAuthStore()

  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (isAuthenticated) router.replace('/home')
  }, [isAuthenticated])

  useEffect(() => {
    if (pendingEmail) {
      setEmail(pendingEmail)
      setMode('verify')
    }
  }, [pendingEmail])

  useEffect(() => { clearError(); setLocalError(''); setSuccessMsg('') }, [mode])

  const displayError = error || localError

  async function handleSignIn() {
    if (!email || !password) { setLocalError('Please fill in all fields'); return }
    await signIn(email, password)
  }

  async function handleSignUp() {
    if (!email || !password || !username) { setLocalError('Please fill in all fields'); return }
    if (password.length < 8) { setLocalError('Password must be at least 8 characters'); return }
    await signUp(email, password, username)
  }

  async function handleVerify() {
    if (!code) { setLocalError('Please enter the verification code'); return }
    const pwd = password || localStorage.getItem('trybe_pending_password') || ''
    await confirmSignUp(email, code, pwd)
  }

  async function handleForgot() {
    if (!email) { setLocalError('Please enter your email'); return }
    try {
      await cognito.forgotPassword(email)
      setSuccessMsg('Reset code sent to your email')
      setMode('reset')
    } catch (e: unknown) {
      setLocalError((e as Error).message)
    }
  }

  async function handleReset() {
    if (!code || !newPassword) { setLocalError('Please fill in all fields'); return }
    try {
      await cognito.confirmForgotPassword(email, code, newPassword)
      setSuccessMsg('Password reset! Please sign in.')
      setMode('signin')
    } catch (e: unknown) {
      setLocalError((e as Error).message)
    }
  }

  async function resendCode() {
    try {
      await cognito.resendVerificationCode(email)
      setSuccessMsg('New code sent!')
    } catch (e: unknown) {
      setLocalError((e as Error).message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            TRYBE
          </h1>
          <p className="text-white/40 text-sm mt-2">
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'verify' && 'Verify your email'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'reset' && 'Enter new password'}
          </p>
        </div>

        {/* Error / Success */}
        {displayError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {displayError}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
            {successMsg}
          </div>
        )}

        {/* Forms */}
        <div className="space-y-3">
          {mode === 'signin' && (
            <>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass text-white text-sm" />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass text-white text-sm"
                onKeyDown={e => e.key === 'Enter' && handleSignIn()} />
              <button onClick={handleSignIn} disabled={isLoading}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
              <div className="flex justify-between text-xs text-white/40">
                <button onClick={() => setMode('forgot')} className="hover:text-white/60">Forgot password?</button>
                <button onClick={() => setMode('signup')} className="hover:text-white/60">Create account</button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <>
              <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass text-white text-sm" />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass text-white text-sm" />
              <input type="password" placeholder="Password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass text-white text-sm"
                onKeyDown={e => e.key === 'Enter' && handleSignUp()} />
              <button onClick={handleSignUp} disabled={isLoading}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </button>
              <button onClick={() => setMode('signin')} className="w-full text-xs text-white/40 hover:text-white/60">
                Already have an account? Sign in
              </button>
            </>
          )}

          {mode === 'verify' && (
            <>
              <p className="text-white/50 text-xs text-center">Code sent to {email}</p>
              <input type="text" placeholder="Verification code" value={code} onChange={e => setCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass text-white text-sm text-center tracking-widest"
                onKeyDown={e => e.key === 'Enter' && handleVerify()} />
              <button onClick={handleVerify} disabled={isLoading}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
              <button onClick={resendCode} className="w-full text-xs text-white/40 hover:text-white/60">
                Resend code
              </button>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass text-white text-sm"
                onKeyDown={e => e.key === 'Enter' && handleForgot()} />
              <button onClick={handleForgot} disabled={isLoading}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition disabled:opacity-50">
                Send Reset Code
              </button>
              <button onClick={() => setMode('signin')} className="w-full text-xs text-white/40 hover:text-white/60">
                Back to sign in
              </button>
            </>
          )}

          {mode === 'reset' && (
            <>
              <input type="text" placeholder="Reset code" value={code} onChange={e => setCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass text-white text-sm" />
              <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass text-white text-sm"
                onKeyDown={e => e.key === 'Enter' && handleReset()} />
              <button onClick={handleReset} disabled={isLoading}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition disabled:opacity-50">
                Reset Password
              </button>
              <button onClick={() => setMode('signin')} className="w-full text-xs text-white/40 hover:text-white/60">
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
