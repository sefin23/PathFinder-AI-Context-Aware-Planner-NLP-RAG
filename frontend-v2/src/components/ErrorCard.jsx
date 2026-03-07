/**
 * ErrorCard — shown in InsightPanel when any API call fails.
 * Displays a clear error message and a retry button.
 */
import { motion } from 'framer-motion'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function ErrorCard({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 14,
        padding: '18px 18px',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <AlertTriangle size={22} color="#EF4444" />
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#FCA5A5', marginBottom: 6 }}>
        Something went wrong
      </p>
      <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5, marginBottom: 14 }}>
        {message || 'An unexpected error occurred. Please check that the backend is running and try again.'}
      </p>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onRetry}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 18px',
          borderRadius: 9,
          border: 'none',
          cursor: 'pointer',
          background: '#EF4444',
          color: '#fff',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <RotateCcw size={13} /> Try Again
      </motion.button>
    </motion.div>
  )
}

/* aria-label */
