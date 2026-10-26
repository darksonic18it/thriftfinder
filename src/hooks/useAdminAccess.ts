import { useEffect, useState } from 'react'

import { useAuth } from '../context/AuthContext'
import type { AdminRole } from '../services/adminService'
import { fetchAdminRole } from '../services/adminService'

export function useAdminAccess() {
  const { user } = useAuth()
  const [state, setState] = useState<{ loading: boolean; role: AdminRole | null }>({
    loading: true, role: null })

  useEffect(() => {
    if (!user) { setState({ loading: false, role: null }); return undefined }
    let cancelled = false
    fetchAdminRole(user.id).then((role) => { if (!cancelled) setState({ loading: false, role }) })
    return () => { cancelled = true }
  }, [user?.id])

  return state
}