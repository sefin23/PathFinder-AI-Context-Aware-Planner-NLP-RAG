/**
 * AIInteractionPanel — centre panel: input at bottom, chat timeline above.
 * Does NOT fetch data — it receives messages and processingSteps from Dashboard.
 */
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LifeEventInput from './LifeEventInput'
import ChatBubble from './ChatBubble'
import { MessageSquare } from 'lucide-react'

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
        background: '#0F172A',
      }}
    >
      {/* Chat Timeline */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
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
              gap: 12,
              color: '#475569',
              textAlign: 'center',
              paddingBottom: 40,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: '#1E293B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #334155',
              }}
            >
              <MessageSquare size={22} color="#6366F1" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                Start by describing your situation
              </p>
              <p style={{ fontSize: 13, color: '#475569', maxWidth: 320, lineHeight: 1.5 }}>
                Tell Pathfinder about a major life change — a job, move, marriage, or any big decision — and it will plan everything for you.
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
              marginLeft: 40,
              padding: '8px 14px',
              background: '#1E293B',
              borderRadius: 10,
              border: '1px solid #334155',
              fontSize: 12.5,
            }}
          >
            {processingSteps.map((step, i) => (
              <ChatBubble
                key={step.id ?? i}
                type="step"
                text={step.done ? `✓ ${step.text.replace('...', '')} complete` : step.text}
                done={step.done}
              />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#1E293B' }} />

      {/* Input */}
      <LifeEventInput stage={stage} onSubmit={onSubmit} />
    </div>
  )
}
