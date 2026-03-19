'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [trackingId, setTrackingId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingId.trim()) return
    setLoading(true)
    router.push(`/track/${trackingId.trim().toUpperCase()}`)
  }

  return (
    <>
      <style>{`
        .tf-root {
          min-height: 100vh;
          background: #0f0f10;
          position: relative;
          overflow: hidden;
        }

        /* ── Light mode overrides ── */
        @media (prefers-color-scheme: light) {
          .tf-root              { background: #f4f4f5; }
          .tf-glow              { background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(220,70,30,0.18) 0%, transparent 70%) !important; }
          .tf-nav-logo-text     { color: #111 !important; }
          .tf-heading           { color: #111 !important; }
          .tf-subtext           { color: #555 !important; }
          .tf-badge-wrap        { background: rgba(200,60,20,0.1) !important; border-color: rgba(200,60,20,0.25) !important; }
          .tf-badge-dot         { background: #c83c14 !important; }
          .tf-badge-text        { color: #a03010 !important; }
          .tf-search-box        { background: #fff !important; border-color: #ddd !important; }
          .tf-search-icon       { color: #666 !important; }
          .tf-search-input      { color: #111 !important; }
          .tf-search-input::placeholder { color: #999 !important; }
          .tf-search-btn        { background: #d94f22 !important; }
          .tf-search-btn:hover:not(:disabled) { background: #c03d14 !important; }
          .tf-search-btn:disabled { background: rgba(217,79,34,0.45) !important; }
          .tf-feature-text      { color: #777 !important; }
          .tf-ring-outer, .tf-ring-inner { border-color: rgba(0,0,0,0.06) !important; }
          .tf-grid-bg           { opacity: 0.04; background-image: linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px) !important; }
        }

        .tf-glow {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,93,47,0.22) 0%, transparent 70%);
          pointer-events: none;
        }
        .tf-grid-bg {
          position: absolute; inset: 0; opacity: 0.04;
          background-image: linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }
        .tf-ring-outer, .tf-ring-inner {
          position: absolute; border-radius: 50%; pointer-events: none;
          border-color: rgba(255,255,255,0.04);
          border-style: solid; border-width: 1px;
        }
        .tf-ring-outer { bottom: -10%; right: -5%; width: 500px; height: 500px; }
        .tf-ring-inner { bottom: -20%; right: -15%; width: 700px; height: 700px; }

        /* Nav */
        .tf-nav {
          padding: 24px 40px;
          display: flex; align-items: center; justify-content: space-between;
          position: relative; z-index: 10;
        }
        @media (max-width: 480px) { .tf-nav { padding: 20px 20px; } }
        .tf-nav-logo { display: flex; align-items: center; gap: 10px; }
        .tf-nav-logo-icon {
          width: 36px; height: 36px; background: #e85d2f; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
        }
        .tf-nav-logo-text {
          font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.02em;
        }

        /* Main */
        .tf-main {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: calc(100vh - 84px);
          padding: 40px 20px;
          position: relative; z-index: 10;
        }
        .tf-hero { text-align: center; max-width: 640px; width: 100%; }

        .tf-badge-wrap {
          display: inline-flex; align-items: center; gap: 8px;
          margin-bottom: 28px;
          background: rgba(232,93,47,0.15);
          border: 1px solid rgba(232,93,47,0.3);
          border-radius: 100px; padding: 6px 16px;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
        .tf-badge-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #e85d2f; animation: pulse-dot 2s infinite;
          flex-shrink: 0;
        }
        .tf-badge-text {
          color: #e85d2f; font-size: 11px; font-weight: 700;
          letter-spacing: 0.09em; text-transform: uppercase;
        }

        .tf-heading {
          font-size: clamp(36px, 8vw, 74px);
          font-weight: 800; line-height: 1.0;
          color: #fff; letter-spacing: -0.04em; margin-bottom: 18px;
        }
        .tf-heading-accent { color: #e85d2f; }

        .tf-subtext {
          color: rgba(255,255,255,0.55);
          font-size: clamp(15px, 2vw, 18px);
          margin-bottom: 44px; font-weight: 400; line-height: 1.65;
        }

        /* Search box */
        .tf-search-box {
          display: flex;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 14px; padding: 6px; gap: 8px;
          backdrop-filter: blur(20px);
        }
        .tf-search-inner {
          flex: 1; display: flex; align-items: center; gap: 10px; padding-left: 14px;
          min-width: 0;
        }
        .tf-search-icon { font-size: 18px; flex-shrink: 0; }
        .tf-search-input {
          background: none; border: none; outline: none; flex: 1; min-width: 0;
          color: #fff; font-size: 15px; font-family: inherit; font-weight: 400;
        }
        .tf-search-input::placeholder { color: rgba(255,255,255,0.38); }
        .tf-search-btn {
          background: #e85d2f; color: #fff; border: none; border-radius: 10px;
          padding: 13px 22px; font-weight: 700; font-size: 14px;
          cursor: pointer; letter-spacing: -0.01em;
          transition: background 0.18s, opacity 0.18s;
          white-space: nowrap; flex-shrink: 0;
        }
        .tf-search-btn:hover:not(:disabled) { background: #cf4e22; }
        .tf-search-btn:disabled { background: rgba(232,93,47,0.45); cursor: not-allowed; }

        /* Stack vertically on very small screens */
        @media (max-width: 480px) {
          .tf-search-box  { flex-direction: column; padding: 10px; gap: 10px; }
          .tf-search-inner { padding-left: 4px; }
          .tf-search-btn  { width: 100%; padding: 13px; text-align: center; }
        }

        /* Feature badges */
        .tf-features {
          display: flex; gap: 20px; margin-top: 72px;
          flex-wrap: wrap; justify-content: center;
        }
        .tf-feature-text {
          display: flex; align-items: center; gap: 7px;
          color: rgba(255,255,255,0.4); font-size: 13px; font-weight: 500;
        }
      `}</style>

      <div className="tf-root">
        <div className="tf-glow" />
        <div className="tf-grid-bg" />
        <div className="tf-ring-outer" />
        <div className="tf-ring-inner" />

        {/* Nav */}
        <nav className="tf-nav">
          <div className="tf-nav-logo">
            <div className="tf-nav-logo-icon">📦</div>
            <span className="tf-nav-logo-text">TrackFlow</span>
          </div>
        </nav>

        {/* Hero */}
        <main className="tf-main">
          <div className="tf-hero">
            <div className="tf-badge-wrap">
              <div className="tf-badge-dot" />
              <span className="tf-badge-text">Live Tracking</span>
            </div>

            <h1 className="tf-heading">
              Where is<br />
              <span className="tf-heading-accent">your parcel?</span>
            </h1>

            <p className="tf-subtext">
              Enter your tracking number to get real-time updates on your shipment's journey.
            </p>

            <form onSubmit={handleTrack}>
              <div className="tf-search-box">
                <div className="tf-search-inner">
                  <span className="tf-search-icon">🔍</span>
                  <input
                    type="text"
                    value={trackingId}
                    onChange={e => setTrackingId(e.target.value)}
                    placeholder="Enter tracking number (e.g. TRK-2025-DEMO01)"
                    className="tf-search-input"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !trackingId.trim()}
                  className="tf-search-btn"
                >
                  {loading ? 'Searching…' : 'Track Package'}
                </button>
              </div>
            </form>
          </div>

          {/* Feature badges */}
          <div className="tf-features">
            {[
              { icon: '🗺️', label: 'Live Updates' },
              { icon: '📱', label: 'SMS Alerts' },
              { icon: '⚡', label: 'Instant Tracking' },
              { icon: '🔒', label: 'Secure & Private' },
            ].map(f => (
              <div key={f.label} className="tf-feature-text">
                <span>{f.icon}</span> {f.label}
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}