/**
 * Sidebar — left navigation panel.
 * Shows logo, nav links, and recent workflow stubs.
 * Active link is determined by the `activePage` prop.
 */
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Settings,
  Compass,
  ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'New Journey',   icon: Compass },
  { id: 'saved',     label: 'Saved Plans',   icon: BookOpen },
  { id: 'insights',  label: 'Insights',      icon: LayoutDashboard },
  { id: 'settings',  label: 'Settings',      icon: Settings },
]

const RECENT_WORKFLOWS = [
  { id: 1, label: 'Move to London' },
  { id: 2, label: 'Buying a used car' },
  { id: 3, label: 'Marriage registration' },
]

export default function Sidebar({ activePage = 'dashboard', onNavigate }) {
  return (
    <aside
      className="sb-wrap"
      style={{
        width: 240,
        minWidth: 240,
        background: 'rgba(0,0,0,0.32)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: 'var(--space-3) var(--space-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Compass size={16} color="#fff" strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="font-playfair" style={{ fontWeight: 700, fontSize: 16, color: 'white', lineHeight: 1 }}>
            PathFinder
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: 'var(--space-2) 10px', flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 16px',
                borderRadius: isActive ? '0 8px 8px 0' : 8,
                border: 'none',
                borderLeft: isActive ? '3px solid var(--amber)' : '3px solid transparent',
                cursor: 'pointer',
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 2,
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <Icon size={15} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {isActive && <ChevronRight size={13} style={{ opacity: 0.5 }} />}
            </button>
          )
        })}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '16px' }} />

        {/* Recent Workflows */}
        <div>
          <p
            className="font-mono"
            style={{
              fontSize: 9,
              color: 'var(--muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0 16px',
              marginBottom: 10,
            }}
          >
            Recent Journeys
          </p>
          {RECENT_WORKFLOWS.map((wf, i) => (
            <motion.button
              key={wf.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 16px',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--fog)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12.5,
                marginBottom: 1,
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--fog)'
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--border)',
                  flexShrink: 0,
                }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {wf.label}
              </span>
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
         <div className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
           Sefin · Pathfinder AI
         </div>
      </div>
    </aside>
  )
}

