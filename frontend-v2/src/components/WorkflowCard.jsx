/**
 * WorkflowCard — AI suggested workflow shown in the main workspace.
 * Dark Forest styling: Playfair phases, glass backgrounds.
 */
import { useState, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Edit3, RefreshCw, Focus, Eye, EyeOff, Map, CheckCircle2, Loader2, Play } from 'lucide-react'
import TaskItem from './TaskItem'
import FocusModePanel from './FocusModePanel'

let _idCounter = 2000
const nextId = () => ++_idCounter

function normaliseTask(t, i) {
  return {
    id: t.id ?? nextId(),
    title: t.title ?? `Task ${i + 1}`,
    description: t.description ?? '',
    priority: t.priority ?? 3,
    suggested_due_offset_days: t.suggested_due_offset_days ?? null,
    done: false,
    subtasks: (t.subtasks ?? []).map((st, j) => ({
      id: st.id ?? nextId(),
      title: st.title ?? `Subtask ${j + 1}`,
      priority: st.priority ?? 3,
      suggested_due_offset_days: st.suggested_due_offset_days ?? null,
      done: false,
    })),
  }
}

// Distribute tasks into phases (every 3 tasks = 1 phase)
const PHASE_SIZE = 3
function toPhases(tasks) {
  const phases = []
  for (let i = 0; i < tasks.length; i += PHASE_SIZE) {
    phases.push(tasks.slice(i, i + PHASE_SIZE))
  }
  return phases
}

export default function WorkflowCard({ data, approved, approving, onApprove, onRegenerate }) {
  if (!data) return null

  const rawTasks = data?.tasks ?? []
  const [tasks, setTasks]             = useState(() => rawTasks.map(normaliseTask))
  const [focusMode, setFocusMode]     = useState(false)
  const [hideCompleted, setHideCompleted] = useState(false)

  // ── Task mutations ─────────────────────────────────────────────────────
  const toggleTask      = useCallback((id) => setTasks(p => p.map(t => t.id === id ? {...t, done: !t.done} : t)), [])
  const editTaskTitle   = useCallback((id, title) => setTasks(p => p.map(t => t.id === id ? {...t, title} : t)), [])
  const editTaskPriority = useCallback((id, priority) =>
    setTasks(p => {
      const updated = p.map(t => t.id === id ? { ...t, priority } : t)
      return [...updated].sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5))
    }),
  [])
  const editTaskDays     = useCallback((id, days) => setTasks(p => p.map(t => t.id === id ? {...t, suggested_due_offset_days: days} : t)), [])
  const deleteTask      = useCallback((id) => setTasks(p => p.filter(t => t.id !== id)), [])
  
  const toggleSubtask   = useCallback((tid, sid) => setTasks(p => p.map(t => t.id !== tid ? t : {...t, subtasks: t.subtasks.map(s => s.id === sid ? {...s, done: !s.done} : s)})), [])
  const editSubtask     = useCallback((tid, sid, title) => setTasks(p => p.map(t => t.id !== tid ? t : {...t, subtasks: t.subtasks.map(s => s.id === sid ? {...s, title} : s)})), [])
  const editSubtaskPriority = useCallback((tid, sid, priority) =>
    setTasks(p => p.map(t => {
      if (t.id !== tid) return t
      const updatedSubs = t.subtasks.map(s => s.id === sid ? { ...s, priority } : s)
      const sortedSubs = [...updatedSubs].sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5))
      return { ...t, subtasks: sortedSubs }
    })),
  [])
  const editSubtaskDays     = useCallback((tid, sid, days) => setTasks(p => p.map(t => t.id !== tid ? t : {...t, subtasks: t.subtasks.map(s => s.id === sid ? {...s, suggested_due_offset_days: days} : s)})), [])
  const addSubtask      = useCallback((tid, title) => setTasks(p => p.map(t => t.id !== tid ? t : {...t, subtasks: [...t.subtasks, {id: nextId(), title, priority: 3, suggested_due_offset_days: 0, done: false}]})), [])
  const deleteSubtask   = useCallback((tid, sid) => setTasks(p => p.map(t => t.id !== tid ? t : {...t, subtasks: t.subtasks.filter(s => s.id !== sid)})), [])

  const reorderSubtasks = useCallback((tid, newOrder) =>
    setTasks(p => p.map(t => t.id !== tid ? t : { ...t, subtasks: newOrder })),
  [])

  const recommendedId  = tasks
    .filter(t => !t.done)
    .sort((a,b) => (a.priority ?? 5) - (b.priority ?? 5))[0]?.id

  const visibleTasks   = hideCompleted ? tasks.filter(t => !t.done) : tasks
  const completedCount = tasks.filter(t => t.done).length

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <p className="font-mono" style={{ fontSize: 10, color: 'var(--sage)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
            02 // Route Map
          </p>
          <h2 className="font-playfair" style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1 }}>
            Your Route Map
          </h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0 0', fontWeight: 300 }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} mapped
            {completedCount > 0 && ` · ${completedCount} completed`}
          </p>
        </div>

        {/* Action Toggles */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => setFocusMode(f => !f)}
            title="Focus on top task"
            className="btn-cust"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              borderColor: focusMode ? 'var(--amber)' : 'rgba(255,255,255,0.14)',
              color: focusMode ? 'white' : 'var(--fog)',
              background: focusMode ? 'var(--amber)' : 'transparent',
            }}
          >
            <Focus size={11} /> Focus
          </button>
          <button
            onClick={() => setHideCompleted(h => !h)}
            title={hideCompleted ? 'Show completed' : 'Hide completed'}
            className="btn-cust"
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            {hideCompleted ? <EyeOff size={11} /> : <Eye size={11} />}
            {hideCompleted ? 'Show all' : 'Hide done'}
          </button>
        </div>
      </div>

      <div style={{
         position: 'relative',
         paddingLeft: 28, // space for the SVG line
         marginBottom: 20
      }}>
         {/* Vertical Timeline SVG Line */}
         <div style={{
            position: 'absolute',
            left: 10, top: 18, bottom: 0, width: 2,
            background: 'linear-gradient(to bottom, var(--amber), var(--sage), rgba(184,207,199,0.15))',
            borderRadius: 2
         }}></div>

         {/* ── Approval banner ───────────────────────────────────────────── */}
         {!approved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.14)' }}>
               <p style={{ fontSize: 12, color: 'var(--fog)', flex: 1, margin: 0, lineHeight: 1.5 }}>
                 Review the tasks below. Edit titles inline, toggle subtasks, then approve to start tracking.
               </p>
               <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                 <button
                    onClick={onRegenerate}
                    title="Customize / Regenerate"
                    className="btn-cust"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                 >
                    <RefreshCw size={12}/> Customize
                 </button>
                 <motion.button
                   whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                   onClick={() => onApprove?.(tasks)}
                   disabled={approving}
                   className="mbtn"
                   style={{
                     display: 'flex', alignItems: 'center', gap: 6,
                     opacity: approving ? 0.7 : 1, cursor: approving ? 'wait' : 'pointer'
                   }}
                 >
                   {approving
                     ? <><Loader2 size={12} style={{animation:'spin 1s linear infinite'}}/> Packing...</>
                     : <><Play size={10} fill="currentColor"/> Approve & Start</>
                   }
                 </motion.button>
               </div>
            </div>
         )}
         {/* Approved badge */}
         {approved && (
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
               style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', borderRadius:10, marginBottom:24, background:'rgba(92,140,117,0.15)', border:'1px solid rgba(92,140,117,0.3)' }}
            >
               <CheckCircle2 size={15} color="var(--sage)"/>
               <span style={{fontSize:13, fontWeight:600, color:'white'}}>Journey approved! Route map is now active.</span>
            </motion.div>
         )}

         {/* ── Focus Mode ───────────────────────────────────────────────── */}
         <AnimatePresence>
            {focusMode && <FocusModePanel tasks={tasks} />}
         </AnimatePresence>

         {/* ── Phase-based task list with drag-and-drop ─────────────────── */}
         {!focusMode && (
            <div>
               {visibleTasks.length === 0 ? (
                 <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
                   {hideCompleted ? 'All tasks complete! 🎉' : 'No tasks to display.'}
                 </p>
               ) : (
                 <Reorder.Group
                   axis="y"
                   values={visibleTasks}
                   onReorder={(newVisible) => {
                     setTasks(prev => {
                       const visibleIds = new Set(visibleTasks.map(t => t.id))
                       const idToTask = new Map(prev.map(t => [t.id, t]))
                       const reorderedVisible = newVisible.map(t => idToTask.get(t.id))
                       const hidden = prev.filter(t => !visibleIds.has(t.id))
                       return [...reorderedVisible, ...hidden]
                     })
                   }}
                   style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}
                 >
                   {visibleTasks.map((task, index) => {
                     const isFirstInPhase = index % PHASE_SIZE === 0;
                     const phaseNumber = Math.floor(index / PHASE_SIZE) + 1;
                     
                     return (
                     <div key={task.id} style={{ position: 'relative', marginBottom: isFirstInPhase ? 4 : 0 }}>
                       {/* Phase label */}
                       {isFirstInPhase && (
                         <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 10px', position: 'relative' }}>
                           {/* Replace default node with Phase node tracker */}
                           <div style={{
                             position: 'absolute', left: -32, top: '50%', transform: 'translateY(-50%)',
                             width: 16, height: 16, borderRadius: '50%', background: 'var(--earth)', 
                             color: 'white', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 8,
                             display: 'flex', alignItems: 'center', justifyContent: 'center',
                             border: '1.5px solid rgba(92,140,117,0.5)', zIndex: 2
                           }}>
                             {phaseNumber}
                           </div>
                           <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                             Phase {phaseNumber}
                           </span>
                           <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
                         </div>
                       )}

                       <Reorder.Item value={task} style={{ listStyle: 'none' }}>
                         <TaskItem
                           task={task}
                           index={index % PHASE_SIZE}
                           isRecommended={task.id === recommendedId}
                           hideCompleted={hideCompleted}
                           onToggleDone={toggleTask}
                           onEditTitle={editTaskTitle}
                           onEditPriority={editTaskPriority}
                           onEditDays={editTaskDays}
                           onDeleteTask={deleteTask}
                           onToggleSubtask={toggleSubtask}
                           onEditSubtask={editSubtask}
                           onEditSubtaskPriority={editSubtaskPriority}
                           onEditSubtaskDays={editSubtaskDays}
                           onAddSubtask={addSubtask}
                           onDeleteSubtask={deleteSubtask}
                           onReorderSubtasks={reorderSubtasks}
                         />
                       </Reorder.Item>
                     </div>
                   )})}
                 </Reorder.Group>
               )}
            </div>
         )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

