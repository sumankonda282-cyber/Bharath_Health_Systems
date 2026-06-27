// Display + search helpers for staff employee IDs.
// The stored id is the full role-prefixed, center-unique value (e.g. "HC00001-MR0001").
// We display the short suffix ("MR0001") and let search match the suffix or the 4 digits.

export function formatEmployeeId(employeeId) {
  if (!employeeId) return ''
  const seg = String(employeeId).split('-').pop() // "MR0001"
  return seg || String(employeeId)
}

// The bare center-unique number, e.g. "0001" — the 4 digits used across portals to
// identify the individual while documenting.
export function employeeCode(employeeId) {
  if (!employeeId) return ''
  const m = String(employeeId).match(/(\d{3,})$/)
  return m ? m[1] : ''
}

export function matchesEmployeeQuery(employeeId, query) {
  if (!employeeId || !query) return false
  const q = String(query).toLowerCase().trim()
  if (!q) return false
  const full = String(employeeId).toLowerCase()
  const suffix = formatEmployeeId(employeeId).toLowerCase() // "mr0001"
  const code = employeeCode(employeeId) // "0001"
  const qDigits = q.replace(/\D/g, '')
  return full.includes(q) || suffix.includes(q) || (!!qDigits && code.includes(qDigits))
}
