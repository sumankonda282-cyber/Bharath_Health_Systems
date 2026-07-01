// Fill-time placement for the CareForm free grid.
//
// The admin builder stores each field's position/size as layout {x,y,w,h} on a
// grid whose column count is per-form (`schema.grid_cols`, default 12). At
// fill-time the renderers honor that so "design = fill" (WYSIWYG). Hidden
// (conditional) fields are excluded by the caller; their rows are then collapsed
// here so the form stays compact while the designed side-by-side widths and
// ordering are preserved.
//
// Backward compatible: forms saved before the resolution was configurable have no
// `grid_cols` and render on the historical 12-column grid — their stored x/w
// values are unchanged. A section whose fields have no layout falls back to the
// caller's legacy flow (sectionHasLayout → false).

// Historical default. Individual forms may store a finer resolution in
// schema.grid_cols; always resolve through gridColsOf() rather than this const.
export const GRID_COLS = 12

// Resolve a form/schema's column resolution, defaulting to the historical 12 so
// previously-saved forms keep their exact layout.
export function gridColsOf(schema) {
  const c = schema && Number(schema.grid_cols)
  return Number.isFinite(c) && c >= 4 && c <= 96 ? c : GRID_COLS
}

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

// Grid container style for a section, at the given column resolution.
export function makeSectionGridStyle(cols = GRID_COLS) {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gap: '1rem',
    alignItems: 'start',
  }
}

// Back-compat static style object (12-col). Prefer makeSectionGridStyle(cols).
export const sectionGridStyle = makeSectionGridStyle(GRID_COLS)

export function gridCellStyle(field, rowMap, cols = GRID_COLS) {
  const l = field.layout || {}
  const x = Number.isFinite(l.x) ? l.x : 0
  const w = Number.isFinite(l.w) ? l.w : cols
  const h = Number.isFinite(l.h) ? l.h : 1
  const row = (rowMap.get(Number.isFinite(l.y) ? l.y : 0) || 0) + 1
  return {
    gridColumn: `${x + 1} / span ${Math.max(1, Math.min(w, cols))}`,
    gridRow: `${row} / span ${Math.max(1, h)}`,
  }
}
