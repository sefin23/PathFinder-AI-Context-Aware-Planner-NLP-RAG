/**
 * TopNavbar — top bar showing current page context and status.
 * Adapts label to the active pipeline stage.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'

const STAGE_LABELS = {
  idle:         { text: 'Ready · Describe your situation to begin', icon: null, color: 'var(--text-secondary)' },
  analyzing:    { text: 'Analyzing your life event...', icon: Sparkles, color: 'var(--accent)' },
  analyzed:     { text: 'Event classified · Retrieving requirements', icon: Sparkles, color: 'var(--accent)' },
  'loading-docs': { text: 'Searching knowledge base...', icon: Sparkles, color: 'var(--accent)' },
  'docs-loaded':  { text: 'Requirements found · Generating workflow', icon: Sparkles, color: 'var(--accent)' },
  generating:   { text: 'Generating AI workflow...', icon: Sparkles, color: 'var(--accent)' },
  complete:     { text: 'Workflow ready · Review and approve', icon: CheckCircle2, color: 'var(--success)' },
  error:        { text: 'Something went wrong · Retry below', icon: AlertCircle, color: 'var(--error)' },
}

export default function TopNavbar({ stage = 'idle', activePage = 'dashboard' }) {
  const stageInfo = STAGE_LABELS[stage] ?? STAGE_LABELS.idle
  const Icon = stageInfo.icon

  return (
    <header
      style={{
        height: 52,
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
      }}
    >
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Pathfinder</span>
        <span style={{ color: 'var(--border-subtle)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>
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
          transition={{ duration: 0.2 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: stageInfo.color,
            fontWeight: 500,
          }}
        >
          {Icon && <Icon size={13} />}
          <span>{stageInfo.text}</span>
        </motion.div>
      </AnimatePresence>
    </header>
  )
}
