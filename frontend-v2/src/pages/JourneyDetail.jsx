/**
 * EventDetail — Full detail view for a saved life event.
 *
 * Timeline View: amber left spine, phase section headers, clean task cards
 *   (PHASE shown once in section header — NOT repeated in each card)
 *   Card shows: PRIORITY badge · DAY XX · title · description · subtasks
 *
 * Category View: polished card-style phase strip (clickable to filter) + same task cards
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  ArrowLeft, Clock, Layers, Focus, Eye, EyeOff, Check, X,
  CheckCircle2, Circle, Loader2, Baby, Map as MapIcon, Briefcase, Home,
  GraduationCap, Heart, HeartOff, Bird, CreditCard, Shield, Plane,
  Users, Car, Stethoscope, FileText, ChevronsRight, RefreshCw, Calendar, Zap,
  AlertTriangle, ArrowRight
} from 'lucide-react'
import {
  getLifeEvent,
  updateLifeEvent,
  updateTaskStatus,
  updateTask,
  updateTaskScheduledDate,
  resolveTaskConflict,
  retrieveRequirements,
  saveRequirements,
} from '../api/backend'
import { matchVaultToPlan } from '../api/vault'
import { getEventVisuals } from '../api/EventSymbols'
import JourneyTaskCard from '../components/JourneyTaskCard'
import FocusModePanel from '../components/FocusModePanel'
import RequirementsCard, { categorizeChunks, parseExplanationToCategories } from '../components/RequirementsCard'
import VictoryModal from '../components/VictoryModal'
import DayPlannerPanel from '../components/DayPlannerPanel'
import GuidePanel from '../components/GuidePanel'
import SmartAlerts from '../components/SmartAlerts'
import ParallelTasksSuggestion from '../components/ParallelTasksSuggestion'
import DocumentStatusDashboard from '../components/DocumentStatusDashboard'
import { usePersonalEvents } from '../hooks/usePersonalEvents'
import CustomDarkCalendar from '../components/CustomDarkCalendar'
import DatePill from '../components/DatePill'
import PlanChat from '../components/PlanChat'
import confetti from 'canvas-confetti'

// ── Helpers ────────────────────────────────────────────────────────────────

let _idCounter = 5000
const nextId = () => ++_idCounter

// Calculate days between two dates
function getDaysBetween(d1, d2) {
  const t1 = new Date(d1).getTime()
  const t2 = new Date(d2).getTime()
  return Math.floor((t2 - t1) / (1000 * 60 * 60 * 24))
}

// Derive a functional category for grouping in Category View
function inferCategory(title = '', phase = '') {
  const t = (title + ' ' + phase).toLowerCase()
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


function normaliseTask(t, i, vaultMatches = [], retrievedDocs = []) {
  const isDone = t.done ?? (t.status === 'completed')
  const rawPhase = t.phase_title ?? ''
  const GENERIC = ['general', 'other', 'misc', 'miscellaneous', 'n/a', 'na', '']
  const phase_title = GENERIC.includes(rawPhase.trim().toLowerCase())
    ? inferPhase(t.title ?? '')
    : rawPhase
  
  // Intelligent Document Extraction from Title (e.g. "Submit Aadhaar + PAN")
  const extractedFromTitle = (() => {
    const title = t.title || '';
    if (!title.includes('+') && !title.toLowerCase().includes(' and ')) return [];
    
    // Verbs and bridge words that shouldn't be treated as documents
    const JUNK_WORDS = [
      'complete', 'submit', 'execute', 'finish', 'follow', 'update', 
      'prepare', 'start', 'begin', 'end', 'task', 'step', 'information', 
      'details', 'form', 'forms', 'all', 'now', 'today', 'immediately', 
      'soon', 'later', 'up', 'with', 'relevant', 'offices', 'applications'
    ]

    const words = title.trim().split(' ');
    if (words.length < 2) return [];
    const firstWord = words[0];
    const remaining = title.substring(firstWord.length).trim();
    const parts = remaining.split(/\s*(?:\+|\band\b)\s*/i);
    if (parts.length <= 1) return [];
    return parts
      .map(p => p.trim())
      .filter(p => p.length > 2 && !JUNK_WORDS.includes(p.toLowerCase()))
      .map(p => ({ name: p, has: false }));
  })()

  // Combine original docs, title extractions, and passed-in retrieved matches
  const mergedDocs = [
    ...(t.required_docs ?? []),
    ...extractedFromTitle,
    ...retrievedDocs
  ].reduce((acc, current) => {
    const x = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
    if (!x) return acc.concat([current]);
    return acc;
  }, []);

  return {
    ...t,
    id: t.id ?? nextId(),
    phase_title,
    category: inferCategory(t.title ?? '', phase_title),
    done: isDone,
    title: t.title ?? `Task ${i + 1}`,
    description: t.description ?? '',
    priority: t.priority ?? 3,
    urgency_score: t.urgency_score ?? null,
    suggested_due_offset_days: t.due_offset_days ?? t.suggested_due_offset_days ?? null,
    subtasks: (t.subtasks ?? []).map((st, j) => ({
      ...st,
      id: st.id ?? nextId(),
      title: st.title ?? `Subtask ${j + 1}`,
      priority: st.priority ?? 3,
      urgency_score: st.urgency_score ?? null,
      suggested_due_offset_days: st.due_offset_days ?? st.suggested_due_offset_days ?? null,
      done: st.done ?? (st.status === 'completed'),
    })),
    required_docs: mergedDocs.map(d => ({
      ...d,
      has: d.has || vaultMatches.some(m => (m.vault_doc?.name || '').toLowerCase().includes(d.name.toLowerCase()))
    }))
  }
}

// Map retrieved requirements to specific tasks based on keyword similarity
function smartMapDocsToTasks(tasks, requirementsData) {
  if (!requirementsData || !tasks.length) return tasks;
  
  const docs = requirementsData.retrieved_chunks || [];
  // Also try to find items in explanation if chunks are empty
  if (docs.length === 0 && requirementsData.explanation) {
    // Basic regex-based extraction from explanation if needed
  }

  return tasks.map(task => {
    const taskContent = (task.title + ' ' + task.description).toLowerCase();
    
    const matchedDocs = docs.filter(doc => {
      const docTitle = doc.title.toLowerCase();
      // Keyword matching
      if (taskContent.includes(docTitle) || docTitle.includes(taskContent)) return true;
      
      // Synonym/Context matching
      const mappings = [
        { keywords: ['identity', 'id proof', 'aadhaar', 'passport', 'voter', 'pan card'], docs: ['aadhaar', 'pan', 'passport', 'voter', 'identity'] },
        { keywords: ['address', 'residence', 'utility', 'rent', 'agreement'], docs: ['address', 'utility', 'rent', 'agreement', 'domicile'] },
        { keywords: ['finance', 'bank', 'salary', 'income', 'tax', 'itr'], docs: ['bank', 'statement', 'salary', 'income', 'tax', 'itr', 'financial'] },
        { keywords: ['education', 'degree', 'marksheet', 'transcript', 'certificate'], docs: ['degree', 'marksheet', 'transcript', 'certificate', 'educational'] },
        { keywords: ['work', 'job', 'offer', 'employment', 'relieving', 'experience'], docs: ['offer', 'contract', 'experience', 'relieving', 'employment'] }
      ];

      for (const m of mappings) {
        const matchesTask = m.keywords.some(k => taskContent.includes(k));
        const matchesDoc = m.docs.some(d => docTitle.includes(d));
        if (matchesTask && matchesDoc) return true;
      }
      return false;
    }).map(doc => ({ name: doc.title, has: false }));

    if (matchedDocs.length === 0) return task;

    // Merge only if not already present
    const existingNames = new Set((task.required_docs || []).map(d => d.name.toLowerCase()));
    const uniqueMatches = matchedDocs.filter(d => !existingNames.has(d.name.toLowerCase()));
    
    return {
      ...task,
      required_docs: [...(task.required_docs || []), ...uniqueMatches]
    };
  });
}


function getEventIcon(title = '', displayTitle = '') {
  const { image, color } = getEventVisuals(title, displayTitle)
  return { image, color }
}

const getPhaseEmoji = (phaseName = '', category = null) => {
  return getEventVisuals(phaseName, '', category).emoji
}

// ── Progress Ring ─────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 60, stroke = 5, color = 'var(--amber)' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ}
        initial={false}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ transformOrigin: 'center', transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 13, fontWeight: 800, fill: 'white', fontFamily: "'DM Sans', sans-serif" }}
      >
        {pct}%
      </text>
    </svg>
  )
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

  // Build phase_title → phase_category lookup for emoji resolution
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
        marginBottom: 8, 
        paddingTop: 12,    
        paddingBottom: 24, 
        overflowX: 'auto', 
        overflowY: 'visible',
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        width: '100%',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'stretch', minWidth: '100%', width: 'max-content', gap: 0, position: 'relative', zIndex: 11, padding: '12px 0' }}>
          {phaseData.map(({ phase, pct, total, completedCount, isAllComplete }, idx) => {
            const isSelected = selectedPhase === phase
            const allPrevComplete = phaseData.slice(0, idx).every(p => p.isAllComplete)
            const isCurrent = !isAllComplete && allPrevComplete
            
            // Rendering tokens
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
                    width: 60, // Increased slightly per request
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
                        boxShadow: phaseData[idx - 1].pct > 0 ? `0 0 10px ${themeColor || 'rgba(212,124,63,0.6)'}` : 'none'
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
              marginTop: 16,
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

// ── Main Component ─────────────────────────────────────────────────────────

const PRIORITY_LABELS = { 1: 'CRITICAL', 2: 'HIGH', 3: 'MEDIUM', 4: 'LOW', 5: 'OPTIONAL' }
const PRIORITY_COLORS = { 1: 'var(--coral)', 2: 'var(--amber)', 3: 'var(--sage)', 4: 'var(--fog)', 5: 'var(--muted)' }

// Normalize near-duplicate phase names so they merge into one group.
// Strips common event-type prefixes ("Adoption", "Home", "Legal"), stop words,
// and trailing noise words, then returns a simplified canonical key.
function canonicalPhase(raw = '') {
  return raw
    .toLowerCase()
    .replace(/\b(adoption|relocation|divorce|marriage|pregnancy|medical|home|legal|financial|job|career|business|house|property)\b/g, '')
    .replace(/\b(the|a|an|and|or|of|for|to|in|on|with|by)\b/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function JourneyDetail({ planId, planTitle, planDescription, onBack, onNavigate }) {
  const [tasks, setTasks] = useState([])
  const [journey, setJourney] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guideTask, setGuideTask] = useState(null) // { type, title, id }
  const [conflictModal, setConflictModal] = useState(null)
  
  const [showTodayOnly, setShowTodayOnly] = useState(false)
  const [viewMode, setViewMode] = useState('timeline')
  const [focusMode, setFocusMode] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(false)
  const [selectedPhase, setSelectedPhase] = useState(null)
  const [microMsg, setMicroMsg] = useState(null)
  const dateInputRef = useRef(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [celebrated, setCelebrated] = useState({ 25: false, 50: false, 75: false, 100: false })
  const [requirements, setRequirements] = useState(null)
  const [showDocs, setShowDocs] = useState(false) // Collapsed by default as per request
  const [docsLoading, setDocsLoading] = useState(false)
  const [collectedDocs, setCollectedDocs] = useState(new Set())
  const [groupedDocs, setGroupedDocs] = useState(null)
  const [isVictoryOpen, setIsVictoryOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('tasks') // 'tasks' or 'schedule'
  const [vaultMatches, setVaultMatches] = useState([])
  const [vaultLoading, setVaultLoading] = useState(false)
  const [isInitialised, setIsInitialised] = useState(false)
  const [celebratedPhases, setCelebratedPhases] = useState(new Set())
  const [chatOpen, setChatOpen] = useState(false)
  
  const groupedDocsData = useMemo(() => {
    if (!requirements) return null
    const chunks = requirements?.retrieved_chunks ?? requirements?.results ?? []
    const explanation = requirements?.explanation
    const explanationRaw = typeof explanation === 'string' ? explanation : explanation?.explanation
    
    let groups = categorizeChunks(chunks)
    if (explanationRaw) {
      const parsedGroups = parseExplanationToCategories(explanationRaw)
      if (parsedGroups) {
        // MERGE and Deduplicate groups by title (case-insensitive)
        Object.keys(groups).forEach(k => {
          const titles = new Set(groups[k].map(it => (it.title || '').toLowerCase()));
          const filteredMatches = (parsedGroups[k] || []).filter(it => !titles.has((it.title || '').toLowerCase()));
          groups[k] = [...groups[k], ...filteredMatches];
        })
      }
    }
    return groups
  }, [requirements])

  // ── Computed ──────────────────────────────────────────────────────────

  const calcTaskPct = (t) => {
    if (t.done) return 100
    const subs = t.subtasks || []
    if (!subs.length) return 0
    return (subs.filter(s => s.done).length / subs.length) * 100
  }

  const overallProgress  = tasks.length > 0 ? Math.round(tasks.reduce((acc, t) => acc + calcTaskPct(t), 0) / tasks.length) : 0
  const completedCount   = tasks.filter(t => t.done).length

  // Create a mapping of canonical keys to consistent display names
  // We compute this early so the sync Effect can use it
  const normalisedTasks = useMemo(() => {
    const canonicalMap = new Map()
    return tasks.map(t => {
      if (viewMode === 'phase') return t
      const raw = t.phase_title || 'Preparation'
      const key = canonicalPhase(raw)
      if (!canonicalMap.has(key)) canonicalMap.set(key, raw)
      return { ...t, phase_title: canonicalMap.get(key) }
    })
  }, [tasks, viewMode])

  // Sync initial completion state silently on first task load
  useEffect(() => {
    if (tasks.length > 0 && !isInitialised) {
      // 1. Sync overall celebrated landmarks
      setCelebrated({
        25: overallProgress >= 25,
        50: overallProgress >= 50,
        75: overallProgress >= 75,
        100: overallProgress >= 100
      })

      // 2. Sync phase-specific completions
      const initialPhaseCompletions = new Set()
      const phaseGroups = {}
      normalisedTasks.forEach(task => { // Use normalizedTasks for consistent keys
        const groupKey = viewMode === 'phase' ? task.category : (task.phase_title || 'Preparation')
        if (!phaseGroups[groupKey]) phaseGroups[groupKey] = []
        phaseGroups[groupKey].push(task)
      })
      Object.entries(phaseGroups).forEach(([phaseName, phaseTasks]) => {
        const isAllDone = phaseTasks.length > 0 && phaseTasks.every(t => t.done)
        if (isAllDone) initialPhaseCompletions.add(phaseName)
      })
      setCelebratedPhases(initialPhaseCompletions)

      setIsInitialised(true)
    }
  }, [tasks.length, overallProgress, isInitialised, normalisedTasks, viewMode])

  const { color: eventColor, colorName: eventColorName } = useMemo(() => getEventVisuals(planTitle || ''), [planTitle])

  // Trigger celebrations (from Dashboard SOP)
  useEffect(() => {
    if (!isInitialised) return
    if (overallProgress >= 100 && !celebrated[100]) {
       setCelebrated(prev => ({ ...prev, 100: true }))
    } else if (overallProgress >= 75 && !celebrated[75]) {
      setMicroMsg({ text: "Final Stretch! 🛡️", color: 'var(--emerald)' })
      setCelebrated(prev => ({ ...prev, 75: true }))
      setTimeout(() => setMicroMsg(null), 4000)
    } else if (overallProgress >= 50 && !celebrated[50]) {
      setMicroMsg({ text: "Halfway Secured! 🏰", color: 'var(--amber)' })
      setCelebrated(prev => ({ ...prev, 50: true }))
      setTimeout(() => setMicroMsg(null), 4000)
    } else if (overallProgress >= 25 && !celebrated[25]) {
      setMicroMsg({ text: "Strong Start! 🚀", color: '#0EA5E9' })
      setCelebrated(prev => ({ ...prev, 25: true }))
      setTimeout(() => setMicroMsg(null), 4000)
    }
  }, [overallProgress, celebrated, isInitialised])

  const {
    events: personalEvents,
    addEvent: addPersonalEvent,
    removeEvent: removePersonalEvent,
    getClashForTask,
  } = usePersonalEvents(planId, tasks)

  // Reset requirements when planId changes to avoid showing old documents
  useEffect(() => {
    setRequirements(null)
  }, [planId])

  const fetchJourney = useCallback(() => {
    if (!planId) return
    setLoading(true)
    getLifeEvent(planId)
      .then(async data => { 
        setJourney(data)
        
        // FIX: Populate tasks immediately from initial data so the user doesn't see an empty roadmap
        // We will update them with vault matches once matchVaultToPlan finishes.
        const initialTasks = (data.tasks ?? []).map((t, idx) => normaliseTask(t, idx))
        setTasks(initialTasks)
        
        setVaultLoading(true)
        
        // Match vault in background and update tasks with links when done
        matchVaultToPlan(planId)
          .then(matches => {
            const matchList = matches?.matched ?? []
            setVaultMatches(matchList)
            setTasks(prev => (data.tasks ?? []).map((t, idx) => normaliseTask(t, idx, matchList)))
            const matchedNames = new Set(matchList.map(m => m.vault_doc?.name))
            setCollectedDocs(matchedNames)
          })
          .catch(e => console.error("Vault match failed:", e))
          .finally(() => setVaultLoading(false))
        
        // Extract life_event_type from metadata_json (the DB model stores it there, not as a column)
        let eventType = null
        try {
          const meta = typeof data.metadata_json === 'string' ? JSON.parse(data.metadata_json) : data.metadata_json
          if (meta?.event_types?.length) eventType = meta.event_types[0]
        } catch { /* metadata_json might be null or malformed */ }

        // ── TIER 1: Permanent DB cache (zero AI cost after first load) ──────
        if (data.requirements_json) {
          try {
            const dbCached = JSON.parse(data.requirements_json)
            setRequirements(dbCached)
            setTasks(prev => {
              if (!prev || prev.length === 0) return prev
              return smartMapDocsToTasks(prev, dbCached)
            })
            setDocsLoading(false)
            return // Done — no AI call needed
          } catch { /* corrupted JSON — fall through */ }
        }

        // ── TIER 2: sessionStorage (same-tab fast reload) ───────────────────
        const cacheKey = `rag_docs_${planId}`
        const sessionCached = sessionStorage.getItem(cacheKey)
        if (sessionCached) {
          try {
            const cachedRes = JSON.parse(sessionCached)
            setRequirements(cachedRes)
            setTasks(prev => {
              if (!prev || prev.length === 0) return prev
              return smartMapDocsToTasks(prev, cachedRes)
            })
            setDocsLoading(false)
            return
          } catch { /* fall through */ }
        }

        // ── TIER 3: AI fetch (first time only) — then auto-save to DB ───────
        setDocsLoading(true)
        retrieveRequirements(data.description || data.title, eventType, 5)
          .then(res => {
            setRequirements(res)
            setTasks(prev => {
              if (!prev || prev.length === 0) return prev
              return smartMapDocsToTasks(prev, res)
            })
            // Persist to sessionStorage for same-tab speed
            try { sessionStorage.setItem(cacheKey, JSON.stringify(res)) } catch { /* storage full */ }
            // Persist permanently to DB so AI is never called again for this event
            saveRequirements(planId, res).catch(e => console.warn('Could not save requirements to DB:', e))
          })
          .catch(e => console.error("Docs retrieval failed:", e))
          .finally(() => setDocsLoading(false))
      })
      .catch(err => {
        console.error('Failed to load journey tasks:', err)
        setLoading(false)
      })
      .finally(() => setLoading(false))
  }, [planId])

  useEffect(() => {
    fetchJourney()
    const handleVaultUpdated = () => fetchJourney()
    window.addEventListener('vault_updated', handleVaultUpdated)
    return () => window.removeEventListener('vault_updated', handleVaultUpdated)
  }, [fetchJourney])

  // ── Task mutation handlers ─────────────────────────────────────────────

  const toggleTask = useCallback(async (id) => {
    if (String(id).startsWith('grouped:')) {
      const subIds = id.split(':').slice(1)
      const anyPending = subIds.some(sid => !tasks.find(t => t.id == sid)?.done)
      const nextDone = anyPending
      setTasks(p => p.map(t => {
        if (subIds.includes(String(t.id))) {
          updateTaskStatus(t.id, nextDone ? 'completed' : 'pending').catch(console.error)
          return { ...t, done: nextDone }
        }
        return t
      }))
      fetchJourney() // Re-fetch to get any status updates / recommendations
      return
    }

    const task = tasks.find(t => t.id === id)
    if (!task) return
    const nextDone = !task.done
    setTasks(p => p.map(t => t.id === id ? { ...t, done: nextDone } : t))
    try {
      await updateTaskStatus(id, nextDone ? 'completed' : 'pending')
      fetchJourney() // Re-fetch to get any status updates / recommendations
    } catch (err) {
      console.error("Task update failed:", err)
    }
  }, [tasks, fetchJourney])

  const editTaskTitle    = useCallback((id, title) => setTasks(p => p.map(t => t.id === id ? { ...t, title } : t)), [])
  const editTaskPriority = useCallback((id, priority) => setTasks(p => p.map(t => t.id === id ? { ...t, priority } : t)), [])
  const editTaskDays     = useCallback(async (id, days) => {
    setTasks(p => p.map(t => t.id === id ? { ...t, suggested_due_offset_days: days } : t))
    try {
      await updateTask(id, { due_offset_days: days })
    } catch (err) {
      console.error("Failed to update task days:", err)
    }
  }, [])

  const handleScheduledDateChange = useCallback(async (taskId, newDate) => {
    try {
      const result = await updateTaskScheduledDate(taskId, newDate)
      
      if (result.has_conflict) {
        setConflictModal({
          task: tasks.find(t => t.id === taskId),
          conflictingTasks: result.conflicting_tasks,
          proposedDate: newDate
        })
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { 
          ...t, 
          scheduled_date: result.task.scheduled_date,
          has_scheduling_conflict: false
        } : t))
      }
    } catch (err) {
      console.error("Date update failed:", err)
    }
  }, [tasks])

  const handleResolveConflict = useCallback(async (resolution) => {
    if (!conflictModal) return
    try {
      const result = await resolveTaskConflict(conflictModal.task.id, resolution, conflictModal.proposedDate)
      setTasks(prev => prev.map(t => t.id === conflictModal.task.id ? {
        ...t,
        scheduled_date: result.scheduled_date,
        has_scheduling_conflict: false
      } : t))
      setConflictModal(null)
    } catch (err) {
      console.error("Conflict resolution failed:", err)
    }
  }, [conflictModal])

  const deleteTask = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to remove this task?")) return
    setTasks(p => p.filter(t => t.id !== id))
    // We can use updateTaskStatus 'archived' if backend supports it, or just generic delete
    // For now, assume it's just local or handled by backend update
  }, [])

  const toggleSubtask = useCallback((tid, sid) => {
    setTasks(p => p.map(t => {
      if (t.id !== tid) return t
      return { ...t, subtasks: t.subtasks.map(s => {
        if (s.id !== sid) return s
        const nextDone = !s.done
        updateTaskStatus(sid, nextDone ? 'completed' : 'pending').catch(console.error)
        return { ...s, done: nextDone }
      })}
    }))
  }, [])

  const editSubtask         = useCallback((tid, sid, title) => setTasks(p => p.map(t => t.id !== tid ? t : { ...t, subtasks: t.subtasks.map(s => s.id === sid ? { ...s, title } : s) })), [])
  const addSubtask          = useCallback((tid, title) => setTasks(p => p.map(t => t.id !== tid ? t : { ...t, subtasks: [...t.subtasks, { id: nextId(), title, priority: 3, suggested_due_offset_days: 0, done: false }] })), [])
  const deleteSubtask       = useCallback((tid, sid) => setTasks(p => p.map(t => t.id !== tid ? t : { ...t, subtasks: t.subtasks.filter(s => s.id !== sid) })), [])
  
  const reorderTasks = useCallback((newOrder) => {
    setTasks(prev => {
      const expandedItems = []
      newOrder.forEach(item => {
        if (item.isGrouped && item.originalTasks) {
          expandedItems.push(...item.originalTasks)
        } else {
          expandedItems.push(item)
        }
      })
      const orderIds = new Set(expandedItems.map(t => t.id))
      const untouched = prev.filter(t => !orderIds.has(t.id))
      return [...untouched, ...expandedItems].sort((a,b) => (a.suggested_due_offset_days ?? 0) - (b.suggested_due_offset_days ?? 0))
    })
  }, [])

  const toggleDoc = useCallback((docId) => {
    setCollectedDocs(prev => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }, [])

  const docStats = useMemo(() => {
    if (!requirements) {
      return { total: 10, collected: collectedDocs.size, pct: Math.round((collectedDocs.size / 10) * 100) }
    }
    const rawChunks = requirements.retrieved_chunks ?? requirements.results ?? []
    let total = Array.from(new Map(rawChunks.map(c => [c.id, c])).values()).length
    if (total === 0 && (requirements.explanation || requirements.results)) {
      const exp = typeof requirements.explanation === 'string' ? requirements.explanation : (requirements.explanation?.explanation || '');
      if (exp) {
        const listItems = exp.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
        total = listItems.length;
      }
    }
    if (total === 0) total = 10; 
    const collected = collectedDocs.size
    return { total, collected, pct: total ? Math.round((collected / total) * 100) : 0 }
  }, [requirements, collectedDocs])

  useEffect(() => {
    if (!isInitialised || tasks.length === 0) return

    const check100 = overallProgress >= 100 && !celebrated[100]
    const check75 = overallProgress >= 75 && !celebrated[75]
    const check50 = overallProgress >= 50 && !celebrated[50]
    const check25 = overallProgress >= 25 && !celebrated[25]

    if (check100) {
      setCelebrated(p => ({ ...p, 100: true }))
      setIsVictoryOpen(true)
      const duration = 5 * 1000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }
      const randomInRange = (min, max) => Math.random() * (max - min) + min
      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now()
        if (timeLeft <= 0) return clearInterval(interval)
        const particleCount = 50 * (timeLeft / duration)
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, colors: ['#d47c3f', '#7ba091', '#f2c94c', '#5c8c75'] })
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, colors: ['#38bdf8', '#c65d4a', '#f2c94c', '#ffffff'] })
      }, 250)
    } else if (check75) {
      setMicroMsg({ text: 'Final Stretch! 🛡️', color: 'var(--emerald)' })
      setCelebrated(p => ({ ...p, 75: true }))
      setTimeout(() => setMicroMsg(null), 4000)
    } else if (check50) {
      setMicroMsg({ text: 'Halfway There! 🏁', color: 'var(--amber)' })
      setCelebrated(p => ({ ...p, 50: true }))
      setTimeout(() => setMicroMsg(null), 4000)
    } else if (check25) {
      setMicroMsg({ text: 'Strong Start! 🚀', color: '#0EA5E9' })
      setCelebrated(p => ({ ...p, 25: true }))
      setTimeout(() => setMicroMsg(null), 4000)
    }
  }, [overallProgress, celebrated, tasks.length, isInitialised])

  const phases = (() => {
    if (viewMode === 'phase') {
      const counts = {}
      normalisedTasks.forEach(t => {
        const cat = t.category || 'General Preparation'
        counts[cat] = (counts[cat] || 0) + 1
      })
      const cats = [...new Set(normalisedTasks.map(t => t.category))]
      // Sort by task count (descending) so the most important categories come first
      return cats.sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
    } else {
      const pMap = {}
      normalisedTasks.forEach(t => {
        const p = t.phase_title
        const d = t.suggested_due_offset_days ?? 999
        if (pMap[p] === undefined || d < pMap[p]) pMap[p] = d
      })
      return Object.keys(pMap).sort((a, b) => pMap[a] - pMap[b])
    }
  })()

  const now = new Date()
  const currentDayOffset = journey?.start_date ? getDaysBetween(journey.start_date, now) : 0

  const baseTasks = hideCompleted ? normalisedTasks.filter(t => !t.done) : normalisedTasks
  const todayTasks = baseTasks.filter(t => t.suggested_due_offset_days === currentDayOffset)
  
  const phaseFiltered = selectedPhase 
    ? baseTasks.filter(t => (viewMode === 'phase' ? t.category : t.phase_title) === selectedPhase) 
    : showTodayOnly ? todayTasks : baseTasks

  const displayTasksRaw = useMemo(() => {
    let list = [];
    if (viewMode === 'timeline') {
      list = [...phaseFiltered].sort((a, b) => (a.suggested_due_offset_days || 0) - (b.suggested_due_offset_days || 0) || (a.priority || 5) - (b.priority || 5))
    } else {
      list = [...phaseFiltered].sort((a, b) => {
        const catA = CATEGORY_ORDER.indexOf(a.category)
        const catB = CATEGORY_ORDER.indexOf(b.category)
        if (catA !== catB) return catA - catB
        return (a.suggested_due_offset_days || 0) - (b.suggested_due_offset_days || 0) || (a.priority || 5) - (b.priority || 5)
      })
    }

    // APPLY GROUPING HERE ONCE
    const groupablePrefixes = ['Collect', 'Submit', 'Open', 'Download', 'Complete', 'Apply', 'Obtain', 'Update'];
    const finalResult = [];
    const processedIds = new Set();
    
    // Group by Day/Phase bucket to ensure they don't jump across sections
    const buckets = new Map();
    list.forEach(t => {
      const bucketKey = `${viewMode === 'phase' ? t.category : t.phase_title}:${t.suggested_due_offset_days}`;
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
      buckets.get(bucketKey).push(t);
    });

    buckets.forEach((bucketTasks) => {
      for (let i = 0; i < bucketTasks.length; i++) {
        const t = bucketTasks[i];
        if (processedIds.has(t.id)) continue;
        
        const firstWord = t.title.trim().split(' ')[0];
        if (groupablePrefixes.includes(firstWord)) {
          const peers = bucketTasks.slice(i + 1).filter(other => {
            if (processedIds.has(other.id)) return false;
            const otherWord = other.title.trim().split(' ')[0];
            return otherWord === firstWord;
          });
          
          if (peers.length > 0) {
            const all = [t, ...peers];
            all.forEach(a => processedIds.add(a.id));
            const suffixes = all.map(a => {
              let s = a.title.trim().substring(firstWord.length).trim();
              return s.replace(/\s+(tasks|process|details)$/i, '');
            });
            const mergedTitle = `${firstWord} ${suffixes.join(' + ')}`;
            
            finalResult.push({
              ...t,
              id: `grouped:${all.map(a => a.id).join(':')}`,
              title: mergedTitle,
              isGrouped: true,
              originalTasks: all,
              required_docs: all.reduce((acc, curr) => {
                const rawTitle = curr.title || '';
                const parts = rawTitle.split(' ');
                const suffix = rawTitle.slice(parts[0].length).trim();
                let currDocs = (curr.required_docs && curr.required_docs.length > 0) ? curr.required_docs : null;
                if (!currDocs) {
                  currDocs = [{ name: suffix, has: false }];
                }
                return [...acc, ...currDocs.filter(d => d.name && !acc.some(existing => existing.name === d.name))];
              }, []),
              done: all.every(a => !!a.done),
              priority: Math.min(...all.map(a => a.priority || 5))
            });
            continue;
          }
        }
        finalResult.push(t);
        processedIds.add(t.id);
      }
    });

    return finalResult;
  }, [phaseFiltered, viewMode]);

  const displayTasks = displayTasksRaw;

  // Phase completion celebration effect
  useEffect(() => {
    if (!isInitialised || !displayTasks.length) return
    
    const phaseGroups = {}
    displayTasks.forEach(task => {
      const groupKey = viewMode === 'phase' ? task.category : (task.phase_title || 'Preparation')
      if (!phaseGroups[groupKey]) phaseGroups[groupKey] = []
      phaseGroups[groupKey].push(task)
    })

    Object.entries(phaseGroups).forEach(([phaseName, phaseTasks]) => {
      const isAllDone = phaseTasks.length > 0 && phaseTasks.every(t => t.done)

      if (isAllDone && !celebratedPhases.has(phaseName)) {
        setCelebratedPhases(prev => new Set([...prev, phaseName]))

        // User triggered completion: celebrate!
        const phaseEmoji = getPhaseEmoji(phaseName) || '✨'
        setMicroMsg({ text: `${phaseEmoji} ${phaseName.replace(/_/g, ' ')} Complete!`, color: 'var(--sage)' })
        setTimeout(() => setMicroMsg(null), 4000)

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#5c8c75', '#7ba091', '#d47c3f', '#f2c94c']
        })
      }
    })
  }, [displayTasks, celebratedPhases, viewMode, isInitialised])

  const recommendedId = tasks.filter(t => !t.done).sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5))[0]?.id

  const [plannerModalOpen, setPlannerModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // Calculate clash count for the widget
  const clashCount = useMemo(() => {
    const tasksByDate = {}
    tasks.forEach(t => {
      if (!t.due_date) return
      const key = new Date(t.due_date).toISOString().split('T')[0]
      if (!tasksByDate[key]) tasksByDate[key] = []
      tasksByDate[key].push(t)
    })

    const personalByDate = {}
    personalEvents.forEach(e => {
      const key = e.event_date
      if (!personalByDate[key]) personalByDate[key] = []
      personalByDate[key].push(e)
    })

    return Object.keys(tasksByDate).filter(date => personalByDate[date]?.length > 0).length
  }, [tasks, personalEvents])


  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14 }}>
        <Loader2 size={20} color="var(--amber)" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--muted)', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Loading your plan...</span>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ padding: '32px 32px 80px', maxWidth: 1440, margin: '0 auto', width: '100%' }}
    >
      {/* ── Back button ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--amber)', fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em', padding: 0, textTransform: 'uppercase', opacity: 0.8 }}
        >
          <ArrowLeft size={14} /> Event History
        </button>
      </div>

      {/* ── MAIN ROADMAP & DOCUMENTS (Full Width, No Split) ────────────────────────────────────────── */}
      <div style={{ width: '100%' }}>
          {/* ── Focused Event Header ─────────────────────────────────────────── */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '10px 14px', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: 20, 
            border: '1px solid rgba(255,255,255,0.08)', 
            marginBottom: 24,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <div style={{ 
                width: 128, height: 128, borderRadius: 16, 
                background: 'rgba(0,0,0,0.4)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
              }}>
                <img 
                  src={getEventIcon(planTitle || '').image || journey?.visuals?.image} 
                  alt="" 
                  loading="lazy"
                  width={128}
                  height={128}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <h1 className="font-playfair" style={{ fontSize: 42, fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.01em' }}>{journey?.display_title || journey?.title || planTitle}</h1>
                  <span style={{ fontSize: 10, background: 'var(--amber)', color: 'black', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>SAVED</span>
                </div>
                
                {(journey?.description || planDescription) && (
                  <p style={{ fontSize: 15, color: 'var(--fog)', lineHeight: 1.5, maxWidth: 600, margin: '8px 0 0 0' }}>
                    {journey?.description || planDescription}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, position: 'relative' }}>
                  <button 
                    onClick={() => setShowCalendar(!showCalendar)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                  >
                    <Calendar size={13} color="var(--amber)" />
                  </button>
                  <span 
                    onClick={() => setShowCalendar(!showCalendar)}
                    style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {journey?.start_date ? new Date(journey.start_date).toLocaleDateString() : 'Set Start Date'}
                  </span>
                  
                  <AnimatePresence>
                    {showCalendar && (
                      <>
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setShowCalendar(false)}
                          style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            zIndex: 999,
                            background: 'transparent'
                          }}
                        />
                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', zIndex: 1000 }}>
                          <CustomDarkCalendar 
                            selectedDate={journey?.start_date ? new Date(journey.start_date) : new Date()}
                            onSelect={async (date) => {
                               const newDate = date.toISOString().split('T')[0]
                               try {
                                 await updateLifeEvent(planId, { start_date: newDate })
                                 fetchJourney()
                                 setShowCalendar(false)
                               } catch (err) {
                                 console.error('Failed to update start date:', err)
                               }
                             }}
                             onClose={() => setShowCalendar(false)}
                          />
                        </div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, textAlign: 'right' }}>
              <div>
                <p className="font-mono" style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', margin: 0 }}>{overallProgress}% COMPLETE</p>
                <p style={{ fontSize: 16, color: 'white', fontWeight: 800, margin: 0 }}>{completedCount}/{tasks.length} Steps</p>
              </div>
              <ProgressRing pct={overallProgress} size={80} stroke={6} color={eventColor} />
            </div>
          </div>

          <DocumentStatusDashboard
            requirements={requirements}
            collectedDocs={collectedDocs}
            groupedDocs={groupedDocsData}
            isLoading={docsLoading}
            isExpanded={showDocs}
            onToggleExpand={() => setShowDocs(!showDocs)}
            onNavigateToVault={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'vault' }))}
          />


          <AnimatePresence>
            {showDocs && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 24 }}>
                <RequirementsCard data={requirements} collectedIds={collectedDocs} onToggleDoc={toggleDoc} onGroupedDocs={() => {}} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Journey Progress Section (from Dashboard) ── */}
          <div style={{ marginBottom: 40, marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
               <div>
                  <h4 className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: eventColor || 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0, opacity: 0.8 }}>
                     Event Progress
                  </h4>
                  <motion.p 
                     key={overallProgress}
                     initial={{ scale: 0.95, opacity: 0.8 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="font-playfair" 
                     style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '4px 0 0 0', letterSpacing: '-0.02em' }}
                  >
                     {overallProgress}% Roadmap complete
                  </motion.p>
               </div>
               <span className="font-mono" style={{ fontSize: 13, fontWeight: 900, color: eventColor || 'var(--amber)', letterSpacing: '0.1em' }}>
                  {completedCount} / {tasks.length}
               </span>
            </div>
            
            <div style={{ position: 'relative' }}>
               {/* Micro Celebration Bubble */}
               <AnimatePresence>
                 {microMsg && (
                   <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.9 }}
                     animate={{ opacity: 1, y: -45, scale: 1 }}
                     exit={{ opacity: 0, y: -60, scale: 0.8 }}
                     style={{
                       position: 'absolute',
                       left: `${overallProgress}%`,
                       transform: 'translateX(-50%)',
                       background: 'rgba(0,0,0,0.85)',
                       backdropFilter: 'blur(10px)',
                       padding: '8px 16px',
                       borderRadius: 12,
                       border: `1px solid ${microMsg.color}`,
                       whiteSpace: 'nowrap',
                       zIndex: 100,
                       boxShadow: `0 10px 25px ${microMsg.color}44`
                     }}
                   >
                     <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{microMsg.text}</span>
                   </motion.div>
                 )}
               </AnimatePresence>

               {/* Main Bar Track */}
               <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                  <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${overallProgress}%` }}
                     transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                     style={{ 
                        height: '100%', 
                        background: eventColor || 'var(--amber)',
                        borderRadius: 10,
                        boxShadow: `0 0 20px ${eventColor || 'var(--amber)'}44` 
                     }} 
                  />
               </div>
            </div>
          </div>

          <SmartAlerts />

          {/* ── Parallel Tasks Suggestion ──────────────────────────────────────── */}
          <ParallelTasksSuggestion
            tasks={tasks}
            onTaskClick={(taskId) => {
              const taskElement = document.getElementById(`task-${taskId}`)
              if (taskElement) {
                taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                taskElement.style.animation = 'highlight-pulse 2s ease-out'
              }
            }}
          />

          {phases.length > 0 && (
            <PhaseStrip 
              phases={phases} 
              tasks={tasks} 
              selectedPhase={selectedPhase} 
              viewMode={viewMode} 
              onSelectPhase={setSelectedPhase} 
              themeColor={eventColor}
              themeColorName={eventColorName}
            />
          )}

          {/* ── Tasks Heading & Controls ─────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 20 }}>
            <h2 className="font-playfair" style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: 0 }}>Your Route Map</h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { id: 'timeline', label: 'Timeline', icon: <Clock size={16} />, color: 'var(--emerald)' },
                  { id: 'phase', label: 'Category', icon: <Layers size={16} />, color: 'var(--amber)' },
                  { id: 'today', label: 'Today', icon: <Focus size={16} />, color: 'var(--amber)' }
                ].map(v => {
                  const isCurrent = (v.id === 'today' && showTodayOnly) || (v.id === viewMode && !showTodayOnly)
                  return (
                    <button
                      key={v.id}
                      onClick={() => { if (v.id === 'today') { setShowTodayOnly(true); setSelectedPhase(null) } else { setViewMode(v.id); setShowTodayOnly(false) } }}
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
                      onMouseEnter={e => !isCurrent && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => !isCurrent && (e.currentTarget.style.background = 'transparent')}
                    >
                      {v.icon} {v.label}
                    </button>
                  )
                })}
              </div>
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
                {hideCompleted ? <EyeOff size={16} /> : <Eye size={16} />} {hideCompleted ? 'Show all' : 'Hide done'}
              </button>
              <button
                onClick={() => setEditMode(m => !m)}
                style={{
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 10,
                  background: editMode ? 'rgba(212,124,63,0.15)' : 'rgba(255,255,255,0.04)',
                  color: editMode ? 'var(--amber)' : 'rgba(255,255,255,0.6)',
                  border: `1px solid ${editMode ? 'rgba(212,124,63,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <ArrowRight size={16} style={{ transform: editMode ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                {editMode ? 'Done Editing' : 'Edit'}
              </button>
            </div>
          </div>

          <AnimatePresence>{focusMode && <FocusModePanel tasks={tasks} />}</AnimatePresence>

          {!focusMode && (
            <>
              {/* Milestone bubble */}
              <AnimatePresence>
                {microMsg && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: 20, marginBottom: 16, background: 'rgba(255,255,255,0.05)', border: `1px solid ${microMsg.color}` }}
                  >
                    <span className="font-mono" style={{ fontSize: 10, fontWeight: 800, color: 'white' }}>{microMsg.text}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Task List ────────────────────────────────────────────────────── */}
              <div style={{ position: 'relative', paddingLeft: 44, marginBottom: 60 }}>
                <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: 'rgba(212,124,63,0.3)', borderRadius: 1 }} />
                {(() => {
                  const phaseGroups = []
                  displayTasks.forEach(task => {
                    const groupKey = viewMode === 'phase' ? task.category : (task.phase_title || 'Preparation')
                    const last = phaseGroups[phaseGroups.length - 1]
                    if (last && last.phase === groupKey) last.tasks.push(task)
                    else phaseGroups.push({ phase: groupKey, tasks: [task] })
                  })
                  if (phaseGroups.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No tasks found for this view.</div>

                  return phaseGroups.map(group => {
                    const doneCount = group.tasks.filter(t => t.done).length
                    const isAllDone = group.tasks.length > 0 && doneCount === group.tasks.length
                    const pct = Math.round((doneCount / group.tasks.length) * 100)
                    const groupCategory = group.tasks.find(t => t.phase_category)?.phase_category ?? null
                    const emoji = getPhaseEmoji(group.phase, groupCategory) || '📍'

                    return (
                      <div key={group.phase} style={{ marginBottom: 32 }}>
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18 }}>{emoji}</span>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'white' }}>
                              {(() => {
                                try {
                                  return decodeURIComponent(group.phase).replace(/_/g, ' ');
                                } catch {
                                  return (group.phase || '').replace(/_/g, ' ');
                                }
                              })()}
                            </h3>
                            {isAllDone ? (
                              <span style={{ background: 'rgba(92,140,117,0.15)', color: 'var(--sage)', fontSize: 8, fontWeight: 800, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Complete</span>
                            ) : (
                              <span style={{ color: 'var(--amber)', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>{pct}% Completed</span>
                            )}
                          </div>
                          <div style={{ paddingLeft: 28, marginTop: 2 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>{doneCount}/{group.tasks.length} TASKS</span>
                          </div>
                        </div>
                        {editMode ? (
                          <Reorder.Group
                            axis="y"
                            values={group.tasks}
                            onReorder={newOrder => {
                              setTasks(prev => {
                                const phaseIds = new Set(newOrder.map(t => String(t.id)))
                                const otherTasks = prev.filter(t => !phaseIds.has(String(t.id)))
                                return [...otherTasks, ...newOrder]
                              })
                            }}
                            style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}
                          >
                            {group.tasks.map(task => (
                              <Reorder.Item key={task.id} value={task} id={`task-${task.id}`} style={{ listStyle: 'none' }}>
                                <JourneyTaskCard
                                  task={task}
                                  editMode={true}
                                  onToggleDone={toggleTask}
                                  onOpenGuide={t => setGuideTask(t)}
                                  onNavigate={onNavigate}
                                  onEditDays={editTaskDays}
                                  onEditPriority={editTaskPriority}
                                  onEditScheduledDate={handleScheduledDateChange}
                                  onDeleteTask={deleteTask}
                                  onToggleSubtask={toggleSubtask}
                                  onAddSubtask={addSubtask}
                                  onDeleteSubtask={deleteSubtask}
                                  onOpenPlanner={() => setPlannerModalOpen(true)}
                                  startDate={journey?.start_date}
                                />
                              </Reorder.Item>
                            ))}
                          </Reorder.Group>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {group.tasks.map(task => (
                              <div id={`task-${task.id}`} key={task.id}>
                                <JourneyTaskCard
                                  task={task}
                                  editMode={false}
                                  onToggleDone={toggleTask}
                                  onOpenGuide={t => setGuideTask(t)}
                                  onNavigate={onNavigate}
                                  onEditDays={editTaskDays}
                                  onEditPriority={editTaskPriority}
                                  onEditScheduledDate={handleScheduledDateChange}
                                  onDeleteTask={deleteTask}
                                  onToggleSubtask={toggleSubtask}
                                  onAddSubtask={addSubtask}
                                  onDeleteSubtask={deleteSubtask}
                                  onOpenPlanner={() => setPlannerModalOpen(true)}
                                  startDate={journey?.start_date}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            </>
          )}
        </div>

      {/* ── Conflicts badge + DayPlanner modal ─────────────────────── */}
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

      {/* ── Ask Your Plan — floating speech bubble button ─────────────────── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring', damping: 18, stiffness: 260 }}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setChatOpen(true)}
        title="Ask Your Plan"
        style={{
          position: 'fixed',
          right: 32,
          bottom: 40,
          background: 'rgba(32,56,42,0.98)',
          border: '1px solid rgba(92,140,117,0.5)',
          borderRadius: 50,
          cursor: 'pointer',
          zIndex: 50,
          padding: '16px 32px 16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          backdropFilter: 'blur(16px)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 20px rgba(92,140,117,0.15)',
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="none">
          <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" fill="#5c8c75" />
          <circle cx="9" cy="12" r="1.2" fill="white" />
          <circle cx="12" cy="12" r="1.2" fill="white" />
          <circle cx="15" cy="12" r="1.2" fill="white" />
        </svg>
        <span style={{
          fontSize: 17,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 800,
          color: 'rgba(255,255,255,1)',
          letterSpacing: '0.01em',
        }}>Ask me</span>
      </motion.button>

      {/* ── Ask Your Plan — slide-in chat panel ───────────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChatOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
              padding: '24px',
            }}
          >
            <motion.div
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 460,
                height: '80vh',
                background: 'var(--forest-card)',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Panel header */}
              <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="none">
                    <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" fill="#5c8c75" />
                    <circle cx="9" cy="12" r="1.2" fill="white" />
                    <circle cx="12" cy="12" r="1.2" fill="white" />
                    <circle cx="15" cy="12" r="1.2" fill="white" />
                  </svg>
                  <div>
                    <h3 className="font-playfair" style={{ fontSize: 15, fontWeight: 800, color: 'white', margin: 0 }}>Ask Your Plan</h3>
                    <p style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600, margin: '2px 0 0 0', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Navigator · Knows your full plan</p>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--muted)' }}
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
              {/* Chat body — fills remaining height */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <PlanChat lifeEventId={planId} planTitle={planTitle} embedded />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {plannerModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPlannerModalOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              padding: '24px',
            }}
          >
            <motion.div
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 420, maxHeight: '85vh', overflowY: 'auto',
                background: 'var(--forest-card)',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
              className="custom-scrollbar"
            >
              <div style={{ padding: '20px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ padding: 8, borderRadius: 8, background: 'rgba(212,124,63,0.15)', border: '1px solid rgba(212,124,63,0.25)' }}>
                    <Clock size={16} color="var(--amber)" />
                  </div>
                  <div>
                    <h3 className="font-playfair" style={{ fontSize: 16, fontWeight: 800, color: 'white', margin: 0 }}>Daily Planner</h3>
                    <p style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600, margin: '2px 0 0 0' }}>Reality check your schedule</p>
                  </div>
                </div>
                <button
                  onClick={() => setPlannerModalOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--muted)' }}
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                <DayPlannerPanel
                  tasks={tasks}
                  personalEvents={personalEvents}
                  onAddEvent={addPersonalEvent}
                  onRemoveEvent={removePersonalEvent}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes highlight-pulse{
          0%{box-shadow:0 0 0 0 rgba(92,140,117,0.7)}
          50%{box-shadow:0 0 0 15px rgba(92,140,117,0)}
          100%{box-shadow:0 0 0 0 rgba(92,140,117,0)}
        }
        .schedule-sidebar::-webkit-scrollbar { width: 4px; }
        .schedule-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 2px; }
        .schedule-sidebar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
      `}</style>
      
      <VictoryModal 
        isOpen={isVictoryOpen} 
        onClose={() => setIsVictoryOpen(false)} 
        planTitle={planTitle} 
        stats={{ tasks: tasks.length, docs: docStats.total }}
      />

      <GuidePanel
        task={guideTask}
        planId={planId}
        onClose={() => setGuideTask(null)}
        onMarkDone={() => {
          if (guideTask?.id) toggleTask(guideTask.id)
          setGuideTask(null)
        }}
        onToggleSubtask={toggleSubtask}
        onNavigate={onNavigate}
      />
    </motion.div>
  )
}

function ConflictResolutionModal({ task, conflictingTasks, proposedDate, onResolve, onClose }) {
  if (!task || !proposedDate) return null
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{
          background: 'var(--forest-card)', padding: 32, borderRadius: 24,
          maxWidth: 500, width: '100%', border: '1px solid rgba(255,191,0,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)', cursor: 'default'
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



