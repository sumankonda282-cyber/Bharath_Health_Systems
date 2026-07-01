import { useState, useEffect, useMemo, useCallback } from 'react'
import { adminApi } from '../api'
import {
  Search, X, ChevronDown, ChevronRight, Loader2, AlertTriangle,
  Database, Download, BookMarked, Trash2, Plus,
} from 'lucide-react'

/* ------------------------------------------------------------------ *
 * Table schema — 70 tables with their columns                        *
 * ------------------------------------------------------------------ */

const TABLE_SCHEMA = [
  { table: 'platform_admins',            columns: ['id', 'email', 'full_name', 'created_at'] },
  { table: 'clinics',                    columns: ['id', 'name', 'status', 'plan', 'specialty', 'city', 'state', 'org_type', 'created_at'] },
  { table: 'branches',                   columns: ['id', 'clinic_id', 'name', 'city', 'state'] },
  { table: 'staff',                      columns: ['id', 'clinic_id', 'full_name', 'email', 'role', 'is_active', 'created_at'] },
  { table: 'doctor_profiles',            columns: ['id', 'staff_id', 'specialization', 'license_number', 'consultation_fee'] },
  { table: 'doctor_schedules',           columns: ['id', 'doctor_id', 'day_of_week', 'start_time', 'end_time'] },
  { table: 'patients',                   columns: ['id', 'clinic_id', 'full_name', 'mobile', 'gender', 'state', 'blood_group', 'created_at'] },
  { table: 'patient_users',              columns: ['id', 'patient_id', 'email', 'created_at'] },
  { table: 'appointments',               columns: ['id', 'clinic_id', 'patient_id', 'doctor_id', 'status', 'appointment_date', 'appointment_time'] },
  { table: 'online_bookings',            columns: ['id', 'clinic_id', 'patient_id', 'booking_date', 'status'] },
  { table: 'vitals',                     columns: ['id', 'patient_id', 'clinic_id', 'temperature', 'bp_systolic', 'bp_diastolic', 'recorded_at'] },
  { table: 'soap_notes',                 columns: ['id', 'patient_id', 'clinic_id', 'subjective', 'objective', 'assessment', 'plan', 'created_at'] },
  { table: 'prescriptions',              columns: ['id', 'patient_id', 'clinic_id', 'doctor_id', 'status', 'created_at'] },
  { table: 'prescription_items',         columns: ['id', 'prescription_id', 'drug_name', 'dosage', 'frequency', 'duration'] },
  { table: 'medicines',                  columns: ['id', 'clinic_id', 'name', 'category', 'unit', 'reorder_level'] },
  { table: 'medicine_batches',           columns: ['id', 'medicine_id', 'batch_number', 'expiry_date', 'quantity', 'purchase_price', 'sale_price'] },
  { table: 'stock_transactions',         columns: ['id', 'medicine_id', 'type', 'quantity', 'created_at'] },
  { table: 'pharmacy_orders',            columns: ['id', 'clinic_id', 'patient_id', 'status', 'total_amount', 'created_at'] },
  { table: 'invoices',                   columns: ['id', 'clinic_id', 'patient_id', 'total_amount', 'status', 'created_at'] },
  { table: 'invoice_items',              columns: ['id', 'invoice_id', 'description', 'quantity', 'unit_price', 'amount'] },
  { table: 'invoice_payments',           columns: ['id', 'invoice_id', 'amount_paid', 'payment_mode', 'payment_date'] },
  { table: 'lab_tests',                  columns: ['id', 'clinic_id', 'name', 'category', 'price'] },
  { table: 'lab_orders',                 columns: ['id', 'clinic_id', 'patient_id', 'status', 'created_at'] },
  { table: 'lab_order_items',            columns: ['id', 'lab_order_id', 'test_id', 'status'] },
  { table: 'lab_results',                columns: ['id', 'lab_order_item_id', 'result_value', 'reference_range', 'is_abnormal'] },
  { table: 'imaging_orders',             columns: ['id', 'clinic_id', 'patient_id', 'modality', 'status', 'created_at'] },
  { table: 'imaging_results',            columns: ['id', 'imaging_order_id', 'report', 'radiologist_id', 'created_at'] },
  { table: 'admissions',                 columns: ['id', 'clinic_id', 'patient_id', 'ward_id', 'bed_id', 'status', 'admitted_at', 'discharged_at'] },
  { table: 'wards',                      columns: ['id', 'clinic_id', 'name', 'ward_type', 'total_beds'] },
  { table: 'beds',                       columns: ['id', 'ward_id', 'bed_number', 'status'] },
  { table: 'vital_signs',                columns: ['id', 'admission_id', 'temperature', 'bp_systolic', 'pulse', 'recorded_at'] },
  { table: 'nursing_notes',              columns: ['id', 'admission_id', 'staff_id', 'note', 'created_at'] },
  { table: 'medication_orders',          columns: ['id', 'admission_id', 'drug_name', 'dosage', 'frequency', 'status'] },
  { table: 'medication_administrations', columns: ['id', 'medication_order_id', 'staff_id', 'administered_at'] },
  { table: 'ward_rounds',                columns: ['id', 'admission_id', 'doctor_id', 'findings', 'created_at'] },
  { table: 'progress_notes',             columns: ['id', 'admission_id', 'doctor_id', 'note', 'created_at'] },
  { table: 'clinical_orders',            columns: ['id', 'admission_id', 'order_type', 'description', 'status'] },
  { table: 'discharge_summaries',        columns: ['id', 'admission_id', 'diagnosis', 'discharge_date', 'condition_on_discharge'] },
  { table: 'inpatient_charges',          columns: ['id', 'admission_id', 'description', 'amount', 'created_at'] },
  { table: 'inpatient_bills',            columns: ['id', 'admission_id', 'total_amount', 'status'] },
  { table: 'departments',                columns: ['id', 'clinic_id', 'name', 'dept_type'] },
  { table: 'assessment_forms',           columns: ['id', 'title', 'category', 'status', 'is_template', 'created_at'] },
  { table: 'form_submissions',           columns: ['id', 'form_id', 'patient_id', 'submitted_at', 'score'] },
  { table: 'assessment_templates',       columns: ['id', 'name', 'category', 'created_at'] },
  { table: 'chat_rooms',                 columns: ['id', 'clinic_id', 'name', 'created_at'] },
  { table: 'internal_messages',          columns: ['id', 'room_id', 'sender_id', 'message', 'sent_at'] },
  { table: 'telehealth_sessions',        columns: ['id', 'clinic_id', 'patient_id', 'doctor_id', 'status', 'started_at'] },
  { table: 'referrals',                  columns: ['id', 'clinic_id', 'patient_id', 'referred_by', 'referred_to', 'status', 'created_at'] },
  { table: 'audit_logs',                 columns: ['id', 'clinic_id', 'action', 'user_type', 'admin_name', 'ip_address', 'created_at'] },
  { table: 'feedback',                   columns: ['id', 'name', 'email', 'type', 'message', 'created_at'] },
  { table: 'subscription_payments',      columns: ['id', 'clinic_id', 'amount', 'plan', 'payment_date', 'status'] },
  { table: 'suppliers',                  columns: ['id', 'clinic_id', 'name', 'contact', 'created_at'] },
  { table: 'purchase_orders',            columns: ['id', 'clinic_id', 'supplier_id', 'total_amount', 'status', 'order_date'] },
  { table: 'drug_register',              columns: ['id', 'clinic_id', 'drug_name', 'schedule', 'quantity'] },
  { table: 'maintenance_requests',       columns: ['id', 'clinic_id', 'title', 'status', 'priority', 'created_at'] },
  { table: 'imaging_slots',              columns: ['id', 'clinic_id', 'modality', 'date', 'start_time', 'is_available'] },
  { table: 'imaging_bookings',           columns: ['id', 'slot_id', 'patient_id', 'status'] },
  { table: 'doctor_ratings',             columns: ['id', 'patient_id', 'doctor_id', 'rating', 'created_at'] },
  { table: 'leave_requests',             columns: ['id', 'staff_id', 'leave_type', 'start_date', 'end_date', 'status'] },
  { table: 'schedule_entries',           columns: ['id', 'staff_id', 'date', 'shift_type_id', 'notes'] },
  { table: 'visitor_passes',             columns: ['id', 'admission_id', 'visitor_name', 'relation', 'valid_from', 'valid_until'] },
  { table: 'insurance_claims',           columns: ['id', 'invoice_id', 'insurer', 'claim_amount', 'status', 'created_at'] },
  { table: 'billing_override_requests',  columns: ['id', 'invoice_id', 'requested_by', 'reason', 'status'] },
  { table: 'patient_referrals',          columns: ['id', 'patient_id', 'referred_by', 'referred_to_clinic', 'reason', 'created_at'] },
  { table: 'documentation_sessions',     columns: ['id', 'admission_id', 'staff_id', 'started_at', 'ended_at'] },
  { table: 'platform_settings',          columns: ['id', 'key', 'value', 'updated_at'] },
  { table: 'medical_terms',              columns: ['id', 'term', 'category', 'description'] },
  { table: 'drugs',                      columns: ['id', 'generic_name', 'brand_names', 'category', 'schedule'] },
]

/* ------------------------------------------------------------------ *
 * Helpers                                                            *
 * ------------------------------------------------------------------ */

function isoDay(d) { return d.toISOString().split('T')[0] }
function todayStr() { return isoDay(new Date()) }
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return isoDay(d)
}
function colKey(table, column) { return `${table}.${column}` }

function exportCsv(rows, selectedColumns) {
  if (!rows.length || !selectedColumns.length) return
  const header = selectedColumns.map(c => `"${c.table}.${c.column}"`).join(',')
  const lines = rows.map(row =>
    selectedColumns.map(c => {
      const v = String(row[colKey(c.table, c.column)] ?? row[c.column] ?? '').replace(/"/g, '""')
      return `"${v}"`
    }).join(',')
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `report_${todayStr()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

const SAVED_KEY = 'bhs_admin_saved_reports_v2'
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] }
}
function persistSaved(list) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)) } catch { /* storage full */ }
}

/* ------------------------------------------------------------------ *
 * Saved Reports Modal                                                *
 * ------------------------------------------------------------------ */

function SavedReportsModal({ onClose, savedReports, onLoad, onDelete, onSaveCurrent, canSave }) {
  const [saveName, setSaveName] = useState('')

  function handleSave() {
    const name = saveName.trim()
    if (!name) return
    onSaveCurrent(name)
    setSaveName('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="surface border border-app rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-app">
          <div className="flex items-center gap-2">
            <BookMarked size={16} className="text-[#F5821E]" />
            <span className="font-semibold text-white text-sm">Saved Reports</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Save current */}
        {canSave && (
          <div className="px-5 py-3 border-b border-app surface-2">
            <p className="text-xs text-gray-400 mb-2">Save current column selection as a named report</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Report name…"
                className="input flex-1 text-xs py-1.5"
              />
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5821E] hover:bg-[#e07319] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex-shrink-0"
              >
                <Plus size={12} />
                Save
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="overflow-y-auto max-h-80 divide-y divide-[color:var(--border)]">
          {savedReports.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <BookMarked size={28} className="text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No saved reports yet.</p>
              <p className="text-xs text-gray-600 mt-1">Select columns, then save the configuration here.</p>
            </div>
          ) : (
            savedReports.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover-app transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{r.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {r.columns.length} column{r.columns.length !== 1 ? 's' : ''}
                    {r.filters?.date_from ? ` · ${r.filters.date_from} → ${r.filters.date_to}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => { onLoad(r); onClose() }}
                  className="text-xs px-2.5 py-1 bg-[#F5821E]/10 hover:bg-[#F5821E]/20 text-[#F5821E] border border-[#F5821E]/30 rounded-lg transition-colors flex-shrink-0"
                >
                  Load
                </button>
                <button
                  onClick={() => onDelete(r.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                  title="Delete saved report"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Left panel — table accordion                                       *
 * ------------------------------------------------------------------ */

function TablePanel({ selectedColumns, onToggle }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})

  const q = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return TABLE_SCHEMA
    return TABLE_SCHEMA.filter(t =>
      t.table.includes(q) || t.columns.some(c => c.includes(q))
    )
  }, [q])

  // Auto-expand matching tables when searching
  useEffect(() => {
    if (q) {
      const map = {}
      filtered.forEach(t => { map[t.table] = true })
      setExpanded(map)
    }
  }, [q, filtered])

  function toggleExpand(table) {
    setExpanded(prev => ({ ...prev, [table]: !prev[table] }))
  }

  function isColumnSelected(table, column) {
    return selectedColumns.some(c => c.table === table && c.column === column)
  }

  function selectedCountFor(table) {
    return selectedColumns.filter(c => c.table === table).length
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search — pinned at top */}
      <div className="p-3 border-b border-app flex-shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tables & columns…"
            className="w-full surface-2 border border-app text-white text-xs rounded-lg pl-8 pr-7 py-1.5 outline-none focus:border-[#F5821E] transition-colors placeholder-gray-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={11} />
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 pl-0.5">
          {filtered.length} table{filtered.length !== 1 ? 's' : ''}
          {selectedColumns.length > 0 && (
            <span className="ml-2 text-[#F5821E]">{selectedColumns.length} selected</span>
          )}
        </p>
      </div>

      {/* Accordion list — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-gray-600">No tables match &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          filtered.map(t => {
            const open = !!expanded[t.table]
            const selCount = selectedCountFor(t.table)

            return (
              <div key={t.table} className="border-b border-app">
                {/* Table header row */}
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 surface-2 hover-app transition-colors text-left"
                  onClick={() => toggleExpand(t.table)}
                >
                  {open
                    ? <ChevronDown size={11} className="text-gray-500 flex-shrink-0" />
                    : <ChevronRight size={11} className="text-gray-500 flex-shrink-0" />
                  }
                  <span className="flex-1 min-w-0 text-xs text-gray-200 truncate font-medium">
                    {t.table}
                  </span>
                  {selCount > 0 && (
                    <span className="flex-shrink-0 text-[9px] bg-[#F5821E]/20 text-[#F5821E] border border-[#F5821E]/30 rounded px-1 py-0.5 font-semibold">
                      {selCount}
                    </span>
                  )}
                </button>

                {/* Column checkboxes */}
                {open && (
                  <div className="py-1 surface">
                    {t.columns.map(col => {
                      const selected = isColumnSelected(t.table, col)
                      const colMatchesSearch = q && col.includes(q)

                      return (
                        <label
                          key={col}
                          className={`flex items-center gap-2.5 px-4 py-1 cursor-pointer transition-colors ${
                            selected
                              ? 'bg-[#F5821E]/10 text-[#F5821E]'
                              : colMatchesSearch
                              ? 'bg-yellow-500/5 text-yellow-200 hover-app'
                              : 'text-dim hover-app hover:text-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => onToggle(t.table, col)}
                            className="accent-[#F5821E] w-3 h-3 flex-shrink-0"
                          />
                          <span className="text-[11px] truncate">{col}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Middle panel — data grid                                           *
 * ------------------------------------------------------------------ */

function DataGrid({ selectedColumns, reportData, loading, error, onRetry, onRemoveColumn, onRemoveAll }) {
  const rows = reportData?.rows || []
  const total = reportData?.total ?? rows.length

  if (selectedColumns.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <Database size={44} className="text-gray-800 mb-4" />
        <p className="text-sm text-gray-400 font-medium">Select columns from the left panel to build your report</p>
        <p className="text-xs text-gray-600 mt-1.5">Choose any combination of columns from the 70 available tables, then click Run.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Selected columns chips header */}
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-app surface">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            <span className="text-xs text-gray-400">
              <span className="text-white font-semibold">{selectedColumns.length}</span>
              {' '}column{selectedColumns.length !== 1 ? 's' : ''}
            </span>
            {reportData && (
              <span className="text-xs text-gray-600">
                &middot; {total.toLocaleString()} row{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 flex-1">
            {selectedColumns.map(c => (
              <span
                key={colKey(c.table, c.column)}
                className="inline-flex items-center gap-1 px-2 py-0.5 surface-2 border border-app rounded-md text-[11px] text-gray-300"
              >
                <span className="text-gray-500">{c.table}.</span>
                <span>{c.column}</span>
                <button
                  type="button"
                  onClick={() => onRemoveColumn(c.table, c.column)}
                  className="ml-0.5 text-gray-600 hover:text-red-400 transition-colors"
                  title={`Remove ${c.table}.${c.column}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={onRemoveAll}
            className="flex-shrink-0 text-[11px] text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 pt-0.5"
          >
            <X size={11} />
            Remove all
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-[#F5821E]" size={24} />
              <p className="text-xs text-gray-500">Running query&hellip;</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full px-8">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300">Query failed</p>
                  <p className="text-xs text-red-400/80 mt-1 break-all">{error}</p>
                  <button
                    onClick={onRetry}
                    className="mt-3 text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : !reportData ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-600">Click &ldquo;Run&rdquo; in the top bar to fetch data</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Database size={32} className="text-gray-700 mb-3" />
            <p className="text-sm text-gray-500">No rows returned</p>
            <p className="text-xs text-gray-600 mt-1">Try adjusting the filters or date range.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {rows.length >= 1000 && (
              <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-xs text-amber-400">
                <AlertTriangle size={13} className="flex-shrink-0" />
                Showing first 1,000 rows{total > 1000 ? ` of ${total.toLocaleString()} total` : ''}. Refine your filters to see all data.
              </div>
            )}
            <div className="overflow-auto flex-1">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 surface">
                <tr className="border-b border-app">
                  {selectedColumns.map(c => (
                    <th key={colKey(c.table, c.column)} className="th whitespace-nowrap">
                      <span className="text-gray-600 font-normal">{c.table}.</span>
                      {c.column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {rows.map((row, i) => (
                  <tr key={i} className="tr-hover">
                    {selectedColumns.map(c => {
                      const val = row[colKey(c.table, c.column)] ?? row[c.column] ?? null
                      return (
                        <td key={colKey(c.table, c.column)} className="td whitespace-nowrap max-w-[240px]">
                          <span
                            className="block truncate"
                            title={val == null ? '' : String(val)}
                          >
                            {val == null
                              ? <span className="text-gray-600">&mdash;</span>
                              : String(val)
                            }
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Main component                                                     *
 * ------------------------------------------------------------------ */

export default function Reports() {
  const [dateFrom, setDateFrom]                 = useState(daysAgo(29))
  const [dateTo, setDateTo]                     = useState(todayStr())
  const [clinics, setClinics]                   = useState([])
  const [selectedClinicId, setSelectedClinicId] = useState('')
  const [selectedColumns, setSelectedColumns]   = useState([])
  const [reportData, setReportData]             = useState(null)
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState('')
  const [savedReports, setSavedReports]         = useState(loadSaved)
  const [showSavedModal, setShowSavedModal]     = useState(false)

  // Load clinic list for Health Center dropdown
  useEffect(() => {
    let alive = true
    adminApi.getClinics()
      .then(data => {
        if (!alive) return
        const list = Array.isArray(data) ? data : (data?.clinics ?? [])
        setClinics(list)
      })
      .catch(() => { if (alive) setClinics([]) })
    return () => { alive = false }
  }, [])

  // Persist saved reports to localStorage whenever the list changes
  useEffect(() => { persistSaved(savedReports) }, [savedReports])

  /* ---- Column selection ---- */
  const toggleColumn = useCallback((table, column) => {
    setSelectedColumns(prev => {
      const exists = prev.some(c => c.table === table && c.column === column)
      if (exists) return prev.filter(c => !(c.table === table && c.column === column))
      return [...prev, { table, column }]
    })
  }, [])

  const removeColumn = useCallback((table, column) => {
    setSelectedColumns(prev => prev.filter(c => !(c.table === table && c.column === column)))
  }, [])

  const removeAllColumns = useCallback(() => {
    setSelectedColumns([])
    setReportData(null)
    setError('')
  }, [])

  /* ---- Run query ---- */
  async function runReport() {
    if (selectedColumns.length === 0) return
    setLoading(true)
    setError('')
    try {
      const body = {
        columns: selectedColumns,
        filters: {
          ...(selectedClinicId ? { clinic_id: selectedClinicId } : {}),
          date_from: dateFrom,
          date_to:   dateTo,
        },
      }
      const res = await adminApi.runQuery(body)
      setReportData(res || { rows: [], total: 0 })
    } catch (e) {
      setError(e.message || 'Failed to run query. Please try again.')
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }

  /* ---- Saved report actions ---- */
  function handleSaveCurrent(name) {
    const entry = {
      id: Date.now(),
      name,
      columns: selectedColumns,
      filters: {
        clinic_id: selectedClinicId,
        date_from: dateFrom,
        date_to:   dateTo,
      },
    }
    setSavedReports(prev => [entry, ...prev])
  }

  function handleLoadSaved(report) {
    setSelectedColumns(report.columns || [])
    if (report.filters) {
      if (report.filters.date_from)  setDateFrom(report.filters.date_from)
      if (report.filters.date_to)    setDateTo(report.filters.date_to)
      setSelectedClinicId(report.filters.clinic_id || '')
    }
    setReportData(null)
    setError('')
  }

  function handleDeleteSaved(id) {
    setSavedReports(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div
      className="flex flex-col surface text-gray-200 overflow-hidden"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* ================================================================ *
       * TOP FILTER BAR — pinned below page header                        *
       * ================================================================ */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-app surface backdrop-blur-sm flex-wrap">

        {/* Date from */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 flex-shrink-0">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="surface-2 border border-app text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#F5821E] transition-colors"
          />
        </div>

        {/* Date to */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 flex-shrink-0">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="surface-2 border border-app text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#F5821E] transition-colors"
          />
        </div>

        {/* Health Center dropdown */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 flex-shrink-0">Health Center</label>
          <select
            value={selectedClinicId}
            onChange={e => setSelectedClinicId(e.target.value)}
            className="surface-2 border border-app text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#F5821E] transition-colors min-w-[160px] max-w-[220px]"
          >
            <option value="">All centers</option>
            {clinics.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {/* Saved Reports button */}
        <button
          type="button"
          onClick={() => setShowSavedModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 surface-2 hover-app border border-app text-gray-300 hover:text-white text-xs font-medium rounded-xl transition-colors"
        >
          <BookMarked size={13} />
          Saved Reports
          {savedReports.length > 0 && (
            <span className="bg-[#F5821E]/20 text-[#F5821E] text-[9px] px-1.5 py-0.5 rounded-full border border-[#F5821E]/30 font-semibold">
              {savedReports.length}
            </span>
          )}
        </button>

        {/* Run button */}
        <button
          type="button"
          onClick={runReport}
          disabled={loading || selectedColumns.length === 0}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#F5821E] hover:bg-[#e07319] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-colors"
        >
          {loading && <Loader2 size={12} className="animate-spin" />}
          {loading ? 'Running…' : 'Run'}
        </button>

        {/* Export CSV button */}
        <button
          type="button"
          onClick={() => exportCsv(reportData?.rows || [], selectedColumns)}
          disabled={!reportData?.rows?.length}
          className="flex items-center gap-1.5 px-3 py-1.5 surface-2 hover-app disabled:opacity-40 disabled:cursor-not-allowed border border-app text-gray-300 hover:text-white text-xs font-medium rounded-xl transition-colors"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* ================================================================ *
       * BODY — left accordion panel + middle data grid                   *
       * ================================================================ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ---- LEFT PANEL ---- */}
        <div
          className="flex-shrink-0 flex flex-col surface border-r border-app overflow-hidden"
          style={{ width: '260px' }}
        >
          <div className="px-3 py-2 border-b border-app flex-shrink-0 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Tables &amp; Columns</p>
            <Database size={12} className="text-gray-700" />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <TablePanel selectedColumns={selectedColumns} onToggle={toggleColumn} />
          </div>
        </div>

        {/* ---- MIDDLE PANEL ---- */}
        <div className="flex-1 min-w-0 flex flex-col surface overflow-hidden">
          <DataGrid
            selectedColumns={selectedColumns}
            reportData={reportData}
            loading={loading}
            error={error}
            onRetry={runReport}
            onRemoveColumn={removeColumn}
            onRemoveAll={removeAllColumns}
          />
        </div>
      </div>

      {/* ================================================================ *
       * SAVED REPORTS MODAL                                              *
       * ================================================================ */}
      {showSavedModal && (
        <SavedReportsModal
          onClose={() => setShowSavedModal(false)}
          savedReports={savedReports}
          onLoad={handleLoadSaved}
          onDelete={handleDeleteSaved}
          onSaveCurrent={handleSaveCurrent}
          canSave={selectedColumns.length > 0}
        />
      )}
    </div>
  )
}
