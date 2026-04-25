import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Sparkles, HelpCircle, ChevronRight } from 'lucide-react'

export default function ClarificationModal({ questions = [], onComplete, onSkipAll, onAbort }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [direction, setDirection] = useState(1) // 1 for right, -1 for left

  const currentQuestion = questions[currentIndex]
  const total = questions.length

  const handleNext = (auto = false) => {
    if (currentIndex < total - 1) {
      setDirection(1)
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1)
      }, auto ? 150 : 0)
    } else {
      // Completed all
      const finalAnswers = { ...answers }
      onComplete?.(finalAnswers)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleOptionSelect = (option) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.key || currentIndex]: option }))
    handleNext(true)
  }

  const handleTextSubmit = (val) => {
     setAnswers(prev => ({ ...prev, [currentQuestion.key || currentIndex]: val }))
     handleNext(false)
  }

  if (!questions.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        marginTop: 32,
        background: 'rgba(30, 53, 41, 0.4)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--r-lg)',
        padding: '32px 40px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Progress Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>🤔</span>
          <h2 className="font-playfair" style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: 0 }}>
            A few quick questions
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className="font-mono" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Question {currentIndex + 1} of {total}
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
                {questions.map((_, idx) => (
                    <div 
                        key={idx}
                        style={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            background: idx === currentIndex ? 'var(--sage)' : 'rgba(255,255,255,0.1)',
                            transition: 'all 0.3s'
                        }} 
                    />
                ))}
            </div>
        </div>
      </div>

      {/* Question Content */}
      <div style={{ minHeight: 180, position: 'relative' }}>
          <AnimatePresence custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                initial={{ opacity: 0, x: direction * 50 }}
                animate={{ opacity: 1, x: 0, position: 'relative' }}
                exit={{ opacity: 0, x: direction * -50, position: 'absolute', width: '100%' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                  <h3 className="font-dm" style={{ fontSize: 20, fontWeight: 500, color: 'white', marginBottom: 24, lineHeight: 1.4, maxWidth: '65ch' }}>
                      {currentQuestion.question}
                  </h3>

                  {/* Input Types */}
                  {currentQuestion.options ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                          {currentQuestion.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => handleOptionSelect(opt)}
                                className="btn-cust"
                                style={{
                                    padding: '10px 24px',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    background: answers[currentQuestion.key || currentIndex] === opt ? 'rgba(92, 140, 117, 0.2)' : 'rgba(255,255,255,0.05)',
                                    borderColor: answers[currentQuestion.key || currentIndex] === opt ? 'var(--sage)' : 'rgba(255,255,255,0.1)',
                                    color: answers[currentQuestion.key || currentIndex] === opt ? 'white' : 'var(--fog)'
                                }}
                              >
                                  {opt}
                              </button>
                          ))}
                      </div>
                  ) : (
                      <div style={{ position: 'relative' }}>
                          <input 
                            autoFocus
                            placeholder="Type your answer here..."
                            value={answers[currentQuestion.key || currentIndex] || ''}
                            onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.key || currentIndex]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 'var(--r-md)',
                                padding: '16px 20px',
                                color: 'white',
                                fontSize: 16,
                                outline: 'none',
                                transition: 'all 0.3s'
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--sage)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                          />
                      </div>
                  )}
              </motion.div>
          </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 40 }}>
          <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={onAbort}
                className="btn-cust"
                style={{ 
                    background: 'transparent', border: '1px solid rgba(216, 110, 110, 0.2)', color: 'var(--coral)', fontSize: 14, fontWeight: 600, padding: '10px 20px', borderRadius: 'var(--r-pill)'
                }}
                onMouseEnter={e => { e.target.style.background = 'rgba(216, 110, 110, 0.1)'; e.target.style.borderColor = 'rgba(216, 110, 110, 0.4)'; }}
                onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(216, 110, 110, 0.2)'; }}
              >
                  Cancel
              </button>
              <button 
                onClick={onSkipAll}
                className="btn-cust"
                style={{ 
                    background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--fog)', fontSize: 14, fontWeight: 600, padding: '10px 20px', borderRadius: 'var(--r-pill)'
                }}
                onMouseEnter={e => { e.target.style.background = 'rgba(255, 255, 255, 0.05)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'; e.target.style.color = 'white'; }}
                onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.color = 'var(--fog)'; }}
              >
                  Skip All
              </button>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
              {currentIndex > 0 && (
                <button 
                    onClick={handlePrev}
                    className="btn-cust"
                    style={{ padding: '10px 20px' }}
                >
                    Back
                </button>
              )}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNext()}
                style={{
                    background: 'var(--amber)',
                    border: 'none',
                    borderRadius: 'var(--r-pill)',
                    padding: '12px 32px',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(212, 124, 63, 0.3)'
                }}
              >
                  {currentIndex === total - 1 ? 'Finish' : 'Next'} <ChevronRight size={18} />
              </motion.button>
          </div>
      </div>
    </motion.div>
  )
}
