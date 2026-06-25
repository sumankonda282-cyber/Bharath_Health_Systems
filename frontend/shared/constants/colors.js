// Shared brand + clinical color tokens for cross-portal components.
// Both portals render shared components by compiling this source with their own
// deps, so shared code must not import portal-local color constants — it uses
// these instead (or receives tokens via ChartDepsContext.colors).
export const NAVY        = '#0F2557'
export const SAFFRON     = '#F5821E'
export const RED         = '#CC1414'
export const GOLD        = '#D4AF37'
export const GREEN       = '#059669'
export const SUCCESS     = '#16A34A'
export const DANGER      = '#CC1414'
export const BLUE_LIGHT  = '#eff6ff'
export const BLUE_BORDER = '#bfdbfe'

const colors = { NAVY, SAFFRON, RED, GOLD, GREEN, SUCCESS, DANGER, BLUE_LIGHT, BLUE_BORDER }
export default colors
