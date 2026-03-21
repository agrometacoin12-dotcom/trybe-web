'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import * as db from '@/lib/aws/dynamodb'

interface ChatMessage {
  id: string
  userId: string
  username: string
  text: string
  timestamp: number
}

export default function StreamViewerPage() {
  const params = useParams()
  const router = useRouter()
  const streamId = params.id as string
  const { user } = useAuthStore()

  const [stream, setStream] = useState<db.TrybeStream | null>(null)
  const [streamer, setStreamer] = useState<db.TrybeUser | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState('')
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const streams = await db.getLiveStreams()
        const found = streams.find(s => s.id === streamId)
        if (found) {
          setStream(found)
          const u = await db.getUser(found.userId)
          if (u) setStreamer(u)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [streamId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  function sendChatMessage() {
    if (!chatText.trim() || !user) return
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      text: chatText.trim(),
      timestamp: Date.now(),
    }
    setChatMessages(prev => [...prev, msg])
    setChatText('')
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stream) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center text-white/30">
          <p className="text-lg">Stream not found</p>
          <button onClick={() => router.back()} className="mt-3 text-purple-400 text-sm">Go back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-screen md:h-[calc(100vh)]">
      {/* Video area */}
      <div className="flex-1 bg-black relative flex items-center justify-center">
        {stream.ivsPlaybackURL ? (
          <video src={stream.ivsPlaybackURL} className="w-full h-full object-contain" autoPlay controls />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex items-center justify-center">
            <div className="text-center text-white/30">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              </div>
              <p className="text-lg font-medium text-white/50">Live Stream</p>
              <p className="text-sm mt-1">{stream.title}</p>
            </div>
          </div>
        )}

        {/* Overlay info */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-white/10">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="glass rounded-full px-3 py-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium">LIVE</span>
            </div>
          </div>
          <div className="glass rounded-full px-3 py-1 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
            </svg>
            <span className="text-xs">{stream.viewerCount}</span>
          </div>
        </div>

        {/* Streamer info */}
        <div className="absolute bottom-4 left-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
            {streamer?.displayName?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-semibold">{streamer?.displayName || 'Unknown'}</p>
            <p className="text-xs text-white/40">{stream.category}</p>
          </div>
        </div>

        {/* Toggle chat on mobile */}
        <button onClick={() => setShowChat(!showChat)}
          className="absolute bottom-4 right-4 md:hidden w-10 h-10 rounded-full glass flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>

      {/* Chat sidebar */}
      {showChat && (
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 flex flex-col h-64 md:h-full bg-black/50">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold">Live Chat</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
            {chatMessages.length === 0 && (
              <p className="text-center text-white/20 text-xs py-4">No messages yet</p>
            )}
            {chatMessages.map(msg => (
              <div key={msg.id} className="text-sm">
                <span className="text-purple-400 font-medium text-xs">{msg.username}</span>
                <span className="text-white/70 text-xs ml-1.5">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="px-4 py-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <input type="text" value={chatText} onChange={e => setChatText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Send a message..."
                className="flex-1 px-3 py-2 rounded-lg glass text-xs text-white" />
              <button onClick={sendChatMessage} disabled={!chatText.trim()}
                className="px-3 py-2 rounded-lg bg-purple-600 text-xs font-medium disabled:opacity-30 hover:bg-purple-700 transition">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
