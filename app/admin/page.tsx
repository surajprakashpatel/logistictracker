'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { db } from '../lib/firebase'
import { collection, doc, setDoc, updateDoc, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore'

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

const STATUS_CONFIG: Record<string, { label: string; varColor: string; varBg: string }> = {
  pending:          { label: 'Pending',          varColor: 'var(--s-pending-c)',   varBg: 'var(--s-pending-bg)'   },
  in_transit:       { label: 'In Transit',        varColor: 'var(--s-transit-c)',   varBg: 'var(--s-transit-bg)'   },
  out_for_delivery: { label: 'Out for Delivery',  varColor: 'var(--s-out-c)',       varBg: 'var(--s-out-bg)'       },
  delivered:        { label: 'Delivered',         varColor: 'var(--s-delivered-c)', varBg: 'var(--s-delivered-bg)' },
  exception:        { label: 'Exception',         varColor: 'var(--s-exception-c)', varBg: 'var(--s-exception-bg)' },
}

const DEFAULT_TIMELINE: TimelineEvent[] =[
  { id: '1', label: 'Order Processed', description: 'Shipment details received', timestamp: '', completed: true,  icon: '📦' },
  { id: '2', label: 'In Transit',      description: 'Departed from origin facility', timestamp: '', completed: false, icon: '🏢' },
  { id: '3', label: 'Delivered',       description: 'Package handed to recipient',   timestamp: '', completed: false, icon: '✅' },
]

const EMPTY_FORM = {
  trackingId: '', senderName: '', recipientName: '', recipientAddress: '',
  origin: '', destination: '', weight: '', courier: '', estimatedDelivery: ''
}

export default function AdminPage() {
  const [shipments,    setShipments]    = useState<Shipment[]>([])
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const[view,         setView]         = useState<'list' | 'create' | 'edit'>('list')
  const [saving,       setSaving]       = useState<string | null>(null)
  const[createLoading,setCreateLoading]= useState(false)
  const [toast,        setToast]        = useState('')
  const [newEvent,     setNewEvent]     = useState({ label: '', description: '', icon: '📍' })
  const [addingEvent,  setAddingEvent]  = useState(false)
  const[mobileSide,   setMobileSide]   = useState<'list' | 'detail'>('list')

  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    const q = query(collection(db, 'shipments'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setShipments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Shipment[])
    }, (error) => {
      console.error('Error fetching shipments:', error)
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
      const initialTimeline = DEFAULT_TIMELINE.map((ev, i) =>
        i === 0 ? { ...ev, timestamp: new Date().toISOString() } : { ...ev }
      )
      await setDoc(doc(db, 'shipments', form.trackingId), {
        ...form, status: 'pending', timeline: initialTimeline, createdAt: new Date().toISOString()
      })
      setSelectedId(form.trackingId)
      setView('list')
      setForm(EMPTY_FORM)
      showToast(`✅ Tracking ID ${form.trackingId} created!`)
    } catch (err) {
      console.error(err)
      showToast('❌ Failed to create shipment.')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    try {
      await updateDoc(doc(db, 'shipments', form.trackingId), {
        senderName: form.senderName,
        recipientName: form.recipientName,
        recipientAddress: form.recipientAddress,
        origin: form.origin,
        destination: form.destination,
        weight: form.weight,
        courier: form.courier,
        estimatedDelivery: form.estimatedDelivery
      })
      setView('list')
      setForm(EMPTY_FORM)
      showToast(`✅ Tracking ID ${form.trackingId} updated!`)
    } catch (err) {
      console.error(err)
      showToast('❌ Failed to update shipment.')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDelete = async (trackingId: string) => {
    if (!window.confirm(`Are you sure you want to completely delete shipment ${trackingId}? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'shipments', trackingId))
      setSelectedId(null)
      showToast('🗑️ Shipment deleted successfully')
    } catch (err) {
      console.error(err)
      showToast('❌ Failed to delete shipment')
    }
  }

  const startEdit = (shipment: Shipment) => {
    setForm({
      trackingId: shipment.trackingId,
      senderName: shipment.senderName || '',
      recipientName: shipment.recipientName || '',
      recipientAddress: shipment.recipientAddress || '',
      origin: shipment.origin || '',
      destination: shipment.destination || '',
      weight: shipment.weight || '',
      courier: shipment.courier || '',
      estimatedDelivery: shipment.estimatedDelivery || ''
    })
    setView('edit')
  }

  const toggleTimeline = async (trackingId: string, eventId: string, completed: boolean) => {
    setSaving(eventId)
    try {
      const shipment = shipments.find(s => s.id === trackingId)
      if (!shipment) return
      const updatedTimeline = shipment.timeline.map(ev =>
        ev.id === eventId ? { ...ev, completed, timestamp: completed ? new Date().toISOString() : '' } : ev
      )
      const isDelivered  = updatedTimeline.some(e => e.label === 'Delivered'         && e.completed)
      const isOut        = updatedTimeline.some(e => e.label === 'Out for Delivery'  && e.completed)
      const isInTransit  = updatedTimeline.some(e => e.label === 'In Transit'        && e.completed)
      const newStatus = isDelivered ? 'delivered' : isOut ? 'out_for_delivery' : isInTransit ? 'in_transit' : 'pending'
      await updateDoc(doc(db, 'shipments', trackingId), { timeline: updatedTimeline, status: newStatus })
      showToast(`${completed ? '✅' : '↩️'} Timeline updated`)
    } catch (err) {
      console.error(err)
      showToast('❌ Failed to update timeline')
    } finally {
      setSaving(null)
    }
  }

  const handleAddCustomEvent = async () => {
    if (!selected || !newEvent.label) return
    setAddingEvent(true)
    try {
      const newEventObj: TimelineEvent = {
        id: Date.now().toString(), label: newEvent.label,
        description: newEvent.description, icon: newEvent.icon || '📍',
        timestamp: '', completed: false,
      }
      const updatedTimeline = [...selected.timeline]
      const deliveredIdx = updatedTimeline.findIndex(e => e.label === 'Delivered')
      deliveredIdx !== -1 ? updatedTimeline.splice(deliveredIdx, 0, newEventObj) : updatedTimeline.push(newEventObj)
      await updateDoc(doc(db, 'shipments', selected.id), { timeline: updatedTimeline })
      showToast('✅ Custom event added')
      setNewEvent({ label: '', description: '', icon: '📍' })
    } catch (err) {
      console.error(err)
      showToast('❌ Failed to add event')
    } finally {
      setAddingEvent(false)
    }
  }

  const generateId = () => {
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
    setForm(f => ({ ...f, trackingId: `TRK-${new Date().getFullYear()}-${rand}` }))
  }

  const selected       = shipments.find(s => s.id === selectedId) || null
  const completedCount = selected?.timeline.filter(e => e.completed).length ?? 0
  const totalCount     = selected?.timeline.length ?? 0

  return (
    <>
      <style>{`
        /* ── CSS variables: dark (default) ── */
        .adm {
          --bg:          #0f0f10;
          --surface:     #1a1a1c;
          --surface2:    #222225;
          --border:      rgba(255,255,255,0.09);
          --border-l:    rgba(255,255,255,0.05);
          --text:        #f0f0f0;
          --muted:       #888;
          --accent:      #e85d2f;
          --accent-pale: rgba(232,93,47,0.12);
          --teal:        #1aae9f;
          --teal-pale:   rgba(26,174,159,0.12);
          --header:      #111;

          --s-pending-c:   #e8b84b; --s-pending-bg:   rgba(232,184,75,0.12);
          --s-transit-c:   #1aae9f; --s-transit-bg:   rgba(26,174,159,0.12);
          --s-out-c:       #e85d2f; --s-out-bg:       rgba(232,93,47,0.12);
          --s-delivered-c: #3ecf6e; --s-delivered-bg: rgba(62,207,110,0.12);
          --s-exception-c: #e05252; --s-exception-bg: rgba(224,82,82,0.12);
        }

        /* ── CSS variables: light mode ── */
        @media (prefers-color-scheme: light) {
          .adm {
            --bg:          #f4f4f5;
            --surface:     #ffffff;
            --surface2:    #f9f9fa;
            --border:      #e2e2e5;
            --border-l:    #ebebee;
            --text:        #111;
            --muted:       #666;
            --accent:      #d94f22;
            --accent-pale: rgba(217,79,34,0.08);
            --teal:        #0f8e80;
            --teal-pale:   rgba(15,142,128,0.08);
            --header:      #111;

            --s-pending-c:   #9a6c00; --s-pending-bg:   #fef6d8;
            --s-transit-c:   #0f8e80; --s-transit-bg:   #e4f7f5;
            --s-out-c:       #b83e14; --s-out-bg:       #fdeee8;
            --s-delivered-c: #1a7a3c; --s-delivered-bg: #e4f7ec;
            --s-exception-c: #991818; --s-exception-bg: #fdeaea;
          }
        }

        /* ── Reset & base ── */
        .adm, .adm * { box-sizing: border-box; margin: 0; padding: 0; }
        .adm {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          display: flex; flex-direction: column;
          font-family: inherit;
        }

        /* ── Toast ── */
        @keyframes adm-fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .adm-toast {
          position: fixed; top: 20px; right: 20px; z-index: 1000;
          background: var(--header); color: #fff;
          border-radius: 12px; padding: 12px 20px;
          font-size: 14px; font-weight: 500;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          animation: adm-fadeUp 0.3s ease forwards;
        }

        /* ── Header ── */
        .adm-header {
          background: var(--header);
          padding: 0 32px;
          display: flex; align-items: center; flex-wrap: wrap;
          gap: 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        @media (max-width: 600px) { .adm-header { padding: 0 16px; } }
        .adm-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; padding: 18px 0; margin-right: 32px;
        }
        .adm-logo-icon {
          width: 32px; height: 32px; background: var(--accent); border-radius: 7px;
          display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;
        }
        .adm-logo-text { font-size: 17px; font-weight: 700; color: #fff; }
        .adm-nav       { display: flex; height: 100%; flex: 1; }
        .adm-nav-btn {
          background: none; border: none; cursor: pointer;
          padding: 20px 18px; font-size: 13px; font-weight: 600;
          letter-spacing: 0.03em; transition: color 0.2s;
          border-bottom: 2px solid transparent;
          font-family: inherit;
        }
        .adm-nav-btn.active     { color: #fff; border-bottom-color: var(--accent); }
        .adm-nav-btn:not(.active) { color: rgba(255,255,255,0.4); }
        .adm-badge {
          background: rgba(232,93,47,0.2); color: var(--accent);
          border-radius: 100px; padding: 4px 12px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
        }

        /* ── Body ── */
        .adm-body { flex: 1; display: flex; min-height: 0; }

        /* ── Create/Edit form ── */
        .adm-create {
          flex: 1; padding: 40px;
          max-width: 680px; margin: 0 auto; width: 100%;
          overflow-y: auto;
        }
        @media (max-width: 600px) { .adm-create { padding: 24px 16px; } }
        .adm-create-title {
          font-size: 26px; font-weight: 800;
          color: var(--text); letter-spacing: -0.03em; margin-bottom: 4px;
        }
        .adm-create-sub { color: var(--muted); font-size: 14px; margin-bottom: 32px; }

        .adm-card {
          background: var(--surface);
          border-radius: 14px; padding: 22px 22px;
          border: 1px solid var(--border); margin-bottom: 16px;
        }
        .adm-card-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--muted);
          display: block; margin-bottom: 14px;
        }
        .adm-field-label { font-size: 12px; color: var(--muted); margin-bottom: 6px; display: block; }
        .adm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 520px) { .adm-grid-2 { grid-template-columns: 1fr; } }
        .adm-col-full { grid-column: 1 / -1; }

        /* inputs */
        .adm-input {
          width: 100%; background: var(--surface2);
          border: 1.5px solid var(--border);
          border-radius: 9px; padding: 11px 13px;
          font-family: inherit; font-size: 14px;
          color: var(--text); outline: none;
          transition: border-color 0.2s;
        }
        .adm-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .adm-input::placeholder { color: var(--muted); }
        .adm-input:focus:not(:disabled) { border-color: var(--accent); }

        .adm-input-row { display: flex; gap: 8px; }
        .adm-input-id  { text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }

        /* buttons */
        .adm-btn-dark {
          background: var(--header); color: #fff; border: none;
          border-radius: 9px; padding: 11px 16px;
          font-size: 12px; font-weight: 700; cursor: pointer;
          white-space: nowrap; font-family: inherit;
          transition: opacity 0.15s;
        }
        .adm-btn-dark:hover { opacity: 0.85; }
        .adm-btn-accent {
          background: var(--accent); color: #fff; border: none;
          border-radius: 11px; padding: 15px; width: 100%;
          font-weight: 800; font-size: 15px; cursor: pointer;
          font-family: inherit; transition: opacity 0.2s; margin-bottom: 40px;
        }
        .adm-btn-accent:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ── List panel ── */
        .adm-list {
          width: 340px; min-width: 260px; max-width: 360px;
          border-right: 1px solid var(--border);
          overflow-y: auto; background: var(--surface);
          display: flex; flex-direction: column;
        }
        .adm-list-header {
          padding: 18px 18px 12px;
          border-bottom: 1px solid var(--border-l);
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--muted); flex-shrink: 0;
        }
        .adm-list-empty { padding: 40px; text-align: center; color: var(--muted); }
        .adm-list-empty-icon { font-size: 36px; margin-bottom: 12px; }
        .adm-list-empty p { font-size: 14px; }
        .adm-list-empty-btn {
          margin-top: 16px; background: var(--accent); color: #fff;
          border: none; border-radius: 8px; padding: 10px 20px;
          cursor: pointer; font-weight: 700; font-size: 13px; font-family: inherit;
        }

        .adm-list-item {
          width: 100%; text-align: left; background: transparent;
          border: none; border-bottom: 1px solid var(--border-l);
          padding: 15px 18px; cursor: pointer;
          transition: background 0.15s;
          border-left: 3px solid transparent;
          font-family: inherit;
        }
        .adm-list-item.active {
          background: var(--accent-pale);
          border-left-color: var(--accent);
        }
        .adm-list-item:not(.active):hover { background: var(--surface2); }
        .adm-item-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; }
        .adm-item-id  { font-weight: 700; font-size: 14px; color: var(--text); }
        .adm-item-sub { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
        .adm-progress-track { height: 3px; background: var(--border); border-radius: 100px; overflow: hidden; }
        .adm-progress-fill  { height: 100%; background: var(--teal); border-radius: 100px; }
        .adm-status-badge {
          border-radius: 100px; padding: 3px 9px;
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          flex-shrink: 0;
        }

        /* ── Detail panel ── */
        .adm-detail {
          flex: 1; overflow-y: auto; padding: 32px 36px; background: var(--bg);
        }
        @media (max-width: 700px) { .adm-detail { padding: 20px 16px; } }
        .adm-detail-empty {
          height: 100%; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          color: var(--muted); text-align: center; padding: 40px;
        }
        .adm-detail-empty-icon { font-size: 48px; margin-bottom: 16px; }
        .adm-detail-empty-title { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .adm-detail-header {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px;
          margin-bottom: 24px; flex-wrap: wrap;
        }
        .adm-detail-title { font-size: 24px; font-weight: 800; color: var(--text); margin-bottom: 4px; }
        .adm-detail-sub   { font-size: 13px; color: var(--muted); }
        
        .adm-header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .adm-btn-view {
          text-decoration: none; background: var(--header); color: #fff;
          border-radius: 9px; padding: 9px 16px; font-size: 13px; font-weight: 700;
          flex-shrink: 0; transition: opacity 0.15s;
        }
        .adm-btn-view:hover { opacity: 0.8; }
        .adm-btn-edit {
          background: var(--surface2); color: var(--text); border: 1px solid var(--border); 
          border-radius: 9px; padding: 9px 16px; font-size: 13px; font-weight: 700; 
          cursor: pointer; transition: all 0.15s;
        }
        .adm-btn-edit:hover { background: var(--border); }
        .adm-btn-delete {
          background: rgba(224,82,82,0.1); color: var(--s-exception-c); border: 1px solid rgba(224,82,82,0.2); 
          border-radius: 9px; padding: 9px 16px; font-size: 13px; font-weight: 700; 
          cursor: pointer; transition: all 0.15s;
        }
        .adm-btn-delete:hover { background: rgba(224,82,82,0.2); }

        .adm-progress-card {
          background: var(--surface); border-radius: 14px; padding: 18px 22px;
          border: 1px solid var(--border); margin-bottom: 20px;
        }
        .adm-progress-row {
          display: flex; justify-content: space-between; margin-bottom: 10px;
        }
        .adm-progress-label { font-size: 13px; font-weight: 700; color: var(--text); }
        .adm-progress-count { font-size: 13px; color: var(--muted); font-weight: 600; }
        .adm-progress-bar   { height: 8px; background: var(--border); border-radius: 100px; overflow: hidden; }
        .adm-progress-bar-fill {
          height: 100%; border-radius: 100px; transition: width 0.5s;
          background: linear-gradient(90deg, var(--teal), var(--accent));
        }

        /* timeline */
        .adm-timeline-card {
          background: var(--surface); border-radius: 14px; padding: 22px;
          border: 1px solid var(--border);
        }
        .adm-timeline-title {
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--muted); margin-bottom: 18px;
        }
        .adm-timeline-list { display: flex; flex-direction: column; gap: 9px; }

        .adm-event {
          display: flex; align-items: center; gap: 14px;
          padding: 13px 15px; border-radius: 11px;
          border: 1.5px solid var(--border);
          background: var(--surface);
          transition: background 0.2s, border-color 0.2s;
        }
        .adm-event.done {
          background: var(--teal-pale);
          border-color: rgba(26,174,159,0.2);
        }
        .adm-event-check {
          width: 27px; height: 27px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; flex-shrink: 0; border: 2px solid var(--border);
          background: transparent; color: #fff; cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          font-family: inherit;
        }
        .adm-event-check.checked { background: var(--teal); border-color: var(--teal); }
        .adm-event-check:disabled { cursor: not-allowed; }
        .adm-event-icon  { font-size: 17px; flex-shrink: 0; }
        .adm-event-body  { flex: 1; min-width: 0; }
        .adm-event-label { font-weight: 700; font-size: 14px; margin-bottom: 2px; color: var(--text); }
        .adm-event-label.done { color: var(--teal); }
        .adm-event-desc  { font-size: 12px; color: var(--muted); }
        .adm-event-time  { font-size: 11px; font-weight: 600; flex-shrink: 0; color: var(--teal); }
        .adm-event-pending { font-size: 11px; color: var(--muted); flex-shrink: 0; }

        /* add event */
        .adm-add-event {
          margin-top: 22px; padding-top: 20px;
          border-top: 1px solid var(--border-l);
        }
        .adm-add-event-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 12px; }
        .adm-add-row { display: flex; gap: 8px; margin-bottom: 10px; }
        .adm-input-sm { width: 72px; text-align: center; }
        .adm-btn-add {
          background: var(--text); color: var(--bg); padding: 10px 18px;
          border-radius: 8px; font-size: 13px; font-weight: 600;
          border: none; cursor: pointer; font-family: inherit;
          transition: opacity 0.15s;
        }
        .adm-btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Mobile layout ── */
        @media (max-width: 700px) {
          .adm-two-panel     { flex-direction: column; }
          .adm-list          { width: 100%; max-width: 100%; min-width: 0; border-right: none; border-bottom: 1px solid var(--border); max-height: 45vh; }
          .adm-detail        { min-height: 55vh; }
          .adm-list-mobile-hide { display: none; }
        }
      `}</style>

      <div className="adm">
        {/* Toast */}
        {toast && <div className="adm-toast">{toast}</div>}

        {/* Header */}
        <header className="adm-header">
          <Link href="/" className="adm-logo">
            <div className="adm-logo-icon">📦</div>
            <span className="adm-logo-text">TrackFlow</span>
          </Link>
          <nav className="adm-nav">
            {(['All Shipments', 'Create New'] as const).map((tab, i) => {
              const isActive = i === 0 ? view === 'list' : (view === 'create' || view === 'edit')
              return (
                <button key={tab} className={`adm-nav-btn${isActive ? ' active' : ''}`}
                  onClick={() => {
                    if (i === 0) {
                      setView('list')
                    } else {
                      setForm(EMPTY_FORM) // Clear form for new creation
                      setView('create')
                    }
                  }}>
                  {tab}
                </button>
              )
            })}
          </nav>
          <div style={{ marginLeft: 'auto' }}>
            <span className="adm-badge">ADMIN</span>
          </div>
        </header>

        <div className="adm-body">

          {/* ── Create / Edit view ── */}
          {view === 'create' || view === 'edit' ? (
            <div className="adm-create">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                  <h2 className="adm-create-title">
                    {view === 'edit' ? 'Edit Shipment' : 'Create Shipment'}
                  </h2>
                  <p className="adm-create-sub" style={{ marginBottom: 0 }}>
                    {view === 'edit' ? 'Update the details for this shipment' : 'Fill in the details to generate a new tracking ID'}
                  </p>
                </div>
                {view === 'edit' && (
                  <button onClick={() => setView('list')} className="adm-btn-dark">Cancel</button>
                )}
              </div>

              <form onSubmit={view === 'edit' ? handleEdit : handleCreate} style={{ display: 'flex', flexDirection: 'column' }}>

                {/* Tracking ID */}
                <div className="adm-card">
                  <label className="adm-card-label">Tracking ID *</label>
                  <div className="adm-input-row">
                    <input required value={form.trackingId}
                      onChange={e => setForm(f => ({ ...f, trackingId: e.target.value }))}
                      placeholder="e.g. TRK-2025-ABCD"
                      className="adm-input adm-input-id"
                      disabled={view === 'edit'} // Lock tracking ID while editing
                      style={{ flex: 1 }} />
                    {view === 'create' && (
                      <button type="button" onClick={generateId} className="adm-btn-dark">Auto Generate</button>
                    )}
                  </div>
                </div>

                {/* People */}
                <div className="adm-card">
                  <label className="adm-card-label">People</label>
                  <div className="adm-grid-2" style={{ marginBottom: 12 }}>
                    <div>
                      <span className="adm-field-label">Sender Name</span>
                      <input value={form.senderName} onChange={e => setForm(f => ({ ...f, senderName: e.target.value }))}
                        placeholder="Acme Warehouse" className="adm-input" />
                    </div>
                    <div>
                      <span className="adm-field-label">Recipient Name *</span>
                      <input required value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))}
                        placeholder="John Doe" className="adm-input" />
                    </div>
                  </div>
                  <div>
                    <span className="adm-field-label">Recipient Address</span>
                    <input value={form.recipientAddress} onChange={e => setForm(f => ({ ...f, recipientAddress: e.target.value }))}
                      placeholder="123 Main St, Mumbai, MH 400001" className="adm-input" />
                  </div>
                </div>

                {/* Route & Package */}
                <div className="adm-card">
                  <label className="adm-card-label">Route & Package</label>
                  <div className="adm-grid-2">
                    <div>
                      <span className="adm-field-label">Origin</span>
                      <input value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
                        placeholder="Delhi, DL" className="adm-input" />
                    </div>
                    <div>
                      <span className="adm-field-label">Destination</span>
                      <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                        placeholder="Mumbai, MH" className="adm-input" />
                    </div>
                    <div>
                      <span className="adm-field-label">Courier</span>
                      <input value={form.courier} onChange={e => setForm(f => ({ ...f, courier: e.target.value }))}
                        placeholder="SwiftShip Express" className="adm-input" />
                    </div>
                    <div>
                      <span className="adm-field-label">Weight</span>
                      <input value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                        placeholder="2.5 kg" className="adm-input" />
                    </div>
                    <div className="adm-col-full">
                      <span className="adm-field-label">Est. Delivery Date</span>
                      <input type="date" value={form.estimatedDelivery}
                        onChange={e => setForm(f => ({ ...f, estimatedDelivery: e.target.value }))}
                        className="adm-input" />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={createLoading} className="adm-btn-accent">
                  {createLoading ? (view === 'edit' ? 'Saving…' : 'Creating…') : (view === 'edit' ? '→ Save Changes' : '→ Create Shipment')}
                </button>
              </form>
            </div>

          ) : (
            /* ── List view ── */
            <div className="adm-two-panel" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

              {/* Shipments list */}
              <div className="adm-list">
                <div className="adm-list-header">{shipments.length} Shipments</div>

                {shipments.length === 0 ? (
                  <div className="adm-list-empty">
                    <div className="adm-list-empty-icon">📭</div>
                    <p>No shipments yet.</p>
                    <button onClick={() => setView('create')} className="adm-list-empty-btn">Create First</button>
                  </div>
                ) : shipments.map(s => {
                  const cfg   = STATUS_CONFIG[s.status] || STATUS_CONFIG['pending']
                  const done  = s.timeline?.filter(e => e.completed).length || 0
                  const total = s.timeline?.length || 1
                  return (
                    <button key={s.id}
                      className={`adm-list-item${selectedId === s.id ? ' active' : ''}`}
                      onClick={() => { setSelectedId(s.id); setMobileSide('detail') }}>
                      <div className="adm-item-row">
                        <span className="adm-item-id">{s.trackingId}</span>
                        <span className="adm-status-badge"
                          style={{ background: cfg.varBg, color: cfg.varColor }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="adm-item-sub">{s.recipientName} · {s.destination || '—'}</p>
                      <div className="adm-progress-track">
                        <div className="adm-progress-fill"
                          style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Detail panel */}
              <div className="adm-detail">
                {!selected ? (
                  <div className="adm-detail-empty">
                    <div className="adm-detail-empty-icon">👈</div>
                    <p className="adm-detail-empty-title">Select a shipment</p>
                    <p>Choose a shipment from the list to manage its timeline</p>
                  </div>
                ) : (
                  <div style={{ maxWidth: 800 }}>
                    <div className="adm-detail-header">
                      <div>
                        <h2 className="adm-detail-title">{selected.trackingId}</h2>
                        <p className="adm-detail-sub">
                          {selected.recipientName} · {selected.origin} → {selected.destination}
                        </p>
                      </div>
                      
                      {/* Action Buttons: View, Edit, Delete */}
                      <div className="adm-header-actions">
                        <Link href={`/track/${selected.trackingId}`} target="_blank" className="adm-btn-view">
                          View as Customer ↗
                        </Link>
                        <button onClick={() => startEdit(selected)} className="adm-btn-edit">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(selected.id)} className="adm-btn-delete">
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="adm-progress-card">
                      <div className="adm-progress-row">
                        <span className="adm-progress-label">Delivery Progress</span>
                        <span className="adm-progress-count">{completedCount}/{totalCount} steps</span>
                      </div>
                      <div className="adm-progress-bar">
                        <div className="adm-progress-bar-fill"
                          style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }} />
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="adm-timeline-card">
                      <p className="adm-timeline-title">
                        Timeline Events — tick to mark completed for customer
                      </p>
                      <div className="adm-timeline-list">
                        {selected.timeline?.map(event => (
                          <div key={event.id} className={`adm-event${event.completed ? ' done' : ''}`}>
                            <button
                              onClick={() => toggleTimeline(selected.trackingId, event.id, !event.completed)}
                              disabled={saving === event.id}
                              className={`adm-event-check${event.completed ? ' checked' : ''}`}>
                              {saving === event.id ? '⏳' : event.completed ? '✓' : ''}
                            </button>
                            <span className="adm-event-icon">{event.icon}</span>
                            <div className="adm-event-body">
                              <p className={`adm-event-label${event.completed ? ' done' : ''}`}>{event.label}</p>
                              <p className="adm-event-desc">{event.description}</p>
                            </div>
                            {event.completed && event.timestamp ? (
                              <span className="adm-event-time">
                                {new Date(event.timestamp).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            ) : (
                              <span className="adm-event-pending">Pending</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add custom event */}
                      <div className="adm-add-event">
                        <p className="adm-add-event-title">+ Add Custom Event</p>
                        <div className="adm-add-row">
                          <input value={newEvent.icon}
                            onChange={e => setNewEvent({ ...newEvent, icon: e.target.value })}
                            placeholder="📍" maxLength={2}
                            className="adm-input adm-input-sm" />
                          <input value={newEvent.label}
                            onChange={e => setNewEvent({ ...newEvent, label: e.target.value })}
                            placeholder="Event Title (e.g. Customs Hold)"
                            className="adm-input" style={{ flex: 1 }} />
                        </div>
                        <input value={newEvent.description}
                          onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                          placeholder="Description (e.g. Package is undergoing inspection)"
                          className="adm-input" style={{ marginBottom: 12 }} />
                        <button onClick={handleAddCustomEvent}
                          disabled={addingEvent || !newEvent.label}
                          className="adm-btn-add">
                          {addingEvent ? 'Adding…' : 'Add to Timeline'}
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
    </>
  )
}