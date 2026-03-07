/**
 * TaskProgressBar — compact progress indicator for a task.
 * Shows "completed / total subtasks complete" + filled bar.
 */
import { motion } from 'framer-motion'

export default function TaskProgressBar({ completed = 0, total = 0 }) {
  if (total === 0) return null
  const pct = Math.round((completed / total) * 100)

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {completed} / {total} subtask{total !== 1 ? 's' : ''} complete
        </span>
        <span style={{ fontSize: 11, color: pct === 100 ? 'var(--success)' : 'var(--text-secondary)' }}>{pct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--border-subtle)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: 2,
            background: pct === 100 ? 'var(--success)' : 'var(--accent)',
          }}
        />
      </div>
    </div>
  )
}
