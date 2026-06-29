// Thin CareChart wrapper around the universal medication-order form (@shared/forms).
// Injects the CareChart api client, the signed-in user, and the inpatient PIN gate.
// All form logic now lives in the shared component so IPD, CareChart and OPD stay in sync.
import SharedMedicationOrderForm from '@shared/forms/MedicationOrderForm'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { usePin } from '../contexts/PinContext'

export default function MedicationOrderForm(props) {
  const { user } = useAuth()
  const { requestPin } = usePin()
  return (
    <SharedMedicationOrderForm
      {...props}
      api={api}
      currentUser={user}
      requestPin={requestPin}
    />
  )
}
