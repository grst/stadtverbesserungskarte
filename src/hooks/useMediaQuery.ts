import { useCallback, useMemo, useSyncExternalStore } from 'react'

/**
 * Abonniert eine CSS Media Query. Über useSyncExternalStore, damit der erste
 * Render schon den richtigen Wert kennt und kein Layout-Flackern entsteht.
 */
export function useMediaQuery(query: string): boolean {
  const mql = useMemo(() => window.matchMedia(query), [query])

  const subscribe = useCallback(
    (onChange: () => void) => {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [mql],
  )

  return useSyncExternalStore(
    subscribe,
    () => mql.matches,
    () => false,
  )
}

/** True, sobald genug Platz für das seitliche Detailpanel ist (Tablet quer, Desktop). */
export function useIsWideViewport(): boolean {
  return useMediaQuery('(min-width: 768px)')
}

/** Respektiert die Systemeinstellung „Bewegung reduzieren“. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
