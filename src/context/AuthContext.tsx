import type { Session, User } from '@supabase/supabase-js'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

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
  /** Profile full_name, falling back to signup metadata, then email. */
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
  resendConfirmation: (email: string) => Promise<AuthResult>
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

  // 1. Restore the existing session and subscribe to authentication changes.
  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return

      if (error) {
        console.error('Failed to restore authentication session:', error.message)
      }

      setSession(data.session ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // 2. Load the user's profile whenever the authenticated user changes.
  useEffect(() => {
    let active = true

    if (!userId) {
      setProfile(null)
      return
    }

    profileService
      .getProfileById(userId)
      .then((nextProfile) => {
        if (active) setProfile(nextProfile)
      })
      .catch((error: unknown) => {
        console.error('Failed to load user profile:', error)
        if (active) setProfile(null)
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
        return {
          error: error.message,
          needsEmailConfirmation: false,
        }
      }

      // With email confirmation enabled, Supabase returns no active session.
      const needsEmailConfirmation = !!data.user && !data.session

      return {
        error: null,
        needsEmailConfirmation,
      }
    },
    []
  )

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  // 3. Send password recovery emails to the dedicated reset-password route.
  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    )

    return { error: error?.message ?? null }
  }, [])

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    return { error: error?.message ?? null }
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
      resendConfirmation,
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
      resendConfirmation,
      refreshProfile,
    ]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return ctx
}