'use client'
import { useState, useEffect } from 'react'
import * as db from '@/lib/aws/dynamodb'
import Link from 'next/link'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<db.TrybeUser[]>([])
  const [allUsers, setAllUsers] = useState<db.TrybeUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.listUsers(100).then(u => {
      setAllUsers(u)
      setUsers(u)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!query) { setUsers(allUsers); return }
    const q = query.toLowerCase()
    setUsers(allUsers.filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      (u.bio || '').toLowerCase().includes(q)
    ))
  }, [query, allUsers])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Search bar */}
      <div className="sticky top-0 bg-black z-10 pb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search users..." value={query} onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl glass text-sm text-white" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p className="text-lg">No users found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {users.map(u => (
            <Link key={u.id} href={`/profile/${u.username}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {u.avatarURL ? (
                  <img src={u.avatarURL} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  u.displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{u.displayName}</p>
                  {u.isVerified && (
                    <svg className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {u.isLive && <span className="px-1.5 py-0.5 bg-red-500 rounded text-[9px] font-bold">LIVE</span>}
                </div>
                <p className="text-xs text-white/40">@{u.username}</p>
                {u.bio && <p className="text-xs text-white/30 truncate mt-0.5">{u.bio}</p>}
              </div>
              <div className="text-right text-xs text-white/30 flex-shrink-0">
                <p>{u.followerCount} followers</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
