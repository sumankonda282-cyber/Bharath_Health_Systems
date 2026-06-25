import { createContext, useContext } from 'react'

// Provider is PIN-free. CareChart assessment forms PIN-gate their save actions
// via usePin().requestPin(); this shim auto-verifies so those forms open and
// save without a PIN prompt, consistent with the rest of the Provider portal.
// The authenticated staff identity for any save comes from the JWT server-side.
const autoVerify = async () => ({ verified: true, staff_id: null, full_name: 'Provider' })

const PinContext = createContext({ requestPin: autoVerify })

export function PinProvider({ children }) {
  return <PinContext.Provider value={{ requestPin: autoVerify }}>{children}</PinContext.Provider>
}

export const usePin = () => useContext(PinContext)

export default PinContext
