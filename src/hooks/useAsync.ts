import { useCallback, useEffect, useRef, useState } from 'react'

import { friendlyAdminError } from '../services/adminService'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const run = useRef(0)

  const load = useCallback(() => {
    const id = ++run.current
    setLoading(true)
    setError(null)
    fn()
      .then((d) => { if (id === run.current) setData(d) })
      .catch((e) => { if (id === run.current) setError(friendlyAdminError(e)) })
      .finally(() => { if (id === run.current) setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}