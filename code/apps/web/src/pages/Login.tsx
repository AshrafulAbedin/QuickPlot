import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../features/auth'

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0" aria-hidden="true">
        <rect x="1" y="1" width="24" height="24" rx="6" fill="#0a0a0f" stroke="#fbbf24" strokeWidth="1.5" />
        <path d="M3 20 Q9 4 13 13 T23 6" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-semibold tracking-tight text-neutral-100">
        Quick<span className="text-amber-400">Plot</span>
      </span>
    </div>
  )
}

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function Login() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const error = err as Error
      setError(error.message || "Couldn't sign in. Check your email and password.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setGoogleSubmitting(true)
    try {
      await loginWithGoogle()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Google sign-in failed.')
    } finally {
      setGoogleSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link to="/">
            <Logo />
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
          <h1 className="text-xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Sign in to save and share your plots.
          </p>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-400">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-medium text-neutral-400">
                  Password
                </label>
                <Link 
                  to="/forgot-password" 
                  className="text-xs text-amber-400 hover:text-amber-300"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-300 transition disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Sign in
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-800" />
            <span className="text-xs text-neutral-500">OR</span>
            <div className="h-px flex-1 bg-neutral-800" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={googleSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-700 py-2.5 text-sm font-medium hover:bg-neutral-800/50 transition disabled:opacity-50"
          >
            {googleSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <GoogleIcon size={16} />
            )}
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-neutral-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-amber-400 hover:text-amber-300">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
