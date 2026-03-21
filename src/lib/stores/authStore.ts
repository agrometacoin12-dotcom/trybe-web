import { create } from 'zustand'
import * as cognito from '../aws/cognito'
import * as db from '../aws/dynamodb'

interface AuthState {
  isAuthenticated: boolean
  user: db.TrybeUser | null
  isLoading: boolean
  error: string | null
  pendingEmail: string | null
  tokens: { accessToken: string; idToken: string; refreshToken: string } | null
  signUp: (email: string, password: string, username: string) => Promise<void>
  confirmSignUp: (email: string, code: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
  loadSession: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  pendingEmail: null,
  tokens: null,

  clearError: () => set({ error: null }),

  signUp: async (email, password, username) => {
    set({ isLoading: true, error: null })
    try {
      await cognito.signUp(email, password, username)
      set({ pendingEmail: email, isLoading: false })
      localStorage.setItem('trybe_pending_email', email)
      localStorage.setItem('trybe_pending_password', password)
      localStorage.setItem('trybe_pending_username', username)
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  confirmSignUp: async (email, code, password) => {
    set({ isLoading: true, error: null })
    try {
      await cognito.confirmSignUp(email, code)
      const tokens = await cognito.signIn(email, password)
      const claims = cognito.decodeJWT(tokens.IdToken)
      const userId = claims.sub || ''
      const username = localStorage.getItem('trybe_pending_username') || claims.preferred_username || email.split('@')[0]

      let user = await db.getUser(userId)
      if (!user) {
        const newUser: db.TrybeUser = {
          id: userId, username, displayName: username,
          followerCount: 0, followingCount: 0, totalLikes: 0,
          isLive: false, isVerified: false, role: 'viewer',
          createdAt: new Date().toISOString(),
        }
        await db.createUserProfile(newUser)
        user = newUser
      }

      localStorage.setItem('trybe_tokens', JSON.stringify(tokens))
      localStorage.setItem('trybe_user_id', userId)
      set({ isAuthenticated: true, user, tokens: { accessToken: tokens.AccessToken, idToken: tokens.IdToken, refreshToken: tokens.RefreshToken }, pendingEmail: null, isLoading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const tokens = await cognito.signIn(email, password)
      const claims = cognito.decodeJWT(tokens.IdToken)
      const userId = claims.sub || ''

      let user = await db.getUser(userId)
      if (!user) {
        const username = claims.preferred_username || email.split('@')[0]
        const newUser: db.TrybeUser = {
          id: userId, username, displayName: username,
          followerCount: 0, followingCount: 0, totalLikes: 0,
          isLive: false, isVerified: false, role: 'viewer',
          createdAt: new Date().toISOString(),
        }
        await db.createUserProfile(newUser)
        user = newUser
      }

      localStorage.setItem('trybe_tokens', JSON.stringify(tokens))
      localStorage.setItem('trybe_user_id', userId)
      set({ isAuthenticated: true, user, tokens: { accessToken: tokens.AccessToken, idToken: tokens.IdToken, refreshToken: tokens.RefreshToken }, isLoading: false })
    } catch (e: unknown) {
      if ((e as Error).message.includes('verify your email')) {
        set({ pendingEmail: email, isLoading: false, error: (e as Error).message })
        localStorage.setItem('trybe_pending_email', email)
        localStorage.setItem('trybe_pending_password', password)
      } else {
        set({ error: (e as Error).message, isLoading: false })
      }
    }
  },

  signOut: () => {
    localStorage.removeItem('trybe_tokens')
    localStorage.removeItem('trybe_user_id')
    set({ isAuthenticated: false, user: null, tokens: null })
  },

  loadSession: async () => {
    const stored = localStorage.getItem('trybe_tokens')
    const userId = localStorage.getItem('trybe_user_id')
    if (!stored || !userId) return

    try {
      const parsed = JSON.parse(stored)
      const refreshed = await cognito.refreshTokens(parsed.RefreshToken)
      const user = await db.getUser(userId)
      const newTokens = { ...parsed, AccessToken: refreshed.AccessToken, IdToken: refreshed.IdToken }
      localStorage.setItem('trybe_tokens', JSON.stringify(newTokens))
      set({ isAuthenticated: true, user, tokens: { accessToken: newTokens.AccessToken, idToken: newTokens.IdToken, refreshToken: newTokens.RefreshToken } })
    } catch {
      localStorage.removeItem('trybe_tokens')
      localStorage.removeItem('trybe_user_id')
    }
  },
}))
