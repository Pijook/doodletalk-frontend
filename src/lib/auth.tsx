import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, loadSession, SESSION_KEY } from './api'
import type { Session } from '../types'

interface Auth {
  session: Session | null
  expired: boolean
  ensureSession: (name: string) => Promise<Session>
  signOut: () => void
}
const AuthContext = createContext<Auth | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession)
  const [expired, setExpired] = useState(false)
  const client = useQueryClient()
  function clear(isExpired: boolean) {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setExpired(isExpired)
    client.clear()
  }
  useEffect(() => {
    function onExpired() {
      clear(true)
    }
    function onStorage(event: StorageEvent) {
      if (event.key === SESSION_KEY) {
        setSession(loadSession())
        client.clear()
      }
    }
    window.addEventListener('session-expired', onExpired)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('session-expired', onExpired)
      window.removeEventListener('storage', onStorage)
    }
  }, [client])
  async function ensureSession(name: string) {
    if (session && Date.parse(session.expiresAt) > Date.now()) return session
    const created = await api.createSession(name.trim())
    localStorage.setItem(SESSION_KEY, JSON.stringify(created))
    setSession(created)
    setExpired(false)
    return created
  }
  return (
    <AuthContext value={{ session, expired, ensureSession, signOut: () => clear(false) }}>
      {children}
    </AuthContext>
  )
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is required')
  return context
}
