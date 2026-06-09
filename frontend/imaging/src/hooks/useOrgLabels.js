import { useAuth } from '../contexts/AuthContext'
import { getOrgLabels } from '../utils/orgLabels'

/**
 * Returns the org-type label set for the currently logged-in staff's clinic.
 * Use this anywhere you'd otherwise hardcode "Clinic" or "Hospital".
 *
 * Example:
 *   const { org, ward, admin } = useOrgLabels()
 *   <h1>{org} Dashboard</h1>   // → "Clinic Dashboard" or "Hospital Dashboard"
 */
export function useOrgLabels() {
  const { user } = useAuth()
  return getOrgLabels(user?.org_type)
}
