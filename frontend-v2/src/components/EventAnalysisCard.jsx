/**
 * EventAnalysisCard — dashboard card shown in the main workspace.
 * Dark Forest styling with subtle gradients and glassmorphism.
 */
import { motion } from 'framer-motion'
import { Sparkles, MapPin, CalendarClock, Target } from 'lucide-react'

export default function EventAnalysisCard({ data }) {
  if (!data) return null

  const types   = data.life_event_types ?? []
  const pct     = Math.round((data.confidence ?? 0) * 100)
  const confColor = pct >= 80 ? 'var(--sage)' : pct >= 60 ? 'var(--amber)' : 'var(--coral)'

  return (
    <div style={{
      position: 'relative',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 'var(--r-md)',
      padding: 'var(--space-2) var(--space-4)',
      overflow: 'hidden'
    }}
      className="group"
    >
      {/* Background glow effect based on main detected event */}
      <div style={{
         position: 'absolute', top: -50, right: -50, width: 200, height: 200,
         background: 'radial-gradient(circle, rgba(123,111,160,0.15) 0%, transparent 70%)',
         pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ padding: '6px', borderRadius: '50%', background: 'rgba(123,111,160,0.15)' }}>
          <Sparkles size={16} color="var(--lavender)" />
        </div>
        <div style={{ flex: 1 }}>
          <p className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--lavender)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>
            Analysis Stage
          </p>
          <h3 className="font-playfair" style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: 0 }}>
            Situation Analyzed
          </h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Detected events */}
        <div style={{ gridColumn: types.length > 2 ? '1 / -1' : undefined }}>
          <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Primary Patterns</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {types.map((t) => (
              <span key={t} style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--r-pill)',
                background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)',
                fontFamily: "'DM Sans', sans-serif"
              }}>
                {t.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Location */}
        {data.location && (
          <div>
            <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Locale Target</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <MapPin size={13} color="var(--sage)" />
               <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fog)' }}>{data.location}</p>
            </div>
          </div>
        )}

        {/* Timeline */}
        {data.timeline && (
          <div>
            <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Est. Timeline</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <CalendarClock size={13} color="var(--amber)" />
               <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fog)' }}>{data.timeline}</p>
            </div>
          </div>
        )}
      </div>

      {/* Match Quality bar */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
             <Target size={12} color="var(--muted)" />
             <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Match Confidence</span>
          </div>
          <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: confColor }}>
            {pct}%
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.4)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            style={{ height: '100%', borderRadius: 2, background: confColor, boxShadow: `0 0 10px ${confColor}` }}
          />
        </div>
      </div>
    </div>
  )
}
