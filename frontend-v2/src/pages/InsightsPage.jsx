/**
 * InsightsPage — Mission control for your life navigation.
 * Layout: hero header → 4 stat cards → two-column body → life path timeline
 */
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getLifeEvents } from '../api/backend'
import { getEventVisuals } from '../api/EventSymbols'
import { AlertCircle, Compass, CheckSquare, Zap, Layers } from 'lucide-react'

// ── Data helpers ──────────────────────────────────────────────────────────────

function computeTaskStats(events) {
  let total = 0, done = 0
  events.forEach(ev => {
    ;(ev.tasks || []).forEach(t => {
      total++
      if (t.status === 'completed') done++
    })
  })
  return { total, done }
}

function computeWeeklyActivity(events) {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const planned = new Array(7).fill(0)
  const resolved = new Array(7).fill(0)

  events.forEach(ev => {
    ;(ev.tasks || []).forEach(t => {
      const raw = t.scheduled_date || ev.created_at
      if (!raw) return
      const dow = (new Date(raw).getDay() + 6) % 7 // Mon=0
      planned[dow]++
      if (t.status === 'completed') resolved[dow]++
    })
  })

  return DAYS.map((day, i) => ({ day, planned: planned[i], resolved: resolved[i] }))
}

function computeBottlenecks(events) {
  const now = new Date()
  const items = []

  events.forEach(ev => {
    ;(ev.tasks || []).forEach(t => {
      if (t.status === 'completed') return
      if (t.scheduled_date) {
        const daysLate = Math.floor((now - new Date(t.scheduled_date)) / 86400000)
        if (daysLate > 0) {
          items.push({ title: t.title, daysLate, high: daysLate > 14 })
        }
      }
    })
  })

  // Fallback: show oldest pending tasks if nothing is overdue
  if (items.length === 0) {
    events.forEach(ev => {
      ;(ev.tasks || []).forEach(t => {
        if (t.status !== 'completed') {
          items.push({ title: t.title, daysLate: 0, high: false })
        }
      })
    })
  }

  return items.sort((a, b) => b.daysLate - a.daysLate).slice(0, 4)
}

function computeAllocation(events) {
  return events.map(ev => {
    const tasks = ev.tasks || []
    const total = tasks.length
    const done = tasks.filter(t => t.status === 'completed').length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    const visuals = getEventVisuals(ev.display_title || ev.title)
    return {
      id: ev.id,
      title: (ev.display_title || ev.title).substring(0, 32),
      pct,
      color: visuals?.color || 'var(--amber)',
    }
  }).slice(0, 5)
}

// ── Components ─────────────────────────────────────────────────────────────────

// rgb strings for rgba() backgrounds (CSS vars can't be used in rgba())
const ACCENT_RGB = {
  gold:     '242,201,76',
  emerald:  '92,140,117',
  amber:    '212,124,63',
  lavender: '123,111,160',
  coral:    '198,93,74',
}

function StatCard({ label, value, sub, icon: Icon, colorVar, rgbKey, index }) {
  const rgb = ACCENT_RGB[rgbKey]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'rgba(14,34,29,0.7)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTop: `2px solid ${colorVar}`,
        borderRadius: 16,
        padding: '22px 24px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <p className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.33)', letterSpacing: '0.12em' }}>
          {label}
        </p>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `rgba(${rgb}, 0.12)`,
          border: `1px solid rgba(${rgb}, 0.22)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} color={colorVar} />
        </div>
      </div>
      <p className="font-playfair" style={{ fontSize: 44, fontWeight: 700, color: colorVar, lineHeight: 1, marginBottom: 8 }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>{sub}</p>
    </motion.div>
  )
}

function BarChart({ data }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.planned, d.resolved)), 1)
  const todayIdx = (new Date().getDay() + 6) % 7
  const hasData = data.some(d => d.planned > 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'white', marginBottom: 5 }}>Journey Activity</h3>
          <p className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.1em' }}>
            VOLUME: AMBER (PLANNED) VS SAGE (RESOLVED)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>Planned</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--emerald)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>Resolved</span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Schedule tasks to see activity data</p>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 130 }}>
          {data.map((d, i) => (
            <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', paddingBottom: 8 }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.planned / maxVal) * 88}%` }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    flex: 1,
                    minHeight: d.planned > 0 ? 4 : 0,
                    background: i === todayIdx ? 'var(--amber)' : 'rgba(212,124,63,0.4)',
                    borderRadius: '3px 3px 0 0',
                    boxShadow: i === todayIdx ? '0 0 10px rgba(212,124,63,0.35)' : 'none',
                  }}
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.resolved / maxVal) * 88}%` }}
                  transition={{ delay: 0.5 + i * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    flex: 1,
                    minHeight: d.resolved > 0 ? 4 : 0,
                    background: 'rgba(92,140,117,0.5)',
                    borderRadius: '3px 3px 0 0',
                  }}
                />
              </div>
              <span className="font-mono" style={{
                fontSize: 9,
                color: i === todayIdx ? 'var(--amber)' : 'rgba(255,255,255,0.22)',
                letterSpacing: '0.04em',
              }}>
                {d.day.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BottleneckDetector({ items }) {
  const hasOverdue = items.some(i => i.daysLate > 0)
  return (
    <div style={{
      background: 'rgba(14,34,29,0.7)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      padding: '22px 24px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <AlertCircle size={15} color="var(--lavender)" />
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>Where do you usually slow down?</h3>
          <p className="font-mono" style={{ fontSize: 9, color: 'rgba(123,111,160,0.65)', letterSpacing: '0.08em', marginTop: 2 }}>
            ✦ AI ANALYZED
          </p>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65, marginBottom: 20 }}>
        PathFinder tracks which steps tend to take you longer than planned — so your next journey starts smarter.
      </p>

      {/* Content */}
      {!hasOverdue ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 12,
          padding: '24px 8px',
        }}>
          <span style={{ fontSize: 36 }}>📖</span>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--emerald)' }}>You're on track so far</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6, maxWidth: 220 }}>
            Complete a few more tasks and PathFinder will show you where to watch your pace next time.
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
            Patterns appear after 2+ completed journeys
          </p>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 0',
              borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.045)' : 'none',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                background: item.high ? 'var(--coral)' : 'var(--amber)',
                boxShadow: item.high ? '0 0 6px rgba(198,93,74,0.5)' : 'none',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: 500,
                  color: 'rgba(255,255,255,0.75)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 3,
                }}>
                  {item.title}
                </p>
                <p className="font-mono" style={{
                  fontSize: 10, letterSpacing: '0.04em',
                  color: item.high ? 'var(--coral)' : item.daysLate > 0 ? 'var(--amber)' : 'rgba(255,255,255,0.28)',
                }}>
                  {item.daysLate > 0 ? `${item.daysLate}d overdue` : 'pending'}
                </p>
              </div>
              {item.high && (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: 'var(--coral)',
                  background: 'rgba(198,93,74,0.1)',
                  border: '1px solid rgba(198,93,74,0.25)',
                  borderRadius: 4, padding: '2px 6px',
                  letterSpacing: '0.06em', flexShrink: 0,
                }}>
                  RESOLVE
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AllocationBars({ items }) {
  if (items.length === 0) return null
  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'white', marginBottom: 4 }}>Life Event Progress</h3>
      <p className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.1em', marginBottom: 20 }}>
        TASK COMPLETION BY PLAN
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.07, duration: 0.4 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="font-mono" style={{
                fontSize: 10, color: 'rgba(255,255,255,0.42)',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%',
              }}>
                {item.title}
              </span>
              <span className="font-mono" style={{ fontSize: 10, color: item.color, letterSpacing: '0.04em' }}>
                {item.pct}%
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.pct}%` }}
                transition={{ delay: 0.6 + i * 0.07, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', background: item.color, borderRadius: 99 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLifeEvents()
      .then(d => setEvents(d || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  const taskStats  = useMemo(() => computeTaskStats(events), [events])
  const weeklyData = useMemo(() => computeWeeklyActivity(events), [events])
  const bottlenecks = useMemo(() => computeBottlenecks(events), [events])
  const allocation  = useMemo(() => computeAllocation(events), [events])

  const activeCount = events.filter(e => e.status !== 'completed').length
  const completionRate = taskStats.total > 0
    ? Math.round((taskStats.done / taskStats.total) * 100)
    : 0

  return (
    <div style={{ padding: '40px 60px 80px', maxWidth: 1600, margin: '0 auto', width: '100%' }}>

      {/* Page label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-mono"
        style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.14em', marginBottom: 20 }}
      >
        PATHFINDER / ANALYTICS
      </motion.p>

      {/* Hero heading */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="font-playfair"
        style={{ fontSize: 36, fontWeight: 700, color: 'white', lineHeight: 1.15, marginBottom: 10 }}
      >
        The State of your{' '}
        <em style={{ color: 'var(--amber)', fontStyle: 'italic' }}>Life Navigation</em>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', maxWidth: 520, lineHeight: 1.65, marginBottom: 36 }}
      >
        A complete view of your plan activity, task velocity, and journey progress.
        Every completed node is a step toward clarity.
      </motion.p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.08)',
            borderTopColor: 'var(--amber)',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>

      ) : events.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingTop: 60 }}>
          <h2 className="font-playfair" style={{ fontSize: 36, color: 'white', marginBottom: 12 }}>Nothing yet.</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', maxWidth: 360, lineHeight: 1.6 }}>
            Create your first life event and your navigation history will appear here.
          </p>
        </motion.div>

      ) : (
        <>
          {/* ── 4 Stat Cards ── */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
            <StatCard
              label="PLANS CREATED"
              value={events.length}
              sub="life events navigated"
              icon={Compass}
              colorVar="var(--gold)"
              rgbKey="gold"
              index={0}
            />
            <StatCard
              label="TASKS COMPLETE"
              value={`${completionRate}%`}
              sub="across all journeys"
              icon={CheckSquare}
              colorVar="var(--emerald)"
              rgbKey="emerald"
              index={1}
            />
            <StatCard
              label="TASKS DONE"
              value={taskStats.done}
              sub="completed milestones"
              icon={Zap}
              colorVar="var(--amber)"
              rgbKey="amber"
              index={2}
            />
            <StatCard
              label="ACTIVE PLANS"
              value={activeCount}
              sub="currently in motion"
              icon={Layers}
              colorVar="var(--lavender)"
              rgbKey="lavender"
              index={3}
            />
          </div>

          {/* ── Two-column body ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'stretch' }}>

            {/* Left: chart + allocation */}
            <div style={{
              background: 'rgba(14,34,29,0.7)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16,
              padding: '24px 28px',
            }}>
              <BarChart data={weeklyData} />
              <AllocationBars items={allocation} />
            </div>

            {/* Right: bottleneck */}
            <BottleneckDetector items={bottlenecks} />

          </div>

        </>
      )}
    </div>
  )
}
