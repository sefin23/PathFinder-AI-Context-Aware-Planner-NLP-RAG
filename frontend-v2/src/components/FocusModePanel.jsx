/**
 * FocusModePanel — shown INSIDE WorkflowCard when Focus Mode is toggled ON.
 * Displays only the highest-priority incomplete task.
 * Layout stays intact. InsightPanel is never replaced.
 */
import { motion } from 'framer-motion'
import { Star, Target } from 'lucide-react'

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
          padding: '20px 0',
          color: '#10B981',
          fontSize: 13,
        }}
      >
        🎉 All tasks complete!
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        background: 'rgba(99,102,241,0.08)',
        border: '1.5px solid rgba(99,102,241,0.35)',
        borderRadius: 12,
        padding: '16px 18px',
        marginTop: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <Target size={15} color="#6366F1" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Focus — Next Step
        </span>
      </div>

      <p style={{ fontSize: 15, fontWeight: 600, color: '#E5E7EB', marginBottom: 6 }}>
        {nextTask.title}
      </p>

      {nextTask.description && (
        <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5, marginBottom: 10 }}>
          {nextTask.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Star size={12} color="#F59E0B" fill="#F59E0B" />
        <span style={{ fontSize: 11.5, color: '#F59E0B', fontWeight: 500 }}>
          Priority {nextTask.priority ?? '—'}
          {nextTask.suggested_due_offset_days != null && ` · Day ${nextTask.suggested_due_offset_days}`}
        </span>
      </div>

      {(nextTask.subtasks ?? []).length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #334155' }}>
          <p style={{ fontSize: 11, color: '#64748B', marginBottom: 6 }}>
            {nextTask.subtasks.length} subtask{nextTask.subtasks.length !== 1 ? 's' : ''}:
          </p>
          {nextTask.subtasks.slice(0, 3).map((st) => (
            <div key={st.id} style={{ fontSize: 12, color: '#94A3B8', marginBottom: 3, paddingLeft: 8 }}>
              • {st.title}
            </div>
          ))}
          {nextTask.subtasks.length > 3 && (
            <div style={{ fontSize: 11, color: '#475569', paddingLeft: 8 }}>
              + {nextTask.subtasks.length - 3} more
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

/* aria-label */
