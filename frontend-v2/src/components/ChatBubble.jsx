/**
 * ChatBubble — renders a single conversation message.
 * type: 'user' | 'ai' | 'step'
 * Dark Forest styling.
 */
import { motion } from 'framer-motion'
import { Sparkles, User, Check, Loader2 } from 'lucide-react'

// Simple bold markdown parser for **text**
function parseBold(text) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'white', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function ChatBubble({ type = 'ai', text = '', done = false }) {
  if (type === 'step') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 0',
        }}
      >
        {done ? (
          <Check size={14} color="var(--sage)" />
        ) : (
          <Loader2
            size={14}
            color="var(--lavender)"
            style={{ animation: 'spin 1.5s linear infinite' }}
          />
        )}
        <span className="font-mono" style={{ fontSize: 11, color: done ? 'var(--sage)' : 'var(--lavender)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{text}</span>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </motion.div>
    )
  }

  const isUser = type === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        flexDirection: isUser ? 'row-reverse' : 'row',
        marginBottom: 8,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--r-md)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isUser ? 'rgba(255,255,255,0.03)' : 'var(--lavender)',
          border: isUser ? '1px solid rgba(255,255,255,0.08)' : 'none',
          marginTop: 4,
        }}
      >
        {isUser ? <User size={16} color="var(--muted)" /> : <Sparkles size={16} color="var(--forest-deep)" />}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '75%',
          background: isUser ? 'rgba(255,255,255,0.02)' : 'rgba(123,111,160,0.1)',
          border: `1px solid ${isUser ? 'rgba(255,255,255,0.06)' : 'rgba(123,111,160,0.2)'}`,
          borderRadius: 'var(--r-md)',
          padding: '16px 20px',
          fontSize: 14,
          lineHeight: 1.6,
          color: isUser ? 'var(--fog)' : 'white',
        }}
      >
        {parseBold(text)}
      </div>
    </motion.div>
  )
}
