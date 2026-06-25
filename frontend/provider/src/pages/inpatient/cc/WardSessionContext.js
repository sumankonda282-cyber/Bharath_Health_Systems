// Provider shim for CareChart sections copied into the Inpatient chart.
// CareChart sections expect a ward-session hook; the Provider portal manages its
// inpatient session separately, so this returns an empty session and any feature
// that keys off the ward session simply no-ops.
export const useWardSession = () => ({ session: {} })
export default { useWardSession }
