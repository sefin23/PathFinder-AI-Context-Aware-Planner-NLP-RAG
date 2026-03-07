/**
 * ChatBubble — renders a single conversation message.
 * type: 'user' | 'ai' | 'step'
 *
 * 'step' type is used for AI processing feedback lines (✓ done / spinner)
 */
import { motion } from 'framer-motion'
import { Bot, User, Check, Loader2 } from 'lucide-react'

// Simple bold markdown parser for **text**
function parseBold(text) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#E5E7EB' }}>{part.slice(2, -2)}</strong>
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
        transition={{ duration: 0.2 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 0 4px 8px',
          fontSize: 12.5,
          color: done ? '#10B981' : '#6366F1',
        }}
      >
        {done ? (
          <Check size={13} />
        ) : (
          <Loader2
            size={13}
            style={{ animation: 'spin 1s linear infinite' }}
          />
        )}
        <span>{text}</span>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </motion.div>
    )
  }

  const isUser = type === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        flexDirection: isUser ? 'row-reverse' : 'row',
        marginBottom: 2,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isUser ? '#334155' : 'linear-gradient(135deg, #6366F1, #818CF8)',
          marginTop: 2,
        }}
      >
        {isUser ? <User size={14} color="#94A3B8" /> : <Bot size={14} color="#fff" />}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '80%',
          background: isUser ? '#1E3A5F' : '#1E293B',
          border: `1px solid ${isUser ? '#2563EB33' : '#334155'}`,
          borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
          padding: '10px 14px',
          fontSize: 13.5,
          lineHeight: 1.55,
          color: isUser ? '#93C5FD' : '#CBD5E1',
        }}
      >
        {parseBold(text)}
      </div>
    </motion.div>
  )
}
