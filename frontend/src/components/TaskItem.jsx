/**
 * TaskItem — an expandable task card with subtask hierarchy.
 * Dark Forest styling with spring-bounce checkboxes.
 */
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronDown, Sparkles, Trash2, Zap, X } from 'lucide-react'
import SubtaskList from './SubtaskList'
import TaskProgressBar from './TaskProgressBar'
import DatePill from './DatePill'

const PRIORITY_COLORS = { 1: 'var(--coral)', 2: 'var(--amber)', 3: 'var(--gold)', 4: 'var(--sage)', 5: 'var(--muted)' }
const PRIORITY_LABELS = { 1: 'URGENT', 2: 'HIGH', 3: 'MED', 4: 'LOW', 5: 'OPT' }

export default function TaskItem({
  task,
  index = 0,
  isRecommended = false,
  hideCompleted = false,
  onToggleDone,
  onEditTitle,
  onEditPriority,
  onEditDays,
  onEditScheduledDate,
  onDeleteTask,
  onToggleSubtask,
  onEditSubtask,
  onEditSubtaskPriority,
  onEditSubtaskDays,
  onAddSubtask,
  onDeleteSubtask,
  onReorderSubtasks,
  startDate,
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  if (!task) return null
  if (hideCompleted && task.done) return null

  const subtasks = task.subtasks ?? []
  const completedSubs = subtasks.filter((s) => s.done).length
  const priorityColor = PRIORITY_COLORS[task.priority] ?? 'var(--fog)'

  const commitEdit = () => {
    const t = draft.trim()
    if (t && t !== task.title) onEditTitle?.(task.id, t)
    setEditing(false)
  }

  const handleHeaderClick = (e) => {
    if (e.target.closest('[data-no-expand]')) return
    setExpanded(prev => !prev)
  }

  return (
    <motion.div
      className={task.done ? "task-row done" : "task-row"}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 0,
        padding: 0,
        background: 'var(--forest-card)',
        border: 'none',
        borderLeft: `6px solid ${task.done ? '#ddd' : priorityColor}`,
        borderRadius: '4px',
        marginBottom: 0,
        padding: 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'visible',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        position: 'relative'
      }}
    >
      {/* Task header row */}
      <div
        onClick={handleHeaderClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '18px 18px',
          cursor: subtasks.length > 0 ? 'pointer' : 'default',
        }}
        className="group"
      >
        {/* Expand toggle */}
        <button
          data-no-expand
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#999',
            display: 'flex',
            padding: 2,
            flexShrink: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'white'}}
          onMouseLeave={e => { e.currentTarget.style.color = '#999'}}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* Priority badge */}
        <div
          data-no-expand
          title={`Priority ${task.priority}${task.urgency_score ? ` (Urgency: ${task.urgency_score})` : ''} - Click to cycle`}
          onClick={() => {
            const nextP = task.priority >= 5 ? 1 : task.priority + 1
            onEditPriority?.(task.id, nextP)
          }}
          className="font-mono"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 'var(--r-sm)',
            background: `rgba(${
              task.priority === 1 ? '216,110,110' :
              task.priority === 2 ? '212,124,63' :
              task.priority === 3 ? '201,168,76' : 
              task.priority === 4 ? '92,140,117' :
              '148,163,184'
            }, 0.1)`,
            color: priorityColor,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.05em',
            flexShrink: 0,
            cursor: 'pointer',
            borderLeft: `3px solid ${priorityColor}`,
            minWidth: 40,
            textAlign: 'center',
            transition: 'all 0.2s'
          }}
        >
          {task.urgency_score > 70 && <Zap size={10} fill={priorityColor} stroke="none" />}
          {PRIORITY_LABELS[task.priority] || `P${task.priority}`}
        </div>

        {/* Done checkbox (Left side in new design) */}
        <button
          data-no-expand
          onClick={() => onToggleDone?.(task.id)}
          className="cb"
          style={{
            width: 24,
            height: 24,
            border: `2px solid var(--sage)`,
            borderRadius: 'var(--r-sm)',
            background: task.done ? 'var(--sage)' : 'transparent',
            flexShrink: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.25s cubic-bezier(.34, 1.56, .64, 1)',
            transform: task.done ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          {task.done && <span style={{ color: 'var(--forest-deep)', fontSize: 14, fontWeight: 700 }}>✓</span>}
        </button>

        {/* Task title */}
        <div style={{ flex: 1, minWidth: 0, marginLeft: 2 }}>
          {editing ? (
            <input
              aria-label="Task title draft"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 'var(--r-sm)',
                padding: '4px 10px',
                color: 'white',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 15,
                outline: 'none',
              }}
            />
          ) : (
            <span
              onClick={() => setEditing(true)}
              className="cbl"
              title="Click to edit"
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily: 'var(--font-heading)',
                color: task.done ? 'var(--muted)' : 'white',
                textDecoration: task.done ? 'line-through' : 'none',
                cursor: 'text',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s'
              }}
            >
              {task.title}
            </span>
          )}
          {/* Subtitle: description */}
          {task.description && !editing && (
            <span style={{ 
              fontSize: 13, 
              color: 'var(--fog)', 
              display: '-webkit-box', 
              WebkitLineClamp: 3, 
              WebkitBoxOrient: 'vertical', 
              marginTop: 8, 
              lineHeight: '1.6',
              overflow: 'hidden', 
              opacity: task.done ? 0.5 : 0.8 
            }}>
              {task.description}
            </span>
          )}
        </div>



        {/* Priority Picker */}
        <div data-no-expand style={{ position: 'relative', display: 'flex', gap: 4, flexShrink: 0 }}>
          <AnimatePresence mode="wait">
            {showPriorityMenu ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.6)', padding: '2px 4px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', alignItems: 'center' }}
              >
                {[1, 2, 3, 4, 5].map(p => (
                  <button
                    key={p}
                    onClick={(e) => { e.stopPropagation(); onEditPriority?.(task.id, p); setShowPriorityMenu(false) }}
                    style={{
                      background: task.priority === p ? PRIORITY_COLORS[p] : 'transparent',
                      border: 'none', borderRadius: 4, width: 24, height: 20, cursor: 'pointer',
                      color: task.priority === p ? 'var(--forest-deep)' : PRIORITY_COLORS[p],
                      fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                    }}
                  >
                    P{p}
                  </button>
                ))}
                <button onClick={(e) => { e.stopPropagation(); setShowPriorityMenu(false) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '0 4px', display: 'flex' }}><X size={12} /></button>
              </motion.div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setShowPriorityMenu(true) }}
                title="Change priority"
                style={{
                  background: `rgba(${task.priority === 1 ? '216,110,110' : task.priority === 2 ? '212,124,63' : '92,140,117'},0.12)`,
                  border: `1px solid ${priorityColor}40`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: priorityColor,
                  display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <span className="font-mono" style={{ fontSize: 10, fontWeight: 800 }}>P{task.priority}</span>
              </button>
            )}
          </AnimatePresence>
        </div>

        {/* Due offset */}
        {task.suggested_due_offset_days != null && (
          <div
            data-no-expand
            style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-sm)',
            padding: '4px 8px', border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <span className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Day</span>
            <input
              aria-label="Task due offset days"
              type="number" min="0"
              value={task.suggested_due_offset_days}
              onChange={e => onEditDays?.(task.id, parseInt(e.target.value) || 0)}
              className="font-mono"
              style={{
                width: 40,
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                textAlign: 'center',
                outline: 'none',
                padding: '0 2px',
                WebkitAppearance: 'none',
                MozAppearance: 'textfield'
              }}
            />
          </div>
        )}

        {/* Scheduled Date Pill */}
        {(task.scheduled_date || onEditScheduledDate) && (
          <DatePill
            date={task.scheduled_date}
            onDateChange={(newDate) => onEditScheduledDate?.(task.id, newDate)}
            editable={!!onEditScheduledDate}
            hasConflict={task.has_scheduling_conflict}
            minDate={startDate}
          />
        )}

        {/* Cost estimate */}
        {task.estimated_cost_min != null && task.estimated_cost_max > 0 && (
          <span
            data-no-expand
            style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', flexShrink: 0, opacity: 0.75, letterSpacing: '0.01em' }}
          >
            {task.estimated_cost_min === task.estimated_cost_max
              ? `₹${task.estimated_cost_min.toLocaleString('en-IN')}`
              : `₹${task.estimated_cost_min.toLocaleString('en-IN')}–${task.estimated_cost_max.toLocaleString('en-IN')}`
            }
          </span>
        )}

        {/* Delete (hover) */}
        <button
            data-no-expand
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDeleteTask?.(task.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--coral)', display: 'flex', padding: 6, opacity: 0.7 }}
            onMouseEnter={e => { e.currentTarget.style.opacity = 1 }}
            onMouseLeave={e => { e.currentTarget.style.opacity = 0.7 }}
        >
            <Trash2 size={16} />
        </button>
      </div>

      {/* Progress bar (only when subtasks exist) */}
      {subtasks.length > 0 && (
        <div style={{ padding: '0 18px 12px 18px' }}>
          <TaskProgressBar completed={completedSubs} total={subtasks.length} />
        </div>
      )}

      {/* Subtask list — animated expand */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '0 18px 14px', overflow: 'hidden' }}
          >
            {subtasks.length === 0 && (
              <div style={{ padding: '4px 0 12px 32px', opacity: 0.4, fontSize: 12, fontStyle: 'italic', color: 'var(--fog)' }}>
                No subtasks defined. Add your first step below.
              </div>
            )}
            <SubtaskList
              subtasks={subtasks}
              onToggleDone={(sid) => onToggleSubtask?.(task.id, sid)}
              onEdit={(sid, t) => onEditSubtask?.(task.id, sid, t)}
              onEditPriority={(sid, p) => onEditSubtaskPriority?.(task.id, sid, p)}
              onEditDays={(sid, d) => onEditSubtaskDays?.(task.id, sid, d)}
              onAdd={(t) => onAddSubtask?.(task.id, t)}
              onDelete={(sid) => onDeleteSubtask?.(task.id, sid)}
              onReorder={(order) => onReorderSubtasks?.(task.id, order)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

