import { useState, useEffect, useCallback } from 'react'
import { Loader2, X, RotateCcw, Search, CheckCircle } from 'lucide-react'
import api from '../api/client'

const REASONS = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'expired', label: 'Expired' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'patient_request', label: 'Patient Request' },
  { value: 'doctor_cancelled', label: 'Doctor Cancelled' },
]

const REFUND_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'credit_note', label: 'Credit Note' },
]

const PAGE_SIZE = 20

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed top-5 right-5 z-[60] flex items-center gap-3 bg-white border border-green-200 shadow-xl rounded-xl px-5 py-3 text-sm font-medium text-green-700">
      <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
      {message}
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600">
        <X size={14} />
      </button>
    </div>
  )
}

function NewReturnModal({ onClose, onSuccess }) {
  const [invoiceId, setInvoiceId] = useState('')
  const [invoice, setInvoice] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [items, setItems] = useState([])
  const [reason, setReason] = useState('damaged')
  const [refundMethod, setRefundMethod] = useState('cash')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function fetchInvoice() {
    const id = invoiceId.trim()
    if (!id) return
    setFetching(true)
    setFetchError('')
    setInvoice(null)
    setItems([])
    try {
      const data = await api.get(`/pharmacy/invoices/${encodeURIComponent(id)}`)
      setInvoice(data)
      setItems(
        (data.items || []).map(i => ({
          invoice_item_id: i.id,
          medicine_name: i.description || i.medicine_name || '—',
          billed_qty: Number(i.quantity) || 0,
          return_qty: 0,
          unit_price: Number(i.unit_price) || 0,
        }))
      )
    } catch (ex) {
      setFetchError(ex.message || 'Invoice not found')
    } finally {
      setFetching(false)
    }
  }

  function updateReturnQty(idx, val) {
    setItems(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item
        const parsed = Math.max(0, Math.min(item.billed_qty, Number(val) || 0))
        return { ...item, return_qty: parsed }
      })
    )
  }

  const returnableItems = items.filter(i => i.return_qty > 0)
  const totalRefund = returnableItems.reduce(
    (sum, i) => sum + i.return_qty * i.unit_price,
    0
  )

  async function handleSubmit() {
    if (returnableItems.length === 0) {
      setSubmitError('Enter a return quantity of at least 1 for one or more items.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      await api.post('/pharmacy/returns', {
        invoice_id: invoice.id,
        reason,
        refund_method: refundMethod,
        items: returnableItems.map(i => ({
          invoice_item_id: i.invoice_item_id,
          quantity_returned: i.return_qty,
          unit_price: i.unit_price,
        })),
      })
      onSuccess()
    } catch (ex) {
      setSubmitError(ex.message || 'Failed to submit return')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[#0F2557]">New Sales Return</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Invoice Lookup */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-1">Invoice ID / Number</label>
          <div className="flex gap-2">
            <input
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 flex-1"
              placeholder="Enter invoice ID or number and click Fetch"
              value={invoiceId}
              onChange={e => { setInvoiceId(e.target.value); setFetchError('') }}
              onKeyDown={e => e.key === 'Enter' && fetchInvoice()}
            />
            <button
              onClick={fetchInvoice}
              disabled={fetching || !invoiceId.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {fetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Fetch
            </button>
          </div>
          {fetchError && <p className="text-red-500 text-xs mt-1">{fetchError}</p>}
        </div>

        {/* Invoice Details */}
        {invoice && (
          <>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice #</span>
                <span className="font-mono font-medium">{invoice.invoice_number || invoice.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Patient / Customer</span>
                <span className="font-medium">{invoice.patient_name || invoice.customer_name || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-IN') : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-semibold">₹{Number(invoice.total || invoice.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Line Items */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
            <div className="rounded-xl border border-gray-200 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billed Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-medium">{item.medicine_name}</td>
                      <td className="px-4 py-3 text-gray-500">{item.billed_qty}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={item.billed_qty}
                          value={item.return_qty}
                          onChange={e => updateReturnQty(idx, e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 w-20"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-500">₹{item.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">
                        ₹{(item.return_qty * item.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Reason & Refund Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 w-full"
                >
                  {REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Refund Method</label>
                <select
                  value={refundMethod}
                  onChange={e => setRefundMethod(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 w-full"
                >
                  {REFUND_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Refund Total */}
            {returnableItems.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm">
                <span className="font-semibold text-green-700">
                  Total Refund: ₹{totalRefund.toFixed(2)}
                </span>
                <span className="text-gray-500 ml-2">
                  ({returnableItems.length} item{returnableItems.length > 1 ? 's' : ''})
                </span>
              </div>
            )}

            {submitError && <p className="text-red-500 text-sm mb-3">{submitError}</p>}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || returnableItems.length === 0}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? 'Processing…' : 'Submit Return'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SalesReturns() {
  const [returns, setReturns] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const load = useCallback(
    async (pg, from, to) => {
      setLoading(true)
      setError('')
      try {
        const params = { page: pg, page_size: PAGE_SIZE }
        if (from) params.from_date = from
        if (to) params.to_date = to
        const data = await api.get('/pharmacy/returns', { params })
        const list = Array.isArray(data) ? data : (data?.returns ?? [])
        const count = typeof data?.total === 'number' ? data.total : list.length
        setReturns(list)
        setTotal(count)
      } catch (ex) {
        setError(ex.message || 'Failed to load returns')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => { load(page, fromDate, toDate) }, [load, page, fromDate, toDate])

  function handleSearch() {
    setPage(1)
    load(1, fromDate, toDate)
  }

  function handleClear() {
    setFromDate('')
    setToDate('')
    setPage(1)
    load(1, '', '')
  }

  function handlePageChange(pg) {
    setPage(pg)
    load(pg, fromDate, toDate)
  }

  function handleSuccess() {
    setShowModal(false)
    setToast('Sales return recorded successfully.')
    setPage(1)
    load(1, fromDate, toDate)
  }

  function reasonLabel(val) {
    return REASONS.find(r => r.value === val)?.label ?? val ?? '—'
  }

  function refundMethodLabel(val) {
    return REFUND_METHODS.find(m => m.value === val)?.label ?? val ?? '—'
  }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
      {showModal && (
        <NewReturnModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
      )}

      {/* Filter bar */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
        >
          <Search size={14} /> Search
        </button>
        {(fromDate || toDate) && (
          <button
            onClick={handleClear}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> New Return
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={30} className="animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="card p-10 text-center text-red-500">{error}</div>
      ) : returns.length === 0 ? (
        <div className="card p-14 text-center text-gray-400">
          <RotateCcw size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No sales returns found</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items Returned</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refund Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refund Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returns.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[#0F2557] font-semibold">
                        {r.return_number || `RET-${r.id}`}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {r.invoice_number || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {Array.isArray(r.items) ? r.items.length : (r.items_count ?? '—')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-700">
                        ₹{Number(r.total_refund || r.refund_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {refundMethodLabel(r.refund_method)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{reasonLabel(r.reason)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">
                          {r.status || 'processed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>Page {page} of {totalPages} ({total} total)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
