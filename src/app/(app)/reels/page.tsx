'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import * as db from '@/lib/aws/dynamodb'

export default function ReelsPage() {
  const { user } = useAuthStore()
  const [reels, setReels] = useState<db.TrybeReel[]>([])
  const [, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    db.getReels(50).then(setReels).catch(() => {})
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'))
            setCurrentIndex(idx)
            const video = entry.target.querySelector('video')
            if (video) video.play().catch(() => {})
          } else {
            const video = entry.target.querySelector('video')
            if (video) { video.pause(); video.currentTime = 0 }
          }
        })
      },
      { threshold: 0.7 }
    )
    container.querySelectorAll('.reel-item').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [reels])

  async function toggleLike(reel: db.TrybeReel) {
    if (!user) return
    const newLiked = !reel.isLiked
    setReels(prev => prev.map(r =>
      r.id === reel.id ? { ...r, isLiked: newLiked, likeCount: r.likeCount + (newLiked ? 1 : -1) } : r
    ))
    await db.setReelLike(reel.id, user.id, newLiked)
  }

  if (reels.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center text-white/30">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-lg">No reels yet</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-screen overflow-y-scroll snap-y snap-mandatory snap-scroll">
      {reels.map((reel, idx) => (
        <div key={reel.id} data-index={idx} className="reel-item h-screen snap-start snap-always relative bg-black flex items-center justify-center">
          {/* Video */}
          {reel.videoURL ? (
            <video
              src={reel.videoURL}
              className="h-full w-full object-cover md:w-auto md:max-w-md md:rounded-2xl"
              loop muted playsInline
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-purple-900/30 to-pink-900/30 md:w-96 md:rounded-2xl" />
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none md:hidden" />

          {/* Right side actions */}
          <div className="absolute right-3 bottom-24 md:right-[calc(50%-220px)] flex flex-col items-center gap-5">
            {/* Like */}
            <button onClick={() => toggleLike(reel)} className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full glass flex items-center justify-center ${reel.isLiked ? 'text-red-500' : 'text-white'}`}>
                <svg className="w-5 h-5" fill={reel.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <span className="text-[10px] text-white/70">{reel.likeCount}</span>
            </button>

            {/* Comments */}
            <button className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full glass flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
              </div>
              <span className="text-[10px] text-white/70">{reel.commentCount}</span>
            </button>

            {/* Views */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full glass flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-[10px] text-white/70">{reel.viewCount}</span>
            </div>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-6 left-4 right-16 md:left-[calc(50%-200px)] md:right-auto md:w-80">
            <p className="text-sm font-semibold">@{reel.userId.slice(0, 8)}</p>
            {reel.caption && <p className="text-sm text-white/80 mt-1 line-clamp-2">{reel.caption}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
