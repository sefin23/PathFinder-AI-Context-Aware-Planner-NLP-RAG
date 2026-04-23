/**
 * JourneysPage — Complete life timeline with month navigation
 * Specification from user chat with Claude (March 2026)
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { getLifeEvents } from '../api/backend'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function _deriveEventTitle(e) {
  const raw = e.display_title || e.title || ''
  const generic = ['new event', 'event', 'life event', 'personal event', 'untitled']
  if (!generic.includes(raw.toLowerCase())) return raw
  try {
    const meta = JSON.parse(e.metadata_json || '{}')
    if (meta.event_types?.length > 0) {
      const label = meta.event_types[0].replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      const loc = e.location && e.location.toLowerCase() !== 'null' ? e.location : null
      return loc ? `${label} in ${loc}` : label
    }
  } catch { /* ignore */ }
  return raw || 'Personal Planning Journey'
}
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const STATUS_FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'active',   label: 'Active' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'done',     label: 'Completed' },
]

const DOMAIN_FILTERS = [
  { id: 'career',     label: '💼 Career' },
  { id: 'relocation', label: '🚚 Relocation' },
  { id: 'home',       label: '🏠 Home' },
  { id: 'startup',    label: '🚀 Business' },
  { id: 'legal',      label: '⚖️ Legal' },
  { id: 'health',     label: '🏥 Medical' },
]

const DOMAIN_CONFIG = {
  career:    { color: '#f2c94c', bg: 'rgba(242,201,76,',  emoji: '💼', label: 'Career' },
  relocation:{ color: '#7ba091', bg: 'rgba(123,160,145,', emoji: '🚚', label: 'Relocation' },
  home:      { color: '#5c8c75', bg: 'rgba(92,140,117,',  emoji: '🏠', label: 'Home' },
  startup:   { color: '#f2c94c', bg: 'rgba(242,201,76,',  emoji: '🚀', label: 'Business' },
  legal:     { color: '#5c8c9e', bg: 'rgba(92,140,158,',  emoji: '⚖️', label: 'Legal' },
  health:    { color: '#c65d4a', bg: 'rgba(198,93,74,',   emoji: '🏥', label: 'Health' },
  marriage:  { color: '#c65d4a', bg: 'rgba(198,93,74,',   emoji: '💍', label: 'Relationships' },
  finance:   { color: '#c9a84c', bg: 'rgba(201,168,76,',  emoji: '💰', label: 'Finance' },
  loss:      { color: 'rgba(255,255,255,.45)', bg: 'rgba(255,255,255,', emoji: '🕊️', label: 'Remembrance' },
}

export default function JourneysPage() {
  const dayStripRef = useRef(null)

  // Date navigation
  const [curMonth, setCurMonth] = useState(new Date().getMonth())
  const [curYear, setCurYear] = useState(new Date().getFullYear())
  const [selDay, setSelDay] = useState(null) // Start with null to show all events in current month
  const [calOpen, setCalOpen] = useState(false)

  // Data
  const [journeys, setJourneys] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [activeStatus, setActiveStatus] = useState('all')
  const [activeDomain, setActiveDomain] = useState('all')

  // Fetch journeys
  useEffect(() => {
    async function fetchJourneys() {
      try {
        setLoading(true)
        const events = await getLifeEvents()
        // Transform backend data to match our model
        const transformed = (events || []).map(e => {
          const start = e.start_date ? new Date(e.start_date) : null
          const end = e.target_date ? new Date(e.target_date) : null

          return {
            id: e.id,
            title: _deriveEventTitle(e),
            domain: detectDomain(e.title, e.display_title),
            status: e.status === 'completed' ? 'done' : e.status === 'active' ? 'active' : 'upcoming',
            start_date: start ? formatDate(start) : null,
            end_date: end ? formatDate(end) : null,
            start_year: start?.getFullYear(),
            start_month: start?.getMonth(),
            start_day: start?.getDate(),
            end_year: end?.getFullYear(),
            end_month: end?.getMonth(),
            end_day: end?.getDate(),
            description: e.description || '',
            progress_pct: e.progress_pct || 0,
            tasks_done: e.tasks?.filter(t => t.status === 'completed').length || 0,
            tasks_total: e.tasks?.length || 0,
            next_task: e.tasks?.find(t => t.status !== 'completed')?.title || null
          }
        })
        setJourneys(transformed)
      } catch (err) {
        console.error('Failed to fetch journeys:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchJourneys()
  }, [])

  // Domain detection from keywords - aligned with EventSymbols.js
  function detectDomain(title, displayTitle) {
    const text = `${title} ${displayTitle}`.toLowerCase()
    if (text.match(/job|career|work|onboard|employ|hire/)) return 'career'
    if (text.match(/move|relocat|transit|arriv|repatriat/)) return 'relocation'
    if (text.match(/home|house|property|apartment|rent|mortgage/)) return 'home'
    if (text.match(/startup|business|company|founding|venture|incorp/)) return 'startup'
    if (text.match(/legal|visa|passport|document|notari|affidavit/)) return 'legal'
    if (text.match(/health|medical|hospital|doctor|clinic|pharmacy/)) return 'health'
    if (text.match(/marr|wedding|relationship|engaged|anniv/)) return 'marriage'
    if (text.match(/loss|grief|funeral|rememb|mourn/)) return 'loss'
    return 'career' // default
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Get days in current month
  const daysInMonth = useMemo(() => {
    const firstDay = new Date(curYear, curMonth, 1)
    const lastDay = new Date(curYear, curMonth + 1, 0)
    const days = []
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(d)
    }
    return days
  }, [curMonth, curYear])

  // Get start offset for calendar grid (Monday = 0)
  const startOffset = useMemo(() => {
    const firstDay = new Date(curYear, curMonth, 1).getDay()
    return firstDay === 0 ? 6 : firstDay - 1 // Convert Sunday=0 to Monday=0
  }, [curMonth, curYear])

  // Check if journey is active on a specific day
  function isJourneyActiveOnDay(journey, year, month, day) {
    if (!journey.start_year) return false
    const check = new Date(year, month, day)
    const start = new Date(journey.start_year, journey.start_month, journey.start_day || 1)

    if (journey.end_year) {
      const end = new Date(journey.end_year, journey.end_month, journey.end_day || 28)
      return check >= start && check <= end
    }
    // Upcoming with no end — show on start day only
    return journey.start_year === year && journey.start_month === month && journey.start_day === day
  }

  // Check if journey is active in entire month
  function isJourneyActiveInMonth(journey, year, month) {
    if (!journey.start_year) return false
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    const start = new Date(journey.start_year, journey.start_month, journey.start_day || 1)

    if (journey.end_year) {
      const end = new Date(journey.end_year, journey.end_month, journey.end_day || 28)
      return end >= monthStart && start <= monthEnd
    }
    // Upcoming — check if start is in this month
    return journey.start_year === year && journey.start_month === month
  }

  // Get colored dots for a day
  function getDotsForDay(year, month, day) {
    const active = journeys.filter(j => isJourneyActiveOnDay(j, year, month, day))
    const colors = [...new Set(active.map(j => DOMAIN_CONFIG[j.domain]?.color || '#f2c94c'))].slice(0, 3)
    return colors
  }

  // Navigate month
  function changeMonth(dir) {
    let m = curMonth + dir
    let y = curYear
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setCurMonth(m)
    setCurYear(y)
    setSelDay(null)
  }

  // Auto-scroll to selected/today on day strip
  useEffect(() => {
    const el = dayStripRef.current?.querySelector('[data-selected="true"]')
             || dayStripRef.current?.querySelector('[data-today="true"]')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selDay, curMonth, curYear])

  // Filter journeys
  const filtered = useMemo(() => {
    return journeys.filter(journey => {
      // Day filter
      const dayOk = selDay === null
        ? isJourneyActiveInMonth(journey, curYear, curMonth)
        : isJourneyActiveOnDay(journey, curYear, curMonth, selDay)

      // Status filter
      const statusOk = activeStatus === 'all' || journey.status === activeStatus

      // Domain filter
      const domainOk = activeDomain === 'all' || journey.domain === activeDomain

      // Search filter
      const q = searchQuery.toLowerCase()
      const searchOk = !q
        || journey.title.toLowerCase().includes(q)
        || journey.description.toLowerCase().includes(q)
        || journey.start_date?.toLowerCase().includes(q)

      return dayOk && statusOk && domainOk && searchOk
    })
  }, [journeys, selDay, curMonth, curYear, activeStatus, activeDomain, searchQuery])

  // Group by status
  const sections = useMemo(() => {
    return [
      { key: 'done',     label: 'COMPLETED' },
      { key: 'active',   label: 'ACTIVE NOW' },
      { key: 'upcoming', label: 'UPCOMING' },
    ].filter(s => filtered.some(j => j.status === s.key))
  }, [filtered])

  // Highlight text
  function highlightText(text, query) {
    if (!query) return text
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} style={{ background: 'rgba(212,124,63,.22)', borderRadius: 2, padding: '0 1px', color: 'inherit' }}>{part}</mark>
        : part
    )
  }

  const now = new Date()
  const today = now.getDate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d1a15, #1a2f26)',
      color: '#f7f4ee',
      paddingBottom: 60
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,.06)'
      }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 26,
          fontWeight: 800,
          color: '#f7f4ee',
          margin: 0
        }}>My Calendar</h1>

        <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }))} style={{
          background: '#d47c3f',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer'
        }}>+ New plan</button>
      </div>

      {/* Month Navigation Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px 8px'
      }}>
        {/* Clickable label */}
        <div
          onClick={() => setCalOpen(!calOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 600,
            color: '#f7f4ee',
            letterSpacing: '0.04em',
            transition: 'color .15s'
          }}>
            {MONTHS[curMonth]} {curYear}
          </span>
          <motion.span
            animate={{ rotate: calOpen ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ fontSize: 11, color: 'rgba(184,207,199,.4)' }}
          >▾</motion.span>
        </div>

        {/* Month nav arrows */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => changeMonth(-1)} style={{
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 6,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#f7f4ee',
            fontSize: 14
          }}>‹</button>
          <button onClick={() => changeMonth(1)} style={{
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 6,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#f7f4ee',
            fontSize: 14
          }}>›</button>
        </div>
      </div>

      {/* Day Strip */}
      <div
        ref={dayStripRef}
        style={{
          display: 'flex',
          gap: 6,
          padding: '0 16px 10px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
        {daysInMonth.map(d => {
          const date = new Date(curYear, curMonth, d)
          const dow = date.getDay()
          const dots = getDotsForDay(curYear, curMonth, d)
          const hasEvents = dots.length > 0
          const isToday = d === today && curMonth === now.getMonth() && curYear === now.getFullYear()
          const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate())

          return (
            <div
              key={d}
              data-selected={d === selDay}
              data-today={isToday}
              onClick={() => hasEvents && setSelDay(selDay === d ? null : d)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 10px',
                borderRadius: 12,
                minWidth: 52,
                border: `1px solid ${d === selDay ? 'rgba(212,124,63,.35)' : 'transparent'}`,
                background: d === selDay ? 'rgba(212,124,63,.16)' : 'transparent',
                opacity: !hasEvents ? 0.2 : isPast ? 0.5 : 1,
                pointerEvents: hasEvents ? 'auto' : 'none',
                cursor: 'pointer',
                transition: 'all .15s',
                flexShrink: 0
              }}
            >
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                textTransform: 'uppercase',
                color: 'rgba(184,207,199,.4)',
                letterSpacing: '0.05em',
                fontWeight: 600
              }}>{DAY_NAMES[dow === 0 ? 6 : dow - 1]}</span>

              <span style={{
                fontSize: 18,
                fontWeight: isToday ? 800 : 600,
                color: d === selDay ? '#f0a96b' : isToday ? '#d47c3f' : '#f7f4ee',
                lineHeight: 1
              }}>{d}</span>

              {/* Dots */}
              <div style={{ display: 'flex', gap: 2, minHeight: 6 }}>
                {dots.map((color, i) => (
                  <div key={i} style={{
                    width: 5, height: 5,
                    borderRadius: '50%',
                    background: color
                  }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Expandable Full Month Calendar Grid */}
      <motion.div
        initial={false}
        animate={{ height: calOpen ? 'auto' : 0, opacity: calOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ overflow: 'hidden', borderTop: calOpen ? '1px solid rgba(255,255,255,.06)' : 'none' }}
      >
        <div style={{ padding: '8px 14px 14px' }}>
          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                textAlign: 'center',
                color: 'rgba(184,207,199,.25)',
                padding: '4px 0'
              }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {/* Empty cells for offset */}
            {Array(startOffset).fill(null).map((_, i) => <div key={`e${i}`} />)}

            {/* Day cells */}
            {daysInMonth.map(d => {
              const dots = getDotsForDay(curYear, curMonth, d)
              const hasEvents = dots.length > 0
              const isSelected = d === selDay
              const isToday = d === today && curMonth === now.getMonth() && curYear === now.getFullYear()

              return (
                <div
                  key={d}
                  onClick={() => hasEvents && setSelDay(selDay === d ? null : d)}
                  style={{
                    height: 40,
                    borderRadius: 7,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    cursor: hasEvents ? 'pointer' : 'default',
                    opacity: hasEvents ? 1 : 0.22,
                    background: isSelected ? 'rgba(212,124,63,.18)' : 'transparent',
                    outline: isSelected ? '1px solid rgba(212,124,63,.35)' : 'none',
                    transition: 'background .12s'
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: isToday ? '#fff' : '#f7f4ee',
                    ...(isToday ? {
                      background: '#d47c3f',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    } : {})
                  }}>{d}</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {dots.map((color, i) => (
                      <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: color }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <div style={{ padding: '10px 16px 6px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,.05)',
          border: `1px solid ${searchQuery ? 'rgba(212,124,63,.4)' : 'rgba(255,255,255,.1)'}`,
          borderRadius: 10,
          padding: '8px 12px',
          transition: 'border-color .15s'
        }}>
          <span style={{ fontSize: 13, opacity: .4 }}>🔍</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search journeys..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#f7f4ee',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              flex: 1
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'rgba(184,207,199,.3)', cursor: 'pointer', fontSize: 14 }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{
        padding: '8px 16px',
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        scrollbarWidth: 'none'
      }}>
        {/* Status filters */}
        {STATUS_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => {
              setActiveStatus(f.id)
              setActiveDomain('all')
            }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              padding: '8px 22px',
              borderRadius: 999,
              border: `1px solid ${activeStatus === f.id ? '#d47c3f' : 'rgba(255,255,255,.1)'}`,
              color: activeStatus === f.id ? '#fff' : 'rgba(184,207,199,.6)',
              background: activeStatus === f.id ? 'rgba(212,124,63, 0.2)' : 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all .2s',
              flexShrink: 0,
              fontWeight: activeStatus === f.id ? '700' : '500'
            }}
          >{f.label}</button>
        ))}

        {/* Divider */}
        <div style={{ width: 1, background: 'rgba(255,255,255,.08)', margin: '0 8px' }} />

        {/* Domain filters */}
        {DOMAIN_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => {
              setActiveDomain(f.id)
              setActiveStatus('all')
            }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              padding: '8px 22px',
              borderRadius: 999,
              border: `1px solid ${activeDomain === f.id ? '#d47c3f' : 'rgba(255,255,255,.1)'}`,
              color: activeDomain === f.id ? '#fff' : 'rgba(184,207,199,.6)',
              background: activeDomain === f.id ? 'rgba(212,124,63, 0.2)' : 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all .2s',
              flexShrink: 0,
              fontWeight: activeDomain === f.id ? '700' : '500'
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Journey Timeline */}
      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(184,207,199,.4)' }}>
            Loading journeys...
          </div>
        ) : sections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🗺</div>
            <div style={{ fontSize: 13, color: 'rgba(184,207,199,.4)' }}>No journeys this period</div>
            <div style={{ fontSize: 11, color: 'rgba(184,207,199,.2)', marginTop: 4 }}>
              Tap another day or clear filters
            </div>
          </div>
        ) : (
          sections.map(section => {
            const sectionJourneys = filtered.filter(j => j.status === section.key)

            return (
              <div key={section.key} style={{ marginBottom: 32 }}>
                {/* Section label */}
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'rgba(184,207,199,.25)',
                  paddingLeft: 44,
                  marginBottom: 10,
                  marginTop: 4
                }}>{section.label}</div>

                {/* Journey items */}
                {sectionJourneys.map((journey, idx) => {
                  const dm = DOMAIN_CONFIG[journey.domain] || DOMAIN_CONFIG.career
                  const isActive = journey.status === 'active'
                  const isDone = journey.status === 'done'
                  const isLastInSection = idx === sectionJourneys.length - 1
                  const statusBadgeLabel = journey.status === 'active' ? 'Active today' : isDone ? 'Completed' : 'Planned'

                  return (
                    <div key={journey.id} style={{ display: 'flex', alignItems: 'stretch', marginBottom: 10 }}>
                      {/* LEFT: circle + vertical strip */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          border: `2px solid ${isActive ? dm.color : 'rgba(255,255,255,.15)'}`,
                          background: `${dm.bg}${isActive ? '0.14' : '0.06'})`,
                          boxShadow: isActive ? `0 0 0 3px ${dm.bg}0.1)` : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          position: 'relative',
                          zIndex: 1,
                          opacity: isDone ? 0.5 : 1
                        }}>
                          {dm.emoji}
                        </div>
                        {!isLastInSection && (
                          <div style={{
                            width: 2,
                            flex: 1,
                            minHeight: 10,
                            margin: '2px auto 0',
                            background: `${dm.bg}0.14)`,
                            borderRadius: 1
                          }} />
                        )}
                      </div>

                      {/* RIGHT: expanded card */}
                      <div style={{
                        flex: 1,
                        borderRadius: 10,
                        border: `1px solid ${dm.bg}${isActive ? '0.25' : '0.14'})`,
                        borderLeft: `3px solid ${dm.color}`,
                        background: `${dm.bg}0.06)`,
                        padding: '12px 14px',
                        opacity: isDone ? 0.45 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10
                      }}>
                        {/* Date range */}
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          color: dm.color,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5
                        }}>
                          <span style={{ fontWeight: 600 }}>{journey.start_date || 'Not set'}</span>
                          {journey.end_date && (
                            <><span style={{ opacity: .45 }}>—</span><span style={{ opacity: .45 }}>{journey.end_date}</span></>
                          )}
                        </div>

                        {/* Title */}
                        <span style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: 15,
                          fontWeight: 700,
                          color: '#f7f4ee',
                          lineHeight: 1.3
                        }}>
                          {highlightText(journey.title, searchQuery)}
                        </span>

                        {/* Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 8,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: `${dm.bg}0.15)`,
                            color: dm.color,
                            border: `1px solid ${dm.bg}0.25)`
                          }}>
                            {statusBadgeLabel}
                          </span>
                          {journey.progress_pct > 0 && (
                            <span style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 8,
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: 'rgba(255,255,255,.05)',
                              color: 'rgba(184,207,199,.4)',
                              border: '1px solid rgba(255,255,255,.08)'
                            }}>{journey.progress_pct}%</span>
                          )}
                        </div>

                        {/* Description */}
                        {journey.description && (
                          <p style={{
                            fontSize: 11,
                            color: 'rgba(184,207,199,.5)',
                            lineHeight: 1.5,
                            margin: 0,
                            fontFamily: "'DM Sans', sans-serif"
                          }}>
                            {journey.description}
                          </p>
                        )}

                        {/* Progress text + bar */}
                        {journey.tasks_total > 0 && (
                          <div>
                            <div style={{ fontSize: 11, color: 'rgba(184,207,199,.5)', marginBottom: 6 }}>
                              {journey.tasks_total - journey.tasks_done} tasks remaining.
                            </div>
                            <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2, overflow: 'hidden' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${journey.progress_pct}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                style={{ height: '100%', background: dm.color, borderRadius: 2 }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Info rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {journey.tasks_total > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(184,207,199,.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>TASKS</span>
                              <span style={{ fontSize: 12, color: '#f7f4ee', fontWeight: 600 }}>{journey.tasks_done}/{journey.tasks_total} done</span>
                            </div>
                          )}
                          {journey.end_date && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(184,207,199,.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>TARGET DATE</span>
                              <span style={{ fontSize: 12, color: '#f7f4ee', fontWeight: 600 }}>{journey.end_date}</span>
                            </div>
                          )}
                          {journey.next_task && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(184,207,199,.4)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>NEXT TASK</span>
                              <span style={{ fontSize: 11, color: dm.color, fontWeight: 600, textAlign: 'right' }}>{journey.next_task}</span>
                            </div>
                          )}
                        </div>

                        {/* Open journey button */}
                        {!isDone && (
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-plan', {
                              detail: { id: journey.id, title: journey.title, description: journey.description }
                            }))}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              width: '100%',
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 9,
                              fontWeight: 600,
                              color: dm.color,
                              background: 'rgba(255,255,255,.03)',
                              border: `1px solid ${dm.bg}0.2)`,
                              borderRadius: 8,
                              padding: '8px 12px',
                              cursor: 'pointer',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              transition: 'all .2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = `${dm.bg}0.12)`}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}
                          >
                            Open journey →
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
