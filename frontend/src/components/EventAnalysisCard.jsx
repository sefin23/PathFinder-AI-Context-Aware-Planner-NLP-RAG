import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, MapPin, CalendarClock, Target, Plus, X, Search } from 'lucide-react'
import { ALL_LIFE_EVENT_TYPES } from '../api/life_event_types'

export default function EventAnalysisCard({ data, onAdd, onRemove }) {
  const [isAdding, setIsAdding] = useState(false)
  const [search, setSearch] = useState('')
  
  if (!data) return null

  const types   = Array.from(new Set(data.life_event_types ?? []))
  const pct     = Math.round((data.confidence ?? 0) * 100)
  const confColor = pct >= 80 ? 'var(--gold)' : pct >= 60 ? 'var(--amber)' : 'var(--coral)'

  const availableSuggestions = useMemo(() => {
    return ALL_LIFE_EVENT_TYPES.filter(t => 
      !types.includes(t.value) && 
      t.label.toLowerCase().includes(search.toLowerCase()) &&
      t.value !== 'OTHER'
    )
  }, [types, search])

  const handleSelect = (val) => {
    onAdd?.(val)
    setIsAdding(false)
    setSearch('')
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } 
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        position: 'relative',
        zIndex: isAdding ? 50 : 1,
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(24px)',
        border: '1.5px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--space-3)',
        overflow: 'visible',
        transition: 'all var(--dur-med) var(--ease-main)'
      }}
      whileHover={{ 
        borderColor: 'rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.03)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '8px', borderRadius: 'var(--r-md)', background: 'rgba(212,124,63,0.1)' }}>
          <Target size={18} color="var(--amber)" />
        </div>
        <div style={{ flex: 1 }}>
          <p className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.15em', marginBottom: 4 }}>
            ASSESSMENT INSIGHT
          </p>
          <h3 className="font-playfair" style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.1 }}>
            {data.display_title || 'Situation Analyzed'}
          </h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, position: 'relative', zIndex: 1 }}>
        {/* Situation Overview */}
        <div style={{ gridColumn: '1 / -1', marginBottom: 8 }}>
          <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Situation Overview</p>
          <p style={{ fontSize: 13, color: 'var(--fog)', lineHeight: 1.6, margin: 0, fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 12, borderLeft: '3px solid var(--amber)' }}>
            "{data.enriched_narrative || data.last_text || 'Synthesizing your journey details...'}"
          </p>
          
          {/* Proactive Vault Recognition */}
          {data.proactive_vault_message && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ 
                marginTop: 12, padding: '10px 16px', 
                background: 'rgba(74, 222, 128, 0.05)', 
                border: '1px solid rgba(74, 222, 128, 0.2)', 
                borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 
              }}
            >
              <Sparkles size={14} color="#4ade80" />
              <p style={{ fontSize: 12, color: '#4ade80', margin: 0, fontWeight: 600 }}>
                {data.proactive_vault_message}
              </p>
            </motion.div>
          )}
        </div>

        {/* Detected events */}
        <div style={{ gridColumn: types.length > 2 ? '1 / -1' : undefined }}>
          <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Event Types</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {types.map((t) => (
              <span key={t} style={{
                fontSize: 11, fontWeight: 600, padding: '4px 8px 4px 10px', borderRadius: 'var(--r-pill)',
                background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)',
                fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6
              }}>
                {t.replace(/_/g, ' ')}
                <button 
                  onClick={() => onRemove?.(t)}
                  style={{ 
                    border: 'none', background: 'none', padding: 0, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', opacity: 0.6, color: 'white'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </span>
            ))}
            
            {/* Add Button */}
            <div style={{ position: 'relative', zIndex: isAdding ? 10 : 'auto' }}>
              <motion.button
                whileHover={{ scale: 1.05, background: 'rgba(212,124,63,0.15)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAdding(!isAdding)}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 'var(--r-pill)',
                  background: 'rgba(255,255,255,0.02)', color: 'var(--amber)', border: '1px dashed var(--amber)',
                  fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  outline: 'none'
                }}
              >
                {isAdding ? <X size={10} /> : <Plus size={10} />}
                {isAdding ? 'cancel' : 'add your own'}
              </motion.button>

              {/* Popover Suggestions */}
              <AnimatePresence>
                {isAdding && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      style={{
                        position: 'absolute', top: '100%', left: 0, marginTop: 12,
                        width: 280, maxHeight: 320, background: 'rgba(20, 30, 26, 0.95)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid var(--amber)', borderRadius: 12, overflow: 'hidden',
                        zIndex: 200, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column'
                      }}
                    >
                    <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
                       <Search size={12} color="var(--muted)" />
                       <input 
                         autoFocus
                         placeholder="Search events..."
                         value={search}
                         onChange={e => setSearch(e.target.value)}
                         style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: 12, padding: '4px 0', width: '100%' }}
                       />
                    </div>
                    <div style={{ overflowY: 'auto', padding: 4 }}>
                       {availableSuggestions.map(s => (
                         <button
                           key={s.value}
                           onClick={() => handleSelect(s.value)}
                           style={{
                             width: '100%', padding: '8px 12px', background: 'transparent', 
                             border: 'none', color: 'var(--fog)', fontSize: 13, textAlign: 'left',
                             cursor: 'pointer', borderRadius: 6, transition: 'all 0.2s',
                             fontFamily: "'DM Sans', sans-serif"
                           }}
                           onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white' }}
                           onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fog)' }}
                         >
                           {s.label}
                         </button>
                       ))}
                       {availableSuggestions.length === 0 && (
                         <p style={{ padding: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>No other patterns match.</p>
                       )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Location */}
        {data.location && (
          <div>
            <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Target Location</p>
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
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', position: 'relative', zIndex: 1 }}>
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
    </motion.div>
  )
}

