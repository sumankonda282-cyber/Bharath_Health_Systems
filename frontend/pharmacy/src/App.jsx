import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import InstallPrompt from './components/InstallPrompt'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CpoeQueue from './pages/CpoeQueue'
import Cart from './pages/Cart'
import RxHistory from './pages/RxHistory'
import Inventory from './pages/Inventory'
import StockIn from './pages/StockIn'
import StockAdjustment from './pages/StockAdjustment'
import DrugRegister from './pages/DrugRegister'
import CounterSales from './pages/CounterSales'
import CreditLedger from './pages/CreditLedger'
import Reconciliation from './pages/Reconciliation'
import PurchaseOrders from './pages/PurchaseOrders'
import Suppliers from './pages/Suppliers'
import SupplierReturns from './pages/SupplierReturns'
import SupplierPayments from './pages/SupplierPayments'
import GstReport from './pages/GstReport'
import Reports from './pages/Reports'
import DiscountSchemes from './pages/DiscountSchemes'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]">
      <div className="w-9 h-9 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: '#F5821E', borderTopColor: 'transparent' }} />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <InstallPrompt appName="BH Pharmacy" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index                 element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"         element={<Dashboard />} />
            <Route path="cpoe"              element={<CpoeQueue />} />
            <Route path="cart"              element={<Cart />} />
            <Route path="rx-history"        element={<RxHistory />} />
            <Route path="inventory"         element={<Inventory />} />
            <Route path="stock-in"          element={<StockIn />} />
            <Route path="stock-adjustments" element={<StockAdjustment />} />
            <Route path="drug-register"     element={<DrugRegister />} />
            <Route path="counter-sales"     element={<CounterSales />} />
            <Route path="credit"            element={<CreditLedger />} />
            <Route path="reconciliation"    element={<Reconciliation />} />
            <Route path="purchase-orders"   element={<PurchaseOrders />} />
            <Route path="suppliers"         element={<Suppliers />} />
            <Route path="supplier-returns"  element={<SupplierReturns />} />
            <Route path="supplier-payments" element={<SupplierPayments />} />
            <Route path="gst-report"        element={<GstReport />} />
            <Route path="reports"           element={<Reports />} />
            <Route path="discount-schemes"  element={<DiscountSchemes />} />
            {/* legacy redirects */}
            <Route path="billing"           element={<Navigate to="/counter-sales" replace />} />
            <Route path="pending"           element={<Navigate to="/cpoe" replace />} />
            <Route path="history"           element={<Navigate to="/rx-history" replace />} />
            <Route path="stock-adjustment"  element={<Navigate to="/stock-adjustments" replace />} />
            <Route path="credit-ledger"     element={<Navigate to="/credit" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
