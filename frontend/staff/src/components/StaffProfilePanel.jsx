import api from '../api/client'
import ProfilePanel from '@shared/components/ProfilePanel'

// Thin wrapper around the shared, unified profile panel (Profile + photo, Work,
// Plan & Subscription, Security) injected with the staff portal's API client.
export default function StaffProfilePanel(props) {
  return <ProfilePanel api={api} {...props} />
}
