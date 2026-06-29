// Thin provider wrapper around the universal medication-order form (@shared/forms).
// The provider portal is PIN-free for BOTH IPD and OPD, so no requestPin is injected
// (only CareChart passes a PIN gate). The shared form skips the PIN step when absent.
import SharedMedicationOrderForm from '@shared/forms/MedicationOrderForm'
import api from '../../../api/client'
import { useAuth } from '../../../contexts/AuthContext'

export default function MedicationOrderForm(props) {
  const { user } = useAuth()
  return (
    <SharedMedicationOrderForm
      {...props}
      api={api}
      currentUser={user}
    />
  )
}
