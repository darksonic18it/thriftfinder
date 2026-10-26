import React from 'react'
import { Navigate } from 'react-router-dom'

import { useAdminAccess } from '../hooks/useAdminAccess'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, role } = useAdminAccess()
  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}>Checking access…</div>
  if (!role) return <Navigate to="/" replace />
  return <>{children}</>
}