import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, MessageSquare, ChevronLeft, Circle, Loader2 } from 'lucide-react'
import api from '../api/client'

const ROLE_LABEL = {
  doctor: 'Doctor', nurse: 'Nurse', pharmacist: 'Pharmacist',
  lab_technician: 'Lab', radiologist: 'Radiologist', imaging_technician: 'Imaging',
  clinic_admin: 'Admin', clinic_manager: 'Manager',
}
const ROLE_COLOR = {
  doctor: 'bg-blue-100 text-blue-700',
  nurse: 'bg-emerald-100 text-emerald-700',
  pharmacist: 'bg-purple-100 text-purple-700',
  lab_technician: 'bg-amber-100 text-amber-700',
  radiologist: 'bg-orange-100 text-orange-700',
  imaging_technician: 'bg-rose-100 text-rose-700',
  clinic_admin: 'bg-gray-100 text-gray-700',
  clinic_manager: 'bg-gray-100 text-gray-700',
}
const PRESENCE_COLOR = { online: 'text-green-500', away: 'text-amber-400', offline: 'text-gray-300' }

// PIN numpad overlay
function PinGate({ onSuccess, onCancel }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const press = (d) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) verify(next)
  }
  const del = () => setPin(p => p.slice(0, -1))

  const verify = async (p) => {
    setLoading(true); setError('')
    try {
      const res = await api.post('/auth/staff/pin-verify', { pin: p })
      if (res.verified) onSuccess(res)
      else { setError('Incorrect PIN'); setPin('') }
    } catch (e) {
      setError(e.message || 'Verification failed'); setPin('')
    } finally {
      setLoading(false)
    }
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-white">
      <MessageSquare size={32} className="text-emerald-600 mb-3" />
      <h3 className="font-bold text-gray-800 text-lg mb-1">Identify Yourself</h3>
      <p className="text-gray-500 text-sm mb-6 text-center">Enter your 4-digit PIN to start chatting</p>

      {/* PIN dots */}
      <div className="flex gap-3 mb-6">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
            i < pin.length ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
          }`} />
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? <Loader2 size={24} className="animate-spin text-emerald-600 mb-4" /> : (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {KEYS.map((k, i) => k === '' ? <div key={i} /> : (
            <button key={i}
              onClick={k === '⌫' ? del : () => press(k)}
              className="w-16 h-16 rounded-2xl text-xl font-semibold bg-gray-100 hover:bg-emerald-100 active:scale-95 transition-all text-gray-800 flex items-center justify-center"
            >
              {k}
            </button>
          ))}
        </div>
      )}

      <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 mt-2">Cancel</button>
    </div>
  )
}

// Contact list
function ContactList({ contacts, loading, onSelect }) {
  const groups = {}
  contacts.forEach(c => {
    const g = ROLE_LABEL[c.role] || c.role
    if (!groups[g]) groups[g] = []
    groups[g].push(c)
  })

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <Loader2 size={20} className="animate-spin mr-2" /> Loading…
    </div>
  )
  if (!contacts.length) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">No colleagues online</div>
  )

  return (
    <div className="flex-1 overflow-y-auto">
      {Object.entries(groups).map(([group, members]) => (
        <div key={group}>
          <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 sticky top-0">
            {group}
          </div>
          {members.map(c => (
            <button key={c.staff_id} onClick={() => onSelect(c)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors text-left border-b border-gray-100">
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700">
                  {c.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <Circle size={10} className={`absolute -bottom-0.5 -right-0.5 fill-current ${PRESENCE_COLOR[c.presence]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 text-sm truncate">{c.full_name}</span>
                  {c.unread > 0 && (
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                      {c.unread}
                    </span>
                  )}
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLOR[c.role] || 'bg-gray-100 text-gray-600'}`}>
                  {ROLE_LABEL[c.role] || c.role}
                </span>
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

// Message thread
function MessageThread({ contact, me, onBack }) {
  const [roomId, setRoomId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const pollRef = useRef(null)
  const lastIdRef = useRef(0)

  const openRoom = useCallback(async () => {
    const r = await api.post('/chat/rooms/direct', null, { params: { other_staff_id: contact.staff_id } })
    return r.room_id
  }, [contact.staff_id])

  const loadMessages = useCallback(async (rid) => {
    const msgs = await api.get(`/chat/rooms/${rid}/messages`)
    setMessages(msgs)
    if (msgs.length) lastIdRef.current = msgs[msgs.length - 1].id
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const rid = await openRoom()
      if (cancelled) return
      setRoomId(rid)
      await loadMessages(rid)

      // Long-poll loop
      const poll = async () => {
        if (cancelled) return
        try {
          const newMsgs = await api.get(`/chat/rooms/${rid}/poll`, { params: { after_id: lastIdRef.current }, timeout: 30000 })
          if (!cancelled && newMsgs.length) {
            setMessages(prev => [...prev, ...newMsgs])
            lastIdRef.current = newMsgs[newMsgs.length - 1].id
          }
        } catch (_) {}
        if (!cancelled) pollRef.current = setTimeout(poll, 500)
      }
      poll()
    }
    init()
    return () => { cancelled = true; clearTimeout(pollRef.current) }
  }, [openRoom, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || !roomId || sending) return
    setSending(true)
    try {
      const msg = await api.post(`/chat/rooms/${roomId}/messages`, { body: input.trim(), msg_type: 'text' })
      setMessages(prev => [...prev, msg])
      lastIdRef.current = msg.id
      setInput('')
    } catch (_) {}
    setSending(false)
  }

  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-700 p-1">
          <ChevronLeft size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700 flex-shrink-0">
          {contact.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{contact.full_name}</p>
          <p className="text-xs text-gray-500">{ROLE_LABEL[contact.role] || contact.role} · <span className={`font-medium ${PRESENCE_COLOR[contact.presence]}`}>{contact.presence}</span></p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
        {loading ? (
          <div className="flex justify-center pt-10 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center pt-10 text-gray-400 text-sm">No messages yet. Say hello!</div>
        ) : messages.map(msg => {
          const isMine = msg.sender_id === me.staff_id
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                isMine ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
              }`}>
                {!isMine && <p className="text-xs font-semibold mb-0.5 text-emerald-700">{msg.sender_name}</p>}
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                <p className={`text-xs mt-1 ${isMine ? 'text-emerald-200' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
        <textarea
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type a message…"
          className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 max-h-24"
          style={{ minHeight: '38px' }}
        />
        <button onClick={send} disabled={!input.trim() || sending}
          className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0">
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

// Main ChatPanel component
export default function ChatPanel({ open, onClose }) {
  const [identity, setIdentity] = useState(null)  // PIN-verified user
  const [contacts, setContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [activeContact, setActiveContact] = useState(null)
  const [unread, setUnread] = useState(0)
  const heartbeatRef = useRef(null)

  const loadContacts = useCallback(async () => {
    setContactsLoading(true)
    try {
      const data = await api.get('/chat/contacts')
      setContacts(Array.isArray(data) ? data : [])
    } catch (_) {}
    setContactsLoading(false)
  }, [])

  useEffect(() => {
    if (!identity) return
    loadContacts()
    // heartbeat every 60s
    heartbeatRef.current = setInterval(() => api.post('/chat/heartbeat').catch(() => {}), 60000)
    api.post('/chat/heartbeat').catch(() => {})
    return () => clearInterval(heartbeatRef.current)
  }, [identity, loadContacts])

  // Poll unread for badge (even when panel closed)
  useEffect(() => {
    if (!identity) return
    const poll = async () => {
      try {
        const r = await api.get('/chat/unread')
        setUnread(r.total || 0)
      } catch (_) {}
    }
    poll()
    const id = setInterval(poll, 15000)
    return () => clearInterval(id)
  }, [identity])

  if (!open) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm shadow-2xl flex flex-col bg-white border-l border-gray-200"
      style={{ top: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-700 text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} />
          <span className="font-bold text-sm">CareChat</span>
          {unread > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">{unread}</span>
          )}
        </div>
        {identity && (
          <span className="text-xs text-emerald-200">as {identity.full_name}</span>
        )}
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-emerald-600 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!identity ? (
          <PinGate onSuccess={setIdentity} onCancel={onClose} />
        ) : activeContact ? (
          <MessageThread
            contact={activeContact}
            me={identity}
            onBack={() => { setActiveContact(null); loadContacts() }}
          />
        ) : (
          <>
            <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-700">
              Tap a colleague to start messaging
            </div>
            <ContactList
              contacts={contacts}
              loading={contactsLoading}
              onSelect={setActiveContact}
            />
            <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
              <button onClick={loadContacts} className="text-xs text-emerald-600 hover:text-emerald-800">
                Refresh contacts
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
