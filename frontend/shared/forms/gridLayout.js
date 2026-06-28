// Fill-time placement for the CareForm free 12-column grid.
//
// The admin builder stores each field's position/size as layout {x,y,w,h} on a
// 12-col grid. At fill-time the renderers honor that so "design = fill" (WYSIWYG).
// Hidden (conditional) fields are excluded by the caller; their rows are then
// collapsed here so the form stays compact while the designed side-by-side
// widths and ordering are preserved.
//
// Backward compatible: a section whose fields have no layout falls back to the
// caller's legacy flow (sectionHasLayout → false).

export const GRID_COLS = 12

export function sectionHasLayout(fields) {
  return Array.isArray(fields) && fields.some(f => f && f.layout && Number.isFinite(f.layout.w))
}

// Map the distinct used rows of the *visible* fields onto consecutive indices,
// so rows occupied only by hidden fields collapse away.
export function buildRowMap(visibleFields) {
  const ys = [...new Set((visibleFields || []).map(f => (f.layout && Number.isFinite(f.layout.y) ? f.layout.y : 0)))]
    .sort((a, b) => a - b)
  return new Map(ys.map((y, i) => [y, i]))
}

export const sectionGridStyle = {
  display: 'grid',
  gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
  gap: '1rem',
  alignItems: 'start',
}

export function gridCellStyle(field, rowMap) {
  const l = field.layout || {}
  const x = Number.isFinite(l.x) ? l.x : 0
  const w = Number.isFinite(l.w) ? l.w : GRID_COLS
  const h = Number.isFinite(l.h) ? l.h : 1
  const row = (rowMap.get(Number.isFinite(l.y) ? l.y : 0) || 0) + 1
  return {
    gridColumn: `${x + 1} / span ${Math.max(1, Math.min(w, GRID_COLS))}`,
    gridRow: `${row} / span ${Math.max(1, h)}`,
  }
}
