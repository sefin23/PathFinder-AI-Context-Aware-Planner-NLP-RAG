/**
 * TopNavbar — top bar showing current page context and status.
 * Adapts label to the active pipeline stage.
 * Dark Forest styling.
 */
import { motion, AnimatePresence } from 'framer-motion'
import BrandLogo from './BrandLogo'
import { Sparkles, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

const STAGE_LABELS = {
  idle:         { text: 'Ready for your next event?', icon: null, color: 'var(--muted)' },
  analyzing:    { text: 'Understanding your situation...', icon: Loader2, color: 'var(--emerald)' },
  analyzed:     { text: 'Situation identified · Searching resources', icon: CheckCircle2, color: 'var(--amber)' },
  'loading-docs': { text: 'Searching for information...', icon: Loader2, color: 'var(--emerald)' },
  'docs-loaded':  { text: 'Requirements found · Preparing details', icon: CheckCircle2, color: 'var(--amber)' },
  generating:   { text: 'Creating your roadmap...', icon: Loader2, color: 'var(--amber)' },
  complete:     { text: 'Roadmap created · Ready for review', icon: CheckCircle2, color: 'var(--amber)' },
  approving:    { text: 'Securing your path...', icon: Loader2, color: 'var(--emerald)' },
  approved:     { text: 'Roadmap secured · Adding to history', icon: CheckCircle2, color: 'var(--sage)' },
  error:        { text: 'Problem occurred · Analysis stopped', icon: AlertCircle, color: 'var(--coral)' },
}

export default function TopNavbar({ stage = 'idle', activePage = 'dashboard' }) {
  // If we are NOT on the dashboard, we shouldn't show "Analysis Stopped" or "Analyzing..."
  // as those processes are Dashboard-specific.
  const effectiveStage = (activePage !== 'dashboard' && (stage === 'error' || stage.includes('ing') || stage === 'loading-docs')) 
    ? 'idle' 
    : stage

  const stageInfo = STAGE_LABELS[effectiveStage] ?? STAGE_LABELS.idle
  const Icon = stageInfo.icon

  return (
    <header
      style={{
        height: 56,
        background: 'rgba(13,26,21,0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '2px solid rgba(212, 124, 63, 0.35)',
        boxShadow: '0 4px 25px rgba(0, 0, 0, 0.4), 0 2px 10px rgba(212, 124, 63, 0.05)',
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
        <BrandLogo size={16} />
        <span style={{ color: 'var(--muted)' }}>Pathfinder</span>
        <span style={{ color: 'var(--amber)', fontSize: 14, opacity: 0.6 }}>/</span>
        <span style={{ color: 'var(--fog)', fontWeight: 700 }}>
          {activePage === 'saved' ? 'Event History' : 
           activePage === 'event-detail' ? 'Event Detail' : 
           activePage === 'dashboard' ? 'Dashboard' : 
           activePage === 'journeys' ? 'My Calendar' :
           activePage.replace('-', ' ')}
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

