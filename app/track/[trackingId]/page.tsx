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
  pending:          { label: 'Pending',         varColor: 'var(--s-pending-c)',   varBg: 'var(--s-pending-bg)',   varBorder: 'var(--s-pending-bo)'   },
  in_transit:       { label: 'In Transit',       varColor: 'var(--s-transit-c)',   varBg: 'var(--s-transit-bg)',   varBorder: 'var(--s-transit-bo)'   },
  out_for_delivery: { label: 'Out for Delivery', varColor: 'var(--s-out-c)',       varBg: 'var(--s-out-bg)',       varBorder: 'var(--s-out-bo)'       },
  delivered:        { label: 'Delivered',        varColor: 'var(--s-delivered-c)', varBg: 'var(--s-delivered-bg)', varBorder: 'var(--s-delivered-bo)' },
  exception:        { label: 'Exception',        varColor: 'var(--s-exception-c)', varBg: 'var(--s-exception-bg)', varBorder: 'var(--s-exception-bo)' },
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}
function formatShort(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
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
  const isMoving = shipment?.status === 'in_transit' || shipment?.status === 'out_for_delivery'

  const CSS = `
    /* ── Root vars: dark default ── */
    .trk {
      --bg:          #0c0c15;
      --surface:     rgba(255,255,255,0.03);
      --surface2:    rgba(255,255,255,0.05);
      --border:      rgba(255,255,255,0.07);
      --border2:     rgba(255,255,255,0.05);
      --text:        #fff;
      --text-80:     rgba(255,255,255,0.82);
      --text-40:     rgba(255,255,255,0.4);
      --text-25:     rgba(255,255,255,0.25);
      --text-15:     rgba(255,255,255,0.15);
      --accent:      #e85d2f;
      --accent-from: #fb923c;
      --teal:        #22d3ee;
      --teal-faint:  rgba(34,211,238,0.06);
      --teal-border: rgba(34,211,238,0.15);
      --teal-text:   rgba(34,211,238,0.75);
      --nav-bg:      rgba(12,12,21,0.92);
      --nav-input:   rgba(255,255,255,0.05);
      --nav-input-b: rgba(255,255,255,0.09);
      --nav-icon:    rgba(255,255,255,0.3);
      --step-done:   rgba(34,211,238,0.12);
      --step-done-b: rgba(34,211,238,0.35);
      --step-cur-bg: linear-gradient(135deg,#fb923c,#e85d2f);
      --step-cur-b:  rgba(251,146,60,0.6);
      --connector:   linear-gradient(180deg,rgba(34,211,238,0.65) 0%,rgba(34,211,238,0.12) 100%);
      --progress-bg: rgba(255,255,255,0.06);
      --progress-bar:linear-gradient(90deg,#22d3ee,#fb923c);
      --progress-done:linear-gradient(90deg,#4ade80,#22d3ee);
      --pct-done-c:  #4ade80;  --pct-done-bg: rgba(74,222,128,0.1); --pct-done-bo: rgba(74,222,128,0.25);
      --pct-c:       #22d3ee;  --pct-bg:      rgba(34,211,238,0.1);  --pct-bo:      rgba(34,211,238,0.25);
      --route-bg:    linear-gradient(135deg,rgba(34,211,238,0.06),rgba(251,146,60,0.06));
      --arrow-c:     #fb923c;  --arrow-bg: rgba(251,146,60,0.12); --arrow-bo: rgba(251,146,60,0.3);

      --s-pending-c: #f59e0b;  --s-pending-bg: rgba(245,158,11,0.12);  --s-pending-bo: rgba(245,158,11,0.35);
      --s-transit-c: #22d3ee;  --s-transit-bg: rgba(34,211,238,0.12);  --s-transit-bo: rgba(34,211,238,0.35);
      --s-out-c:     #fb923c;  --s-out-bg:     rgba(251,146,60,0.12);  --s-out-bo:     rgba(251,146,60,0.35);
      --s-delivered-c:#4ade80; --s-delivered-bg:rgba(74,222,128,0.12); --s-delivered-bo:rgba(74,222,128,0.35);
      --s-exception-c:#f87171; --s-exception-bg:rgba(248,113,113,0.12);--s-exception-bo:rgba(248,113,113,0.35);
    }

    /* ── Light mode overrides ── */
    @media (prefers-color-scheme: light) {
      .trk {
        --bg:          #f2f2f4;
        --surface:     #fff;
        --surface2:    #f7f7f9;
        --border:      #e0e0e4;
        --border2:     #ebebee;
        --text:        #111;
        --text-80:     #222;
        --text-40:     #777;
        --text-25:     #aaa;
        --text-15:     #bbb;
        --accent:      #c83c14;
        --accent-from: #d95b20;
        --teal:        #0e8fa0;
        --teal-faint:  rgba(14,143,160,0.06);
        --teal-border: rgba(14,143,160,0.2);
        --teal-text:   #0a7080;
        --nav-bg:      rgba(242,242,244,0.95);
        --nav-input:   #fff;
        --nav-input-b: #d8d8dc;
        --nav-icon:    #888;
        --step-done:   rgba(14,143,160,0.08);
        --step-done-b: rgba(14,143,160,0.25);
        --step-cur-bg: linear-gradient(135deg,#d95b20,#c83c14);
        --step-cur-b:  rgba(217,91,32,0.5);
        --connector:   linear-gradient(180deg,rgba(14,143,160,0.5) 0%,rgba(14,143,160,0.08) 100%);
        --progress-bg: #e0e0e4;
        --progress-bar:linear-gradient(90deg,#0e8fa0,#d95b20);
        --progress-done:linear-gradient(90deg,#1a9a4a,#0e8fa0);
        --pct-done-c:  #1a7a3c;  --pct-done-bg: rgba(26,122,60,0.1);  --pct-done-bo: rgba(26,122,60,0.25);
        --pct-c:       #0a7080;  --pct-bg:      rgba(14,143,160,0.1);  --pct-bo:      rgba(14,143,160,0.25);
        --route-bg:    linear-gradient(135deg,rgba(14,143,160,0.05),rgba(217,91,32,0.05));
        --arrow-c:     #c83c14;  --arrow-bg: rgba(200,60,20,0.08); --arrow-bo: rgba(200,60,20,0.25);

        --s-pending-c: #8a5c00;  --s-pending-bg: #fef3d0;  --s-pending-bo: rgba(138,92,0,0.3);
        --s-transit-c: #0a7080;  --s-transit-bg: #e0f5f8;  --s-transit-bo: rgba(14,143,160,0.3);
        --s-out-c:     #a83800;  --s-out-bg:     #feede3;  --s-out-bo:     rgba(168,56,0,0.3);
        --s-delivered-c:#1a6a30; --s-delivered-bg:#e3f7ea; --s-delivered-bo:rgba(26,106,48,0.3);
        --s-exception-c:#8a1818; --s-exception-bg:#fde8e8; --s-exception-bo:rgba(138,24,24,0.3);
      }
    }

    /* ── Keyframes ── */
    @keyframes trk-fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes trk-slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
    @keyframes trk-pulse   { 0%,100%{box-shadow:0 0 0 0 var(--teal-border)} 50%{box-shadow:0 0 0 7px transparent} }
    @keyframes trk-opulse  { 0%,100%{box-shadow:0 0 0 0 rgba(217,91,32,0.4)} 50%{box-shadow:0 0 0 7px transparent} }
    @keyframes trk-spin    { to{transform:rotate(360deg)} }
    @keyframes trk-dot     { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* ── Base ── */
    .trk, .trk * { box-sizing: border-box; margin: 0; padding: 0; }
    .trk {
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: inherit;
    }

    /* ── Loading ── */
    .trk-loading {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      text-align: center;
    }
    .trk-spinner {
      width: 44px; height: 44px;
      border: 2px solid var(--teal-faint);
      border-top-color: var(--teal);
      border-radius: 50%;
      margin: 0 auto 18px;
      animation: trk-spin 0.9s linear infinite;
    }
    .trk-loading-label  { color: var(--text-40); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; }
    .trk-loading-id     { color: var(--text-25); font-size: 11px; margin-top: 6px; font-family: monospace; }

    /* ── Nav ── */
    .trk-nav {
      position: sticky; top: 0; z-index: 50;
      background: var(--nav-bg);
      backdrop-filter: blur(24px);
      border-bottom: 1px solid var(--border);
      padding: 0 28px;
      height: 62px;
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    @media (max-width: 600px) { .trk-nav { padding: 0 16px; } }
    .trk-nav-logo {
      display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0;
    }
    .trk-nav-icon {
      width: 32px; height: 32px; border-radius: 9px;
      background: var(--accent);
      display: flex; align-items: center; justify-content: center; font-size: 15px;
    }
    .trk-nav-name { font-size: 17px; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
    .trk-nav-form { display: flex; gap: 8px; flex: 1; max-width: 360px; justify-content: flex-end; }
    .trk-nav-input-wrap {
      display: flex; align-items: center; gap: 9px;
      background: var(--nav-input);
      border: 1px solid var(--nav-input-b);
      border-radius: 10px; padding: 0 12px; height: 38px;
      flex: 1; min-width: 0;
    }
    .trk-nav-input {
      background: none; border: none; outline: none;
      color: var(--text); font-size: 13px; font-family: inherit; flex: 1; min-width: 0;
    }
    .trk-nav-input::placeholder { color: var(--text-40); }
    .trk-nav-btn {
      height: 38px; padding: 0 16px;
      background: var(--accent);
      color: #fff; border: none; border-radius: 10px;
      font-weight: 700; font-size: 13px; cursor: pointer;
      font-family: inherit; flex-shrink: 0;
      transition: opacity 0.15s;
    }
    .trk-nav-btn:hover { opacity: 0.85; }

    /* ── Error ── */
    .trk-error {
      max-width: 420px; margin: 80px auto; padding: 0 24px; text-align: center;
      opacity: 0; animation: trk-fadeUp 0.4s ease forwards;
    }
    .trk-error-icon  { font-size: 52px; margin-bottom: 16px; }
    .trk-error-title { font-size: 22px; font-weight: 800; margin-bottom: 10px; letter-spacing: -0.03em; color: var(--text); }
    .trk-error-msg   { color: var(--text-40); font-size: 14px; line-height: 1.7; margin-bottom: 24px; }
    .trk-error-btns  { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .trk-btn-ghost {
      display: inline-block; text-decoration: none;
      background: var(--surface); color: var(--text);
      border: 1px solid var(--border);
      border-radius: 10px; padding: 10px 20px;
      font-weight: 700; font-size: 13px; font-family: inherit;
      cursor: pointer; transition: opacity 0.15s;
    }
    .trk-btn-ghost:hover { opacity: 0.75; }
    .trk-btn-accent {
      background: var(--accent); color: #fff; border: none;
      border-radius: 10px; padding: 10px 20px;
      font-weight: 700; font-size: 13px; cursor: pointer;
      font-family: inherit; transition: opacity 0.15s;
    }
    .trk-btn-accent:hover { opacity: 0.85; }

    /* ── Main ── */
    .trk-main { max-width: 1040px; margin: 0 auto; padding: 36px 24px 80px; }
    @media (max-width: 600px) { .trk-main { padding: 24px 16px 60px; } }

    /* ── Header ── */
    .trk-hdr { margin-bottom: 30px; opacity: 0; animation: trk-fadeUp 0.4s ease 0.05s forwards; }
    .trk-hdr-top {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px;
    }
    .trk-hdr-id {
      font-size: clamp(20px, 4vw, 30px); font-weight: 800;
      letter-spacing: -0.03em; color: var(--text);
    }
    .trk-status-pill {
      display: inline-flex; align-items: center; gap: 7px;
      border-radius: 100px; padding: 5px 13px;
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.07em; text-transform: uppercase;
      border: 1px solid;
    }
    .trk-status-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    }
    .trk-status-dot.pulsing { animation: trk-pulse 2s infinite; }
    .trk-hdr-sub { color: var(--text-40); font-size: 14px; }
    .trk-hdr-sub strong { color: var(--text-80); font-weight: 600; }

    /* ── Grid ── */
    .trk-grid {
      display: grid;
      grid-template-columns: minmax(0,1fr) 284px;
      gap: 16px; align-items: start;
    }
    @media (max-width: 780px) {
      .trk-grid { grid-template-columns: 1fr; }
      .trk-col-right { display: contents; }
    }

    /* ── Timeline card ── */
    .trk-tl-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 18px; overflow: hidden;
      opacity: 0; animation: trk-fadeUp 0.4s ease 0.15s forwards;
    }
    .trk-tl-top {
      padding: 16px 24px;
      border-bottom: 1px solid var(--border2);
      background: var(--surface2);
      display: flex; align-items: center; justify-content: space-between;
    }
    .trk-tl-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--text-40);
    }
    .trk-tl-meta { display: flex; align-items: center; gap: 10px; }
    .trk-tl-count { font-size: 12px; color: var(--text-40); font-weight: 600; }
    .trk-pct-badge {
      font-size: 11px; font-weight: 700;
      border-radius: 100px; padding: 3px 10px; border: 1px solid;
    }
    .trk-progress-wrap { padding: 12px 24px 0; }
    .trk-progress-track { height: 3px; border-radius: 100px; overflow: hidden; background: var(--progress-bg); }
    .trk-progress-fill  { height: 100%; border-radius: 100px; transition: width 1s cubic-bezier(0.4,0,0.2,1); }
    .trk-tl-body { padding: 20px 24px 24px; }
    .trk-tl-empty { text-align: center; padding: 28px 0; color: var(--text-25); }
    .trk-tl-empty-icon { font-size: 28px; margin-bottom: 10px; }
    .trk-tl-empty p { font-size: 13px; }

    /* ── Timeline rows ── */
    .tl-row { opacity: 0; animation: trk-slideIn 0.35s ease forwards; }
    .trk-tl-row { display: flex; gap: 14px; position: relative; }
    .trk-connector {
      position: absolute; left: 18px; top: 40px; bottom: 0; width: 2px;
      transition: background 0.5s;
    }
    .trk-step-icon {
      width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; z-index: 1;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; transition: all 0.35s; border: 1.5px solid;
    }
    .trk-step-content { flex: 1; padding-top: 6px; }
    .trk-step-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .trk-step-label {
      font-weight: 700; font-size: 14px; margin-bottom: 3px;
      font-family: inherit;
    }
    .trk-step-desc  { font-size: 12px; line-height: 1.55; }
    .trk-step-time  {
      font-size: 10px; flex-shrink: 0; white-space: nowrap;
      border-radius: 6px; padding: 3px 8px; margin-top: 2px;
      background: var(--surface2); border: 1px solid var(--border2);
      color: var(--text-40);
    }
    .trk-step-pending { font-size: 10px; color: var(--text-25); flex-shrink: 0; font-style: italic; margin-top: 4px; }

    /* ── Right column cards ── */
    .trk-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 16px; padding: 18px 20px;
    }
    .trk-card-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--text-40); margin-bottom: 14px;
    }
    .trk-route { background: var(--route-bg); }
    .trk-route-inner { display: flex; align-items: center; gap: 10px; }
    .trk-route-place { flex: 1; }
    .trk-route-place-label { font-size: 10px; color: var(--text-40); margin-bottom: 4px; }
    .trk-route-place-name  { font-weight: 800; font-size: 17px; color: var(--text); letter-spacing: -0.02em; }
    .trk-route-place.right { text-align: right; }
    .trk-route-arrow {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      background: var(--arrow-bg); border: 1px solid var(--arrow-bo);
      display: flex; align-items: center; justify-content: center;
    }
    .trk-recipient-name { font-weight: 700; font-size: 15px; color: var(--text); margin-bottom: 6px; }
    .trk-recipient-addr { font-size: 12px; color: var(--text-40); line-height: 1.65; }
    .trk-details-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 9px 0; border-bottom: 1px solid var(--border2);
    }
    .trk-details-row:last-child { border-bottom: none; }
    .trk-details-key { font-size: 12px; color: var(--text-40); }
    .trk-details-val { font-size: 12px; font-weight: 600; color: var(--text-80); text-align: right; max-width: 150px; }
    .trk-live-badge {
      border-radius: 12px; padding: 9px 14px;
      background: var(--teal-faint); border: 1px solid var(--teal-border);
      display: flex; align-items: center; gap: 9px;
    }
    .trk-live-dot  { width: 6px; height: 6px; border-radius: 50%; background: var(--teal); flex-shrink: 0; animation: trk-dot 2s infinite; }
    .trk-live-text { font-size: 11px; color: var(--teal-text); font-weight: 600; }

    /* ── Mobile card order ── */
    @media (max-width: 780px) {
      .trk-card-route     { order: 2; }
      .trk-card-recipient { order: 3; }
      .trk-card-details   { order: 4; }
      .trk-card-live      { order: 5; }
      .trk-tl-card        { order: 1; }
    }
  `

  if (loading) return (
    <div className="trk">
      <style>{CSS}</style>
      <div className="trk-loading">
        <div>
          <div className="trk-spinner" />
          <p className="trk-loading-label">Fetching shipment</p>
          <p className="trk-loading-id">{safeTrackingId}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="trk">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="trk-nav">
        <Link href="/" className="trk-nav-logo">
          <div className="trk-nav-icon">📦</div>
          <span className="trk-nav-name">TrackFlow</span>
        </Link>
        <form className="trk-nav-form"
          onSubmit={e => { e.preventDefault(); const t = newId.trim().toUpperCase(); if (t) router.push(`/track/${t}`) }}>
          <div className="trk-nav-input-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--nav-icon)" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={newId} onChange={e => setNewId(e.target.value)}
              placeholder="Track another parcel…"
              className="trk-nav-input" />
          </div>
          <button type="submit" className="trk-nav-btn">Track</button>
        </form>
      </nav>

      {/* ERROR */}
      {(error || (!loading && !shipment)) && (
        <div className="trk-error">
          <div className="trk-error-icon">🔍</div>
          <h2 className="trk-error-title">Not Found</h2>
          <p className="trk-error-msg">{error}</p>
          <div className="trk-error-btns">
            <Link href="/" className="trk-btn-ghost">← Go Back</Link>
            <button onClick={() => window.location.reload()} className="trk-btn-accent">Retry</button>
          </div>
        </div>
      )}

      {/* MAIN */}
      {shipment && (
        <main className="trk-main">

          {/* Header */}
          <div className="trk-hdr">
            <div className="trk-hdr-top">
              <h1 className="trk-hdr-id">{shipment.trackingId}</h1>
              <span className="trk-status-pill"
                style={{ color: statusCfg.varColor, background: statusCfg.varBg, borderColor: statusCfg.varBorder }}>
                <span className="trk-status-dot" style={{ background: statusCfg.varColor }}
                  data-pulsing={isMoving ? 'true' : undefined} />
                {statusCfg.label}
              </span>
            </div>
            <p className="trk-hdr-sub">
              Carried by <strong>{shipment.courier || '—'}</strong>
              {' · '}Est. delivery:{' '}
              <strong>
                {shipment.estimatedDelivery
                  ? new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </strong>
            </p>
          </div>

          {/* Grid */}
          <div className="trk-grid">

            {/* Timeline */}
            <div className="trk-tl-card">
              <div className="trk-tl-top">
                <span className="trk-tl-label">Delivery Timeline</span>
                <div className="trk-tl-meta">
                  <span className="trk-tl-count">{completedCount}/{totalCount}</span>
                  <span className="trk-pct-badge"
                    style={progress === 100
                      ? { color: 'var(--pct-done-c)', background: 'var(--pct-done-bg)', borderColor: 'var(--pct-done-bo)' }
                      : { color: 'var(--pct-c)',      background: 'var(--pct-bg)',      borderColor: 'var(--pct-bo)'      }}>
                    {progress}%
                  </span>
                </div>
              </div>

              <div className="trk-progress-wrap">
                <div className="trk-progress-track">
                  <div className="trk-progress-fill"
                    style={{
                      width: `${progress}%`,
                      background: progress === 100 ? 'var(--progress-done)' : 'var(--progress-bar)',
                    }} />
                </div>
              </div>

              <div className="trk-tl-body">
                {totalCount === 0 ? (
                  <div className="trk-tl-empty">
                    <div className="trk-tl-empty-icon">📋</div>
                    <p>No timeline events yet</p>
                  </div>
                ) : timeline.map((event, index) => {
                  const isLast        = index === timeline.length - 1
                  const isCurrentStep = event.completed && !timeline[index + 1]?.completed
                  const nextDone      = timeline[index + 1]?.completed ?? false

                  const iconStyle: React.CSSProperties = event.completed
                    ? isCurrentStep
                      ? { background: 'var(--step-cur-bg)', borderColor: 'var(--step-cur-b)', animation: 'trk-opulse 2.5s infinite' }
                      : { background: 'var(--step-done)',   borderColor: 'var(--step-done-b)' }
                    : { background: 'transparent',          borderColor: 'var(--border)' }

                  return (
                    <div key={event.id ?? index} className="tl-row trk-tl-row"
                      style={{ animationDelay: `${0.2 + index * 0.07}s`, paddingBottom: isLast ? 0 : 22 }}>

                      {!isLast && (
                        <div className="trk-connector"
                          style={{ background: event.completed && nextDone ? 'var(--connector)' : 'var(--border)' }} />
                      )}

                      <div className="trk-step-icon" style={iconStyle}>
                        {event.completed
                          ? isCurrentStep
                            ? (event.icon || '📍')
                            : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="3.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )
                          : <span style={{ opacity: 0.2, fontSize: 14 }}>{event.icon || '○'}</span>
                        }
                      </div>

                      <div className="trk-step-content">
                        <div className="trk-step-inner">
                          <div>
                            <p className="trk-step-label"
                              style={{ color: event.completed ? (isCurrentStep ? 'var(--accent-from)' : 'var(--text-80)') : 'var(--text-15)' }}>
                              {event.label}
                            </p>
                            <p className="trk-step-desc"
                              style={{ color: event.completed ? 'var(--text-40)' : 'var(--text-15)' }}>
                              {event.description}
                            </p>
                          </div>
                          {event.completed && event.timestamp
                            ? <span className="trk-step-time">{formatShort(event.timestamp)}</span>
                            : !event.completed
                              ? <span className="trk-step-pending">Pending</span>
                              : null
                          }
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <div className="trk-card trk-route trk-card-route"
                style={{ opacity: 0, animation: 'trk-fadeUp 0.4s ease 0.25s forwards' }}>
                <p className="trk-card-label">Route</p>
                <div className="trk-route-inner">
                  <div className="trk-route-place">
                    <p className="trk-route-place-label">Origin</p>
                    <p className="trk-route-place-name">{shipment.origin || '—'}</p>
                  </div>
                  <div className="trk-route-arrow">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--arrow-c)" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                  <div className="trk-route-place right">
                    <p className="trk-route-place-label">Destination</p>
                    <p className="trk-route-place-name">{shipment.destination || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="trk-card trk-card-recipient"
                style={{ opacity: 0, animation: 'trk-fadeUp 0.4s ease 0.32s forwards' }}>
                <p className="trk-card-label">Recipient</p>
                <p className="trk-recipient-name">{shipment.recipientName || '—'}</p>
                <p className="trk-recipient-addr">{shipment.recipientAddress || 'No address on file'}</p>
              </div>

              <div className="trk-card trk-card-details"
                style={{ opacity: 0, animation: 'trk-fadeUp 0.4s ease 0.39s forwards' }}>
                <p className="trk-card-label">Package Details</p>
                {([
                  { label: 'Courier',    value: shipment.courier },
                  { label: 'Weight',     value: shipment.weight },
                  { label: 'Sender',     value: shipment.senderName },
                  { label: 'Order Date', value: formatDate(shipment.createdAt) },
                ] as { label: string; value: string }[]).map(d => (
                  <div key={d.label} className="trk-details-row">
                    <span className="trk-details-key">{d.label}</span>
                    <span className="trk-details-val">{d.value || '—'}</span>
                  </div>
                ))}
              </div>

              <div className="trk-live-badge trk-card-live"
                style={{ opacity: 0, animation: 'trk-fadeUp 0.4s ease 0.46s forwards' }}>
                <div className="trk-live-dot" />
                <p className="trk-live-text">Live · Updates automatically</p>
              </div>

            </div>
          </div>
        </main>
      )}
    </div>
  )
}