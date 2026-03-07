/**
 * AIInteractionPanel — centre panel: input at bottom, chat timeline above.
 * Dark Forest styling.
 */
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LifeEventInput from './LifeEventInput'
import ChatBubble from './ChatBubble'
import { Sparkles } from 'lucide-react'

export default function AIInteractionPanel({
  messages = [],
  processingSteps = [],
  stage = 'idle',
  onSubmit,
}) {
  const bottomRef = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, processingSteps])

  const isEmpty = messages.length === 0

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--forest-deep)',
      }}
    >
      {/* Chat Timeline */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '40px 48px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* Empty state */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              color: 'var(--muted)',
              textAlign: 'center',
              paddingBottom: 60,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--r-md)',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <Sparkles size={28} color="var(--sage)" />
            </div>
            <div>
              <p className="font-playfair" style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 8 }}>
                Initiate Pathfinding Sequence
              </p>
              <p style={{ fontSize: 14, color: 'var(--fog)', maxWidth: 420, lineHeight: 1.6, margin: '0 auto' }}>
                Describe a complex scenario or impending transition. The intelligence core will synthesize optimal navigation pathways and extract critical milestones.
              </p>
            </div>
          </motion.div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} type={msg.type} text={msg.text} />
        ))}

        {/* Processing steps — shown inline under the latest AI message */}
        {processingSteps.length > 0 && (
          <div
            style={{
              marginLeft: 56,
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 'var(--r-md)',
              border: '1px solid rgba(255,255,255,0.05)',
              fontSize: 13,
            }}
          >
            {processingSteps.map((step, i) => (
              <ChatBubble
                key={step.id ?? i}
                type="step"
                text={step.done ? `[COMPLETED] ${step.text.replace('...', '')}` : `[ACTIVE] ${step.text}`}
                done={step.done}
              />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }} />

      {/* Input */}
      <div style={{ padding: '24px 48px 48px' }}>
          <LifeEventInput stage={stage} onSubmit={onSubmit} />
      </div>
    </div>
  )
}
