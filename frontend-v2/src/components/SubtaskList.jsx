/**
 * SubtaskList — animated expand/collapse list of subtask rows.
 * Supports inline completion toggle, edit, and add-new.
 *
 * Props:
 *   subtasks: [{id, title, priority, suggested_due_offset_days, done?}]
 *   onToggleDone: (subtaskId) => void
 *   onEdit: (subtaskId, newTitle) => void
 *   onAdd: (title) => void
 *   onDelete: (subtaskId) => void
 *   hideCompleted: boolean
 */
import { useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Plus, Trash2, Check } from 'lucide-react'

function SubtaskRow({ subtask, onToggleDone, onEdit, onEditPriority, onEditDays, onDelete, hideCompleted }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(subtask.title)
  const [hovered, setHovered] = useState(false)

  if (hideCompleted && subtask.done) return null

  const commitEdit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== subtask.title) onEdit?.(subtask.id, trimmed)
    setEditing(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 0',
        borderBottom: '1px solid var(--border-subtle)',
        opacity: subtask.done ? 0.5 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggleDone?.(subtask.id)}
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: `1.5px solid ${subtask.done ? 'var(--success)' : 'var(--text-secondary)'}`,
          background: subtask.done ? 'var(--success)' : 'transparent',
          flexShrink: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all var(--duration-base) var(--ease-spring)',
        }}
      >
        {subtask.done && <Check size={10} color="#fff" strokeWidth={3} />}
      </button>

      {/* Title */}
      {editing ? (
        <input
          aria-label="Subtask title draft"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
          style={{
            flex: 1,
            background: 'var(--bg-primary)',
            border: '1px solid var(--accent)',
            borderRadius: 5,
            padding: '2px 7px',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            fontSize: 12.5,
            outline: 'none',
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          title="Click to edit"
          style={{
            flex: 1,
            fontSize: 12.5,
            color: subtask.done ? 'var(--text-secondary)' : 'var(--text-primary)',
            textDecoration: subtask.done ? 'line-through' : 'none',
            cursor: 'text',
          }}
        >
          {subtask.title}
        </span>
      )}

      {/* Priority tag */}
      <div 
        title="Click to cycle priority (1-5)"
        onClick={() => {
          const nextP = subtask.priority >= 5 ? 1 : subtask.priority + 1
          onEditPriority?.(subtask.id, nextP)
        }}
        style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 24, height: 20, borderRadius: 5,
          background: subtask.priority <= 2 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)',
          border: `1px solid ${subtask.priority <= 2 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
          color: subtask.priority <= 2 ? 'var(--warning)' : 'var(--text-secondary)',
          fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all var(--duration-base)'
        }}
      >
        P{subtask.priority}
      </div>

      {/* Days offset */}
      {subtask.suggested_due_offset_days != null && (
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 3,
          background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 5,
          padding: '2px 5px'
        }}>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>Day</span>
          <input 
            aria-label="Subtask due offset days"
            type="number" min="0"
            value={subtask.suggested_due_offset_days}
            onChange={e => onEditDays?.(subtask.id, parseInt(e.target.value) || 0)}
            style={{
              width: 32, background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--accent)', color: 'var(--text-primary)', fontSize: 11,
              fontWeight: 600, textAlign: 'center', outline: 'none', padding: '0 1px'
            }}
          />
        </div>
      )}

      {/* Delete */}
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onDelete?.(subtask.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--error)', display: 'flex' }}
          >
            <Trash2 size={12} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function SubtaskList({
  subtasks = [],
  onToggleDone,
  onEdit,
  onEditPriority,
  onEditDays,
  onAdd,
  onDelete,
  onReorder,
  hideCompleted = false,
}) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const submitNew = () => {
    const t = newTitle.trim()
    if (t) onAdd?.(t)
    setNewTitle('')
    setAdding(false)
  }

  return (
    <div style={{ paddingLeft: 16, paddingTop: 4 }}>
      <Reorder.Group
        axis="y"
        values={subtasks}
        onReorder={order => onReorder?.(order)}
      >
        <AnimatePresence>
          {subtasks.map((st) => (
            <Reorder.Item key={st.id} value={st} style={{ listStyle: 'none' }}>
              <SubtaskRow
                subtask={st}
                onToggleDone={onToggleDone}
                onEdit={onEdit}
                onEditPriority={onEditPriority}
                onEditDays={onEditDays}
                onDelete={onDelete}
                hideCompleted={hideCompleted}
              />
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Add new subtask */}
      {adding ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            aria-label="New subtask title"
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitNew(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="New subtask..."
            style={{
              flex: 1,
              background: 'var(--bg-primary)',
              border: '1px solid var(--accent)',
              borderRadius: 6,
              padding: '4px 8px',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: 12.5,
              outline: 'none',
            }}
          />
          <button
            onClick={submitNew}
            style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: 12 }}
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontFamily: 'inherit',
            fontSize: 11.5,
            padding: 0,
          }}
        >
          <Plus size={12} /> Add subtask
        </button>
      )}
    </div>
  )
}
