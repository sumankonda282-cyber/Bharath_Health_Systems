import { createContext, useContext } from 'react'
import sharedColors from '../constants/colors'

/**
 * Injection seam for the shared inpatient chart.
 *
 * Each portal renders the SAME shared chart + section components but supplies
 * its own glue, so the UI/logic stays a single source of truth while
 * portal-specific concerns are provided from outside:
 *
 *   value = {
 *     api,         // axios client used for all data fetching (required)
 *     navigate,    // react-router navigate (required)
 *     user,        // current staff: { id, role, full_name, ... } (required)
 *     requestPin,  // optional async (reason) => { verified } PIN gate.
 *                  //   Omit/undefined → no PIN gate (e.g. the Provider portal).
 *     colors,      // optional color-token overrides; defaults to shared tokens
 *     portal,      // optional 'provider' | 'carechart' for minor per-portal copy
 *   }
 *
 * This keeps "change CareChart once → Provider updates too" structurally true:
 * the components live in @shared, only the deps differ per portal.
 */
export const ChartDepsContext = createContext(null)

export function ChartDepsProvider({ value, children }) {
  const merged = { ...value, colors: { ...sharedColors, ...(value?.colors || {}) } }
  return <ChartDepsContext.Provider value={merged}>{children}</ChartDepsContext.Provider>
}

export function useChartDeps() {
  const ctx = useContext(ChartDepsContext)
  if (!ctx) {
    throw new Error('useChartDeps must be used within a <ChartDepsProvider>')
  }
  return ctx
}

/**
 * PIN gate hook. Returns the injected requestPin, or a no-op that resolves as
 * verified when none is injected (PIN-free portals like Provider).
 */
export function usePinGate() {
  const ctx = useContext(ChartDepsContext)
  return (ctx && ctx.requestPin) || (async () => ({ verified: true }))
}
