'use client'

import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const fetchedRef = useRef<string | null>(null)

  // Step 1: Listen for auth state changes — just capture the user ID
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setAuthUserId(null)
        setUser(null)
        setLoading(false)
      } else {
        setAuthUserId(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Step 2: When we have an auth user ID, fetch the profile separately
  useEffect(() => {
    if (!authUserId) return
    if (fetchedRef.current === authUserId) return
    fetchedRef.current = authUserId

    supabase
      .from('users')
      .select('*')
      .eq('id', authUserId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setUser(data as User)
        setLoading(false)
      })
  }, [authUserId, supabase])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
