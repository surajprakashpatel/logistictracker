'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { db } from '../lib/firebase' // Adjust path if necessary
import { collection, doc, setDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore'

// --- Explicit Color Palette to prevent Dark Mode clashes ---
const COLORS = {
  bg: '#F9FAFB',         
  card: '#FFFFFF',       
  border: '#E5E7EB',     
  borderLight: '#F3F4F6', 
  textMain: '#111827',   
  textMuted: '#6B7280',  
  accent: '#E85D2F',     
  accentPale: '#FFF0EB', 
  header: '#111827',     
  teal: '#1A9E8F',       
  tealPale: '#E8F7F5',   
}

type TimelineEvent = {
  id: string; label: string; description: string;
  timestamp: string; completed: boolean; icon: string;
}
type Shipment = {
  id: string; trackingId: string; senderName: string; recipientName: string;
  recipientAddress: string; origin: string; destination: string; weight: string;
  courier: string; estimatedDelivery: string;
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  timeline: TimelineEvent[]; createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#d4a020', bg: '#fdf5e0' },
  in_transit: { label: 'In Transit', color: '#1a9e8f', bg: '#e8f7f5' },
  out_for_delivery: { label: 'Out for Delivery', color: '#e85d2f', bg: '#fdf0eb' },
  delivered: { label: 'Delivered', color: '#1a9e4a', bg: '#e8f7ee' },
  exception: { label: 'Exception', color: '#c0392b', bg: '#fdf0ed' },
}

const inputStyle = {
  width: '100%', background: COLORS.bg, border: `1.5px solid ${COLORS.border}`,
  borderRadius: 10, padding: '11px 14px', fontFamily: 'inherit', fontSize: 14,
  color: COLORS.textMain, outline: 'none', transition: 'border-color 0.2s'
}

const DEFAULT_TIMELINE: TimelineEvent[] =[
  { id: '1', label: 'Order Processed', description: 'Shipment details received', timestamp: '', completed: true, icon: '📦' },
  { id: '2', label: 'In Transit', description: 'Departed from origin facility', timestamp: '', completed: false, icon: '🏢' },
  { id: '3', label: 'Delivered', description: 'Package handed to recipient', timestamp: '', completed: false, icon: '✅' },
]

export default function AdminPage() {
  const[shipments, setShipments] = useState<Shipment[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'create'>('list')
  const [saving, setSaving] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [toast, setToast] = useState('')

  // State for adding a new custom event
  const [newEvent, setNewEvent] = useState({ label: '', description: '', icon: '📍' })
  const [addingEvent, setAddingEvent] = useState(false)

  const [form, setForm] = useState({
    trackingId: '', senderName: '', recipientName: '', recipientAddress: '',
    origin: '', destination: '', weight: '', courier: '', estimatedDelivery: ''
  })

  useEffect(() => {
    const q = query(collection(db, 'shipments'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedShipments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Shipment[]
      setShipments(fetchedShipments)
    }, (error) => {
      console.error("Error fetching shipments:", error)
      showToast('❌ Failed to load shipments')
    })
    return () => unsubscribe()
  },[])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    try {
      const initialTimeline = [...DEFAULT_TIMELINE]
      initialTimeline[0].timestamp = new Date().toISOString()

      const newShipmentData = {
        ...form, status: 'pending', timeline: initialTimeline, createdAt: new Date().toISOString()
      }

      const docRef = doc(db, 'shipments', form.trackingId)
      await setDoc(docRef, newShipmentData)

      setSelectedId(form.trackingId)
      setView('list')
      setForm({ trackingId: '', senderName: '', recipientName: '', recipientAddress: '', origin: '', destination: '', weight: '', courier: '', estimatedDelivery: '' })
      showToast(`✅ Tracking ID ${form.trackingId} created!`)
    } catch (error) {
      console.error(error)
      showToast('❌ Failed to create shipment.')
    } finally {
      setCreateLoading(false)
    }
  }

  const toggleTimeline = async (trackingId: string, eventId: string, completed: boolean) => {
    setSaving(eventId)
    try {
      const shipment = shipments.find(s => s.id === trackingId)
      if (!shipment) return

      const updatedTimeline = shipment.timeline.map(event => 
        event.id === eventId ? { ...event, completed, timestamp: completed ? new Date().toISOString() : '' } : event
      )

      // Auto-calculate package status robustly (ignores array positions, checks labels)
      let newStatus = shipment.status
      const isDelivered = updatedTimeline.some(e => e.label === 'Delivered' && e.completed)
      const isOut = updatedTimeline.some(e => e.label === 'Out for Delivery' && e.completed)
      const isInTransit = updatedTimeline.some(e => e.label === 'In Transit' && e.completed)
      
      if (isDelivered) newStatus = 'delivered'
      else if (isOut) newStatus = 'out_for_delivery'
      else if (isInTransit) newStatus = 'in_transit'
      else newStatus = 'pending'

      const docRef = doc(db, 'shipments', trackingId)
      await updateDoc(docRef, { timeline: updatedTimeline, status: newStatus })
      showToast(`${completed ? '✅' : '↩️'} Timeline updated`)
    } catch (error) {
      console.error(error)
      showToast('❌ Failed to update timeline')
    } finally {
      setSaving(null)
    }
  }

  // Add custom event function
  const handleAddCustomEvent = async () => {
    if (!selected || !newEvent.label) return
    setAddingEvent(true)
    try {
      const newEventObj: TimelineEvent = {
        id: Date.now().toString(),
        label: newEvent.label,
        description: newEvent.description,
        icon: newEvent.icon || '📍',
        timestamp: '', 
        completed: false
      }

      let updatedTimeline = [...selected.timeline]
      
      // Try to insert it right before the 'Delivered' step so Delivered is always last
      const deliveredIdx = updatedTimeline.findIndex(e => e.label === 'Delivered')
      if (deliveredIdx !== -1) {
        updatedTimeline.splice(deliveredIdx, 0, newEventObj)
      } else {
        updatedTimeline.push(newEventObj) // Fallback: append at the end
      }

      const docRef = doc(db, 'shipments', selected.id)
      await updateDoc(docRef, { timeline: updatedTimeline })
      
      showToast('✅ Custom event added')
      setNewEvent({ label: '', description: '', icon: '📍' }) // Reset form
    } catch (error) {
      console.error(error)
      showToast('❌ Failed to add event')
    } finally {
      setAddingEvent(false)
    }
  }

  const generateId = () => {
    const date = new Date()
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
    setForm(f => ({ ...f, trackingId: `TRK-${date.getFullYear()}-${rand}` }))
  }

  const selected = shipments.find(s => s.id === selectedId) || null
  const completedCount = selected?.timeline.filter(e => e.completed).length ?? 0
  const totalCount = selected?.timeline.length ?? 0

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: COLORS.textMain, display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          background: COLORS.header, color: 'white', borderRadius: 12,
          padding: '12px 20px', fontSize: 14, fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)', animation: 'fadeUp 0.3s ease forwards'
        }}>{toast}</div>
      )}

      {/* Header */}
      <header style={{ background: COLORS.header, padding: '0 40px', display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', padding: '20px 0', marginRight: 40 }}>
          <div style={{ width: 32, height: 32, background: COLORS.accent, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>TrackFlow</span>
        </Link>
        <nav style={{ display: 'flex', height: '100%' }}>
          {['All Shipments', 'Create New'].map((tab, i) => (
            <button key={tab} onClick={() => setView(i === 0 ? 'list' : 'create')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '22px 20px', fontSize: 13, fontWeight: 600, letterSpacing: '0.03em',
                color: (i === 0 ? view === 'list' : view === 'create') ? 'white' : 'rgba(255,255,255,0.4)',
                borderBottom: (i === 0 ? view === 'list' : view === 'create') ? `2px solid ${COLORS.accent}` : '2px solid transparent',
                transition: 'all 0.2s'
              }}>{tab}</button>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <span style={{ background: 'rgba(232,93,47,0.2)', color: COLORS.accent, borderRadius: 100, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
            ADMIN
          </span>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {view === 'create' ? (
          
          /* Create form */
          <div style={{ flex: 1, padding: '40px', maxWidth: 680, margin: '0 auto', width: '100%', overflowY: 'auto' }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: COLORS.textMain, letterSpacing: '-0.03em', marginBottom: 6 }}>
                Create Shipment
              </h2>
              <p style={{ color: COLORS.textMuted, fontSize: 14 }}>Fill in the details to generate a new tracking ID</p>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Tracking ID */}
              <div style={{ background: COLORS.card, borderRadius: 16, padding: 24, border: `1px solid ${COLORS.border}` }}>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: COLORS.textMuted, display: 'block', marginBottom: 12 }}>Tracking ID *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input required value={form.trackingId} onChange={e => setForm(f => ({ ...f, trackingId: e.target.value }))}
                    placeholder="e.g. TRK-2025-ABCD"
                    style={{ ...inputStyle, flex: 1, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }} />
                  <button type="button" onClick={generateId} style={{
                    background: COLORS.header, color: 'white', border: 'none', borderRadius: 10,
                    padding: '11px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                  }}>Auto Generate</button>
                </div>
              </div>

              {/* Sender & Recipient */}
              <div style={{ background: COLORS.card, borderRadius: 16, padding: 24, border: `1px solid ${COLORS.border}` }}>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: COLORS.textMuted, display: 'block', marginBottom: 16 }}>People</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Sender Name</p>
                    <input value={form.senderName} onChange={e => setForm(f => ({ ...f, senderName: e.target.value }))} placeholder="Acme Warehouse" style={inputStyle} />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Recipient Name *</p>
                    <input required value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} placeholder="John Doe" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Recipient Address</p>
                  <input value={form.recipientAddress} onChange={e => setForm(f => ({ ...f, recipientAddress: e.target.value }))} placeholder="123 Main St, Mumbai, MH 400001" style={inputStyle} />
                </div>
              </div>

              {/* Route & Package */}
              <div style={{ background: COLORS.card, borderRadius: 16, padding: 24, border: `1px solid ${COLORS.border}` }}>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: COLORS.textMuted, display: 'block', marginBottom: 16 }}>Route & Package</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Origin</p>
                    <input value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} placeholder="Delhi, DL" style={inputStyle} />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Destination</p>
                    <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="Mumbai, MH" style={inputStyle} />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Courier</p>
                    <input value={form.courier} onChange={e => setForm(f => ({ ...f, courier: e.target.value }))} placeholder="SwiftShip Express" style={inputStyle} />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Weight</p>
                    <input value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="2.5 kg" style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Est. Delivery Date</p>
                    <input type="date" value={form.estimatedDelivery} onChange={e => setForm(f => ({ ...f, estimatedDelivery: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={createLoading} style={{
                background: COLORS.accent, color: 'white', border: 'none', borderRadius: 12,
                padding: '16px', fontWeight: 800, fontSize: 16, cursor: createLoading ? 'not-allowed' : 'pointer',
                opacity: createLoading ? 0.7 : 1, transition: 'all 0.2s', marginBottom: 40
              }}>
                {createLoading ? 'Creating...' : '→ Create Shipment'}
              </button>
            </form>
          </div>

        ) : (
          /* List view */
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            
            {/* Shipments list */}
            <div style={{ width: 360, borderRight: `1px solid ${COLORS.border}`, overflowY: 'auto', background: COLORS.card }}>
              <div style={{ padding: '20px 20px 12px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
                <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: COLORS.textMuted }}>
                  {shipments.length} Shipments
                </p>
              </div>
              {shipments.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: COLORS.textMuted }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                  <p style={{ fontSize: 14 }}>No shipments yet.</p>
                  <button onClick={() => setView('create')} style={{
                    marginTop: 16, background: COLORS.accent, color: 'white', border: 'none',
                    borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 13
                  }}>Create First</button>
                </div>
              ) : shipments.map(s => {
                const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG['pending']
                const done = s.timeline?.filter(e => e.completed).length || 0
                const total = s.timeline?.length || 1
                return (
                  <button key={s.id} onClick={() => setSelectedId(s.id)}
                    style={{
                      width: '100%', textAlign: 'left', background: selectedId === s.id ? COLORS.accentPale : 'transparent',
                      border: 'none', borderBottom: `1px solid ${COLORS.borderLight}`, padding: '16px 20px',
                      cursor: 'pointer', transition: 'background 0.15s',
                      borderLeft: selectedId === s.id ? `3px solid ${COLORS.accent}` : '3px solid transparent'
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: COLORS.textMain }}>{s.trackingId}</p>
                      <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 100, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{cfg.label}</span>
                    </div>
                    <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 8 }}>{s.recipientName} · {s.destination || '—'}</p>
                    <div style={{ height: 3, background: COLORS.borderLight, borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${total ? (done / total) * 100 : 0}%`, background: COLORS.teal, borderRadius: 100 }} />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Detail panel */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: COLORS.bg }}>
              {!selected ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>👈</div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: COLORS.textMain, marginBottom: 6 }}>Select a shipment</p>
                  <p style={{ fontSize: 14 }}>Choose a shipment from the list to manage its timeline</p>
                </div>
              ) : (
                <div style={{ maxWidth: 800 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                    <div>
                      <h2 style={{ fontSize: 26, fontWeight: 800, color: COLORS.textMain, marginBottom: 4 }}>
                        {selected.trackingId}
                      </h2>
                      <p style={{ fontSize: 13, color: COLORS.textMuted }}>
                        {selected.recipientName} · {selected.origin} → {selected.destination}
                      </p>
                    </div>
                    <Link href={`/track/${selected.trackingId}`} target="_blank" style={{
                      textDecoration: 'none', background: COLORS.header, color: 'white',
                      borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700
                    }}>View as Customer ↗</Link>
                  </div>

                  {/* Progress */}
                  <div style={{ background: COLORS.card, borderRadius: 16, padding: '20px 24px', border: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.textMain }}>Delivery Progress</span>
                      <span style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>{completedCount}/{totalCount} steps</span>
                    </div>
                    <div style={{ height: 8, background: COLORS.borderLight, borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%`,
                        background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.accent})`, borderRadius: 100, transition: 'width 0.5s'
                      }} />
                    </div>
                  </div>

                  {/* Timeline controls */}
                  <div style={{ background: COLORS.card, borderRadius: 16, padding: 24, border: `1px solid ${COLORS.border}` }}>
                    <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 20 }}>
                      Timeline Events — tick to mark completed for customer
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selected.timeline?.map((event) => (
                        <div key={event.id} style={{
                          display: 'flex', alignItems: 'center', gap: 16,
                          padding: '14px 16px', borderRadius: 12,
                          background: event.completed ? COLORS.tealPale : COLORS.card,
                          border: `1.5px solid ${event.completed ? 'rgba(26,158,143,0.25)' : COLORS.border}`,
                          transition: 'all 0.2s'
                        }}>
                          <button
                            onClick={() => toggleTimeline(selected.trackingId, event.id, !event.completed)}
                            disabled={saving === event.id}
                            style={{
                              width: 28, height: 28, borderRadius: 8,
                              background: event.completed ? COLORS.teal : 'transparent',
                              border: event.completed ? 'none' : `2px solid ${COLORS.border}`,
                              color: 'white',
                              cursor: saving === event.id ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, flexShrink: 0
                            } as React.CSSProperties}
                          >
                            {saving === event.id ? '⏳' : event.completed ? '✓' : ''}
                          </button>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{event.icon}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: 14, color: event.completed ? COLORS.teal : COLORS.textMain, marginBottom: 2 }}>
                              {event.label}
                            </p>
                            <p style={{ fontSize: 12, color: COLORS.textMuted }}>{event.description}</p>
                          </div>
                          {event.completed && event.timestamp && (
                            <span style={{ fontSize: 11, color: COLORS.teal, fontWeight: 600, flexShrink: 0 }}>
                              {new Date(event.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {!event.completed && (
                            <span style={{ fontSize: 11, color: COLORS.textMuted, flexShrink: 0 }}>Pending</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* NEW: Add Custom Event UI */}
                    <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${COLORS.borderLight}` }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.textMain, marginBottom: 12 }}>+ Add Custom Event</p>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                        <input 
                          value={newEvent.icon} onChange={e => setNewEvent({...newEvent, icon: e.target.value})}
                          placeholder="Icon (📍)" maxLength={2} style={{ ...inputStyle, width: 80, textAlign: 'center' }} 
                        />
                        <input 
                          value={newEvent.label} onChange={e => setNewEvent({...newEvent, label: e.target.value})}
                          placeholder="Event Title (e.g. Customs Hold)" style={{ ...inputStyle, flex: 1 }} 
                        />
                      </div>
                      <input 
                        value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                        placeholder="Description (e.g. Package is undergoing inspection)" style={{ ...inputStyle, marginBottom: 12 }} 
                      />
                      <button 
                        onClick={handleAddCustomEvent}
                        disabled={addingEvent || !newEvent.label}
                        style={{
                          background: COLORS.textMain, color: 'white', padding: '10px 20px', borderRadius: 8, 
                          fontSize: 13, fontWeight: 600, border: 'none', cursor: (addingEvent || !newEvent.label) ? 'not-allowed' : 'pointer',
                          opacity: (addingEvent || !newEvent.label) ? 0.6 : 1
                        }}>
                        {addingEvent ? 'Adding...' : 'Add to Timeline'}
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}