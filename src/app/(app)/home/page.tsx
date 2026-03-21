'use client'
import { useState, useEffect } from 'react'
import * as db from '@/lib/aws/dynamodb'
import Link from 'next/link'

export default function HomePage() {
  const [streams, setStreams] = useState<db.TrybeStream[]>([])
  const [reels, setReels] = useState<db.TrybeReel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      db.getLiveStreams().catch(() => []),
      db.getReels(20).catch(() => []),
    ]).then(([s, r]) => {
      setStreams(s)
      setReels(r)
      setLoading(false)
    })
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Home</h1>
        <Link href="/live" className="px-4 py-1.5 rounded-full bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition">
          Go Live
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Live Streams */}
          {streams.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Now
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 snap-scroll">
                {streams.map(stream => (
                  <Link key={stream.id} href={`/stream/${stream.id}`}
                    className="flex-shrink-0 w-44 glass rounded-2xl overflow-hidden hover:scale-[1.02] transition">
                    <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-pink-900/50 relative">
                      {stream.thumbnailURL && <img src={stream.thumbnailURL} alt="" className="w-full h-full object-cover" />}
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 rounded text-[10px] font-bold">LIVE</div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded text-[10px]">
                        {stream.viewerCount} watching
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{stream.title}</p>
                      <p className="text-[10px] text-white/40">{stream.category}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Reels Feed */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Feed</h2>
            {reels.length === 0 ? (
              <div className="text-center py-20 text-white/30">
                <p className="text-lg">No posts yet</p>
                <p className="text-sm mt-1">Be the first to share something!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reels.map(reel => (
                  <Link key={reel.id} href="/reels"
                    className="aspect-[9/16] rounded-2xl overflow-hidden relative bg-white/5 hover:scale-[1.02] transition group">
                    {reel.thumbnailURL ? (
                      <img src={reel.thumbnailURL} alt="" className="w-full h-full object-cover" />
                    ) : reel.videoURL ? (
                      <video src={reel.videoURL} className="w-full h-full object-cover" muted />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-pink-900/30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      {reel.caption && <p className="text-xs text-white/90 line-clamp-2">{reel.caption}</p>}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-white/50">
                        <span>{reel.viewCount} views</span>
                        <span>{reel.likeCount} likes</span>
                      </div>
                    </div>
                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <svg className="w-10 h-10 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
