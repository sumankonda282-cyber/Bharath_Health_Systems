import CareFormsManager from '@shared/careforms/CareFormComposer'
import api from '../../api/client'

// Provider Care-Forms workspace — compose existing assessment forms into a care
// plan scoped to this health center (field editing stays admin-only).
export default function CareForms() {
  return (
    <div className="h-full p-4 md:p-6">
      <CareFormsManager api={api} />
    </div>
  )
}
