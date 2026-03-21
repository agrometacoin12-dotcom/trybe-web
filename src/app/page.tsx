'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'

export default function SplashPage() {
  const router = useRouter()
  const { loadSession } = useAuthStore()

  useEffect(() => {
    loadSession().then(() => {
      const state = useAuthStore.getState()
      if (state.isAuthenticated) {
        router.replace('/home')
      } else {
        router.replace('/auth')
      }
    }).catch(() => {
      router.replace('/auth')
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          TRYBE
        </h1>
        <div className="mt-6 w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )
}
