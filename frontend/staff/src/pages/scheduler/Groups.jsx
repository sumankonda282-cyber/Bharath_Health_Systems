import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, Plus, Trash2, Users, X, UserPlus, Crown,
} from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'

function formatRole(role) {
  if (!role) return ''
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function Groups() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'clinic_admin'
  const [groups, setGroups]   = useState([])
  const [staff, setStaff]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [addingTo, setAddingTo] = useState(null)   // group id with member-picker open

  const fetchAll = useCallback(() => {
    Promise.all([api.get('/scheduler/groups'), api.get('/scheduler/staff')])
      .then(([g, s]) => { setGroups(g); setStaff(s) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const createGroup = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await api.post('/scheduler/groups', { name: newName.trim() })
      setNewName('')
      fetchAll()
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    } finally {
      setCreating(false)
    }
  }

  const deleteGroup = async (id) => {
    if (!confirm('Delete this group? Schedule entries are kept but unlinked.')) return
    try {
      await api.delete(`/scheduler/groups/${id}`)
      fetchAll()
    } catch (e) {
      setError(e.message)
    }
  }

  const addMembers = async (groupId, staffIds) => {
    try {
      await api.post(`/scheduler/groups/${groupId}/members`, { staff_ids: staffIds })
      setAddingTo(null)
      fetchAll()
    } catch (e) {
      setError(e.message)
    }
  }

  const removeMember = async (groupId, staffId) => {
    try {
      await api.delete(`/scheduler/groups/${groupId}/members/${staffId}`)
      fetchAll()
    } catch (e) {
      setError(e.message)
    }
  }

  const setManager = async (groupId, managerId) => {
    try {
      await api.patch(`/scheduler/groups/${groupId}`, { manager_id: managerId ? Number(managerId) : null })
      fetchAll()
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-gray-300" /></div>
  }

  const managers = staff.filter(s => ['clinic_manager', 'clinic_admin'].includes(s.role))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-800">Groups & People</h1>
          <p className="text-sm text-gray-500">Organize staff into schedulable groups — ICU Nurses, OPD Doctors, Front Desk…</p>
        </div>
        <div className="flex gap-2">
          <input
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-48 focus:outline-none"
            placeholder="New group name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createGroup()}
          />
          <button onClick={createGroup} disabled={creating || !newName.trim()} className="btn-primary btn-sm">
            {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}Create Group
          </button>
        </div>
      </div>

      {error && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      {groups.length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={36} className="mx-auto text-gray-300 mb-3" />
          <div className="font-bold text-gray-700">No groups yet</div>
          <p className="text-sm text-gray-500 mt-1">Create your first group above — e.g. "OPD Doctors" or "Ward Nurses"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map(g => (
            <div key={g.id} className="card p-5">
              <div className="flex items-start justify-between mb-1">
                <div className="font-bold text-gray-800">{g.name}</div>
                <button onClick={() => deleteGroup(g.id)} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Manager assignment */}
              <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
                <Crown size={12} style={{ color: '#F5821E' }} />
                {isAdmin ? (
                  <select
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
                    value={g.manager_id || ''}
                    onChange={e => setManager(g.id, e.target.value)}
                  >
                    <option value="">No owner (visible to all managers)</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                ) : (
                  <span>{g.manager_name ? `Managed by ${g.manager_name}` : 'No owner'}</span>
                )}
              </div>

              {/* Members */}
              <div className="space-y-1.5 mb-3">
                {g.members.length === 0 && (
                  <div className="text-xs text-gray-400 italic">No members yet</div>
                )}
                {g.members.map(m => (
                  <div key={m.staff_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 text-sm">
                    <span className="font-medium text-gray-700 text-xs">{m.full_name}</span>
                    <span className="text-xs text-gray-400">{formatRole(m.role)}</span>
                    <button onClick={() => removeMember(g.id, m.staff_id)} className="ml-auto text-gray-300 hover:text-red-500">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={() => setAddingTo(g.id)} className="btn-secondary btn-sm w-full justify-center">
                <UserPlus size={13} />Add Staff
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Member picker modal */}
      {addingTo && (
        <MemberPicker
          group={groups.find(g => g.id === addingTo)}
          allStaff={staff}
          onAdd={ids => addMembers(addingTo, ids)}
          onClose={() => setAddingTo(null)}
        />
      )}
    </div>
  )
}

function MemberPicker({ group, allStaff, onAdd, onClose }) {
  const existing = new Set(group.members.map(m => m.staff_id))
  const candidates = allStaff.filter(s => !existing.has(s.id))
  const [selected, setSelected] = useState(new Set())
  const [search, setSearch] = useState('')

  const filtered = candidates.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.role || '').includes(search.toLowerCase())
  )

  const toggle = id => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 p-6 max-h-[85vh] flex flex-col">
        <h3 className="font-bold text-gray-800 mb-1">Add staff to {group.name}</h3>
        <input
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm my-3 focus:outline-none"
          placeholder="Search by name or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <div className="flex-1 overflow-y-auto space-y-1 mb-4">
          {filtered.length === 0 && <div className="text-sm text-gray-400 text-center py-6">No staff found</div>}
          {filtered.map(s => (
            <label key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                className="rounded"
              />
              <div>
                <div className="text-sm font-medium text-gray-800">{s.full_name}</div>
                <div className="text-xs text-gray-400">{formatRole(s.role)}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAdd([...selected])}
            disabled={!selected.size}
            className="btn-primary flex-1"
          >
            Add {selected.size > 0 && `(${selected.size})`}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}
