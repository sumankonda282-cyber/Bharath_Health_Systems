import InstallPrompt from './components/InstallPrompt'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import AccountSettings from './pages/AccountSettings'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import PendingReports from './pages/PendingReports'
import ReportWriter from './pages/ReportWriter'
import Billing from './pages/Billing'
import Reports from './pages/Reports'
import PatientHistory from './pages/PatientHistory'
import Templates from './pages/Templates'
import Schedule from './pages/Schedule'
import ReferringDoctors from './pages/ReferringDoctors'
import PendingReview from './pages/PendingReview'
import { Loader2 } from 'lucide-react'
function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 size={36} className="animate-spin text-gray-400"/></div>
  return user ? children : <Navigate to="/login" replace/>
}
function LoginRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 size={36} className="animate-spin text-gray-400"/></div>
  return user ? <Navigate to="/" replace/> : <Login/>
}
export default function App() {
  return (
    <AuthProvider>
      <>
        <InstallPrompt appName="BH Imaging" />
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute/>}/>
          <Route element={<Guard><Layout/></Guard>}>
            <Route index element={<Dashboard/>}/>
            <Route path="pending"        element={<PendingReports/>}/>
            <Route path="pending-review" element={<PendingReview/>}/>
            <Route path="report-writer"  element={<ReportWriter/>}/>
            <Route path="orders"         element={<Orders/>}/>
            <Route path="schedule"       element={<Schedule/>}/>
            <Route path="referring"      element={<ReferringDoctors/>}/>
            <Route path="billing"        element={<Billing/>}/>
            <Route path="reports"        element={<Reports/>}/>
            <Route path="patients"       element={<PatientHistory/>}/>
            <Route path="templates"      element={<Templates/>}/>
          </Route>
            <Route path="account" element={<AccountSettings/>}/>
          </Route>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </BrowserRouter>
      </>
    </AuthProvider>
  )
}
