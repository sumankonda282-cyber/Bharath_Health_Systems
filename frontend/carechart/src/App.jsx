import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WardSessionProvider, useWardSession } from './contexts/WardSessionContext'
import Login from './pages/Login'
import SelectLocation from './pages/SelectLocation'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/select-location" replace /> : children
}

// Requires both auth AND a chosen ward session
function WardRoute({ children }) {
  const { user, loading } = useAuth()
  const { session } = useWardSession()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (!session) return <Navigate to="/select-location" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <WardSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/select-location" element={<PrivateRoute><SelectLocation /></PrivateRoute>} />
            <Route path="/dashboard" element={<WardRoute><ComingSoon label="Dashboard" /></WardRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </WardSessionProvider>
    </AuthProvider>
  )
}

function ComingSoon({ label }) {
  const { session } = useWardSession()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#065F46' }}>
          <span className="text-white text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{label} — Coming Next</h1>
        {session && (
          <p className="text-sm text-gray-500">
            {session.hospital.name} · {session.department.name} · {session.ward.name}
          </p>
        )}
      </div>
    </div>
  )
}
