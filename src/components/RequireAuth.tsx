import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

/**
 * Gate for authenticated-only routes.
 * Renders nothing while the initial session check runs, so a signed-in user
 * on a hard refresh is never briefly bounced to /login.
 */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export default RequireAuth