import React, { createContext, useCallback, useContext, useState } from 'react'

import { useAuth } from './AuthContext'

interface AuthGateContextValue {
  /** Whether the "sign in to sell" prompt is currently open. */
  isSellGateOpen: boolean
  closeSellGate: () => void
  /**
   * Call this from a "Sell an Item" action instead of navigating directly.
   * Returns true (and does nothing else) if the user is signed in, so the
   * caller can proceed to /create-listing. Returns false and opens the
   * sign-in prompt if the user is signed out.
   */
  requireAuthToSell: () => boolean
}

const AuthGateContext = createContext<AuthGateContextValue | undefined>(undefined)

export const AuthGateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth()
  const [isSellGateOpen, setSellGateOpen] = useState(false)

  const requireAuthToSell = useCallback(() => {
    if (isAuthenticated) return true
    setSellGateOpen(true)
    return false
  }, [isAuthenticated])

  const closeSellGate = useCallback(() => setSellGateOpen(false), [])

  return (
    <AuthGateContext.Provider
      value={{ isSellGateOpen, closeSellGate, requireAuthToSell }}
    >
      {children}
    </AuthGateContext.Provider>
  )
}

export const useAuthGate = (): AuthGateContextValue => {
  const ctx = useContext(AuthGateContext)
  if (!ctx) {
    throw new Error('useAuthGate must be used within an AuthGateProvider')
  }
  return ctx
}