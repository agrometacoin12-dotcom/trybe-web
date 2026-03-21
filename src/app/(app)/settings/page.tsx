'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'

export default function SettingsPage() {
  const router = useRouter()
  const { user, signOut } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    // Would update DynamoDB in production
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 1000)
  }

  function handleSignOut() {
    signOut()
    router.replace('/auth')
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Settings</h1>

      {/* Profile section */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold">
            {user?.avatarURL ? (
              <img src={user.avatarURL} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              user?.displayName?.charAt(0).toUpperCase() || '?'
            )}
          </div>
          <button className="px-4 py-2 rounded-xl glass text-sm text-white/70 hover:text-white hover:bg-white/10 transition">
            Change Photo
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 block mb-1">Display Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Username</label>
            <input type="text" value={user?.username || ''} disabled
              className="w-full px-4 py-2.5 rounded-xl glass text-sm text-white/50" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              placeholder="Tell us about yourself..."
              className="w-full px-4 py-2.5 rounded-xl glass text-sm text-white resize-none" />
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-sm font-medium transition disabled:opacity-50">
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </section>

      {/* Account section */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Account</h2>
        <div className="space-y-1">
          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition">
            <span className="text-sm">Email</span>
            <span className="text-sm text-white/40">{user?.id?.slice(0, 8)}...@</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition">
            <span className="text-sm">Change Password</span>
            <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Danger Zone</h2>
        <button onClick={handleSignOut}
          className="w-full py-2.5 rounded-xl glass text-red-400 text-sm font-medium hover:bg-red-500/10 transition">
          Sign Out
        </button>
      </section>
    </div>
  )
}
