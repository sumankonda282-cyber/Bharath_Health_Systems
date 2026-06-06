import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useApi — data fetching hook with automatic AbortController cleanup.
 *
 * Prevents state updates on unmounted components and cancels in-flight
 * requests when dependencies change (e.g. user navigates to a different patient).
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(
 *     (signal) => api.get('/patients/1', { signal }),
 *     [id]   // re-fetch when id changes
 *   )
 */
export function useApi(apiFn, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const abortRef              = useRef(null)

  const fetch = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    apiFn(controller.signal)
      .then(res => {
        if (!controller.signal.aborted) {
          setData(res)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError(err.message || 'Something went wrong')
          setLoading(false)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    fetch()
    return () => { if (abortRef.current) abortRef.current.abort() }
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
