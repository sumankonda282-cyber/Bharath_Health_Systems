import React from 'react'

// Live patient snapshot for CareForm intelligence fields (medication_order,
// patient_auto, age/weight-driven conditions & formulas). The fill renderers
// provide { patientId }; smart fields read it and fetch /patients/{id}/clinical-context.
export const PatientDataContext = React.createContext({ patientId: null })

// Module-level cache so multiple smart fields on one form share a single fetch.
const _cache = {}

export async function loadClinicalContext(api, patientId) {
  if (!patientId) return null
  if (_cache[patientId] !== undefined) return _cache[patientId]
  try {
    const ctx = await api.get(`/patients/${patientId}/clinical-context`)
    _cache[patientId] = ctx
    return ctx
  } catch {
    _cache[patientId] = null
    return null
  }
}
