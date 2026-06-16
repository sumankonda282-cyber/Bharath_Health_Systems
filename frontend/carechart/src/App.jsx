import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WardSessionProvider, useWardSession } from './contexts/WardSessionContext'
import Login from './pages/Login'
import SelectLocation from './pages/SelectLocation'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import WardBoard from './pages/WardBoard'
import WardRounds from './pages/WardRounds'
import Vitals from './pages/Vitals'
import WardOrders from './pages/WardOrders'
import Assessments from './pages/Assessments'
import PatientChart from './pages/PatientChart'
import Layout from './components/Layout'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
    </div>
  )
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return user ? <Navigate to="/select-location" replace /> : children
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return user ? children : <Navigate to="/login" replace />
}

function WardRoute({ children }) {
  const { user, loading } = useAuth()
  const { session } = useWardSession()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!session) return <Navigate to="/select-location" replace />
  return <Layout>{children}</Layout>
}

function Placeholder({ label }) {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      {label} — coming soon
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <WardSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/select-location" element={<PrivateRoute><SelectLocation /></PrivateRoute>} />

            <Route path="/dashboard"   element={<WardRoute><Dashboard /></WardRoute>} />
            <Route path="/patients"    element={<WardRoute><Patients /></WardRoute>} />
            <Route path="/ward-board"  element={<WardRoute><WardBoard /></WardRoute>} />
            <Route path="/vitals"      element={<WardRoute><Vitals /></WardRoute>} />
            <Route path="/mar"         element={<WardRoute><Placeholder label="MAR" /></WardRoute>} />
            <Route path="/notes"       element={<WardRoute><Placeholder label="Nursing Notes" /></WardRoute>} />
            <Route path="/assessments" element={<WardRoute><Assessments /></WardRoute>} />
            <Route path="/discharge"   element={<WardRoute><Placeholder label="Discharge" /></WardRoute>} />
            <Route path="/handoff"     element={<WardRoute><Placeholder label="Shift Handoff" /></WardRoute>} />
            <Route path="/rounds"      element={<WardRoute><WardRounds /></WardRoute>} />
            <Route path="/orders"      element={<WardRoute><WardOrders /></WardRoute>} />
            <Route path="/docs"        element={<WardRoute><Placeholder label="Documentation" /></WardRoute>} />
            <Route path="/chart/:id"   element={<WardRoute><PatientChart /></WardRoute>} />

            <Route path="/"  element={<Navigate to="/dashboard" replace />} />
            <Route path="*"  element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </WardSessionProvider>
    </AuthProvider>
  )
}
