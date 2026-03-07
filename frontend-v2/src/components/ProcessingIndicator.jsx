/**
 * ProcessingIndicator — animated AI pipeline step tracker.
 * Dark Forest styling: scanning lines, organic colors.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { Asterisk, CheckCircle2 } from 'lucide-react'

const STEPS = [
  { id: 'analyzing',    label: 'Understanding your situation...',    done: 'Situation analyzed' },
  { id: 'loading-docs', label: 'Consulting knowledge core...',         done: 'Documentation retrieved' },
  { id: 'generating',  label: 'Mapping optimal route...',          done: 'Route map drawn' },
]

const STAGE_INDEX = {
  idle: -1, analyzing: 0, analyzed: 0, 'loading-docs': 1, 'docs-loaded': 1, generating: 2, complete: 2,
}

export default function ProcessingIndicator({ stage }) {
  if (stage === 'idle' || stage === 'error') return null

  const currentIdx = STAGE_INDEX[stage] ?? 0
  const isComplete = stage === 'complete'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-md)',
        padding: '24px 28px',
        marginBottom: 24,
        overflow: 'hidden'
      }}
    >
      {/* Scanning light effect */}
      <motion.div
         animate={{ top: ['-20%', '120%'] }}
         transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
         style={{
            position: 'absolute', left: 0, right: 0, height: '40%',
            background: 'linear-gradient(to bottom, transparent, rgba(123,111,160,0.1), transparent)',
            pointerEvents: 'none', zIndex: 0
         }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Asterisk size={16} color="var(--lavender)" style={{ animation: 'breathe 3s ease-in-out infinite' }} />
            <p className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--lavender)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
              AI Synthesis Active
            </p>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 8 }}>
            {STEPS.map((step, i) => {
               const isDone = isComplete || i < currentIdx || (i === currentIdx && ['analyzed', 'docs-loaded', 'complete'].includes(stage))
               const isActive = !isDone && i === currentIdx
               const isFuture = !isDone && !isActive

               return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                     <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isDone ? 'rgba(92,140,117,0.15)' : isActive ? 'rgba(123,111,160,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isDone ? 'rgba(92,140,117,0.4)' : isActive ? 'rgba(123,111,160,0.4)' : 'transparent'}`,
                        transition: 'all 0.4s',
                     }}>
                        {isDone
                           ? <CheckCircle2 size={13} color="var(--sage)" />
                           : isActive
                              ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lavender)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                              : <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--muted)' }} />
                        }
                     </div>
                     <span className="font-mono" style={{
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: isDone ? 'var(--sage)' : isActive ? 'white' : 'var(--muted)',
                        fontWeight: isActive ? 600 : 500,
                        transition: 'color 0.4s',
                     }}>
                        {isDone ? step.done : step.label}
                     </span>
                  </div>
               )
            })}
         </div>
      </div>
    </motion.div>
  )
}
