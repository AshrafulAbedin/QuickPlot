import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
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

export default function ForgotPassword() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    
    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err) {
      const error = err as Error
      setError(error.message || "Couldn't send reset email. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Link to="/">
              <Logo />
            </Link>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
            </div>

            <h1 className="text-center text-xl font-bold">Check your email</h1>
            <p className="mt-2 text-center text-sm text-neutral-400">
              We've sent a password reset link to <strong className="text-neutral-200">{email}</strong>
            </p>

            <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs text-neutral-400">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setSuccess(false)}
                  className="text-amber-400 hover:text-amber-300"
                >
                  try again
                </button>
              </p>
            </div>

            <Link
              to="/login"
              className="mt-6 flex items-center justify-center gap-2 text-sm text-neutral-400 hover:text-neutral-200"
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link to="/">
            <Logo />
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
          <h1 className="text-xl font-bold">Reset your password</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Enter your email and we'll send you a reset link.
          </p>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6">
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

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-300 transition disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Send reset link
            </button>
          </form>

          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm text-neutral-400 hover:text-neutral-200"
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
