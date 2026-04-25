/**
 * WorkflowCard — AI suggested workflow shown in the main workspace.
 * Dark Forest styling: Playfair phases, glass backgrounds.
 */import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Edit3, RefreshCw, Focus, Eye, EyeOff, CheckCircle2, Loader2, Play, Clock, Layers, ChevronsRight, Calendar, AlertTriangle, ArrowRight } from 'lucide-react'
import { getEventVisuals } from '../api/EventSymbols'
import TaskItem from './TaskItem'
import FocusModePanel from './FocusModePanel'
import CustomDarkCalendar from './CustomDarkCalendar'
import { updateTaskScheduledDate, resolveTaskConflict } from '../api/backend'

let _idCounter = 2000
const nextId = () => ++_idCounter

// Derive a functional category for grouping in Category View
function inferCategory(title = '', phase = '') {
  const t = (title + ' ' + (phase || '')).toLowerCase()
  if (/court|legal|lawyer|attorney|decree|judgment|hearing|petition|notari|affidavit|structure|incorporation|registration|compliance/.test(t)) return 'Legal & Law'
  if (/home|house|propert|inspection|room|space|setup|furnish|residential/.test(t)) return 'Home & Property'
  if (/financ|bank|account|income|tax|fund|budget|payment|fee|loan|asset|money/.test(t)) return 'Financial & Banking'
  if (/document|paperwork|certif|proof|dossier|compil|file|record/.test(t)) return 'Identity & Documents'
  if (/name availability|branding|trademark|logo|identity|passport|id proof|register|aadhaar|aadhar|pan card|birth cert/.test(t)) return 'Identity & Documents'
  if (/agency|select|choose|search|research|orient|contact|consultant/.test(t)) return 'Services & Agency'
  if (/medical|health|doctor|hospital|clinic|physical exam|vaccin|wellness|appointment/.test(t)) return 'Health & Medical'
  if (/interview|meeting|attend|visit|session|appointm/.test(t)) return 'Meetings & Interviews'
  if (/train|course|class|workshop|educat|learn|school|enroll/.test(t)) return 'Training & Education'
  if (/insur|coverage|policy|premium|claim/.test(t)) return 'Insurance & Coverage'
  if (/bond|adjust|transition|settl|adapt|connect|travel|relocat/.test(t)) return 'Bonding & Transition'
  if (/final|complet|submit|obtain|receiv|collect|closure/.test(t)) return 'Finalization & Closure'
  return 'General Preparation'
}

// Order of appearance for categories in Category View
const CATEGORY_ORDER = [
  'Identity & Documents',
  'Financial & Banking',
  'Legal & Law',
  'Services & Agency',
  'Home & Property',
  'Health & Medical',
  'Insurance & Coverage',
  'Training & Education',
  'Meetings & Interviews',
  'Bonding & Transition',
  'Finalization & Closure',
  'General Preparation'
]

const getPhaseEmoji = (phaseName = '', category = null) => {
  return getEventVisuals(phaseName, '', category).emoji
}

// Derive a meaningful phase name from a task title when the backend returns null/'General'
function inferPhase(title = '') {
  const t = title.toLowerCase()
  if (/document|paperwork|certif|proof|notari|affidavit|dossier|compil/.test(t)) return 'Document Preparation'
  if (/financ|bank|account|income|tax|fund|budget|payment|fee|loan|asset/.test(t)) return 'Financial Setup'
  if (/court|legal|lawyer|attorney|decree|judgment|hearing|petition|notari|affidavit|decree|structure|incorporation|registration|compliance/.test(t)) return 'Legal Proceedings'
  if (/name availability|branding|trademark|logo|identity|passport|id proof|pan card|birth cert/.test(t)) return 'Identity & Registration'
  if (/background|police|clearance|verificat|screen/.test(t)) return 'Background Checks'
  if (/home|house|propert|inspection|room|space|setup|furnish/.test(t)) return 'Home Preparation'
  if (/agency|select|choose|search|research|orient|contact/.test(t)) return 'Agency Selection'
  if (/medical|health|doctor|hospital|clinic|physical exam|vaccin/.test(t)) return 'Health Assessment'
  if (/interview|meeting|attend|visit|session|appointm/.test(t)) return 'Meetings & Interviews'
  if (/train|course|class|workshop|educat|learn/.test(t)) return 'Training & Education'
  if (/insur|coverage|policy|premium|claim/.test(t)) return 'Insurance & Coverage'
  if (/bond|adjust|transition|settl|adapt|connect/.test(t)) return 'Bonding & Transition'
  if (/final|complet|submit|obtain|receiv|collect/.test(t)) return 'Final Steps'
  // Capitalise first 3 words as last resort
  const words = title.trim().split(/\s+/)
  return words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Preparation'
}


// Normalize near-duplicate phase names so they merge into one group.
function canonicalPhase(raw = '') {
  return raw
    .toLowerCase()
    .replace(/\b(adoption|relocation|divorce|marriage|pregnancy|medical|home|legal|financial|job|career|business|house|property)\b/g, '')
    .replace(/\b(the|a|an|and|or|of|for|to|in|on|with|by)\b/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normaliseTask(t, i) {
  const isDone = t.done ?? (t.status === 'completed')
  const rawPhase = t.phase_title ?? ''
  const GENERIC = ['general', 'other', 'misc', 'miscellaneous', 'n/a', 'na', '']
  const phase_title = GENERIC.includes(rawPhase.trim().toLowerCase())
    ? inferPhase(t.title ?? '')
    : rawPhase
  return {
    id: t.id ?? nextId(),
    title: t.title ?? `Task ${i + 1}`,
    description: t.description ?? '',
    priority: t.priority ?? 3,
    urgency_score: t.urgency_score ?? null,
    suggested_due_offset_days: t.suggested_due_offset_days ?? t.due_offset_days ?? null,
    phase_title,
    phase_category: t.phase_category ?? null,
    task_type: t.task_type ?? null,
    scheduled_date: t.scheduled_date ?? null,
    category: inferCategory(t.title ?? '', phase_title),
    done: isDone,
    subtasks: (t.subtasks ?? []).map((st, j) => ({
      id: st.id ?? nextId(),
      title: st.title ?? `Subtask ${j + 1}`,
      priority: st.priority ?? 3,
      task_type: st.task_type ?? null,
      scheduled_date: st.scheduled_date ?? null,
      urgency_score: st.urgency_score ?? null,
      suggested_due_offset_days: st.suggested_due_offset_days ?? st.due_offset_days ?? null,
      done: st.done ?? (st.status === 'completed'),
    })),
  }
}
// ── Phase Strip (Unified SOP Style) ──
function PhaseStrip({ phases, tasks, selectedPhase, onSelectPhase, viewMode, themeColor, themeColorName }) {
  const calculateTaskProgressRaw = (t) => {
    if (t.done) return 100
    const subs = t.subtasks || []
    if (subs.length === 0) return 0
    const doneCount = subs.filter(s => s.done).length
    return (doneCount / subs.length) * 100
  }

  // Build phase_title → phase_category lookup from task data
  const phaseCategoryMap = {}
  tasks.forEach(t => {
    if (t.phase_title && t.phase_category) phaseCategoryMap[t.phase_title] = t.phase_category
    if (t.category && t.phase_category) phaseCategoryMap[t.category] = t.phase_category
  })

  const phaseData = phases.map((phase, idx) => {
    const phaseTasks = tasks.filter(t => (viewMode === 'phase' ? t.category : (t.phase_title || 'General')) === phase)
    const progressSum = phaseTasks.reduce((acc, t) => acc + calculateTaskProgressRaw(t), 0)
    const pct = phaseTasks.length > 0 ? Math.round(progressSum / phaseTasks.length) : 0
    const isAllComplete = pct === 100
    const completedCount = phaseTasks.filter(t => calculateTaskProgressRaw(t) === 100).length
    return { phase, pct, total: phaseTasks.length, completedCount, isAllComplete }
  })

  const overallProgress = phaseData.length > 0 ? (phaseData.reduce((acc, p) => acc + p.pct, 0) / phaseData.length) : 0;

  return (
    <>
      <div style={{ 
        marginBottom: 32, 
        margin: '0 -32px 32px -32px', 
        padding: '40px 32px 56px 32px', 
        background: 'transparent',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        overflowX: 'auto', 
        overflowY: 'visible',
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'stretch', minWidth: '100%', width: 'max-content', gap: 0, position: 'relative', zIndex: 11, padding: '12px 0' }}>
          {phaseData.map(({ phase, pct, total, completedCount, isAllComplete }, idx) => {
            const isSelected = selectedPhase === phase
            const allPrevComplete = phaseData.slice(0, idx).every(p => p.isAllComplete)
            const isCurrent = !isAllComplete && allPrevComplete
            
            // Theme-aware tokens
            let stateLabel = 'UPCOMING'
            let stateIcon = <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
            let accentColor = 'rgba(255,255,255,0.3)'

            if (isAllComplete) {
              stateLabel = 'COMPLETE'
              stateIcon = <CheckCircle2 size={12} color="var(--emerald)" />
              accentColor = 'var(--emerald)'
            } else if (isCurrent) {
              stateLabel = 'IN PROGRESS'
              stateIcon = <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: themeColor || 'var(--amber)' }} />
              accentColor = themeColor || 'var(--amber)'
            }

            return (
              <React.Fragment key={`${phase}-${idx}`}>
                {/* Connecting Line between cards */}
                {idx > 0 && (
                  <div style={{
                    height: 3,
                    width: 60,
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.07)',
                    borderRadius: 2,
                    alignSelf: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${phaseData[idx - 1].pct}%` }}
                      transition={{ duration: 1.5, ease: 'circOut' }}
                      style={{
                        position: 'absolute',
                        left: 0, top: 0, height: '100%',
                        background: themeColor || 'var(--amber)',
                        borderRadius: 2,
                        boxShadow: phaseData[idx - 1].pct > 0 ? `0 0 6px ${themeColor || 'rgba(212,124,63,0.6)'}` : 'none'
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 160, position: 'relative', zIndex: 1 }}>
                  <motion.button
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectPhase(isSelected ? null : phase)}
                    className={`phase-glass-card ${isSelected ? 'is-selected' : ''}`}
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      padding: '16px 12px', 
                      cursor: 'pointer',
                      textAlign: 'left', 
                      width: '100%',
                      height: '100%',
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 16,
                      transition: 'all 0.4s var(--ease-main)'
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {stateIcon}
                        <span className="font-mono" style={{ fontSize: 9, fontWeight: 900, color: accentColor, letterSpacing: '0.15em' }}>
                          {stateLabel}
                        </span>
                      </div>
                      <span className="font-mono" style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>
                        {pct}%
                      </span>
                    </div>

                    {/* Phase Title (No Truncation) */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: 1 }}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{getPhaseEmoji(phase, phaseCategoryMap[phase])}</span>
                      <span style={{ 
                        fontSize: 15, 
                        fontWeight: 800, 
                        color: 'white', 
                        fontFamily: "'DM Sans', sans-serif", 
                        lineHeight: 1.3,
                        display: 'block',
                        whiteSpace: 'normal',
                        overflow: 'hidden'
                      }}>
                        {phase.replace(/_/g, ' ')}
                      </span>
                    </div>
                    
                    {/* Task Count & Progress Bar Wrapper */}
                    <div style={{ marginTop: 'auto', paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#b8cfc7', fontSize: 10 }}>
                        {completedCount}/{total} tasks
                      </span>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1.5, ease: 'circOut' }}
                          style={{
                            height: '100%',
                            background: isAllComplete ? 'var(--emerald)' : (themeColor || 'var(--amber)'),
                            borderRadius: 2,
                            boxShadow: pct > 0 ? `0 0 10px ${isAllComplete ? 'rgba(92,140,117,1)' : (themeColor || 'rgba(212,124,63,0.45)')}` : 'none'
                          }}
                        />
                      </div>
                    </div>
                  </motion.button>
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedPhase && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 24,
              marginTop: -16,
              padding: '8px 16px',
              borderRadius: 12,
              background: 'rgba(212,124,63,0.1)',
              border: '1px solid rgba(212,124,63,0.3)',
              width: 'fit-content'
            }}
          >
            <span style={{
              fontSize: 11,
              color: 'var(--amber)',
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              Filtering: {selectedPhase}
            </span>
            <button
              onClick={() => onSelectPhase(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--amber)',
                cursor: 'pointer',
                fontSize: 14,
                opacity: 0.7,
                padding: 0,
                marginLeft: 4
              }}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}


export default function WorkflowCard({ data, approved, approving, initialStartDate, onApprove, onRegenerate, onStatusChange, onNavigate }) {
  if (!data) return null

  const rawTasks = data?.tasks ?? []
  const [tasks, setTasks]             = useState(() => rawTasks.map(normaliseTask))

  // Sync tasks state when data prop changes
  useEffect(() => {
    if (rawTasks && rawTasks.length > 0) {
      setTasks(rawTasks.map(normaliseTask))
    }
  }, [rawTasks])

  const [focusMode, setFocusMode]     = useState(false)
  const [viewMode, setViewMode]       = useState('timeline')
  const [hideCompleted, setHideCompleted] = useState(false)
  const [startDate, setStartDate]     = useState(initialStartDate || new Date().toISOString().split('T')[0])
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [selectedPhase, setSelectedPhase]   = useState(null)
  const [celebrated, setCelebrated]   = useState({ 25: false, 50: false, 75: false, 100: false })
  const [microMsg, setMicroMsg]       = useState(null)
  const [showTodayOnly, setShowTodayOnly] = useState(false)
  const [conflictModal, setConflictModal] = useState(null)

  // ── Task mutations ───────────────────────────────────────────────────────────
  const toggleTask      = useCallback((id) => {
    setTasks(p => p.map(t => {
      if (t.id === id) {
        const nextDone = !t.done
        if (approved) onStatusChange?.(id, t.done ? 'completed' : 'pending')
        return { ...t, done: nextDone }
      }
      return t
    }))
  }, [approved, onStatusChange])
  const editTaskTitle   = useCallback((id, title) => setTasks(p => p.map(t => t.id === id ? {...t, title} : t)), [])
  const editTaskPriority = useCallback((id, priority) =>
    setTasks(p => p.map(t => t.id === id ? { ...t, priority } : t)),
  [])
  const editTaskDays     = useCallback((id, days) => setTasks(p => p.map(t => t.id === id ? {...t, suggested_due_offset_days: days} : t)), [])
  const deleteTask      = useCallback((id) => setTasks(p => p.filter(t => t.id !== id)), [])
  
  const toggleSubtask   = useCallback((tid, sid) => {
    setTasks(p => p.map(t => {
      if (t.id !== tid) return t
      const updatedSubs = t.subtasks.map(s => {
        if (s.id === sid) {
          const nextDone = !s.done
          if (approved) onStatusChange?.(sid, s.done ? 'completed' : 'pending', true)
          return { ...s, done: nextDone }
        }
        return s
      })
      return { ...t, subtasks: updatedSubs }
    }))
  }, [approved, onStatusChange])
  const editSubtask     = useCallback((tid, sid, title) => setTasks(p => p.map(t => t.id !== tid ? t : {...t, subtasks: t.subtasks.map(s => s.id === sid ? {...s, title} : s)})), [])
  const editSubtaskPriority = useCallback((tid, sid, priority) =>
    setTasks(p => p.map(t => {
      if (t.id !== tid) return t
      const updatedSubs = t.subtasks.map(s => s.id === sid ? { ...s, priority } : s)
      return { ...t, subtasks: updatedSubs }
    })),
  [])
  const editSubtaskDays     = useCallback((tid, sid, days) => setTasks(p => p.map(t => t.id !== tid ? t : {...t, subtasks: t.subtasks.map(s => s.id === sid ? {...s, suggested_due_offset_days: days} : s)})), [])
  const addSubtask      = useCallback((tid, title) => setTasks(p => p.map(t => t.id !== tid ? t : {...t, subtasks: [...t.subtasks, {id: nextId(), title, priority: 3, suggested_due_offset_days: 0, done: false}]})), [])
  const deleteSubtask   = useCallback((tid, sid) => setTasks(p => p.map(t => t.id !== tid ? t : {...t, subtasks: t.subtasks.filter(s => s.id !== sid)})), [])

  const reorderSubtasks = useCallback((tid, newOrder) =>
    setTasks(p => p.map(t => t.id !== tid ? t : { ...t, subtasks: newOrder })),
  [])

  const handleScheduledDateChange = useCallback(async (taskId, newDate) => {
    try {
      if (!approved) {
        // Just update local state for proposal
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, scheduled_date: newDate } : t))
        return
      }

      const result = await updateTaskScheduledDate(taskId, newDate)
      
      if (result.has_conflict) {
        setConflictModal({
          task: tasks.find(t => t.id === taskId),
          conflictingTasks: result.conflicting_tasks,
          proposedDate: newDate
        })
      } else {
        // Update local state with confirmed date from backend
        setTasks(prev => prev.map(t => t.id === taskId ? { 
          ...t, 
          scheduled_date: result.task.scheduled_date,
          has_scheduling_conflict: false
        } : t))
      }
    } catch (err) {
      console.error("Failed to update task date:", err)
    }
  }, [approved, tasks])

  const handleResolveConflict = useCallback(async (resolution) => {
    if (!conflictModal) return
    
    try {
      const result = await resolveTaskConflict(
        conflictModal.task.id,
        resolution,
        conflictModal.proposedDate
      )
      
      // Update local tasks
      setTasks(prev => prev.map(t => t.id === conflictModal.task.id ? {
        ...t,
        scheduled_date: result.scheduled_date,
        has_scheduling_conflict: false
      } : t))
      
      setConflictModal(null)
    } catch (err) {
      console.error("Failed to resolve conflict:", err)
    }
  }, [conflictModal])

  const recommendedId  = tasks
    .filter(t => !t.done)
    .sort((a,b) => (a.priority ?? 5) - (b.priority ?? 5))[0]?.id

  const title = data.display_title || data.title
  const { color, colorName } = getEventVisuals(title)

  const canonicalMap = new Map()
  const normalisedTasks = tasks.map(t => {
    if (viewMode === 'phase') return t
    const raw = t.phase_title || 'General'
    const key = canonicalPhase(raw)
    if (!canonicalMap.has(key)) canonicalMap.set(key, raw)
    return { ...t, phase_title: canonicalMap.get(key) }
  })

  // Derive phases/categories for the strip
  const phases = (() => {
    if (viewMode === 'phase') {
      const cats = [...new Set(normalisedTasks.map(t => t.category))]
      return CATEGORY_ORDER.filter(c => cats.includes(c))
    } else {
      const pMap = {}
      normalisedTasks.forEach(t => {
        const p = t.phase_title || 'General'
        const d = t.suggested_due_offset_days ?? 999
        if (pMap[p] === undefined || d < pMap[p]) pMap[p] = d
      })
      return Object.keys(pMap).sort((a, b) => pMap[a] - pMap[b])
    }
  })()

  const visibleTasks   = hideCompleted ? normalisedTasks.filter(t => !t.done) : normalisedTasks
  const todayOnlyTasks = showTodayOnly ? visibleTasks.filter(t => (t.suggested_due_offset_days || 0) <= 0) : visibleTasks;
  const phaseFiltered = selectedPhase ? todayOnlyTasks.filter(t => (viewMode === 'phase' ? t.category : t.phase_title) === selectedPhase) : todayOnlyTasks

  const displayTasks   = (() => {
    if (viewMode === 'timeline') {
      return [...phaseFiltered].sort((a, b) => (a.suggested_due_offset_days || 0) - (b.suggested_due_offset_days || 0) || (a.priority || 5) - (b.priority || 5))
    } else {
      return [...phaseFiltered].sort((a, b) => {
        const catA = CATEGORY_ORDER.indexOf(a.category)
        const catB = CATEGORY_ORDER.indexOf(b.category)
        if (catA !== catB) return catA - catB
        return (a.suggested_due_offset_days || 0) - (b.suggested_due_offset_days || 0) || (a.priority || 5) - (b.priority || 5)
      })
    }
  })()

  const allTasksCount  = tasks.length
  
  // High-resolution progress calculation
  const calculateTaskProgressRaw = (t) => {
    if (t.done) return 100
    const subs = t.subtasks || []
    if (subs.length === 0) return 0
    const doneCount = subs.filter(s => s.done).length
    return (doneCount / subs.length) * 100
  }

  const overallProgress = allTasksCount > 0 
    ? Math.round(tasks.reduce((acc, t) => acc + calculateTaskProgressRaw(t), 0) / allTasksCount) 
    : 0

  const completedCount = tasks.filter(t => t.done).length
  
  // Trigger celebrations
  if (overallProgress >= 100 && !celebrated[100] && allTasksCount > 0) {
    setCelebrated(prev => ({ ...prev, 100: true }))
  } else if (overallProgress >= 75 && !celebrated[75]) {
    setMicroMsg({ text: "Final Stretch! 🛡️", color: 'var(--emerald)' })
    setCelebrated(prev => ({ ...prev, 75: true }))
    setTimeout(() => setMicroMsg(null), 4000)
  } else if (overallProgress >= 50 && !celebrated[50]) {
    setMicroMsg({ text: "Halfway Secured! 🏚️", color: 'var(--amber)' })
    setCelebrated(prev => ({ ...prev, 50: true }))
    setTimeout(() => setMicroMsg(null), 4000)
  } else if (overallProgress >= 25 && !celebrated[25]) {
    setMicroMsg({ text: "Strong Start! 🚀", color: '#0EA5E9' })
    setCelebrated(prev => ({ ...prev, 25: true }))
    setTimeout(() => setMicroMsg(null), 4000)
  }

  const getCategoryProgress = (catTitle) => {
    const catTasks = tasks.filter(t => (viewMode === 'phase' ? t.category : (t.phase_title || 'General')) === (catTitle || 'General'))
    const progressSum = catTasks.reduce((acc, t) => acc + calculateTaskProgressRaw(t), 0)
    return {
      pct: catTasks.length > 0 ? Math.round(progressSum / catTasks.length) : 0,
      total: catTasks.length
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(16px)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--space-4)',
        border: '1.5px solid rgba(255,255,255,0.06)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 32 }}>
        <div style={{ flex: 1 }}>
          <p className="font-mono" style={{ fontSize: 10, color: 'var(--sage)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
            SECTION 02 // ROUTE MAP
          </p>
          <h2 className="font-playfair" style={{ fontSize: 32, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.1 }}>
            Strategic Roadmap
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '8px 0 0 0', fontWeight: 400, opacity: 0.8 }}>
            {completedCount} of {allTasksCount} steps secured ({overallProgress}%)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
             {[
               { id: 'timeline', label: 'Timeline', icon: <Clock size={16} />, color: 'var(--emerald)' },
               { id: 'phase', label: 'Category', icon: <Layers size={16} />, color: 'var(--amber)' },
               approved && { id: 'today', label: 'Today', icon: <Focus size={16} />, color: 'var(--amber)' }
             ].filter(Boolean).map(v => {
               const isCurrent = (v.id === 'today' && showTodayOnly) || (v.id === viewMode && !showTodayOnly)
               return (
                 <button
                   key={v.id}
                   onClick={() => { 
                     if (v.id === 'today') { 
                       setShowTodayOnly(true); 
                       setSelectedPhase(null);
                     } else { 
                       setViewMode(v.id); 
                       setShowTodayOnly(false); 
                     }
                   }}
                   style={{
                     padding: '10px 18px',
                     fontSize: 13,
                     fontWeight: 700,
                     display: 'flex',
                     alignItems: 'center',
                     gap: 8,
                     borderRadius: 10,
                     background: isCurrent ? 'rgba(255,255,255,0.1)' : 'transparent',
                     color: isCurrent ? v.color : 'var(--muted)',
                     border: 'none',
                     cursor: 'pointer',
                     transition: 'all 0.2s ease'
                   }}
                 >
                   {v.icon} {v.label}
                 </button>
               )
             })}
          </div>

          {approved && (
            <button
              onClick={() => setFocusMode(f => !f)}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 10,
                background: focusMode ? 'var(--amber)' : 'rgba(255,255,255,0.04)',
                color: focusMode ? 'black' : 'white',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Focus size={16} /> Focus
            </button>
          )}
          
          {approved && (
            <button
              onClick={() => setHideCompleted(h => !h)}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {hideCompleted ? <EyeOff size={16} /> : <Eye size={16} />} 
              {hideCompleted ? 'Show all' : 'Hide done'}
            </button>
          )}
        </div>
      </div>

      <div style={{
         position: 'relative',
         paddingLeft: 28,
         marginBottom: 20
      }}>
        {phases.length > 0 && (
          <PhaseStrip
            phases={phases}
            tasks={tasks}
            selectedPhase={selectedPhase}
            onSelectPhase={setSelectedPhase}
            viewMode={viewMode}
            themeColor={color}
            themeColorName={colorName}
          />
        )}


         <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
               <div>
                  <h4 className="font-mono" style={{ fontSize: 12, fontWeight: 800, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0, opacity: 0.9 }}>
                     Event Progress
                  </h4>
                  <motion.p 
                     key={overallProgress}
                     initial={{ scale: 0.98, opacity: 0.8 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="font-playfair" 
                     style={{ fontSize: 32, fontWeight: 900, color: 'white', margin: '4px 0 0 0', lineHeight: 1.1 }}
                   >
                     {overallProgress}% Roadmap complete
                  </motion.p>
               </div>
               <span className="font-mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--amber)', alignSelf: 'flex-end', marginBottom: 2 }}>
                  {completedCount} / {allTasksCount}
               </span>
            </div>
            
            <div style={{ position: 'relative' }}>
               <AnimatePresence>
                 {microMsg && (
                   <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.8 }}
                     animate={{ opacity: 1, y: -45, scale: 1 }}
                     exit={{ opacity: 0, y: -60, scale: 0.8 }}
                     style={{
                       position: 'absolute',
                       right: 0,
                       background: 'rgba(255,255,255,0.05)',
                       backdropFilter: 'blur(10px)',
                       border: `1px solid ${microMsg.color}`,
                       padding: '6px 14px',
                       borderRadius: 20,
                       zIndex: 50,
                       pointerEvents: 'none',
                       boxShadow: `0 4px 15px ${microMsg.color}33`
                     }}
                   >
                     <span className="font-mono" style={{ fontSize: 11, fontWeight: 800, color: 'white', whiteSpace: 'nowrap' }}>
                       {microMsg.text}
                     </span>
                   </motion.div>
                 )}
               </AnimatePresence>

               <div style={{ height: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${overallProgress}%` }}
                     transition={{ duration: 1, ease: "circOut" }}
                     style={{ 
                       height: '100%', 
                       background: 'var(--amber)',
                       boxShadow: '0 0 15px rgba(212, 124, 63, 0.3)'
                     }} 
                  />
               </div>
            </div>
         </div>

         <AnimatePresence>
            {overallProgress >= 100 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', inset: 0, zIndex: 100,
                  background: 'rgba(13, 26, 21, 0.8)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center', pointerEvents: 'auto', borderRadius: 24
                }}
              >
                <motion.div
                  initial={{ y: 20 }} animate={{ y: 0 }}
                  transition={{ type: 'spring', damping: 12 }}
                  style={{ position: 'relative', zIndex: 10 }}
                >
                  <div style={{ fontSize: 60, marginBottom: 10 }}>🎉</div>
                  <h2 className="font-playfair" style={{ fontSize: 42, fontWeight: 800, color: 'white', margin: 0, textShadow: '0 0 20px rgba(255,191,0,0.3)' }}>
                    Mission Accomplished!
                  </h2>
                  <p style={{ color: 'var(--sage)', fontSize: 16, marginTop: 12, maxWidth: 320, opacity: 0.9 }}>
                    You've successfully secured every milestone of your roadmap.
                  </p>
                  <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                    <button 
                      onClick={() => setCelebrated(prev => ({ ...prev, 100: true }))} 
                      className="mbtn"
                      style={{ 
                        padding: '14px 40px', 
                        fontSize: 16, 
                        background: 'var(--amber)',
                        color: 'black',
                        fontWeight: 700 
                      }}
                    >
                      Awesome!
                    </button>
                    <button 
                      onClick={() => {
                        setCelebrated(prev => ({ ...prev, 100: true }));
                        onNavigate?.('saved');
                      }} 
                      className="btn-cust"
                      style={{ 
                        padding: '14px 24px', 
                        fontSize: 14, 
                        borderColor: 'var(--amber)',
                        color: 'var(--amber)',
                        fontWeight: 700 
                      }}
                    >
                      View Event History
                    </button>
                  </div>
                </motion.div>
                
                {/* Decorative particles */}
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{ 
                      x: (Math.random() - 0.5) * 600, 
                      y: (Math.random() - 0.5) * 600,
                      opacity: 0,
                      rotate: Math.random() * 360
                    }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    style={{
                      position: 'absolute', width: 8, height: 8, 
                      background: i % 2 === 0 ? 'var(--amber)' : 'var(--emerald)',
                      borderRadius: i % 3 === 0 ? '50%' : '2px'
                    }}
                  />
                ))}
              </motion.div>
            )}
         </AnimatePresence>

         {/* ── Approval banner ────────────────────────────────────────────────── */}
         {!approved && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24, padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.14)' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--fog)', flex: 1, margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                  Look through the tasks below. Mark completed ones, adjust anything if needed, then approve to start tracking your progress.
                </p>
                <div style={{ display: 'flex', gap: 7, flexShrink: 0, alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!approved) setShowStartPicker(!showStartPicker);
                      }}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: 8, 
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                        padding: '4px 12px', borderRadius: 8, height: 32, 
                        cursor: approved ? 'default' : 'pointer', minWidth: 140 
                      }}
                    >
                      <Calendar size={12} color="var(--emerald)" />
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Start:</span>
                      <span style={{ color: 'white', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {startDate ? new Date(startDate).toLocaleDateString('en-GB').replace(/\//g, '-') : 'dd-mm-yyyy'}
                      </span>
                    </div>
                    
                    <AnimatePresence>
                      {showStartPicker && (
                        <div style={{ position: 'absolute', bottom: '100%', right: 0, zIndex: 1000, marginBottom: 10 }}>
                          <div 
                            style={{ position: 'fixed', inset: 0, zIndex: -1 }} 
                            onClick={() => setShowStartPicker(false)} 
                          />
                          <CustomDarkCalendar 
                            selectedDate={startDate ? new Date(startDate) : new Date()}
                            onSelect={(date) => {
                              const isoStr = date.toISOString().split('T')[0]
                              setStartDate(isoStr)
                              setShowStartPicker(false)
                            }}
                            onClose={() => setShowStartPicker(false)}
                            style={{ bottom: '0', top: 'auto', marginBottom: 12 }}
                          />
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={() => onRegenerate?.()}
                    title="Start Over completely"
                    className="btn-cust restart-btn-hover"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6,
                      background: 'rgba(212,124,63,0.05)', 
                      border: '1px solid rgba(212,124,63,0.3)',
                      padding: '8px 20px', 
                      borderRadius: 10, 
                      fontSize: 13, 
                      fontWeight: 700,
                      color: 'var(--amber)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Restart
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                    onClick={() => onApprove?.(tasks, startDate)}
                    disabled={approving}
                    className="mbtn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 24px', borderRadius: 14,
                      background: 'linear-gradient(135deg, var(--amber) 0%, #E68A5C 100%)',
                      border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
                      opacity: approving ? 0.7 : 1, cursor: approving ? 'wait' : 'pointer',
                      boxShadow: '0 4px 15px rgba(212,123,73,0.3)'
                    }}
                  >
                    {approving
                      ? <><Loader2 size={12} className="animate-spin"/> Packing...</>
                      : <><Play size={12} fill="white"/> Approve & Start</>
                    }
                  </motion.button>
                </div>
              </div>
            </div>
         )}

         {/* Approved badge */}
         {approved && (
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
               style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', borderRadius:14, marginBottom:28, background:'rgba(92,140,117,0.18)', border:'1px solid rgba(92,140,117,0.35)', boxShadow: '0 0 20px rgba(92,140,117,0.1)' }}
            >
               <div style={{ background: 'var(--sage)', borderRadius: '50%', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <CheckCircle2 size={18} color="black"/>
               </div>
               <div style={{ flex: 1 }}>
                  <p style={{fontSize:14, fontWeight:700, color:'white', margin: 0}}>Event successfully secured!</p>
                  <p style={{fontSize:12, color:'var(--sage)', margin: '2px 0 0 0', opacity: 0.9}}>This roadmap has been added to your <strong>Saved Plans</strong> for permanent tracking.</p>
               </div>
               <button 
                 onClick={() => onNavigate?.('saved')}
                 className="btn-cust"
                 style={{ fontSize: 11, padding: '6px 16px', borderColor: 'var(--sage)', color: 'var(--sage)', fontWeight: 800 }}
               >
                 View Event History
               </button>
            </motion.div>
         )}
      </div>

      <AnimatePresence>
        {focusMode && <FocusModePanel tasks={tasks} />}
      </AnimatePresence>

      {!focusMode && (
         <div>
            {visibleTasks.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
                {hideCompleted ? 'All tasks complete! 🎉' : 'No tasks to display.'}
              </p>
            ) : (() => {
               const isCategoryMode = viewMode === 'phase';
               
               if (!isCategoryMode) {
                 const dayGroups = []
                 displayTasks.forEach(t => {
                   const d = t.suggested_due_offset_days ?? 0
                   if (!dayGroups.length || dayGroups[dayGroups.length - 1].day !== d) {
                     dayGroups.push({ day: d, tasks: [t] })
                   } else {
                     dayGroups[dayGroups.length - 1].tasks.push(t)
                   }
                 })

                 return (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: 0 }}>
                     {dayGroups.map((group, gIdx) => (
                       <div key={`${group.day}-${gIdx}`} style={{ position: 'relative' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                           <span className="font-mono" style={{ fontSize: 11, fontWeight: 900, color: 'var(--sage)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                             Day {group.day}
                           </span>
                           <div style={{ flex: 1, height: 1, background: 'rgba(92,140,117,0.1)' }} />
                         </div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                           {group.tasks.map((task, tIdx) => (
                             <TaskItem
                               key={task.id} task={task} index={tIdx} isRecommended={task.id === recommendedId}
                               hideCompleted={hideCompleted} onToggleDone={toggleTask} onEditTitle={editTaskTitle}
                               onEditPriority={editTaskPriority} onEditDays={editTaskDays} onDeleteTask={deleteTask}
                               onToggleSubtask={toggleSubtask} onEditSubtask={editSubtask} onEditSubtaskPriority={editSubtaskPriority}
                               onEditSubtaskDays={editSubtaskDays} onAddSubtask={addSubtask} onDeleteSubtask={deleteSubtask}
                               onReorderSubtasks={reorderSubtasks}
                               onEditScheduledDate={handleScheduledDateChange}
                               startDate={startDate}
                             />
                           ))}
                         </div>
                       </div>
                     ))}
                   </div>
                 )
               }

               // Category View - Grouped into Unified Cards
               const phaseGroups = [];
               displayTasks.forEach(task => {
                 const groupKey = viewMode === 'phase' ? task.category : (task.phase_title || 'General');
                 const last = phaseGroups[phaseGroups.length - 1];
                 if (last && last.phase === groupKey) {
                   last.tasks.push(task);
                 } else {
                   phaseGroups.push({ phase: groupKey, tasks: [task] });
                 }
               });

               return (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingLeft: 30, position: 'relative' }}>
                   <div style={{ position: 'absolute', left: 17, top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, zIndex: 1 }} />
                   
                   {phaseGroups.map((group, gIdx) => {
                     const { phase, tasks: gTasks } = group;
                     const progress = getCategoryProgress(phase);
                     
                     return (
                       <div key={`${phase}-${gIdx}`} style={{ position: 'relative' }}>
                         <div style={{
                           position: 'absolute', left: -24, top: 24, transform: 'translateY(-50%)',
                           width: 24, height: 24, borderRadius: '50%', background: 'var(--amber)',
                           display: 'flex', alignItems: 'center', justifyContent: 'center',
                           border: '3px solid var(--forest-card)', zIndex: 5,
                           boxShadow: '0 0 10px rgba(212,124,63,0.3)', opacity: 0.9
                         }}>
                           <ChevronsRight size={12} strokeWidth={3} color="black" />
                         </div>

                         <motion.div
                           initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                           transition={{ duration: 0.4, delay: gIdx * 0.1 }}
                           style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}
                         >
                           <div style={{ padding: '16px 20px', background: 'rgba(212,124,63,0.04)', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                             <span className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.8 }}>
                               {viewMode === 'phase' ? 'TASK CATEGORIES' : 'TIMELINE STAGE'}: {phase.replace(/_/g, ' ')}
                             </span>
                             <span className="font-mono" style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: 'var(--amber)', background: 'rgba(212, 124, 63, 0.08)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(212, 124, 63, 0.2)' }}>
                               {progress.pct}%
                             </span>
                           </div>

                           <div style={{ padding: '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                             <Reorder.Group
                               axis="y"
                               values={gTasks}
                               onReorder={(newOrder) => {
                                 setTasks(prev => {
                                   const groupIds = new Set(gTasks.map(t => t.id));
                                   const idToTask = new Map(prev.map(t => [t.id, t]));
                                   const reorderedGroup = newOrder.map(t => idToTask.get(t.id));
                                   const others = prev.filter(t => !groupIds.has(t.id));
                                   return [...others, ...reorderedGroup];
                                 });
                               }}
                             >
                               {gTasks.map((task, tIdx) => (
                                 <Reorder.Item key={`${task.id}-${tIdx}`} value={task} style={{ listStyle: 'none' }}>
                               <TaskItem
                                 key={task.id} task={task} index={tIdx} isRecommended={task.id === recommendedId}
                                 hideCompleted={hideCompleted} onToggleDone={toggleTask} onEditTitle={editTaskTitle}
                                 onEditPriority={editTaskPriority} onEditDays={editTaskDays} onDeleteTask={deleteTask}
                                 onToggleSubtask={toggleSubtask} onEditSubtask={editSubtask} onEditSubtaskPriority={editSubtaskPriority}
                                 onEditSubtaskDays={editSubtaskDays} onAddSubtask={addSubtask} onDeleteSubtask={deleteSubtask}
                                 onReorderSubtasks={reorderSubtasks}
                                 onEditScheduledDate={handleScheduledDateChange}
                                 startDate={startDate}
                               />
                                 </Reorder.Item>
                               ))}
                             </Reorder.Group>
                           </div>
                         </motion.div>
                       </div>
                     );
                   })}
                 </div>
               );
             })()
            }

         </div>
      )}

      <AnimatePresence>
        {conflictModal && (
          <ConflictResolutionModal
            task={conflictModal.task}
            conflictingTasks={conflictModal.conflictingTasks}
            proposedDate={conflictModal.proposedDate}
            onResolve={handleResolveConflict}
            onClose={() => setConflictModal(null)}
          />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </motion.div>
  )
}

function ConflictResolutionModal({ task, conflictingTasks, proposedDate, onResolve, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          background: 'var(--forest-card)', padding: 32, borderRadius: 24,
          maxWidth: 500, width: '100%', border: '1px solid rgba(255,191,0,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, color: 'var(--amber)' }}>
          <AlertTriangle size={24} />
          <h3 className="font-playfair" style={{ fontSize: 24, margin: 0, color: 'white' }}>Scheduling Clash</h3>
        </div>
        
        <p style={{ color: 'var(--fog)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Planning "<strong>{task.title}</strong>" for <strong>{new Date(proposedDate).toLocaleDateString()}</strong> creates conflicts with your existing schedule.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Conflicting Items</span>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {conflictingTasks.map(ct => (
              <div key={ct.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'white' }}>
                 <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--coral)' }} />
                 {ct.title}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button 
            onClick={() => onResolve('reschedule_others')}
            className="mbtn"
            style={{ width: '100%', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(92,140,117,0.15)', border: '1px solid var(--sage)', color: 'var(--sage)' }}
          >
            Move others to next available day <ArrowRight size={16} />
          </button>
          <button 
            onClick={() => onResolve('reschedule_current')}
            className="mbtn"
            style={{ width: '100%', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(212,124,63,0.15)', border: '1px solid var(--amber)', color: 'var(--amber)' }}
          >
            Move this task to next open slot <ArrowRight size={16} />
          </button>
          <button 
            onClick={() => onResolve('accept_conflict')}
            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: 8, textDecoration: 'underline' }}
          >
            Accept conflict and keep both
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
