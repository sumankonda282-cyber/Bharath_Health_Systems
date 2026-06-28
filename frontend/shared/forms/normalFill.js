/**
 * @shared-pool
 * normalFill — "Mark all within normal limits" for DB assessment forms.
 *
 * Returns a patch { fieldKey: normalValue } for every VISIBLE field that has a
 * defined "normal" and is still empty. Never overwrites a value the clinician
 * already entered. Portal-agnostic: callers inject how a field is keyed (provider
 * keys by field.id, carechart by field.field_id) and a visibility predicate.
 *
 *   const patch = computeNormalFill(sections, values, {
 *     keyOf: f => f.id, isVisible: (f, vals) => isFieldVisible(f, vals),
 *   })
 *   setValues(v => ({ ...v, ...patch }))
 */

function normalValueFor(field) {
  const t  = field.type
  const rr = field.reference_range || {}

  if (t === 'number') {
    if (rr.normal_low != null && rr.normal_high != null) {
      const mid = (Number(rr.normal_low) + Number(rr.normal_high)) / 2
      return Number.isFinite(mid) ? Number(mid.toFixed(1)) : undefined
    }
    if (field.normal != null && field.normal !== '') return field.normal
    return undefined
  }

  if (t === 'select' || t === 'radio') {
    const opts = field.options || []
    const norm =
      opts.find(o => o && typeof o === 'object' && o.normal) ||
      opts.find(o => /^(normal|wnl|nil|none|negative)$/i.test((o?.label ?? o?.value ?? o) || ''))
    if (!norm) return undefined
    return (typeof norm === 'object') ? (norm.value ?? norm.label) : norm
  }

  if (t === 'text' || t === 'textarea') {
    if (field.normal_text) return field.normal_text
    if (field.required)    return 'Normal'
    return undefined
  }

  if (t === 'boolean' || t === 'toggle' || t === 'checkbox_single') {
    return field.normal != null ? field.normal : undefined
  }

  return undefined
}

export function computeNormalFill(sections, values = {}, opts = {}) {
  const keyOf     = opts.keyOf     || (f => f.id || f.field_id)
  const isVisible = opts.isVisible || (() => true)
  const patch = {}
  for (const section of sections || []) {
    for (const f of section.fields || []) {
      const id = keyOf(f)
      if (!id) continue
      if (!isVisible(f, { ...values, ...patch })) continue
      const cur = values[id]
      if (cur !== undefined && cur !== null && cur !== '') continue   // keep entered values
      const nv = normalValueFor(f)
      if (nv !== undefined) patch[id] = nv
    }
  }
  return patch
}
