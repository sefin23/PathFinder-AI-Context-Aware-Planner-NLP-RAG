/**
 * Sidebar — premium left navigation panel.
 * Collapsed: 60px (icons) | Expanded: 240px (hover).
 * Amber accents, 250ms smooth transition, custom non-AI icons.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BrandLogo from './BrandLogo'
import AllBookmarkIcon from './AllBookmarkIcon'
import InsightsIcon from './InsightsIcon'
import {
  Map,
  Sliders,
  User,
  ChevronRight,
  LogOut,
  Archive,
  Calendar,
  Compass,
} from 'lucide-react'
import { logoutUser } from '../api/backend'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'New Event', icon: Map,             color: '#60a5fa' }, // Vibrant Sky Blue
  { id: 'saved',     label: 'Event History', icon: AllBookmarkIcon, color: '#34d399' }, // Vibrant Emerald
  { id: 'journeys',  label: 'My Calendar', icon: Calendar,         color: '#fbbf24' }, // Vibrant Amber
  { id: 'vault',     label: 'Document Vault', icon: Archive,      color: '#22d3ee' }, // Vibrant Cyan
  { id: 'insights',  label: 'Insights',    icon: InsightsIcon,    color: '#fb7185' }, // Vibrant Rose/Coral
]

const BOTTOM_ITEMS = [
  { id: 'settings', label: 'Settings', icon: '⚙️', color: '#f2c94c' }, // Gold
]

export default function Sidebar({ user, activePage = 'dashboard', onNavigate }) {
  const [isHovered, setIsHovered] = useState(false)

  const userName = user?.name || 'Pathfinder User'
  const userInitials = userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const sidebarWidth = isHovered ? 240 : 60

  const handleLogout = async () => {
    try {
      // 1. Instantly log out locally for immediate UI response
      window.dispatchEvent(new CustomEvent('pathfinder-signout'))
      
      // 2. Clear backend session in the background
      await logoutUser().catch(console.error)
    } catch (err) {
      console.error("Logout failed:", err)
    }
  }

  return (
    <motion.aside
      className="sb-wrap"
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: '100%',
        background: 'rgba(13, 26, 21, 0.45)',
        backdropFilter: 'blur(24px)',
        borderRight: '2px solid rgba(212, 124, 63, 0.5)',
        borderTop: '2px solid rgba(212, 124, 63, 0.3)',
        borderBottom: '2px solid rgba(212, 124, 63, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        position: 'relative',
        boxShadow: `
          15px 0 60px rgba(0,0,0,0.7), 
          inset -3px 0 15px rgba(212, 124, 63, 0.2),
          inset 0 0 30px rgba(0,0,0,0.4),
          0 0 30px rgba(212, 124, 63, 0.15)
        `,
        borderTopRightRadius: 24,
        borderBottomRightRadius: 24,
        margin: 0,
        overflow: 'hidden',
        willChange: 'width'
      }}
    >
      {/* Logo Section */}
      <div style={{ 
        padding: '30px 0', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isHovered ? 'flex-start' : 'center',
        paddingLeft: isHovered ? 20 : 0,
        gap: 12 
      }}>
        <div style={{ position: 'relative' }}>
            <BrandLogo size={28} />
        </div>
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="font-playfair"
              style={{ fontWeight: 900, fontSize: 20, color: 'white', letterSpacing: '-0.02em' }}
            >
              PathFinder
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Main */}
      <nav style={{ flex: 1, padding: '0 8px', marginTop: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activePage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                className="btn-cust"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isHovered ? 'flex-start' : 'center',
                  gap: 16,
                  width: '100%',
                  height: 44,
                  padding: isHovered ? '0 12px' : 0,
                  borderRadius: 12,
                  border: 'none',
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.85)', // Increased from 0.6
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                {/* Active Indicator Pillar */}
                {isActive && (
                   <motion.div
                     layoutId="active-pillar"
                     style={{
                       position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3,
                       background: 'var(--amber)', borderRadius: '0 4px 4px 0'
                     }}
                   />
                )}
                
                <Icon 
                  size={18} 
                  style={{ 
                    flexShrink: 0, 
                    color: item.color,
                    opacity: 1, 
                    filter: 'none',
                    transition: 'all 0.3s'
                  }} 
                />
                
                {isHovered && (
                   <motion.span
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     style={{ 
                        fontSize: 13, fontWeight: isActive ? 600 : 500,
                        whiteSpace: 'nowrap'
                     }}
                   >
                     {item.label}
                   </motion.span>
                )}
              </button>
            )
          })}
        </div>

        {/* Separator Line */}
        <div style={{ 
          margin: '24px 12px', height: 1, 
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' 
        }} />

        {/* Secondary Nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activePage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isHovered ? 'flex-start' : 'center',
                  gap: 16,
                  width: '100%',
                  height: 44,
                  padding: isHovered ? '0 12px' : 0,
                  borderRadius: 12,
                  border: 'none',
                  background: 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.85)', // Increased from 0.6
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {typeof Icon === 'string' ? (
                  <span style={{ fontSize: 18, flexShrink: 0, opacity: isActive ? 1 : 0.85 }}>{Icon}</span>
                ) : (
                  <Icon 
                    size={18} 
                    style={{ 
                      flexShrink: 0, 
                      color: item.color,
                      opacity: 1,
                      filter: 'none',
                      transition: 'all 0.3s'
                    }} 
                  />
                )}
                {isHovered && (
                   <motion.span
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}
                   >
                     {item.label}
                   </motion.span>
                )}
              </button>
            )
          })}
        </div>
      </nav>


      {/* Footer Section */}
      <div style={{ 
        padding: '20px 12px', 
        background: 'rgba(0,0,0,0.1)', 
        borderTop: '1px solid rgba(255,255,255,0.03)' 
      }}>
        {isHovered ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div style={{ 
              width: 28, height: 28, borderRadius: '50%', 
              background: 'linear-gradient(135deg, rgba(96,165,250,0.35), rgba(30,58,138,0.7))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#93c5fd',
              border: '1px solid rgba(96,165,250,0.25)',
              fontFamily: 'Playfair Display, serif'
            }}>
              {userInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
               <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                 {userName}
               </p>
    
            </div>
            <motion.button
              whileHover={{ scale: 1.1, color: 'white' }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              style={{ 
                background: 'transparent',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--amber)',
                opacity: 0.8
              }}
            >
              <LogOut size={18} />
            </motion.button>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
             <User size={18} color="rgba(255,255,255,0.2)" />
          </div>
        )}
      </div>
    </motion.aside>
  )
}
