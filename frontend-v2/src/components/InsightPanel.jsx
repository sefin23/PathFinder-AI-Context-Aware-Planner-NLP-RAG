/**
 * InsightPanel — right sidebar showing AI understanding at a glance.
 * Dark Forest styling: glassmorphism, earth tones, subtle animations.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Brain, FileText, Lightbulb, RotateCcw, CheckCircle2, Loader2, Map } from 'lucide-react'

const cardStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 'var(--r-md)',
  padding: '20px',
  marginBottom: '20px',
  transition: 'all var(--duration-base) var(--ease-spring)',
}

const SectionLabel = ({ icon: Icon, label, color = 'var(--lavender)' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={14} color={color} />
    </div>
    <span className="font-mono" style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</span>
  </div>
)

const SkeletonLine = ({ width = '100%', h = 10 }) => (
  <div style={{ width, height: h, borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,0.05)', marginBottom: 12, animation: 'pulse 1.5s ease infinite' }} />
)

// ── Today & Upcoming Tasks ────────────────────────────────────────────────
const TodayUpcomingCard = ({ workflowData }) => {
  if (!workflowData?.tasks?.length) return null
  
  // Extract a few tasks as "Today" and "This Week"
  const tasks = workflowData.tasks
  const todayTasks = tasks.slice(0, 1) // Just taking the first one for "Today"
  const weekTasks = tasks.slice(1, 3)

  return (
    <motion.div
      style={cardStyle}
      whileHover={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', transform: 'translateY(-2px)' }}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
    >
      <SectionLabel icon={Lightbulb} label="Focus Horizon" color="var(--lavender)" />
      
      {todayTasks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Immediate</span>
          <div style={{ marginTop: 8, background: 'rgba(123,111,160,0.1)', padding: '12px 14px', borderRadius: 'var(--r-sm)', borderLeft: '3px solid var(--lavender)' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'white', lineHeight: 1.4, display: 'block' }}>{todayTasks[0].title}</span>
          </div>
        </div>
      )}

      {weekTasks.length > 0 && (
        <div>
          <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Upcoming</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {weekTasks.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: 'var(--fog)', lineHeight: 1.4 }}>{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ── Risk & Stats ────────────────────────────────────────────────────────
const RiskStatsCard = ({ workflowData }) => {
  if (!workflowData?.tasks?.length) return null

  const taskCount = workflowData.tasks.length

  return (
    <motion.div
      style={cardStyle}
      whileHover={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', transform: 'translateY(-2px)' }}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
    >
      <SectionLabel icon={Brain} label="Analysis Ops" color="var(--coral)" />
      
      <div style={{ marginBottom: 20 }}>
        <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Critical Path</span>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 8, background: 'rgba(216,110,110,0.1)', padding: '12px', borderRadius: 'var(--r-sm)' }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontSize: 12.5, color: 'var(--coral)', lineHeight: 1.5 }}>Notifying utility companies of your exact move-out date is highly recommended.</span>
        </div>
      </div>

      <div>
        <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Project Scope</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-sm)', padding: '14px 10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="font-playfair" style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>0<span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>/{taskCount}</span></div>
            <div className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Nodes</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-sm)', padding: '14px 10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="font-playfair" style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>--</div>
            <div className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Est. Days</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Timeline Task Item with expand/collapse logic ──
const TimelineTaskItem = ({ task }) => {
  const [expanded, setExpanded] = useState(false)
  const hasMore = task.subtasks && task.subtasks.length > 2

  return (
    <div style={{ paddingBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'white', margin: '0 0 8px 0', lineHeight: 1.4 }}>
        {task.title}
      </p>
      {task.subtasks && task.subtasks.length > 0 && (
        <div style={{ paddingLeft: 6, borderLeft: '1px solid rgba(255,255,255,0.08)', marginLeft: 4 }}>
          {/* Always show first 2 */}
          {task.subtasks.slice(0, 2).map((st, j) => (
            <div key={st.id ?? j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
               <div style={{ width: 4, height: 4, background: 'var(--sage)', borderRadius: '50%', marginTop: 6, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: 'var(--fog)', lineHeight: 1.4 }}>{st.title}</span>
            </div>
          ))}

          {/* Expandable shelf for the rest */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                {task.subtasks.slice(2).map((st, j) => (
                  <div key={st.id ?? j + 2} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                     <div style={{ width: 4, height: 4, background: 'var(--sage)', borderRadius: '50%', marginTop: 6, flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: 'var(--fog)', lineHeight: 1.4 }}>{st.title}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 0 0 12px',
                color: 'var(--amber)',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--amber)'}
            >
              {expanded ? '[- COLLAPSE]' : `[+ ${task.subtasks.length - 2} MORE]`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Ideal Timeline card ───────────────────────────────────────────────────────
const TimelineCard = ({ workflowData }) => {
  const tasks = workflowData?.tasks ?? []
  if (tasks.length === 0) return null

  // Group by suggested due offset
  const groups = {}
  tasks.forEach(t => {
    const d = t.suggested_due_offset_days ?? 0
    if (!groups[d]) groups[d] = []
    groups[d].push(t)
  })

  const sortedDays = Object.keys(groups).map(Number).sort((a,b) => a - b)

  return (
    <motion.div
      style={cardStyle}
      whileHover={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', transform: 'translateY(-2px)' }}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
    >
      <SectionLabel icon={Map} label="Trajectory" color="var(--sage)" />
      
      <div style={{ paddingLeft: 12, borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: 10, marginTop: 20 }}>
        <div style={{ position: 'relative', marginBottom: 24 }}>
            <div style={{
              position: 'absolute', left: -18, top: 4, width: 10, height: 10,
              borderRadius: '50%', background: 'var(--earth)', border: '2px solid var(--forest-card)'
            }} />
            <p className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', margin: 0, paddingTop: 2, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Commencement
            </p>
        </div>

        {sortedDays.map((day, idx) => (
          <div key={day} style={{ position: 'relative', marginBottom: idx === sortedDays.length - 1 ? 0 : 8 }}>
            <div style={{
              position: 'absolute', left: -19, top: 2, width: 12, height: 12,
              borderRadius: '50%', background: 'var(--sage)', border: '2px solid var(--forest-card)'
            }} />
            
            <p className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Day {day}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {groups[day].map((t, i) => (
                <TimelineTaskItem key={t.id ?? i} task={t} />
              ))}
            </div>
          </div>
        ))}
        
        <div style={{ position: 'relative', marginTop: 8 }}>
            <div style={{
              position: 'absolute', left: -18, top: 4, width: 10, height: 10,
              borderRadius: '50%', background: 'var(--earth)', border: '2px solid var(--forest-card)'
            }} />
            <p className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', margin: 0, paddingTop: 2, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Target Arrival
            </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function InsightPanel({ stage, analysisData, requirementsData, workflowData, errorMsg, approved, approving, onRetry, onApprove }) {
  const taskCount = workflowData?.tasks?.length ?? 0

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        height: '100vh',
        background: 'var(--forest-mid)',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        padding: '30px 24px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
        zIndex: 20
      }}
    >
      <p className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>
        Command Center
      </p>

      {/* Idle placeholder */}
      {stage === 'idle' && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
          <Brain size={32} color="var(--muted)" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
            Awaiting input sequence...
          </p>
        </div>
      )}

      {/* Shimmer loading for the whole panel while pipeline runs */}
      {['analyzing','loading-docs','docs-loaded','generating'].includes(stage) && (
        <div style={{ opacity: 0.7, pointerEvents: 'none', filter: 'blur(2px)', transition: 'all 0.5s' }}>
           <SkeletonLine width="100%" h={120} />
           <SkeletonLine width="100%" h={90} />
           <SkeletonLine width="100%" h={150} />
        </div>
      )}

      {/* Real cards once data is available */}
      <AnimatePresence>
        {workflowData && stage === 'complete' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <TimelineCard key="summary" workflowData={workflowData} />
            <TodayUpcomingCard key="today" workflowData={workflowData} />
            <RiskStatsCard key="risk" workflowData={workflowData} />
          </div>
        )}
      </AnimatePresence>

      {/* Approve / Regenerate buttons */}
      {stage === 'complete' && workflowData && (
        <div style={{ marginTop: 10, marginBottom: 40 }}>
          {approved ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 'var(--r-md)', background: 'rgba(92,140,117,0.1)', border: '1px solid rgba(92,140,117,0.3)' }}
            >
              <CheckCircle2 size={16} color="var(--sage)" />
              <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sequence Approved</span>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => onApprove?.(workflowData.tasks ?? [])}
                disabled={approving}
                className="btn-cust"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', background: 'var(--sage)', color: 'var(--forest-deep)',
                  fontWeight: 700, opacity: approving ? 0.7 : 1, textAlign: 'center'
                }}
              >
                {approving
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> PROCESSING...</>
                  : <><CheckCircle2 size={14} /> AUTHORIZE SEQUENCE</>
                }
              </button>
              <button
                onClick={onRetry}
                className="btn-cust"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', background: 'transparent',
                }}
              >
                <RotateCcw size={13} /> ABORT & RECALCULATE
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error retry */}
      {stage === 'error' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '16px', borderRadius: 'var(--r-md)', background: 'rgba(216,110,110,0.1)', border: '1px solid rgba(216,110,110,0.2)' }}>
          <p style={{ fontSize: 13, color: 'var(--coral)', marginBottom: 14, lineHeight: 1.5 }}>{errorMsg}</p>
          <button onClick={onRetry} className="btn-cust" style={{ width: '100%', background: 'var(--coral)', color: 'white', border: 'none' }}>
            INITIATE RECOVERY
          </button>
        </motion.div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.3}50%{opacity:0.8} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
