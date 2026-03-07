/**
 * TaskItem — an expandable task card with subtask hierarchy.
 * Dark Forest styling with spring-bounce checkboxes.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronDown, Star, Trash2 } from 'lucide-react'
import SubtaskList from './SubtaskList'
import TaskProgressBar from './TaskProgressBar'

const PRIORITY_COLORS = { 1: '#C65D4A', 2: '#D47C3F', 3: '#5C8C75', 4: '#7B6FA0', 5: '#B8CFC7' }
const PRIORITY_LABELS = { 1: 'HIGH', 2: 'MED', 3: 'LOW', 4: 'AI', 5: 'OPT' }

export default function TaskItem({
  task,
  index = 0,
  isRecommended = false,
  hideCompleted = false,
  onToggleDone,
  onEditTitle,
  onEditPriority,
  onEditDays,
  onDeleteTask,
  onToggleSubtask,
  onEditSubtask,
  onEditSubtaskPriority,
  onEditSubtaskDays,
  onAddSubtask,
  onDeleteSubtask,
  onReorderSubtasks,
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)

  if (!task) return null
  if (hideCompleted && task.done) return null

  const subtasks = task.subtasks ?? []
  const completedSubs = subtasks.filter((s) => s.done).length
  const priorityColor = PRIORITY_COLORS[task.priority] ?? 'var(--fog)'
  const priorityBg = `${priorityColor}33` // 20% opacity using hex rough approx

  const commitEdit = () => {
    const t = draft.trim()
    if (t && t !== task.title) onEditTitle?.(task.id, t)
    setEditing(false)
  }

  const handleHeaderClick = (e) => {
    if (!subtasks.length) return
    if (e.target.closest('[data-no-expand]')) return
    setExpanded(prev => !prev)
  }

  return (
    <motion.div
      layout
      className={task.done ? "task-row done" : "task-row"}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 0,
        padding: 0,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 'var(--r-md)',
        marginBottom: 8,
        transition: 'all 0.3s',
      }}
    >
      {/* Task header row */}
      <div
        onClick={handleHeaderClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          cursor: subtasks.length > 0 ? 'pointer' : 'default',
        }}
        className="group"
      >
        {/* Expand toggle */}
        <button
          data-no-expand
          onClick={() => subtasks.length > 0 && setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            cursor: subtasks.length > 0 ? 'pointer' : 'default',
            color: subtasks.length > 0 ? 'var(--fog)' : 'transparent',
            display: 'flex',
            padding: 2,
            flexShrink: 0,
          }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Priority badge */}
        <div
          data-no-expand
          title={`Priority ${task.priority}${task.urgency_score ? ` (Urgency: ${task.urgency_score})` : ''} - Click to cycle`}
          onClick={() => {
            const nextP = task.priority >= 5 ? 1 : task.priority + 1
            onEditPriority?.(task.id, nextP)
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 7px',
            borderRadius: 20,
            background: priorityBg,
            color: priorityColor,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            flexShrink: 0,
            cursor: 'pointer',
            borderLeft: `3px solid ${priorityColor}`,
          }}
        >
          {PRIORITY_LABELS[task.priority] || `P${task.priority}`}
        </div>

        {/* Done checkbox (Left side in new design) */}
        <button
          data-no-expand
          onClick={() => onToggleDone?.(task.id)}
          className="cb"
          style={{
            width: 22,
            height: 22,
            border: `2px solid var(--sage)`,
            borderRadius: 6,
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
          {task.done && <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>✓</span>}
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
                background: 'var(--forest-card)',
                border: '1px solid var(--sage)',
                borderRadius: 6,
                padding: '3px 8px',
                color: 'white',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                outline: 'none',
              }}
            />
          ) : (
            <span
              onClick={() => setEditing(true)}
              className="cbl"
              title="Click to edit"
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: task.done ? 'var(--muted)' : 'var(--on-dark)',
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
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.description}
            </span>
          )}
        </div>

        {/* AI Tag */}
        {!task.done && task.id && (
           <span className="cai" style={{ fontSize: 11, color: 'var(--lavender)', opacity: 0.7, marginLeft: 'auto' }}>
             ✨ AI
           </span>
        )}

        {/* Due offset */}
        {task.suggested_due_offset_days != null && (
          <div
            data-no-expand
            style={{ 
            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
            background: 'rgba(255,255,255,0.06)', borderRadius: 6,
            padding: '2px 6px'
          }}>
            <span style={{ fontSize: 11, color: 'var(--fog)' }}>Day</span>
            <input 
              aria-label="Task due offset days"
              type="number" min="0"
              value={task.suggested_due_offset_days}
              onChange={e => onEditDays?.(task.id, parseInt(e.target.value) || 0)}
              style={{
                width: 38,
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                fontSize: 12,
                textAlign: 'center',
                outline: 'none',
                padding: '0 2px'
              }}
              onFocus={e => e.target.style.borderBottomColor = 'var(--sage)'}
              onBlur={e => e.target.style.borderBottomColor = 'rgba(255,255,255,0.2)'}
            />
          </div>
        )}

        {/* Delete (hover) */}
        <button
            data-no-expand
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDeleteTask?.(task.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--coral)', display: 'flex', padding: 4 }}
        >
            <Trash2 size={13} />
        </button>
      </div>

      {/* Progress bar (only when subtasks exist) */}
      {subtasks.length > 0 && (
        <div style={{ padding: '0 14px 8px 14px' }}>
          <TaskProgressBar completed={completedSubs} total={subtasks.length} />
        </div>
      )}

      {/* Subtask list — animated expand */}
      <AnimatePresence>
        {expanded && subtasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ padding: '0 14px 10px', overflow: 'hidden' }}
          >
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
