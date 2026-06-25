// Provider shim: copied CareChart components PIN-gate sensitive actions via a
// PinContext. The Provider portal is PIN-free, so this resolves verification
// immediately (no PIN prompt) — consistent with Provider's existing chart.
export const usePin = () => ({ requestPin: async () => ({ verified: true }) })
export default { usePin }
