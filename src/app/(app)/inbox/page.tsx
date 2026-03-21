'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import * as db from '@/lib/aws/dynamodb'
import Link from 'next/link'

export default function InboxPage() {
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState<db.Conversation[]>([])
  const [users, setUsers] = useState<db.TrybeUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)

  useEffect(() => {
    if (!user) return
    db.getInboxConversations(user.id).then(setConversations).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (showNewChat) {
      db.listUsers(50).then(setUsers).catch(() => {})
    }
  }, [showNewChat])

  const filteredUsers = users.filter(u => u.id !== user?.id && (
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName.toLowerCase().includes(search.toLowerCase())
  ))

  function getConversationName(conv: db.Conversation): string {
    if (conv.groupName) return conv.groupName
    const otherId = conv.id.replace('dm#', '').split('#').find(id => id !== user?.id) || ''
    return otherId.slice(0, 8)
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffH = Math.floor(diffMs / 3600000)
    if (diffH < 1) return `${Math.floor(diffMs / 60000)}m`
    if (diffH < 24) return `${diffH}h`
    return `${Math.floor(diffH / 24)}d`
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-xl z-10 px-4 py-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Messages</h1>
          <button onClick={() => setShowNewChat(true)}
            className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-white/10 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4" onClick={() => setShowNewChat(false)}>
          <div className="w-full max-w-sm glass rounded-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">New Message</h2>
              <button onClick={() => setShowNewChat(false)} className="text-white/40 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass text-sm text-white mb-3" />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredUsers.map(u => (
                <Link key={u.id} href={`/inbox/${db.directConversationId(user!.id, u.id)}`}
                  onClick={() => setShowNewChat(false)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                    {u.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.displayName}</p>
                    <p className="text-xs text-white/40">@{u.username}</p>
                  </div>
                </Link>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-white/30 text-sm py-4">No users found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conversations */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-lg">No messages yet</p>
          <button onClick={() => setShowNewChat(true)} className="mt-3 text-purple-400 text-sm hover:text-purple-300">
            Start a conversation
          </button>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {conversations.map(conv => (
            <Link key={conv.id} href={`/inbox/${encodeURIComponent(conv.id)}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {getConversationName(conv).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{getConversationName(conv)}</p>
                  <span className="text-[10px] text-white/30 flex-shrink-0">{formatTime(conv.updatedAt)}</span>
                </div>
                {conv.lastMessage && (
                  <p className="text-xs text-white/40 truncate mt-0.5">{conv.lastMessage.content}</p>
                )}
              </div>
              {conv.unreadCount > 0 && (
                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {conv.unreadCount}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
