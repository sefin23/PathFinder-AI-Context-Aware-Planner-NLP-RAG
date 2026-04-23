/**
 * LifeEventInput — premium hero input section for starting a journey.
 * Dark Forest branding with advanced glassmorphism and organic feedback.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, HelpCircle, ArrowRight, Zap, Calendar as CalendarIcon, AlertCircle } from 'lucide-react'
import ClarificationModal from './ClarificationModal'
import CustomDarkCalendar from './CustomDarkCalendar'
import { format, parseISO } from 'date-fns'

const RUNNING_STAGES = ['analyzing', 'analyzed', 'loading-docs', 'docs-loaded', 'generating']

export default function LifeEventInput({ stage = 'idle', onSubmit, analysisData }) {
  const [text, setText] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dateError, setDateError] = useState(null)
  const [showClarification, setShowClarification] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const busy = RUNNING_STAGES.includes(stage)
  const canSubmit = text.trim().length >= 10 && !busy

  useEffect(() => {
    if (analysisData?.clarification_needed && !busy) {
      setShowClarification(true)
    } else {
      setShowClarification(false)
    }
  }, [analysisData, busy])

  // Sync with AI-generated enriched narrative once available
  useEffect(() => {
    if (analysisData?.enriched_narrative && stage === 'complete') {
      setText(analysisData.enriched_narrative)
    }
  }, [analysisData?.enriched_narrative, stage])

  // Clear inputs on full reset
  useEffect(() => {
    if (stage === 'idle' && !analysisData) {
      setText('')
      setStartDate('')
      setDateError(null)
    }
  }, [stage, analysisData])

  const handleSubmit = () => { 
    if (canSubmit) { 
      if (!startDate) {
        setDateError('A start date is required to map your journey timeline accurately.')
        // Scroll to or highlight date? For now just setting error is good.
        return
      }
      
      const selected = new Date(startDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selected < today) {
        setDateError('Please select a current or future date.')
        return
      }

      setDateError(null)
      setShowClarification(false); 
      onSubmit?.(text.trim(), startDate); 
    } 
  }

  const handleClarificationComplete = (answers) => {
    // Pair each answer with its question so the classifier has full context,
    // not just bare values like "Grade 5. Yes." that it can't interpret.
    const questions = analysisData?.questions || []
    const additionalDetails = Object.entries(answers)
      .map(([key, val]) => {
        if (!val?.trim()) return null
        const questionText = questions[parseInt(key)]?.question
        return questionText ? `${questionText}: ${val}` : val
      })
      .filter(Boolean)
      .join('. ')

    const combinedText = additionalDetails
      ? `${text.trim()}. Additional context — ${additionalDetails}`
      : text.trim()

    setText(combinedText)
    setShowClarification(false)
    onSubmit?.(combinedText, startDate, true)
  }

  const handleClarificationCancel = () => {
    setShowClarification(false)
    onSubmit?.(text, startDate, true)
  }

  const clarification = analysisData?.clarification_needed ? analysisData.questions : null

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        width: '100%',
        maxWidth: 960,
        margin: '0 auto',
        padding: 'var(--space-2) 0'
      }}
    >
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <motion.div
          variants={itemVariants}
          style={{ 
            display: 'inline-flex', padding: '6px 12px', borderRadius: 'var(--r-pill)', background: 'rgba(92,140,117,0.1)', border: '1px solid rgba(92,140,117,0.15)', marginBottom: 20
          }}
        >
          <Sparkles size={14} color="var(--sage)" style={{ opacity: 0.8 }} />
          <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--sage)', marginLeft: 8 }}>
            PATHFINDER // THE NAVIGATOR
          </span>
        </motion.div>
        
        <motion.h1 variants={itemVariants} className="font-playfair" style={{ fontSize: 44, fontWeight: 900, color: 'white', marginBottom: 16, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
           Where is your path <span style={{ color: 'var(--amber)', fontStyle: 'italic' }}>leading?</span>
        </motion.h1>
        <motion.p variants={itemVariants} style={{ fontSize: 16, color: 'var(--muted)', fontWeight: 300, maxWidth: 720, margin: '0 auto', lineHeight: 1.6 }}>
           Describe the life event you’re navigating. The navigator will map 
           your journey, identify requirements, and guide your steps.
        </motion.p>
      </div>

      {/* Input Container */}
      <motion.div 
        variants={itemVariants}
        style={{ 
          position: 'relative', 
          background: 'rgba(255,255,255,0.02)', 
          backdropFilter: 'blur(32px)',
          border: `1.5px solid ${isFocused ? 'rgba(212,124,63,0.4)' : 'rgba(212,124,63,0.15)'}`,
          borderRadius: 'var(--r-lg)',
          padding: 24,
          boxShadow: isFocused 
            ? '0 30px 60px rgba(0,0,0,0.3), 0 0 40px rgba(212,124,63,0.1)' 
            : '0 20px 40px rgba(0,0,0,0.2)',
          transition: 'all var(--dur-med) var(--ease-main)',
        }}
        onMouseEnter={e => { if(!isFocused) { e.currentTarget.style.borderColor = 'rgba(212,124,63,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
        onMouseLeave={e => { if(!isFocused) { e.currentTarget.style.borderColor = 'rgba(212,124,63,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={busy}
          aria-label="Describe the life event you need a roadmap for"
          placeholder={`e.g. "I'm starting a new software company," or "I'm getting married in Italy next June," or "I need to renew my passport and update my address."`}
          rows={3}
          className={busy ? 'breathe' : ''}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            fontSize: 17,
            lineHeight: 1.7,
            color: 'white',
            fontFamily: "'DM Sans', sans-serif",
            resize: 'none',
            outline: 'none',
            transition: 'opacity 0.3s',
            boxSizing: 'border-box',
            marginBottom: 24,
            opacity: busy ? 0.6 : 1
          }}
        />

        {/* Start Date Input */}
        <div style={{ marginBottom: 32, marginTop: 12 }}>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--muted)',
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: 'var(--font-mono)'
          }}>
            When do you plan to start?
          </label>
          <div style={{ position: 'relative', width: '100%' }}>
            <div
              onClick={() => !busy && setShowCalendar(!showCalendar)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${showCalendar ? 'rgba(212,124,63,0.45)' : 'rgba(212,124,63,0.15)'}`,
                borderRadius: 'var(--r-md)',
                padding: '10px 14px',
                fontSize: 14,
                color: startDate ? 'white' : 'rgba(255,255,255,0.3)',
                fontFamily: "'DM Sans', sans-serif",
                cursor: busy ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
              }}
            >
              <span>{startDate ? format(parseISO(startDate), 'dd MMMM yyyy') : 'Select start date...'}</span>
              <CalendarIcon size={16} opacity={0.5} />
            </div>

            <AnimatePresence>
              {showCalendar && (
                <>
                  <div 
                    style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
                    onClick={() => setShowCalendar(false)} 
                  />
                  <CustomDarkCalendar
                    selectedDate={startDate ? new Date(startDate) : null}
                    onSelect={(date) => {
                      const formatted = format(date, 'yyyy-MM-dd')
                      setStartDate(formatted)
                      setShowCalendar(false)
                    }}
                    onClose={() => setShowCalendar(false)}
                  />
                </>
              )}
            </AnimatePresence>
          </div>
          {dateError && (
             <motion.p 
               initial={{ opacity: 0, x: -5 }} 
               animate={{ opacity: 1, x: 0 }} 
               style={{ 
                 fontSize: 11, color: '#f87171', marginTop: 12, fontWeight: 700, 
                 display: 'flex', alignItems: 'center', gap: 6,
                 background: 'rgba(239, 68, 68, 0.08)',
                 padding: '8px 12px',
                 borderRadius: 8,
                 border: '1px solid rgba(239, 68, 68, 0.15)',
                 width: 'fit-content'
               }}
             >
               <AlertCircle size={14} />
               {dateError}
             </motion.p>
          )}
        </div>

        {/* Action Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
             <span className="font-mono" style={{ fontSize: 10, color: text.length >= 10 ? 'var(--sage)' : 'var(--muted)', fontWeight: 700 }}>
               {text.length} <span style={{ opacity: 0.5 }}>/ MIN 10</span>
             </span>
             {text.length >= 10 && (
               <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: 'var(--sage)' }}>
                 ✓ Ready
               </motion.span>
             )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-cust"
            style={{
              padding: '12px 28px',
              borderRadius: 'var(--r-pill)',
              background: canSubmit ? 'var(--amber)' : 'rgba(255,255,255,0.05)',
              color: canSubmit ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
              fontWeight: 800,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: 'none',
              cursor: canSubmit ? 'pointer' : 'default',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: canSubmit ? '0 10px 20px rgba(var(--amber-rgb), 0.25)' : 'none',
            }}
            onMouseEnter={e => { if(canSubmit) { 
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)'; 
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(var(--amber-rgb), 0.5)';
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}}
            onMouseLeave={e => { if(canSubmit) { 
              e.currentTarget.style.transform = 'scale(1)'; 
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(var(--amber-rgb), 0.25)'; 
              e.currentTarget.style.filter = 'none'; 
            }}}
          >
            {busy ? (
               <><Loader2 size={16} className="animate-spin" /> CREATING PLAN...</>
            ) : (
               <>CREATE PLAN <ArrowRight size={16} /></>
            )}
          </button>
        </div>

        {/* Scanning Light Effect */}
        <AnimatePresence>
          {busy && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: '100%' }}
              exit={{ height: 0 }}
              style={{
                position: 'absolute', left: 0, right: 0, top: 0,
                background: 'linear-gradient(180deg, rgba(92,140,117,0.1) 0%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: -1
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Clarification Modal Overlay */}
      <AnimatePresence>
        {showClarification && analysisData?.questions && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               style={{ width: '100%', maxWidth: 640 }}
            >
              <ClarificationModal 
                questions={analysisData.questions} 
                onComplete={handleClarificationComplete}
                onCancel={handleClarificationCancel}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

