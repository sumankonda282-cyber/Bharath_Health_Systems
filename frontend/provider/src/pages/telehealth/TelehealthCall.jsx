// The telehealth call is now handled by the persistent floating TelehealthWidget in Layout.
// This route is kept for backward compatibility (e.g., deep links) — it joins and redirects back.
import { useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useTelehealth } from '../../contexts/TelehealthContext'
import api from '../../api/client'

export default function TelehealthCall() {
  const { appointmentId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { startCall, activeCall } = useTelehealth()

  useEffect(() => {
    // If already in a call from this appointment, just go back to desk
    if (activeCall?.appointmentId === parseInt(appointmentId)) {
      navigate('/telehealth', { replace: true })
      return
    }
    // If we got here with pre-joined data (from state), wire it up
    if (state?.joinData) {
      startCall({
        url: state.joinData.url,
        token: state.joinData.token,
        provider: state.joinData.provider,
        appointmentId: parseInt(appointmentId),
        appt: state.appt,
        windowEndsAt: state.joinData.window_ends_at,
      })
      navigate('/telehealth', { replace: true })
      return
    }
    // Otherwise join fresh
    api.post(`/telehealth/appointments/${appointmentId}/join`)
      .then(data => {
        startCall({
          url: data.url,
          token: data.token,
          provider: data.provider,
          appointmentId: parseInt(appointmentId),
          appt: null,
          windowEndsAt: data.window_ends_at,
        })
        navigate('/telehealth', { replace: true })
      })
      .catch(e => {
        alert(e.response?.data?.detail || e.message || 'Could not join. Check the appointment time window.')
        navigate('/telehealth', { replace: true })
      })
  }, [])

  return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <Loader2 size={28} className="animate-spin text-white mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Starting call…</p>
      </div>
    </div>
  )
}
