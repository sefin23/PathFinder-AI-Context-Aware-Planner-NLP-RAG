import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar as CalendarIcon, Trash2, FileText, Upload, Check, GripVertical, X, Plus } from 'lucide-react'
import DatePill from './DatePill'

const PRIORITY_COLORS = {
  1: 'var(--coral)',
  2: 'var(--amber)',
  3: 'var(--gold)',
  4: 'var(--sage)',
  5: 'var(--muted)',
}
const PRIORITY_LABELS = { 1: 'CRITICAL', 2: 'HIGH', 3: 'MED', 4: 'LOW', 5: 'OPT' }

export default function JourneyTaskCard({
  task,
  editMode = false,
  onToggleDone,
  onEditPriority,
  onOpenGuide,
  onNavigate,
  onEditDays,
  onEditScheduledDate,
  onDeleteTask,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onOpenPlanner,
  startDate,
}) {
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')

  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[3]
  const priorityLabel = PRIORITY_LABELS[task.priority] || `P${task.priority}`

  const hasDocuments = task.required_docs && task.required_docs.length > 0
  const hasSubtasks = task.subtasks && task.subtasks.length > 0

  const rgbMap = {
    1: '216,110,110',
    2: '212,124,63',
    3: '201,168,76',
    4: '92,140,117',
    5: '148,163,184',
  }
  const priorityRgb = rgbMap[task.priority] || rgbMap[3]

  function commitSubtask() {
    const title = newSubtask.trim()
    if (title) onAddSubtask?.(task.id, title)
    setNewSubtask('')
    setAddingSubtask(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      style={{
        background: task.done ? 'rgba(10,20,15,0.3)' : 'var(--forest-card)',
        borderRadius: 8,
        border: `1px solid ${task.done ? 'rgba(92,140,117,0.15)' : 'rgba(255,255,255,0.07)'}`,
        borderLeft: `6px solid ${task.done ? 'rgba(92,140,117,0.3)' : priorityColor}`,
        marginBottom: 12,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        transition: 'border-color 0.2s',
      }}
    >
      {/* ── Main Task Row ──────────────────────────────────────────── */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Drag handle (edit mode only) */}
        {editMode && (
          <div style={{ color: 'rgba(255,255,255,0.2)', cursor: 'grab', flexShrink: 0, display: 'flex' }}>
            <GripVertical size={16} />
          </div>
        )}

        {/* Priority badge — TaskItem style with popup picker */}
        <div
          style={{ position: 'relative', flexShrink: 0 }}
          onClick={() => editMode && setShowPriorityMenu(m => !m)}
        >
          <div
            className="font-mono"
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '4px 8px', borderRadius: 6,
              background: `rgba(${priorityRgb},0.1)`,
              color: priorityColor,
              fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
              cursor: editMode ? 'pointer' : 'default',
              borderLeft: `3px solid ${priorityColor}`,
              minWidth: 44, textAlign: 'center',
              transition: 'all 0.2s',
              userSelect: 'none',
            }}
          >
            {priorityLabel}
          </div>

          <AnimatePresence>
            {showPriorityMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
                  background: 'rgba(8,18,12,0.97)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: 4, display: 'flex', gap: 2,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
                onClick={e => e.stopPropagation()}
              >
                {[1, 2, 3, 4, 5].map(p => (
                  <button
                    key={p}
                    onClick={() => { onEditPriority?.(task.id, p); setShowPriorityMenu(false) }}
                    style={{
                      background: task.priority === p ? PRIORITY_COLORS[p] : 'transparent',
                      border: 'none', borderRadius: 4, width: 28, height: 22, cursor: 'pointer',
                      color: task.priority === p ? '#0a1a0f' : PRIORITY_COLORS[p],
                      fontSize: 9, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace",
                      transition: 'all 0.15s',
                    }}
                  >
                    P{p}
                  </button>
                ))}
                <button
                  onClick={() => setShowPriorityMenu(false)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                >
                  <X size={10} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Circle checkbox */}
        <button
          onClick={() => onToggleDone?.(task.id)}
          style={{
            width: 22, height: 22, borderRadius: '50%',
            border: `2px solid ${task.done ? 'var(--sage)' : 'rgba(255,255,255,0.25)'}`,
            background: task.done ? 'var(--sage)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0, flexShrink: 0,
            transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)',
            transform: task.done ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          {task.done && <Check size={11} color="var(--forest-deep)" strokeWidth={3} />}
        </button>

        {/* Title + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            color: task.done ? 'var(--muted)' : 'white',
            fontSize: 15, fontWeight: 800,
            fontFamily: "'DM Sans', sans-serif",
            textDecoration: task.done ? 'line-through' : 'none',
            display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.2,
          }}>
            {task.title}
          </span>
          {task.description && !task.done && (
            <span style={{
              fontSize: 12, 
              color: 'var(--fog)', 
              display: '-webkit-box', 
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              marginTop: 6,
              lineHeight: '1.6',
              overflow: 'hidden', 
              opacity: 0.8
            }}>
              {task.description}
            </span>
          )}
        </div>

        {/* Day Offset */}
        {task.suggested_due_offset_days != null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
            background: 'rgba(255,255,255,0.03)', borderRadius: 8,
            padding: '3px 8px', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Day</span>
            <input
              type="number" min="0"
              value={task.suggested_due_offset_days}
              onChange={e => onEditDays?.(task.id, parseInt(e.target.value) || 0)}
              className="font-mono"
              style={{ width: 32, background: 'transparent', border: 'none', color: 'white', fontSize: 11, fontWeight: 700, textAlign: 'center', outline: 'none' }}
            />
          </div>
        )}

        {/* Scheduled Date */}
        {(task.scheduled_date || onEditScheduledDate) && (
          <DatePill
            date={task.scheduled_date}
            onDateChange={newDate => onEditScheduledDate?.(task.id, newDate)}
            editable={!!onEditScheduledDate}
            hasConflict={task.has_scheduling_conflict}
            minDate={startDate}
          />
        )}

        {/* Delete button — visible in edit mode */}
        {editMode && (
          <button
            onClick={() => onDeleteTask?.(task.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--coral)', display: 'flex', padding: 4, opacity: 0.6, flexShrink: 0, transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* ── Documents & Subtasks ───────────────────────────────────── */}
      {(hasDocuments || hasSubtasks || editMode) && !task.done && (
        <div style={{ padding: '0 18px 4px 64px', marginTop: -4 }}>

          {/* Required Documents */}
          {hasDocuments && (
            <div style={{ marginTop: 12 }}>
              <div className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Required Documents:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {task.required_docs.map((doc, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', background: 'rgba(255,255,255,0.02)',
                    borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <FileText size={13} color={doc.has ? 'var(--sage)' : 'rgba(255,255,255,0.3)'} />
                    <span style={{ flex: 1, fontSize: 12, color: doc.has ? 'var(--sage)' : 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                      {doc.name}
                    </span>
                    {doc.has ? (
                      <span style={{ fontSize: 9, color: 'var(--sage)', fontWeight: 700, padding: '2px 8px', background: 'rgba(92,140,117,0.15)', borderRadius: 4 }}>
                        from vault
                      </span>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); onNavigate?.('vault') }}
                        style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700, padding: '4px 10px', background: 'rgba(212,124,63,0.1)', border: '1px solid rgba(212,124,63,0.25)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Upload size={11} /> Upload
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          {hasSubtasks && (
            <div style={{ marginTop: hasDocuments ? 14 : 12 }}>
              <div className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Subtasks:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {task.subtasks.map(subtask => (
                  <div
                    key={subtask.id}
                    onClick={() => onToggleSubtask?.(task.id, subtask.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '5px 8px 5px 10px',
                      borderLeft: `2px solid ${subtask.done ? 'var(--sage)' : 'rgba(212,124,63,0.3)'}`,
                      borderRadius: '0 4px 4px 0',
                      background: 'rgba(255,255,255,0.01)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: `2px solid ${subtask.done ? 'var(--sage)' : 'rgba(255,255,255,0.2)'}`,
                      background: subtask.done ? 'var(--sage)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      transition: 'all 0.2s',
                    }}>
                      {subtask.done && <Check size={8} color="var(--forest-deep)" strokeWidth={3} />}
                    </div>
                    <span style={{
                      flex: 1, fontSize: 12,
                      color: subtask.done ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                      textDecoration: subtask.done ? 'line-through' : 'none',
                    }}>
                      {subtask.title}
                    </span>
                    {editMode && (
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteSubtask?.(task.id, subtask.id) }}
                        style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', opacity: 0.45, padding: 2, display: 'flex', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add subtask (edit mode) */}
          {editMode && (
            <div style={{ marginTop: 8, marginBottom: 4 }}>
              {addingSubtask ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    autoFocus
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitSubtask()
                      if (e.key === 'Escape') { setNewSubtask(''); setAddingSubtask(false) }
                    }}
                    placeholder="New step..."
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 6, padding: '6px 10px', color: 'white',
                      fontSize: 12, outline: 'none', fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  <button
                    onClick={commitSubtask}
                    style={{ background: 'var(--amber)', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#0a1a0f', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setNewSubtask(''); setAddingSubtask(false) }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingSubtask(true)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0',
                    transition: 'color 0.2s', fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--amber)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                >
                  <Plus size={12} /> Add Step
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Action Bar (active task) ───────────────────────────────── */}
      {!task.done && (
        <div style={{ padding: '10px 18px 16px' }}>
          <div style={{ display: 'flex', gap: 8 }}>

            {/* Guide me through this */}
            <button
              onClick={() => onOpenGuide?.(task)}
              style={{
                flex: 2, padding: '10px 14px',
                background: 'rgba(240,169,107,0.05)', border: '1px solid rgba(240,169,107,0.3)',
                borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(240,169,107,0.12)'; e.currentTarget.style.borderColor = 'rgba(240,169,107,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(240,169,107,0.05)'; e.currentTarget.style.borderColor = 'rgba(240,169,107,0.3)' }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f0a96b', display: 'flex', alignItems: 'center', gap: 6 }}>
                🧭 Guide me through this →
              </span>
            </button>

            {/* Schedule (inline planner trigger) */}
            <button
              onClick={() => onOpenPlanner?.(task)}
              title="Open daily planner"
              style={{
                padding: '10px 12px', flexShrink: 0,
                background: task.has_scheduling_conflict ? 'rgba(198,93,74,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${task.has_scheduling_conflict ? 'rgba(198,93,74,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = task.has_scheduling_conflict ? 'rgba(198,93,74,0.1)' : 'rgba(255,255,255,0.04)'}
            >
              <CalendarIcon size={14} color={task.has_scheduling_conflict ? 'var(--coral)' : 'var(--amber)'} />
              <span className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: task.has_scheduling_conflict ? 'var(--coral)' : 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>
                {task.has_scheduling_conflict ? 'CLASH' : 'SCHEDULE'}
              </span>
            </button>

            {/* Mark done */}
            <button
              onClick={() => onToggleDone?.(task.id)}
              style={{
                flex: 1, padding: '10px 14px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: 'rgba(255,255,255,0.7)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              ✓ Mark done
            </button>
          </div>
        </div>
      )}

      {/* ── Completed state ────────────────────────────────────────── */}
      {task.done && (
        <div style={{ padding: '10px 18px 16px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 2, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>🧭 Guide me through this →</span>
            </div>
            <div style={{ flex: 1, padding: '10px 14px', background: 'rgba(92,140,117,0.1)', border: '1px solid rgba(92,140,117,0.3)', borderRadius: 10, color: 'var(--sage)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.8 }}>
              ✓ Completed
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
