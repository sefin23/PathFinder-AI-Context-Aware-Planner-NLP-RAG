/**
 * FocusModePanel — shown INSIDE WorkflowCard when Focus Mode is toggled ON.
 * Displays only the highest-priority incomplete task.
 * Dark Forest styling.
 */
import { motion } from 'framer-motion'
import { Sparkles, Target, Zap } from 'lucide-react'

export default function FocusModePanel({ tasks = [] }) {
  const nextTask = tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5))[0]

  if (!nextTask) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          textAlign: 'center',
          padding: '24px 0',
          color: 'var(--sage)',
          fontSize: 14,
          fontWeight: 600,
        }}
        className="font-playfair"
      >
        <Sparkles size={16} color="var(--sage)" style={{ display: 'inline', marginRight: '6px', marginBottom: '-2px' }} /> Nodes Stabilized
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'rgba(216, 110, 110, 0.05)',
        border: '1px solid rgba(216, 110, 110, 0.2)',
        borderRadius: 'var(--r-md)',
        padding: '20px 24px',
        marginTop: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Zap size={15} color="var(--coral)" />
        <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--coral)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          PRIMARY NODE
        </span>
      </div>

      <p className="font-playfair" style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 8 }}>
        {nextTask.title}
      </p>

      {nextTask.description && (
        <p style={{ fontSize: 13, color: 'var(--fog)', lineHeight: 1.6, marginBottom: 16 }}>
          {nextTask.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
        <Target size={12} color="var(--sage)" />
        <span className="font-mono" style={{ fontSize: 10, color: 'var(--sage)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          PRIORITY {nextTask.priority ?? '—'}
          {nextTask.suggested_due_offset_days != null && ` · INIT +${nextTask.suggested_due_offset_days}`}
        </span>
      </div>

      {(nextTask.subtasks ?? []).length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase' }}>
            {nextTask.subtasks.length} Sequence{nextTask.subtasks.length !== 1 ? 's' : ''}:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {nextTask.subtasks.slice(0, 3).map((st) => (
            <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--fog)', paddingLeft: 4 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--muted)' }} />
               {st.title}
            </div>
          ))}
          </div>
          {nextTask.subtasks.length > 3 && (
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', paddingLeft: 16, marginTop: 8 }}>
              + {nextTask.subtasks.length - 3} OVERFLOW
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
