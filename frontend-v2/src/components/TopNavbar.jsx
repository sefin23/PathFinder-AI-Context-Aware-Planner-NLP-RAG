/**
 * TopNavbar — top bar showing current page context and status.
 * Adapts label to the active pipeline stage.
 * Dark Forest styling.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'

const STAGE_LABELS = {
  idle:         { text: 'Sequence Awaiting Input', icon: null, color: 'var(--muted)' },
  analyzing:    { text: 'Synthesizing Event Data...', icon: Sparkles, color: 'var(--lavender)' },
  analyzed:     { text: 'Event Classified · Accessing Databanks', icon: Sparkles, color: 'var(--lavender)' },
  'loading-docs': { text: 'Scanning Knowledge Core...', icon: Sparkles, color: 'var(--lavender)' },
  'docs-loaded':  { text: 'Requirements Extracted · Computing Vectors', icon: Sparkles, color: 'var(--lavender)' },
  generating:   { text: 'Assembling Optimal Trajectory...', icon: Sparkles, color: 'var(--lavender)' },
  complete:     { text: 'Trajectory Synthesized · Pending Authorization', icon: CheckCircle2, color: 'var(--sage)' },
  error:        { text: 'Critical Error · Sequence Aborted', icon: AlertCircle, color: 'var(--coral)' },
}

export default function TopNavbar({ stage = 'idle', activePage = 'dashboard' }) {
  const stageInfo = STAGE_LABELS[stage] ?? STAGE_LABELS.idle
  const Icon = stageInfo.icon

  return (
    <header
      style={{
        height: 56,
        background: 'rgba(13,26,21,0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* Breadcrumb */}
      <div className="font-mono" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        <span style={{ color: 'var(--muted)' }}>Pathfinder</span>
        <span style={{ color: 'var(--forest-card)', fontSize: 14 }}>/</span>
        <span style={{ color: 'var(--fog)', fontWeight: 700 }}>
          {activePage.replace('-', ' ')}
        </span>
      </div>

      {/* Stage Status Chip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.3 }}
          className="font-mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 10,
            color: stageInfo.color,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            background: 'rgba(255,255,255,0.03)',
            padding: '6px 14px',
            borderRadius: 'var(--r-pill)',
            border: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          {Icon && <Icon size={12} style={{ animation: stage.includes('ing') || stage === 'loading-docs' ? 'pulse 1.5s ease infinite' : 'none' }} />}
          <span>{stageInfo.text}</span>
        </motion.div>
      </AnimatePresence>
    </header>
  )
}
