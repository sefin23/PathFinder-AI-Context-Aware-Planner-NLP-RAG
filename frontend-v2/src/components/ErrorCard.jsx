/**
 * ErrorCard — shown in InsightPanel when any API call fails.
 * Dark Forest styling.
 */
import { motion } from 'framer-motion'
import { AlertCircle, RotateCcw } from 'lucide-react'

export default function ErrorCard({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'rgba(216,110,110,0.08)',
        border: '1px solid rgba(216,110,110,0.3)',
        borderRadius: 'var(--r-md)',
        padding: '24px 20px',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{ padding: 10, background: 'rgba(216,110,110,0.1)', borderRadius: '50%' }}>
            <AlertCircle size={24} color="var(--coral)" />
        </div>
      </div>
      <p className="font-playfair" style={{ fontSize: 16, fontWeight: 700, color: 'var(--coral)', marginBottom: 8 }}>
        System Interruption
      </p>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
        {message || 'An unexpected anomaly occurred. Please verify backend link and re-initiate.'}
      </p>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onRetry}
        className="btn-cust"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          background: 'var(--coral)',
          color: 'white',
          border: 'none',
        }}
      >
        <RotateCcw size={14} /> RE-INITIATE SEQUENCE
      </motion.button>
    </motion.div>
  )
}
