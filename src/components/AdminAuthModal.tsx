import React, { useState } from 'react'

interface AdminAuthModalProps {
  open: boolean
  onSuccess: () => void
  onCancel: () => void
}

const ADMIN_REQUIRED_PASSWORD = 'AROVIA@FIT88888888'

export default function AdminAuthModal({ open, onSuccess, onCancel }: AdminAuthModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_REQUIRED_PASSWORD) {
      sessionStorage.setItem('arovia_admin_auth', 'true')
      setError(false)
      onSuccess()
    } else {
      setError(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 text-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-zinc-800 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold">
              🔒
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Admin Portal Access</h3>
              <p className="text-[11px] text-zinc-400">Restricted Operations & Backend Control</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
              Enter Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  if (error) setError(false)
                }}
                placeholder="Enter password"
                autoFocus
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-400 font-semibold mt-2 flex items-center gap-1.5">
                <span>⚠️</span> Incorrect Admin Password. Access Denied.
              </p>
            )}
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold py-2.5 rounded-lg text-xs transition-colors border border-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-white hover:bg-zinc-200 text-black font-extrabold py-2.5 rounded-lg text-xs transition-colors shadow-md"
            >
              Unlock Portal →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
