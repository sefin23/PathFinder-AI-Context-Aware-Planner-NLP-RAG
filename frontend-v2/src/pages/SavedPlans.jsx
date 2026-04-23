import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getLifeEvents, deleteLifeEvent } from '../api/backend'
import { getVaultDocs } from '../api/vault'
import { getEventVisuals } from '../api/EventSymbols'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import { 
  Search, 
  ArrowRight, 
  Trash2, 
  Clock, 
  LayoutDashboard, 
  Calendar, 
  Trophy, 
  TrendingUp, 
  FileText,
  Check
} from 'lucide-react'

/**
 * SavedPlans — Premium "Event History" view.
 * Matches the requested aesthetic from the user's provided goal image (Image 1).
 */
export default function SavedPlans({ onViewDetail }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('ALL') // ALL, COMPLETED, ACTIVE
  
  // Custom delete modal state
  const [deleteId, setDeleteId] = useState(null)
  const [deleteTitle, setDeleteTitle] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [vaultDocs, setVaultDocs] = useState([])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [plansData, vaultData] = await Promise.all([
          getLifeEvents(),
          getVaultDocs()
        ])
        setPlans(plansData || [])
        setVaultDocs(vaultData || [])
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])
  
  const handleDeleteEvent = async (id, title, e) => {
     if (e) e.stopPropagation();
     setDeleteError(null)
     setDeleteId(id)
     setDeleteTitle(title)
  }

  const confirmDelete = async () => {
     if (!deleteId) return;
     try {
       setIsDeleting(true)
       setDeleteError(null)
       await deleteLifeEvent(deleteId)
       setPlans(prev => prev.filter(p => p.id !== deleteId))
       setDeleteId(null)
     } catch (err) {
       console.error("Failed to delete event:", err)
       setDeleteError(err?.response?.data?.detail ?? "Could not erase this roadmap. Please check your connection.")
     } finally {
       setIsDeleting(false)
     }
  }

  const filteredPlans = useMemo(() => {
    return [...plans]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .filter(p => {
        const title = (p.display_title || p.title || '').toLowerCase()
        const description = (p.description || '').toLowerCase()
        const matchesSearch = title.includes(searchQuery.toLowerCase()) || description.includes(searchQuery.toLowerCase())
        
        const status = p.status?.toUpperCase() || 'ACTIVE'
        const matchesStatus = 
          activeFilter === 'ALL' || 
          (activeFilter === 'ACTIVE' && status !== 'COMPLETED') ||
          (activeFilter === 'COMPLETED' && status === 'COMPLETED')
        
        return matchesSearch && matchesStatus
      })
  }, [plans, searchQuery, activeFilter])

  // Stats calculation
  const stats = useMemo(() => {
    const total = plans.length
    const completed = plans.filter(p => p.status === 'completed').length
    const inProgress = total - completed
    const docsTotal = vaultDocs.length 
    
    return [
      { label: 'TOTAL EVENTS', value: total, icon: LayoutDashboard, color: 'var(--sky)' },
      { label: 'COMPLETED', value: completed, icon: Trophy, color: 'var(--emerald)' },
      { label: 'IN PROGRESS', value: inProgress, icon: TrendingUp, color: 'var(--gold)' },
      { label: 'DOCS HANDLED', value: docsTotal, icon: FileText, color: 'var(--amber)' }
    ]
  }, [plans])

  return (
    <div style={{
      padding: '40px 48px',
      minHeight: '100vh',
      maxWidth: 1200,
      margin: '0 auto',
      background: 'transparent'
    }}>
      {/* Top Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 48
      }}>
        <div>
          <h1 className="font-playfair" style={{
            fontSize: 48,
            fontWeight: 900,
            color: 'white',
            margin: 0,
            lineHeight: 1.1
          }}>
            Event History
          </h1>
          <p style={{
            color: 'var(--muted)',
            fontSize: 14,
            marginTop: 8,
            fontWeight: 500
          }}>
            Explore your active life roadmaps and strategic planning logs.
          </p>
        </div>

        <div />
      </div>

      {/* Stats Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 24,
        marginBottom: 56
      }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 20
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <stat.icon size={18} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                {stat.value}
              </div>
              <div className="font-mono" style={{ fontSize: 8, color: 'var(--muted)', marginTop: 4, letterSpacing: '0.12em' }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Primary Interaction Row (Search + Tabs) */}
      <div style={{
        marginBottom: 44,
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px'
      }}>
        <div style={{
          position: 'relative',
          flex: 1
        }}>
          <Search size={18} style={{ 
            position: 'absolute', left: 20, top: '50%', 
            transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' 
          }} />
          <input
            type="text"
            placeholder="Search events or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '14px 16px 14px 54px',
              color: 'white',
              fontSize: 14,
              outline: 'none',
              fontFamily: "'DM Sans', sans-serif"
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 20, marginLeft: 32 }}>
          {['ALL', 'COMPLETED', 'ACTIVE'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeFilter === f ? 'white' : 'rgba(255,255,255,0.25)',
                fontSize: 10,
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: 'pointer',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'color .2s'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
           <motion.div
             animate={{ rotate: 360 }}
             transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
             style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--amber)', borderRadius: '50%' }}
           />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: 'rgba(255,255,255,0.01)',
          borderRadius: 32,
          border: '1px dashed rgba(255,255,255,0.08)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 20, opacity: 0.5 }}>📂</div>
          <h3 style={{ fontSize: 20, color: 'white', marginBottom: 12 }}>Archive Empty</h3>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No data points matching your query.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {filteredPlans.map((plan, idx) => (
            <HistoryCard 
              key={plan.id}
              plan={plan}
              index={idx}
              total={filteredPlans.length}
              onOpen={() => onViewDetail(plan)}
              onDelete={(e) => handleDeleteEvent(plan.id, plan.display_title || plan.title, e)}
            />
          ))}
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={!!deleteId}
        onClose={() => {
          if (!isDeleting) setDeleteId(null)
        }}
        onConfirm={confirmDelete}
        planTitle={deleteTitle}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </div>
  )
}

function _derivePlanTitle(plan) {
  const raw = plan.display_title || plan.title || ''
  const generic = ['new event', 'event', 'life event', 'personal event', 'untitled']
  if (!generic.includes(raw.toLowerCase())) return raw
  // Try to derive from stored metadata
  try {
    const meta = JSON.parse(plan.metadata_json || '{}')
    if (meta.event_types && meta.event_types.length > 0) {
      const label = meta.event_types[0].replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      const loc = plan.location && plan.location.toLowerCase() !== 'null' ? plan.location : null
      return loc ? `${label} in ${loc}` : label
    }
  } catch { /* ignore */ }
  return raw || 'Personal Planning Journey'
}

function HistoryCard({ plan, index, total, onOpen, onDelete }) {
  const planTitle = _derivePlanTitle(plan)
  // Always recalculate visuals locally to ensure latest icon mapping, fallback to saved visuals if function fails
  const visuals = getEventVisuals(planTitle, planTitle) || plan.visuals
  const { color, emoji, label, colorName, image } = visuals
  const isCompleted = plan.status === 'completed'
  const progress = plan.progress_pct || 0
  const eventNum = (total - index).toString().padStart(3, '0')
  const dateStr = new Date(plan.created_at).toLocaleDateString()

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={onOpen}
      whileHover={{ scale: 1.002, borderColor: 'rgba(255,255,255,0.15)', cursor: 'pointer' }}
      style={{
        background: 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(24px)',
        border: '1.5px solid rgba(255,255,255,0.06)',
        borderRadius: 24,
        display: 'flex',
        minHeight: 340,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        cursor: 'pointer'
      }}
    >
      <div style={{ width: 6, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column' }}>
        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            background: color,
            color: 'var(--ink)',
            padding: '4px 10px',
            borderRadius: 4,
            fontWeight: 800,
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            EVENT #{eventNum}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 800, fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
            SAVED: <span style={{ color: 'rgba(255,255,255,0.5)' }}>{dateStr}</span>
          </div>
        </div>

        {/* Title Block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <h2 className="font-playfair" style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>
            {planTitle}
          </h2>
          {/* Faux edit pen */}
          <div style={{ opacity: 0.15, fontSize: 13 }}>🖋</div>
        </div>

        {/* Status Badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <span style={{
            padding: '4px 12px',
            background: `rgba(var(--${colorName}-rgb), 0.15)`,
            color: color,
            borderRadius: 4,
            fontSize: 8,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            {isCompleted ? 'COMPLETED' : 'ACTIVE EVENT'}
          </span>
          <span style={{
            padding: '4px 12px',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.6)',
            borderRadius: 4,
            fontSize: 8,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: "'JetBrains Mono', monospace",
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {label}
          </span>
        </div>

        {/* Factual Context Strip */}
        <div style={{
          fontSize: 12,
          color: '#b8cfc7', // Precise muted fog color
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.02em',
          marginBottom: 32,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 12px',
          alignItems: 'center',
          fontWeight: 400
        }}>
          {(() => {
            const facts = [];
            const pageTitle = (plan.display_title || plan.title || "").toLowerCase();
            
            // 1. Location Fact (With sniffing fallback for old plans)
            let loc = plan.location;
            // Guard against string "null" returned by LLM instead of JSON null
            if (!loc || loc.toLowerCase() === 'null') {
              loc = null;
              const cities = ["mumbai", "bangalore", "delhi", "pune", "hyderabad", "chennai", "kolkata", "london", "ny", "nyc", "york"];
              const found = cities.find(c => pageTitle.includes(c));
              if (found) loc = found.charAt(0).toUpperCase() + found.slice(1);
            }
            if (loc) facts.push(loc);
            
            // 2. Timeline / Phase logic
            if (plan.timeline) facts.push(plan.timeline);
            
            // 3. Sub-type / Metadata facts
            if (plan.metadata_json) {
              try {
                const meta = JSON.parse(plan.metadata_json);
                if (meta.event_types && meta.event_types.length > 0) {
                  const subType = meta.event_types[0].replace(/_/g, ' ').toLowerCase();
                  if (!pageTitle.includes(subType)) {
                    facts.push(subType.charAt(0).toUpperCase() + subType.slice(1));
                  }
                }
              } catch (e) { /* ignore */ }
            }

            // 4. Start Date fact (Only if explicitly set, not a placeholder)
            if (plan.start_date) {
              const d = new Date(plan.start_date);
              facts.push(`Planned for: ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
            } else {
              // Primary fallback if no date was set: show Creation Date
              facts.push(`Created: ${new Date(plan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
            }

            return facts.map((f, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {i > 0 && <span style={{ opacity: 0.5 }}>·</span>}
                {f}
              </span>
            ));
          })()}
        </div>

        <div style={{ marginTop: 'auto' }}>
          {/* Specific Progress Tracker UI from Image 1 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>PROGRESS TRACKER</span>
              <span className="font-mono" style={{ fontSize: 9, color: color, letterSpacing: '0.12em' }}>ACTIVE TASKS</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: 24,
                right: 24,
                height: 2,
                backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.1) 60%, transparent 60%, transparent 100%)',
                backgroundSize: '16px 2px',
                zIndex: 0
              }} />

              <ProgressNode type="CHECK" color={color} active={progress >= 25} />
              <div style={{ flex: 1 }} />
              <ProgressNode type="CURRENT" color={color} active={progress >= 50 && progress < 100} />
              <div style={{ flex: 1 }} />
              <ProgressNode type="EMPTY" color={color} active={false} />
              <div style={{ flex: 1 }} />
              <ProgressNode type="EMPTY" color={color} active={false} />
            </div>
          </div>

          {/* Action Level Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, color: color, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", opacity: 0.8 }}>
                <Clock size={13} color={color} /> {isCompleted ? 'ARCHIVED' : 'STRATEGIC ROADMAP'}
              </div>
              <motion.div 
                whileHover={{ opacity: 1, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onDelete}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  fontSize: 11, 
                  fontWeight: 800, 
                  color: '#ff6b6b', 
                  textTransform: 'uppercase', 
                  cursor: 'pointer', 
                  fontFamily: "'JetBrains Mono', monospace",
                  opacity: 0.8,
                  transition: 'opacity 0.2s ease'
                }}
              >
                <Trash2 size={13} /> REMOVE EVENT
              </motion.div>
            </div>
            
            <button 
              onClick={onOpen}
              className="mbtn"
              style={{
                background: '#c16a30', 
                color: 'white',
                borderRadius: 12,
                padding: '10px 28px',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 13,
                fontWeight: 900,
                boxShadow: '0 4px 12px rgba(212, 124, 63, 0.2)',
                cursor: 'pointer'
              }}
            >
              View Roadmap <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Hero Illustration Side - Edge-to-Edge 3D Asset */}
      <div style={{
        width: 280,
        position: 'relative',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'stretch'
      }}>
        <img 
          src={image} 
          alt={label} 
          loading="lazy"
          width={280}
          height={340}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            display: 'block'
          }} 
        />
        
        {/* Subtle Inner Glow Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(to right, rgba(0,0,0,0.2) 0%, transparent 20%, transparent 80%, rgba(var(--${colorName}-rgb), 0.05) 100%)`,
          pointerEvents: 'none'
        }} />

        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          color: color,
          fontSize: 9,
          fontWeight: 900,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.1em'
        }}>
          {label.toUpperCase()}
        </div>
      </div>
    </motion.div>
  )
}

function ProgressNode({ type, color }) {
  if (type === 'CHECK') {
    return (
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        boxShadow: `0 0 12px ${color}44`
      }}>
        <Check size={14} color="black" strokeWidth={4} />
      </div>
    )
  }

  if (type === 'CURRENT') {
    return (
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        border: `3px solid ${color}`,
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1
      }}>
        <div style={{ 
          width: 8, 
          height: 8, 
          borderRadius: '50%', 
          background: color 
        }} />
      </div>
    )
  }

  return (
    <div style={{
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.03)',
      border: '2px solid rgba(255,255,255,0.1)',
      zIndex: 1
    }} />
  )
}
