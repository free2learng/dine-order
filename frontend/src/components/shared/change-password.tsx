'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X, Loader2, KeyRound } from 'lucide-react'

interface Props {
  onClose: () => void
}

export function ChangePassword({ onClose }: Props) {
  const [current, setCurrent]   = useState('')
  const [next, setNext]         = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (next !== confirm) { toast.error('New passwords do not match'); return }
    if (next.length < 6)  { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      // Re-authenticate with current password first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Not authenticated')
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current })
      if (signInErr) throw new Error('Current password is incorrect')
      const { error } = await supabase.auth.updateUser({ password: next })
      if (error) throw error
      toast.success('Password updated successfully')
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors bg-white"

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Change Password</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Current Password</label>
            <input
              type="password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="••••••••"
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">New Password</label>
            <input
              type="password"
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Confirm New Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              required
              className={inputClass}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Updating…</> : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
