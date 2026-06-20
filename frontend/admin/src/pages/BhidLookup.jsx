import { useState } from 'react'
import { adminApi } from '../api'
import { Search, User, Building2, CheckCircle, XCircle } from 'lucide-react'

export default function BhidLookup() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async e => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true); setError(''); setResults(null)
    try {
      const data = await adminApi.bhidLookup(query.trim())
      setResults(data)
    } catch (ex) {
      setError(ex.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <form onSubmit={search} className="card p-4 mb-6 flex gap-3">
        <input
          className="input flex-1"
          placeholder="Enter BH ID (e.g. BH9000001) or UHID..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading} className="btn-primary">
          <Search size={16} />
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="card p-4 mb-4 text-red-600 text-sm">{error}</div>}

      {results && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            {results.total} record(s) found{results.bh_id ? <> for <strong>{results.bh_id}</strong></> : ''}
          </p>
          <div className="space-y-4">
            {(results.records || []).map((r, i) => (
              <div key={i} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span className="font-bold text-gray-900 text-lg">{r.full_name}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>BH ID: <strong className="text-indigo-600">{r.bh_id || '—'}</strong></span>
                      <span>UHID: <strong>{r.uhid}</strong></span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`badge ${r.has_portal_account ? 'badge-green' : 'badge-gray'}`}>
                      {r.has_portal_account ? 'Portal Account' : 'No Portal'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-gray-400">Mobile</span><div className="font-medium">{r.mobile || '—'}</div></div>
                  <div><span className="text-gray-400">Gender</span><div className="font-medium capitalize">{r.gender || '—'}</div></div>
                  <div><span className="text-gray-400">DOB</span><div className="font-medium">{r.date_of_birth || '—'}</div></div>
                  <div><span className="text-gray-400">Clinic</span><div className="font-medium flex items-center gap-1"><Building2 size={12}/>{r.clinic_name}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results && results.total === 0 && (
        <div className="card p-10 text-center text-gray-400">No records found</div>
      )}
    </div>
  )
}
