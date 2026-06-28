/**
 * Forms → orders bridge for the OPD Doctor Desk.
 *
 * When a doctor signs an assessment form, its orderable fields become draft orders
 * in the chart. Field types come from the admin Form Builder's search fields; their
 * stored value is the chosen display string.
 *
 *   medication_search → prescription · lab_test_search → lab · imaging_search → imaging
 *   diagnosis_search  → appended to the Assessment (A) of the SOAP note
 *
 * Pure functions — no React, no api — so they're trivially testable.
 */
const RX_TYPES  = new Set(['medication_search'])
const LAB_TYPES = new Set(['lab_test_search'])
const IMG_TYPES = new Set(['imaging_search'])
const DX_TYPES  = new Set(['diagnosis_search'])

const valOf = (v) => (v && typeof v === 'object' ? v.display : v)

export function extractOrdersFromForm(schema, data) {
  const out = { prescriptions: [], labs: [], imaging: [], diagnoses: [] }
  for (const section of (schema?.sections || [])) {
    for (const f of (section.fields || [])) {
      const id   = f.id || f.field_id
      const text = valOf(data?.[id])
      if (!text || typeof text !== 'string' || !text.trim()) continue
      const name = text.trim()
      const t = f.type
      if      (RX_TYPES.has(t))  out.prescriptions.push({ drug_name: name })
      else if (LAB_TYPES.has(t)) out.labs.push({ test_name: name })
      else if (IMG_TYPES.has(t)) out.imaging.push({ procedure_name: name })
      else if (DX_TYPES.has(t))  out.diagnoses.push(name)
    }
  }
  return out
}

/** Append `incoming` to `existing`, skipping items whose `key` field already exists
 *  (case-insensitive). Returns the merged list and how many were actually added. */
export function mergeOrders(existing, incoming, key) {
  const seen = new Set((existing || []).map(x => String(x[key] || '').toLowerCase().trim()).filter(Boolean))
  const merged = [...(existing || [])]
  let added = 0
  for (const item of (incoming || [])) {
    const k = String(item[key] || '').toLowerCase().trim()
    if (!k || seen.has(k)) continue
    seen.add(k); merged.push(item); added++
  }
  return { merged, added }
}
