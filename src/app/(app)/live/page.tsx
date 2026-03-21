'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'

const categories = ['Gaming', 'Music', 'Sports', 'Talk Show', 'Cooking', 'Art', 'Education', 'Just Chatting']

export default function GoLivePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Just Chatting')
  const [isStarting, setIsStarting] = useState(false)

  async function startStream() {
    if (!title.trim() || !user) return
    setIsStarting(true)
    // In production, this would create IVS channel + DynamoDB record
    // For now, show a placeholder
    setTimeout(() => {
      setIsStarting(false)
      alert('Live streaming requires IVS channel setup. Stream configuration saved!')
      router.push('/home')
    }, 2000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Go Live</h1>

      {/* Preview */}
      <div className="aspect-video rounded-2xl glass mb-6 flex items-center justify-center">
        <div className="text-center text-white/30">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="text-sm">Camera preview</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="text-sm text-white/50 block mb-1.5">Stream Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="What are you streaming?"
            className="w-full px-4 py-3 rounded-xl glass text-white text-sm" />
        </div>

        <div>
          <label className="text-sm text-white/50 block mb-1.5">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  category === cat ? 'bg-purple-600 text-white' : 'glass text-white/60 hover:text-white'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <button onClick={startStream} disabled={!title.trim() || isStarting}
          className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 mt-6">
          {isStarting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Go Live
            </>
          )}
        </button>
      </div>
    </div>
  )
}
