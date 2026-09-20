import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '../lib/supabaseClient'
import { profileService } from '../services/profileService'
import type { Profile } from '../types/database'

type AuthResult = { error: string | null }

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  /** True until the initial session check has finished. */
  loading: boolean
  isAuthenticated: boolean
  /** Convenience: profile full_name, falling back to signup metadata, then email. */
  displayName: string
  displayEmail: string
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<AuthResult & { needsEmailConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<AuthResult>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const user = session?.user ?? null
  const userId = user?.id ?? null

  // 1) Restore any persisted session, then subscribe to auth changes.
  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // 2) Load the profile row whenever the signed-in user changes.
  useEffect(() => {
    let active = true

    if (!userId) {
      setProfile(null)
      return
    }

    profileService.getProfileById(userId).then((p) => {
      if (active) setProfile(p)
    })

    return () => {
      active = false
    }
  }, [userId])

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }
    setProfile(await profileService.getProfileById(userId))
  }, [userId])

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (error) {
        return { error: error.message, needsEmailConfirmation: false }
      }

      // When "Confirm email" is ON, Supabase returns a user but no session.
      const needsEmailConfirmation = !!data.user && !data.session

      return { error: null, needsEmailConfirmation }
    },
    []
  )

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    return { error: error ? error.message : null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/login` }
    )
    return { error: error ? error.message : null }
  }, [])

  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split('@')[0] ||
    ''

  const displayEmail = user?.email ?? ''

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      isAuthenticated: !!session,
      displayName,
      displayEmail,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      loading,
      displayName,
      displayEmail,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      refreshProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}