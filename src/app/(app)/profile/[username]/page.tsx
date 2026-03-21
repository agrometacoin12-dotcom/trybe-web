'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import * as db from '@/lib/aws/dynamodb'
import Link from 'next/link'

export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string
  const { user: currentUser } = useAuthStore()

  const [profileUser, setProfileUser] = useState<db.TrybeUser | null>(null)
  const [reels, setReels] = useState<db.TrybeReel[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'reels' | 'liked'>('reels')

  const isOwn = currentUser?.username === username

  useEffect(() => {
    async function load() {
      try {
        const users = await db.listUsers(200)
        const found = users.find(u => u.username === username)
        if (found) {
          setProfileUser(found)
          const allReels = await db.getReels(100)
          setReels(allReels.filter(r => r.userId === found.id))
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [username])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="text-center py-20 text-white/30">
        <p className="text-lg">User not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="relative">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-purple-900/40 to-pink-900/40">
          {profileUser.coverURL && <img src={profileUser.coverURL} alt="" className="w-full h-full object-cover" />}
        </div>

        {/* Avatar */}
        <div className="px-4 -mt-12 flex items-end gap-4">
          <div className="w-24 h-24 rounded-full border-4 border-black bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {profileUser.avatarURL ? (
              <img src={profileUser.avatarURL} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              profileUser.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="pb-2 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{profileUser.displayName}</h1>
              {profileUser.isVerified && (
                <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {profileUser.isLive && <span className="px-2 py-0.5 bg-red-500 rounded text-[10px] font-bold">LIVE</span>}
            </div>
            <p className="text-sm text-white/40">@{profileUser.username}</p>
          </div>
        </div>
      </div>

      {/* Bio + Stats */}
      <div className="px-4 mt-4">
        {profileUser.bio && <p className="text-sm text-white/70 mb-3">{profileUser.bio}</p>}

        <div className="flex gap-6 text-sm">
          <div><span className="font-semibold">{profileUser.followerCount}</span> <span className="text-white/40">Followers</span></div>
          <div><span className="font-semibold">{profileUser.followingCount}</span> <span className="text-white/40">Following</span></div>
          <div><span className="font-semibold">{profileUser.totalLikes}</span> <span className="text-white/40">Likes</span></div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {isOwn ? (
            <Link href="/settings" className="flex-1 py-2 rounded-xl glass text-sm text-center hover:bg-white/10 transition">
              Edit Profile
            </Link>
          ) : (
            <>
              <button className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-sm font-medium transition">
                Follow
              </button>
              <Link href={`/inbox/${currentUser ? db.directConversationId(currentUser.id, profileUser.id) : ''}`}
                className="px-4 py-2 rounded-xl glass text-sm hover:bg-white/10 transition">
                Message
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mt-6">
        <button onClick={() => setActiveTab('reels')}
          className={`flex-1 py-3 text-sm font-medium text-center transition ${activeTab === 'reels' ? 'text-white border-b-2 border-purple-500' : 'text-white/40'}`}>
          Reels
        </button>
        <button onClick={() => setActiveTab('liked')}
          className={`flex-1 py-3 text-sm font-medium text-center transition ${activeTab === 'liked' ? 'text-white border-b-2 border-purple-500' : 'text-white/40'}`}>
          Liked
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-0.5 p-0.5">
        {reels.length === 0 ? (
          <div className="col-span-3 text-center py-20 text-white/30 text-sm">
            No reels yet
          </div>
        ) : (
          reels.map(reel => (
            <Link key={reel.id} href="/reels"
              className="aspect-[9/16] bg-white/5 relative overflow-hidden hover:opacity-80 transition">
              {reel.thumbnailURL ? (
                <img src={reel.thumbnailURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
              <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] text-white/70">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {reel.viewCount}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
