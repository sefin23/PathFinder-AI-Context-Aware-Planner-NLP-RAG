/**
 * LifeEventInput — hero input section at the top of the main workspace.
 * Dashboard-style: Large textarea, prominent CTA button.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, HelpCircle } from 'lucide-react'

const RUNNING_STAGES = ['analyzing', 'analyzed', 'loading-docs', 'docs-loaded', 'generating']

export default function LifeEventInput({ stage = 'idle', onSubmit, analysisData }) {
  const [text, setText] = useState('')
  const busy = RUNNING_STAGES.includes(stage)
  const canSubmit = text.trim().length >= 10 && !busy

  const handleSubmit = () => { if (canSubmit) onSubmit?.(text.trim()) }
  const handleKey = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }

  const clarification = analysisData?.clarification_needed ? analysisData.questions : null

  return (
    <div>
      <h2 className="font-playfair" style={{ fontWeight: 800, fontSize: 18, color: 'white', marginBottom: 4 }}>
        What life event are you navigating?
      </h2>
      <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16, fontWeight: 300 }}>
        Describe your situation — the navigator will map the path.
      </p>

      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 10 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={busy}
          placeholder={`I'm moving to Bangalore for my first job next month — need to sort documents, accommodation, banking...`}
          rows={4}
          className={busy ? 'breathe' : ''}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            border: '1.5px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            fontFamily: "'DM Sans', sans-serif",
            fontStyle: 'italic',
            minHeight: 68,
            resize: 'none',
            outline: 'none',
            transition: 'all 0.3s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--sage)' }}
          onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
        />
        {/* Scanning animation while busy */}
        {busy && (
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(92,140,117,0.5), transparent)',
            top: 0,
            animation: 'scan 1.5s ease-in-out infinite'
          }} />
        )}
      </div>

      <AnimatePresence>
        {clarification && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginTop: 14,
              padding: '12px 14px',
              background: 'rgba(123,111,160,0.1)',
              borderLeft: '3px solid var(--lavender)',
              borderRadius: '0 8px 8px 0',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <HelpCircle size={14} color="var(--lavender)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lavender)' }}>Navigator needs more information</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--fog)', lineHeight: 1.6 }}>
              {clarification.map((q, idx) => (
                <li key={idx}>{q.question}</li>
              ))}
            </ul>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, fontStyle: 'italic' }}>
              Add these details to your description above and try again.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          {text.length > 0 && text.length < 10
            ? 'Please enter at least 10 characters'
            : 'Ctrl + Enter to trigger analysis'}
        </span>

        <button
          className="btn-cust"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            background: canSubmit ? 'var(--amber)' : 'rgba(255,255,255,0.1)',
            color: canSubmit ? 'var(--forest-deep)' : 'var(--muted)',
            fontWeight: 700,
            border: 'none',
            padding: '10px 16px',
            borderRadius: 'var(--r-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {busy ? <><Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> SCANNING PATHS...</> : 'INITIATE PATHFINDING'}
        </button>
      </div>
    </div>
  )
}
