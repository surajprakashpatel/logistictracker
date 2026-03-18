'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const [trackingId, setTrackingId] = useState('')
  const[loading, setLoading] = useState(false)
  const router = useRouter()

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingId.trim()) return
    setLoading(true)
    // Simply routes to the tracking page where Firebase will do the fetching
    router.push(`/track/${trackingId.trim().toUpperCase()}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', position: 'relative', overflow: 'hidden' }}>
      {/* Background elements */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,93,47,0.25) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-5%', width: '500px', height: '500px',
        border: '1px solid rgba(255,255,255,0.04)', borderRadius: '50%', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-15%', width: '700px', height: '700px',
        border: '1px solid rgba(255,255,255,0.03)', borderRadius: '50%', pointerEvents: 'none'
      }} />

      {/* Grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        pointerEvents: 'none'
      }} />

      {/* Nav */}
      <nav style={{ padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, background: 'var(--accent)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
          }}>📦</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>
            TrackFlow
          </span>
        </div>
      </nav>

      {/* Hero */}
      <main style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 100px)', padding: '40px 20px', position: 'relative', zIndex: 10
      }}>
        <div style={{ textAlign: 'center', maxWidth: 640, width: '100%' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 32,
            background: 'rgba(232,93,47,0.15)', border: '1px solid rgba(232,93,47,0.3)',
            borderRadius: 100, padding: '6px 16px'
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-dot 2s infinite' }} />
            <span style={{ color: 'rgba(232,93,47,0.9)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Live Tracking
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(40px, 8vw, 76px)', fontWeight: 800, lineHeight: 1.0,
            color: 'white', letterSpacing: '-0.04em', marginBottom: 20
          }}>
            Where is<br />
            <span style={{ color: 'var(--accent)' }}>your parcel?</span>
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 18, marginBottom: 48, fontWeight: 300, lineHeight: 1.6 }}>
            Enter your tracking number to get real-time updates on your shipment's journey.
          </p>

          <form onSubmit={handleTrack} style={{ position: 'relative', width: '100%' }}>
            <div style={{
              display: 'flex', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16, padding: 6, gap: 8, backdropFilter: 'blur(20px)'
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 16 }}>
                <span style={{ fontSize: 20 }}>🔍</span>
                <input
                  type="text"
                  value={trackingId}
                  onChange={e => setTrackingId(e.target.value)}
                  placeholder="Enter tracking number (e.g. TRK-2025-DEMO01)"
                  style={{
                    background: 'none', border: 'none', outline: 'none', flex: 1,
                    color: 'white', fontSize: 15, fontFamily: 'var(--font-body)',
                    fontWeight: 400,
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !trackingId.trim()}
                style={{
                  background: loading ? 'rgba(232,93,47,0.5)' : 'var(--accent)',
                  color: 'white', border: 'none', borderRadius: 12, padding: '14px 28px',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
                  cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '-0.01em',
                  transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}
              >
                {loading ? 'Searching...' : 'Track Package'}
              </button>
            </div>
          </form>

         
        </div>

        {/* Feature badges */}
        <div style={{ display: 'flex', gap: 16, marginTop: 80, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: '🗺️', label: 'Live Updates' },
            { icon: '📱', label: 'SMS Alerts' },
            { icon: '⚡', label: 'Instant Tracking' },
            { icon: '🔒', label: 'Secure & Private' },
          ].map(f => (
            <div key={f.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 500
            }}>
              <span>{f.icon}</span> {f.label}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}