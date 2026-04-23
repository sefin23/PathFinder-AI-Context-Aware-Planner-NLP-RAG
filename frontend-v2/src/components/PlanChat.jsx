/**
 * PlanChat — conversational AI panel for Journey Detail.
 *
 * The Navigator knows the user's entire plan: tasks, phases, progress,
 * costs, vault documents, knowledge requirements, location, and timeline.
 * Suggested questions are fetched per event type from the backend.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sendPlanChat, getPlanChatHistory, getPlanChatSuggestions } from '../api/backend'

const FALLBACK_SUGGESTIONS = [
  'What should I focus on first?',
  'What happens if I delay by 2 weeks?',
  'Which task is the most critical right now?',
  'What documents am I likely to need?',
  "Do I really need a professional for this?",
  'What can I do in parallel to save time?',
  'What are the most common mistakes people make here?',
  'How does my progress compare to typical plans?',
]

/** Convert **bold**, ✓ green, ⚠ red, and newlines in AI output to HTML. */
function formatResponse(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff">$1</strong>')
    .replace(/(⚠[^\n]*)/g, '<span style="color:#c65d4a">$1</span>')
    .replace(/(✓[^\n]*)/g, '<span style="color:#5c8c75">$1</span>')
    .replace(/\n/g, '<br>')
}

export default function PlanChat({ lifeEventId, planTitle, embedded = false }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [suggestions, setSuggestions] = useState(FALLBACK_SUGGESTIONS)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load persisted history on first open
  useEffect(() => {
    if (historyLoaded) return
    setHistoryLoaded(true)
    getPlanChatHistory(lifeEventId)
      .then(history => {
        if (history.length > 0) {
          setMessages(history)
        } else {
          setMessages([{
            role: 'assistant',
            content: `I'm your Navigator for **${planTitle || 'this plan'}**. I can see all your tasks, phases, deadlines, costs, and the documents you've uploaded to your vault.\n\nAsk me anything — "What should I do first?", "What if I delay 2 weeks?", "Which document do I still need?" — I'll answer based on YOUR specific plan.`,
          }])
        }
      })
      .catch(() => {
        setMessages([{
          role: 'assistant',
          content: `I'm your Navigator for **${planTitle || 'this plan'}**. Ask me anything about your plan and I'll give you specific, contextual answers.`,
        }])
      })
  }, [lifeEventId, planTitle, historyLoaded])

  // Fetch event-type-specific suggestions
  useEffect(() => {
    getPlanChatSuggestions(lifeEventId)
      .then(data => {
        if (data?.suggestions?.length) {
          setSuggestions(data.suggestions)
        }
      })
      .catch(() => {
        // Keep fallback suggestions silently
      })
  }, [lifeEventId])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return

    const newMessages = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      // Send last 12 messages as history context (6 exchanges)
      const history = newMessages.slice(-12).map(m => ({ role: m.role, content: m.content }))
      const { reply } = await sendPlanChat(lifeEventId, msg, history)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, the Navigator is temporarily unavailable. Please try again in a moment.",
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, messages, lifeEventId])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Pick 4 fresh suggestions not yet asked
  const askedSet = new Set(messages.filter(m => m.role === 'user').map(m => m.content))
  const visibleSuggestions = suggestions
    .filter(q => !askedSet.has(q))
    .slice(0, 4)

  const showSuggestions = visibleSuggestions.length > 0 && messages.length < 7

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: embedded ? '100%' : 'calc(100vh - 280px)',
      minHeight: embedded ? 0 : 480,
      borderRadius: embedded ? 0 : 16,
      overflow: 'hidden',
      background: embedded ? 'transparent' : 'rgba(255,255,255,0.02)',
      border: embedded ? 'none' : '1px solid rgba(255,255,255,0.08)',
    }}>

      {/* Header — hidden when embedded inside the modal (modal already has a header) */}
      {!embedded && <div style={{
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(92,140,117,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>🧭</div>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--sage)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 1,
          }}>Navigator · {planTitle || 'Your Plan'}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
            Knows your tasks, vault docs, and knowledge context
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sage)' }} />
          <span style={{ fontSize: 10, color: 'var(--sage)', fontFamily: "'JetBrains Mono', monospace" }}>Online</span>
        </div>
      </div>}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                maxWidth: '82%',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user'
                    ? '14px 14px 4px 14px'
                    : '14px 14px 14px 4px',
                  background: msg.role === 'user'
                    ? 'rgba(212,124,63,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${msg.role === 'user'
                    ? 'rgba(212,124,63,0.2)'
                    : 'rgba(255,255,255,0.07)'}`,
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: msg.role === 'user' ? 'rgba(255,255,255,0.9)' : 'var(--fog)',
                }}
                dangerouslySetInnerHTML={{ __html: formatResponse(msg.content) }}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', gap: 5, paddingLeft: 4, alignItems: 'center' }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--sage)',
                }}
              />
            ))}
            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4, fontFamily: "'JetBrains Mono', monospace" }}>Navigator is thinking…</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      <AnimatePresence>
        {showSuggestions && !loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              padding: '0 18px 10px',
              flexShrink: 0,
            }}
          >
            {visibleSuggestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  fontSize: 11,
                  color: 'var(--fog)',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(212,124,63,0.35)'
                  e.currentTarget.style.color = 'var(--amber)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.color = 'var(--fog)'
                }}
              >
                {q}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div style={{
        padding: '10px 18px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        gap: 8,
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about your plan…"
          disabled={loading}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '10px 14px',
            color: '#fff',
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(212,124,63,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: 'none',
            background: loading || !input.trim() ? 'rgba(212,124,63,0.3)' : 'var(--amber)',
            color: '#fff',
            fontSize: 18,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          →
        </button>
      </div>
    </div>
  )
}
