/**
 * Sidebar — left navigation panel.
 * Shows logo, nav links, and recent workflow stubs.
 * Active link is determined by the `activePage` prop.
 * Dark Forest styling.
 */
import { motion } from 'framer-motion'
import {
  Sparkles,
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
        width: 250,
        minWidth: 250,
        background: 'rgba(13,26,21,0.5)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '32px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--r-sm)',
            background: 'rgba(212,124,63,0.15)',
            border: '1px solid rgba(212,124,63,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(212,124,63,0.2)'
          }}
        >
          <Sparkles size={16} color="var(--amber)" />
        </div>
        <div style={{ flex: 1 }}>
          <div className="font-playfair" style={{ fontWeight: 800, fontSize: 18, color: 'white', letterSpacing: '0.02em', lineHeight: 1 }}>
            PathFinder <span style={{ color: 'var(--sage)', fontSize: 14 }}>AI</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '0 12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                padding: '12px 16px',
                borderRadius: 'var(--r-sm)',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: isActive ? 'white' : 'var(--muted)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.3s',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.color = 'var(--fog)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--muted)'
                }
              }}
            >
              {isActive && (
                 <motion.div
                   layoutId="active-indicator"
                   style={{
                     position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3,
                     background: 'var(--amber)', borderRadius: '0 4px 4px 0'
                   }}
                 />
              )}
              <Icon size={16} color={isActive ? "var(--amber)" : "currentcolor"} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {isActive && <ChevronRight size={14} style={{ opacity: 0.8, color: "var(--lavender)" }} />}
            </button>
          )
        })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)', margin: '24px 16px' }} />

        {/* Recent Workflows */}
        <div style={{ padding: '0 8px' }}>
          <p
            className="font-mono"
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--muted)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 16,
              paddingLeft: 8
            }}
          >
            Terminal History
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {RECENT_WORKFLOWS.map((wf, i) => (
            <motion.button
              key={wf.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--r-sm)',
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--fog)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12.5,
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--fog)'
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  flexShrink: 0,
                  transition: 'background 0.2s'
                }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {wf.label}
              </span>
            </motion.button>
          ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
         <div className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
           PFDR-OS v2.0 · INTL
         </div>
      </div>
    </aside>
  )
}

