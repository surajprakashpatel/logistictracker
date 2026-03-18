'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { db } from '../../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'

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

const STATUS_CONFIG = {
  pending:          { label: 'Pending',          color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)',  dot: '#f59e0b' },
  in_transit:       { label: 'In Transit',        color: '#22d3ee', bg: 'rgba(34,211,238,0.12)',  border: 'rgba(34,211,238,0.35)',  dot: '#22d3ee' },
  out_for_delivery: { label: 'Out for Delivery',  color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)',  dot: '#fb923c' },
  delivered:        { label: 'Delivered',         color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.35)',  dot: '#4ade80' },
  exception:        { label: 'Exception',         color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)', dot: '#f87171' },
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}
function formatShort(iso: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

export default function TrackPage({ params }: { params: Promise<{ trackingId: string }> }) {
  const resolvedParams = use(params)
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newId, setNewId] = useState('')
  const router = useRouter()

  const safeTrackingId = resolvedParams.trackingId?.trim().toUpperCase()

  useEffect(() => {
    if (!safeTrackingId) { setError('No tracking ID provided.'); setLoading(false); return }
    const unsub = onSnapshot(doc(db, 'shipments', safeTrackingId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          let timeline: TimelineEvent[] = []
          if (Array.isArray(data.timeline)) timeline = data.timeline
          else if (data.timeline && typeof data.timeline === 'object') timeline = Object.values(data.timeline) as TimelineEvent[]
          setShipment({ id: snap.id, ...data, timeline } as Shipment)
          setError('')
        } else {
          setShipment(null)
          setError('Shipment not found. Please check your tracking number.')
        }
        setLoading(false)
      },
      (err) => { console.error(err); setError('Failed to fetch. Try again.'); setLoading(false) }
    )
    return () => unsub()
  }, [safeTrackingId])

  const timeline = shipment?.timeline ?? []
  const completedCount = timeline.filter(e => e.completed).length
  const totalCount = timeline.length
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0
  const statusCfg = STATUS_CONFIG[shipment?.status ?? 'pending'] ?? STATUS_CONFIG.pending

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0c0c15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '2px solid rgba(251,146,60,0.15)', borderTopColor: '#fb923c', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 0.9s linear infinite' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Fetching shipment</p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 6, fontFamily: 'monospace' }}>{safeTrackingId}</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0c0c15', color: 'white' }}>
      <style>{`
        @keyframes fadeUp   {from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn  {from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes gpulse   {0%,100%{box-shadow:0 0 0 0 rgba(34,211,238,0.5)}50%{box-shadow:0 0 0 7px rgba(34,211,238,0)}}
        @keyframes opulse   {0%,100%{box-shadow:0 0 0 0 rgba(251,146,60,0.5)}50%{box-shadow:0 0 0 7px rgba(251,146,60,0)}}
        @keyframes spin     {to{transform:rotate(360deg)}}
        .tl-row{opacity:0;animation:slideIn 0.35s ease forwards}
        *{box-sizing:border-box}
        input::placeholder{color:rgba(255,255,255,0.28)}
      `}</style>

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(12,12,21,0.9)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg,#fb923c,#e85d2f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            boxShadow: '0 4px 14px rgba(232,93,47,0.4)'
          }}>📦</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>TrackFlow</span>
        </Link>
        <form onSubmit={e => { e.preventDefault(); const t = newId.trim().toUpperCase(); if (t) router.push(`/track/${t}`) }}
          style={{ display: 'flex', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 10, padding: '0 14px', height: 38, width: 250
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={newId} onChange={e => setNewId(e.target.value)} placeholder="Track another parcel..."
              style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: 13, fontFamily: 'var(--font-body)', flex: 1 }} />
          </div>
          <button type="submit" style={{
            height: 38, padding: '0 18px',
            background: 'linear-gradient(135deg,#fb923c,#e85d2f)',
            color: 'white', border: 'none', borderRadius: 10,
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(232,93,47,0.3)'
          }}>Track</button>
        </form>
      </nav>

      {/* ERROR */}
      {(error || (!loading && !shipment)) && (
        <div style={{ maxWidth: 460, margin: '90px auto', padding: '0 24px', textAlign: 'center', opacity: 0, animation: 'fadeUp 0.4s ease forwards' }}>
          <div style={{ fontSize: 56, marginBottom: 18 }}>🔍</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.03em' }}>Not Found</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7, marginBottom: 26 }}>{error}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href="/" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.07)', color: 'white', textDecoration: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, border: '1px solid rgba(255,255,255,0.1)' }}>← Go Back</Link>
            <button onClick={() => window.location.reload()} style={{ background: 'linear-gradient(135deg,#fb923c,#e85d2f)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Retry</button>
          </div>
        </div>
      )}

      {/* MAIN */}
      {shipment && (
        <main style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px 80px' }}>

          {/* HEADER */}
          <div style={{ marginBottom: 34, opacity: 0, animation: 'fadeUp 0.4s ease 0.05s forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,4vw,32px)',
                fontWeight: 800, letterSpacing: '-0.03em', margin: 0,
                background: 'linear-gradient(135deg,#fff 30%,rgba(255,255,255,0.5))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>{shipment.trackingId}</h1>

              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
                color: statusCfg.color, borderRadius: 100, padding: '5px 14px',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase'
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: statusCfg.dot,
                  animation: (shipment.status === 'in_transit' || shipment.status === 'out_for_delivery') ? 'gpulse 2s infinite' : 'none'
                }} />
                {statusCfg.label}
              </span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
              Carried by <strong style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{shipment.courier || '—'}</strong>
              {' · '}Est. delivery:{' '}
              <strong style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                {shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </strong>
            </p>
          </div>

          {/* GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 292px', gap: 18, alignItems: 'start' }}>

            {/* ── TIMELINE ── */}
            <div style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20, overflow: 'hidden',
              opacity: 0, animation: 'fadeUp 0.4s ease 0.15s forwards'
            }}>
              {/* Card top bar */}
              <div style={{
                padding: '18px 26px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                  Delivery Timeline
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                    {completedCount}/{totalCount}
                  </span>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: progress === 100 ? '#4ade80' : '#22d3ee',
                    background: progress === 100 ? 'rgba(74,222,128,0.1)' : 'rgba(34,211,238,0.1)',
                    border: `1px solid ${progress === 100 ? 'rgba(74,222,128,0.25)' : 'rgba(34,211,238,0.25)'}`,
                    borderRadius: 100, padding: '3px 10px'
                  }}>{progress}%</div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ padding: '14px 26px 0' }}>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${progress}%`, borderRadius: 100,
                    background: progress === 100 ? 'linear-gradient(90deg,#4ade80,#22d3ee)' : 'linear-gradient(90deg,#22d3ee,#fb923c)',
                    transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: progress > 0 ? '0 0 10px rgba(34,211,238,0.6)' : 'none'
                  }} />
                </div>
              </div>

              {/* Steps list */}
              <div style={{ padding: '22px 26px 26px' }}>
                {totalCount === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(255,255,255,0.25)' }}>
                    <div style={{ fontSize: 30, marginBottom: 10 }}>📋</div>
                    <p style={{ fontSize: 13 }}>No timeline events yet</p>
                  </div>
                ) : timeline.map((event, index) => {
                  const isLast = index === timeline.length - 1
                  const isCurrentStep = event.completed && !timeline[index + 1]?.completed
                  const nextDone = timeline[index + 1]?.completed ?? false

                  return (
                    <div key={event.id ?? index} className="tl-row"
                      style={{ animationDelay: `${0.2 + index * 0.07}s`, display: 'flex', gap: 14, position: 'relative' }}>

                      {/* Connector */}
                      {!isLast && (
                        <div style={{
                          position: 'absolute', left: 18, top: 40, bottom: 0, width: 2,
                          background: event.completed && nextDone
                            ? 'linear-gradient(180deg,rgba(34,211,238,0.7) 0%,rgba(34,211,238,0.15) 100%)'
                            : 'rgba(255,255,255,0.05)',
                          transition: 'background 0.5s'
                        }} />
                      )}

                      {/* Icon */}
                      <div style={{ flexShrink: 0, zIndex: 1 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, transition: 'all 0.35s',
                          background: event.completed
                            ? isCurrentStep
                              ? 'linear-gradient(135deg,#fb923c,#e85d2f)'
                              : 'rgba(34,211,238,0.12)'
                            : 'rgba(255,255,255,0.04)',
                          border: event.completed
                            ? isCurrentStep ? '1.5px solid rgba(251,146,60,0.6)' : '1.5px solid rgba(34,211,238,0.35)'
                            : '1.5px solid rgba(255,255,255,0.06)',
                          boxShadow: isCurrentStep ? '0 0 18px rgba(251,146,60,0.4)' : 'none',
                          animation: isCurrentStep ? 'opulse 2.5s infinite' : 'none'
                        }}>
                          {event.completed
                            ? isCurrentStep
                              ? (event.icon || '📍')
                              : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="3.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )
                            : <span style={{ opacity: 0.2, fontSize: 14 }}>{event.icon || '○'}</span>
                          }
                        </div>
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 24, paddingTop: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <div>
                            <p style={{
                              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, margin: '0 0 3px',
                              color: event.completed
                                ? isCurrentStep ? '#fb923c' : 'rgba(255,255,255,0.88)'
                                : 'rgba(255,255,255,0.2)'
                            }}>{event.label}</p>
                            <p style={{ fontSize: 12, margin: 0, lineHeight: 1.55, color: event.completed ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.15)' }}>
                              {event.description}
                            </p>
                          </div>

                          {event.completed && event.timestamp ? (
                            <span style={{
                              fontSize: 10, flexShrink: 0, whiteSpace: 'nowrap',
                              color: 'rgba(255,255,255,0.3)',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 6, padding: '3px 8px', marginTop: 2
                            }}>{formatShort(event.timestamp)}</span>
                          ) : !event.completed ? (
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', flexShrink: 0, fontStyle: 'italic', marginTop: 4 }}>Pending</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Route */}
              <div style={{
                borderRadius: 18, padding: '20px',
                background: 'linear-gradient(135deg,rgba(34,211,238,0.06),rgba(251,146,60,0.06))',
                border: '1px solid rgba(255,255,255,0.07)',
                opacity: 0, animation: 'fadeUp 0.4s ease 0.25s forwards'
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Route</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Origin</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>{shipment.origin || '—'}</p>
                  </div>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Destination</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>{shipment.destination || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Recipient */}
              <div style={{
                borderRadius: 18, padding: '20px',
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                opacity: 0, animation: 'fadeUp 0.4s ease 0.32s forwards'
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 13 }}>Recipient</p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'white', marginBottom: 6, letterSpacing: '-0.02em' }}>
                  {shipment.recipientName || '—'}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65, margin: 0 }}>
                  {shipment.recipientAddress || 'No address on file'}
                </p>
              </div>

              {/* Package details */}
              <div style={{
                borderRadius: 18, padding: '20px',
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                opacity: 0, animation: 'fadeUp 0.4s ease 0.39s forwards'
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>Package Details</p>
                {[
                  { label: 'Courier',    value: shipment.courier },
                  { label: 'Weight',     value: shipment.weight },
                  { label: 'Sender',     value: shipment.senderName },
                  { label: 'Order Date', value: formatDate(shipment.createdAt) },
                ].map((d, i, arr) => (
                  <div key={d.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                  }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)' }}>{d.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.78)', textAlign: 'right', maxWidth: 140 }}>{d.value || '—'}</span>
                  </div>
                ))}
              </div>

              {/* Live badge */}
              <div style={{
                borderRadius: 12, padding: '10px 15px',
                background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)',
                display: 'flex', alignItems: 'center', gap: 9,
                opacity: 0, animation: 'fadeUp 0.4s ease 0.46s forwards'
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', flexShrink: 0, animation: 'gpulse 2s infinite' }} />
                <p style={{ fontSize: 11, color: 'rgba(34,211,238,0.7)', fontWeight: 600, margin: 0 }}>
                  Live · Updates automatically
                </p>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}