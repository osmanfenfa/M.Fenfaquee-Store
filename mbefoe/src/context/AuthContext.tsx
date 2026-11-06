import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setUnauthorizedHandler, tokenStore } from '@/services/api'
import { authService } from '@/services/authService'
import type { LoginCredentials, SignupData, User } from '@/types/auth'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  user: User | null
  status: AuthStatus
  login: (credentials: LoginCredentials) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  logout: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStore.get() ? 'loading' : 'anonymous'))

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setStatus('anonymous')
    queryClient.clear() // drop cached shop data
  }, [queryClient])

  // Any 401 from the API (expired token) signs the owner out
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // Restore the session on page load
  useEffect(() => {
    if (!tokenStore.get()) return
    let cancelled = false
    authService
      .me()
      .then((u) => {
        if (cancelled) return
        setUser(u)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!cancelled) logout()
      })
    return () => {
      cancelled = true
    }
  }, [logout])

  /** Store the token, load the user, and start with an empty cache (never show a previous shop's data). */
  const startSession = useCallback(
    async (accessToken: string) => {
      tokenStore.set(accessToken)
      queryClient.clear()
      try {
        const u = await authService.me()
        setUser(u)
        setStatus('authenticated')
      } catch (e) {
        tokenStore.clear()
        throw e
      }
    },
    [queryClient],
  )

  const login = useCallback(
    async (credentials: LoginCredentials) => startSession((await authService.login(credentials)).access_token),
    [startSession],
  )

  const signup = useCallback(
    async (data: SignupData) => startSession((await authService.signup(data)).access_token),
    [startSession],
  )

  const value = useMemo(() => ({ user, status, login, signup, logout }), [user, status, login, signup, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
