'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import * as db from '@/lib/aws/dynamodb'

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = decodeURIComponent(params.id as string)
  const { user } = useAuthStore()

  const [messages, setMessages] = useState<db.DirectMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    loadMessages()
    pollRef.current = setInterval(loadMessages, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    try {
      const msgs = await db.getMessages(conversationId)
      setMessages(msgs)
    } catch {}
    setLoading(false)
  }

  async function sendMessage() {
    if (!text.trim() || !user) return
    const msg: db.DirectMessage = {
      id: crypto.randomUUID(),
      conversationId,
      senderId: user.id,
      content: text.trim(),
      messageType: 'text',
      isRead: false,
      createdAt: new Date().toISOString(),
    }
    setText('')
    setMessages(prev => [...prev, msg])
    await db.sendDirectMessage(msg).catch(() => {})
  }

  const otherUserId = conversationId.replace('dm#', '').split('#').find(id => id !== user?.id) || ''

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh)]">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-xl z-10 px-4 py-3 border-b border-white/10 flex items-center gap-3">
        <button onClick={() => router.back()} className="md:hidden text-white/60 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {otherUserId.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{otherUserId.slice(0, 12)}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-white/20 py-20 text-sm">
            Send a message to start the conversation
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.senderId === user?.id
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  isMine ? 'bg-purple-600 text-white rounded-br-sm' : 'glass text-white/90 rounded-bl-sm'
                }`}>
                  <p>{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-white/50' : 'text-white/30'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-black/90 backdrop-blur-xl border-t border-white/10 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-full glass text-sm text-white"
          />
          <button onClick={sendMessage} disabled={!text.trim()}
            className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition disabled:opacity-30">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
