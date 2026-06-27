import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import FollowUpReminders from './pages/FollowUpReminders'
import { AuthProvider, useAuth, usePerms } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import Patients from './pages/Patients'
import Billing from './pages/Billing'
import BillingList from './pages/BillingList'
import BillingDetail from './pages/BillingDetail'
import FrontDesk from './pages/FrontDesk'
import PatientChart from './pages/PatientChart'
import Queue from './pages/Queue'
import Operations from './pages/Operations'
import PatientBilling from './pages/PatientBilling'
import StaffManagement from './pages/StaffManagement'
import ManagerManagement from './pages/ManagerManagement'
import RegisterPatient from './pages/RegisterPatient'
import BookAppointment from './pages/BookAppointment'
import PatientLookup from './pages/PatientLookup'
import SetPassword from './pages/SetPassword'
import AccountSettings from './pages/AccountSettings'
import Admissions from './pages/Admissions'
import BedBoard from './pages/BedBoard'
import InpatientBilling from './pages/InpatientBilling'
import Telehealth from './pages/Telehealth'
import MaintenanceDashboard from './pages/MaintenanceDashboard'
import VisitorDesk from './pages/VisitorDesk'
import EmergencyAdmission from './pages/EmergencyAdmission'
import Board from './pages/scheduler/Board'
import Setup from './pages/scheduler/Setup'
import Groups from './pages/scheduler/Groups'
import Leaves from './pages/scheduler/Leaves'
import Patterns from './pages/scheduler/Patterns'
import PublishLog from './pages/scheduler/PublishLog'
import { Loader2 } from 'lucide-react'

// Gate a manager route by role, an optional required module, or the manage-managers right.
// Unrestricted actors (admin / legacy managers) pass every module check.
function Gate({ children, module, managers }) {
  const { user, loading } = useAuth()
  const perms = usePerms()
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 size={36} className="animate-spin text-gray-400" /></div>
  if (!['clinic_manager', 'clinic_admin'].includes(user?.role)) return <Navigate to="/" replace />
  if (managers && !perms.canManageManagers) return <Navigate to="/" replace />
  if (module && !perms.canModule(module)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 size={36} className="animate-spin text-gray-400" />
    </div>
  )

  // Force password reset — all routes redirect here until done
  if (user && user.force_reset) {
    return (
      <Routes>
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="*" element={<Navigate to="/set-password" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/set-password" element={user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />} />

      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="operations" element={<Operations />} />
        <Route path="operations/:appointmentId" element={<PatientBilling />} />
        <Route path="front-desk" element={<FrontDesk />} />
        <Route path="front-desk/register" element={<RegisterPatient />} />
        <Route path="front-desk/book" element={<BookAppointment />} />
        <Route path="front-desk/lookup" element={<PatientLookup />} />
        <Route path="front-desk/chart/:appointmentId" element={<PatientChart />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="telehealth"   element={<Telehealth />} />
        <Route path="patients" element={<Patients />} />
        <Route path="billing" element={<BillingList />} />
        <Route path="billing/:invoiceId" element={<BillingDetail />} />
        <Route path="queue" element={<Queue />} />
        <Route path="follow-ups" element={<FollowUpReminders />} />
        <Route path="staff" element={<Gate module="staff"><StaffManagement /></Gate>} />
        <Route path="managers" element={<Gate managers><ManagerManagement /></Gate>} />
        <Route path="admissions" element={<Admissions />} />
        <Route path="bed-board" element={<BedBoard />} />
        <Route path="inpatient-billing" element={<InpatientBilling />} />
        <Route path="maintenance" element={<MaintenanceDashboard />} />
        <Route path="visitor-desk" element={<VisitorDesk />} />
        <Route path="emergency-admission" element={<EmergencyAdmission />} />
        <Route path="account" element={<AccountSettings />} />
        <Route path="scheduler" element={<Gate module="scheduler"><Board /></Gate>} />
        <Route path="scheduler/setup" element={<Gate module="scheduler"><Setup /></Gate>} />
        <Route path="scheduler/groups" element={<Gate module="scheduler"><Groups /></Gate>} />
        <Route path="scheduler/leaves" element={<Gate module="scheduler"><Leaves /></Gate>} />
        <Route path="scheduler/patterns" element={<Gate module="scheduler"><Patterns /></Gate>} />
        <Route path="scheduler/publish-log" element={<Gate module="scheduler"><PublishLog /></Gate>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
