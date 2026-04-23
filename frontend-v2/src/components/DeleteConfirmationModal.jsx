import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

/**
 * DeleteConfirmationModal — A premium, themed confirmation dialog for destructive actions.
 */
export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, planTitle, isDeleting, error }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 24 }}>
          {/* Backdrop with strong blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'rgba(5, 12, 10, 0.85)', 
              backdropFilter: 'blur(12px)' 
            }}
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 420,
              background: 'linear-gradient(135deg, #0d1a15, #08120e)',
              border: '1.5px solid rgba(255, 107, 107, 0.2)',
              borderRadius: 28,
              padding: '40px 32px 32px',
              textAlign: 'center',
              boxShadow: '0 40px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(255, 107, 107, 0.05)'
            }}
          >
            {/* Warning Icon with Glow */}
            <div style={{ 
              width: 72, height: 72, borderRadius: 24, 
              background: 'rgba(255, 107, 107, 0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px',
              border: '1px solid rgba(255, 107, 107, 0.25)',
              position: 'relative'
            }}>
              <AlertTriangle size={36} color="#ff6b6b" strokeWidth={2} />
              <motion.div 
                animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ position: 'absolute', inset: -4, borderRadius: 28, border: '2px solid #ff6b6b', opacity: 0.2 }}
              />
            </div>

            <h3 className="font-playfair" style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
              Delete this roadmap?
            </h3>
            
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 24px', fontWeight: 500, padding: '0 10px' }}>
              Are you sure you want to remove <span style={{ color: 'white', fontWeight: 800 }}>"{planTitle}"</span>? This will permanently delete your roadmap and all its progress.
            </p>

            {/* ERROR MESSAGE IN-APP */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    marginBottom: 20,
                    padding: '12px 16px',
                    background: 'rgba(255, 107, 107, 0.1)',
                    border: '1px solid rgba(255, 107, 107, 0.2)',
                    borderRadius: 12,
                    color: '#ff6b6b',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'left',
                    overflow: 'hidden'
                  }}
                >
                  âš ï¸  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={onClose}
                className="btn-cust"
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  height: 52,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="mbtn"
                disabled={isDeleting}
                style={{
                  flex: 1,
                  background: '#ff6b6b',
                  border: 'none',
                  borderRadius: 16,
                  height: 52,
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(255, 107, 107, 0.3)',
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: isDeleting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {isDeleting ? (
                   <motion.div 
                     animate={{ rotate: 360 }}
                     transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                     style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }}
                   />
                ) : 'Delete Event'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
