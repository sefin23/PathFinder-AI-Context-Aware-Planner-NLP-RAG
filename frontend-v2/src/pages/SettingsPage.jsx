/**
 * SettingsPage — Redesigned with Pathfinder logo sidebar, grouped nav,
 * polished section cards and human-friendly copy.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getUser, updateUser, getAuthData, logoutUser,
  changePassword, getCurrentUserId,
} from '../api/backend'
import {
  Check, User, Cpu, Bell, Shield, AlertTriangle,
  ChevronRight, MapPin, Lock, LogOut,
} from 'lucide-react'

// ── Nav structure ──────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'My Account',
    items: [
      { id: 'account',  label: 'Account',          icon: User },
      { id: 'security', label: 'Security',          icon: Lock },
    ],
  },
  {
    label: 'Preferences',
    items: [
      { id: 'profile',       label: 'Location',        icon: MapPin },
      { id: 'ai',            label: 'AI Behaviour',     icon: Cpu },
      { id: 'notifications', label: 'Notifications',    icon: Bell },
    ],
  },
  {
    label: '',
    items: [
      { id: 'danger', label: 'Delete & Reset', icon: AlertTriangle, destructive: true },
    ],
  },
]

// ── Design tokens ──────────────────────────────────────────────────────────────

const INPUT = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 14,
  color: 'white',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.2s',
  fontFamily: 'DM Sans, sans-serif',
  boxSizing: 'border-box',
}

// ── Shared primitives ──────────────────────────────────────────────────────────

/** Animated amber-accented toggle switch */
function Toggle({ label, sub, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '15px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ flex: 1, paddingRight: 20 }}>
        <p style={{
          fontSize: 14, fontWeight: 500, margin: 0,
          color: value ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
          marginBottom: sub ? 3 : 0,
          transition: 'color 0.2s',
        }}>
          {label}
        </p>
        {sub && (
          <p style={{
            fontSize: 12, color: 'rgba(255,255,255,0.25)',
            lineHeight: 1.5, margin: 0,
            fontFamily: 'DM Sans, sans-serif',
          }}>
            {sub}
          </p>
        )}
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-pressed={value}
        style={{
          width: 44, height: 25, borderRadius: 99, flexShrink: 0,
          background: value ? 'var(--amber, #d47c3f)' : 'rgba(255,255,255,0.08)',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.25s',
        }}
      >
        <motion.div
          animate={{ x: value ? 21 : 3 }}
          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
          style={{
            position: 'absolute', top: 3.5,
            width: 18, height: 18, borderRadius: '50%',
            background: 'white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  )
}

/** Section card wrapper with an accent top-border stripe */
function SectionCard({ title, description, children, danger }) {
  return (
    <div style={{
      background: 'rgba(12,30,24,0.8)',
      border: `1px solid ${danger ? 'rgba(198,93,74,0.2)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 18,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Top stripe */}
      <div style={{
        height: 3,
        background: danger
          ? 'linear-gradient(90deg, rgba(198,93,74,0.8), transparent)'
          : 'linear-gradient(90deg, rgba(212,124,63,0.6), rgba(92,140,117,0.3), transparent)',
      }} />

      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="font-playfair" style={{
            fontSize: 20, fontWeight: 700, margin: 0,
            color: danger ? 'var(--coral, #c65d4a)' : 'white',
          }}>
            {title}
          </h2>
          {description && (
            <p style={{
              fontSize: 13, color: 'rgba(255,255,255,0.35)',
              margin: '6px 0 0', lineHeight: 1.5,
              fontFamily: 'DM Sans, sans-serif',
            }}>
              {description}
            </p>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}

/** Labelled input field */
function Field({ label, hint, value, onChange, placeholder, type = 'text', autoComplete }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 500,
        color: 'rgba(255,255,255,0.4)', marginBottom: 7,
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={INPUT}
        onFocus={e => { e.target.style.borderColor = 'rgba(212,124,63,0.45)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
      />
      {hint && (
        <p style={{
          fontSize: 11, color: 'rgba(255,255,255,0.22)',
          margin: '5px 0 0', fontFamily: 'DM Sans, sans-serif',
        }}>
          {hint}
        </p>
      )}
    </div>
  )
}

/** Primary action button */
function ActionButton({ onClick, disabled, loading, success, successLabel, label, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '13px 20px',
        borderRadius: 12,
        border: `1px solid ${
          success ? 'rgba(92,140,117,0.35)'
          : danger ? 'rgba(198,93,74,0.35)'
          : 'rgba(212,124,63,0.3)'
        }`,
        background: success ? 'rgba(92,140,117,0.08)' : danger ? 'rgba(198,93,74,0.08)' : 'rgba(212,124,63,0.08)',
        color: success ? 'var(--emerald, #5c8c75)' : danger ? 'var(--coral, #c65d4a)' : 'var(--amber, #d47c3f)',
        fontSize: 13, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'DM Sans, sans-serif',
        transition: 'all 0.2s',
        opacity: disabled && !loading ? 0.6 : 1,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.background = success
            ? 'rgba(92,140,117,0.14)'
            : danger ? 'rgba(198,93,74,0.14)' : 'rgba(212,124,63,0.14)'
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          e.currentTarget.style.background = success
            ? 'rgba(92,140,117,0.08)'
            : danger ? 'rgba(198,93,74,0.08)' : 'rgba(212,124,63,0.08)'
        }
      }}
    >
      {loading ? (
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.12)',
          borderTopColor: 'currentColor',
          animation: 'spin 0.7s linear infinite',
        }} />
      ) : success ? (
        <><Check size={14} />{successLabel}</>
      ) : label}
    </button>
  )
}

// ── Section components ─────────────────────────────────────────────────────────

function AccountSection({ user }) {
  const [signingOut, setSigningOut] = useState(false)
  const authUser = getAuthData()?.user
  const displayUser = authUser || user

  const handleSignOut = async () => {
    setSigningOut(true)
    await logoutUser()
    window.dispatchEvent(new CustomEvent('pathfinder-signout'))
  }

  const initials = (displayUser?.name || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <SectionCard
      title="My Account"
      description="Your profile identity and current session."
    >
      {/* Avatar row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 20px',
        background: 'rgba(255,255,255,0.025)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.05)',
        marginBottom: 24,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(96,165,250,0.3), rgba(30,58,138,0.6))',
          border: '1px solid rgba(96,165,250,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: '#93c5fd',
          fontFamily: 'Playfair Display, serif',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="font-playfair" style={{
            fontSize: 17, fontWeight: 700, color: 'white',
            margin: 0, marginBottom: 3,
          }}>
            {displayUser?.name || 'Guest User'}
          </p>
          <p style={{
            fontSize: 13, color: 'rgba(255,255,255,0.38)',
            margin: 0, fontFamily: 'DM Sans, sans-serif',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayUser?.email || '—'}
          </p>
        </div>
        <div style={{
          fontSize: 11, color: 'rgba(92,140,117,0.7)',
          background: 'rgba(92,140,117,0.08)',
          border: '1px solid rgba(92,140,117,0.15)',
          borderRadius: 6, padding: '3px 10px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
          flexShrink: 0,
        }}>
          Active
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {[
          { label: 'Full name',     value: displayUser?.name  || '—' },
          { label: 'Email address', value: displayUser?.email || '—' },
        ].map(row => (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '18px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{
              fontSize: 13, color: 'rgba(255,255,255,0.38)',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              {row.label}
            </span>
            <span style={{
              fontSize: 13, color: 'rgba(255,255,255,0.75)',
              fontFamily: 'DM Sans, sans-serif',
              maxWidth: '60%', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Sign out - Pushed to bottom with elegant spacing */}
      <div style={{ marginTop: 'auto', paddingTop: 24, position: 'relative' }}>
        <ActionButton
          onClick={handleSignOut}
          disabled={signingOut}
          loading={signingOut}
          label={<><LogOut size={14} />Sign out of Pathfinder</>}
          danger
        />
      </div>
    </SectionCard>
  )
}

function SecuritySection() {
  const [current, setCurrent] = useState('')
  const [next, setNext]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  const handleChange = async () => {
    setError('')
    if (!current)         { setError('Please enter your current password.'); return }
    if (next.length < 6)  { setError('Your new password needs to be at least 6 characters.'); return }
    if (next !== confirm)  { setError("The new passwords you entered don't match."); return }

    setSaving(true)
    try {
      await changePassword(current, next)
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't update your password. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      title="Password & Security"
      description="Update your password to keep your account safe."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field
          label="Current password"
          type="password"
          value={current}
          onChange={setCurrent}
          placeholder="Your current password"
          autoComplete="current-password"
        />
        <Field
          label="New password"
          type="password"
          value={next}
          onChange={setNext}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          hint="Use a mix of letters, numbers, and symbols for a stronger password."
        />
        <Field
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Repeat your new password"
          autoComplete="new-password"
        />

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                margin: 0, padding: '10px 14px',
                background: 'rgba(198,93,74,0.07)',
                border: '1px solid rgba(198,93,74,0.2)',
                borderRadius: 9,
                fontSize: 13, color: 'var(--coral, #c65d4a)',
                fontFamily: 'DM Sans, sans-serif', lineHeight: 1.4,
              }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div style={{ paddingTop: 4 }}>
          <ActionButton
            onClick={handleChange}
            disabled={saving || success}
            loading={saving}
            success={success}
            label="Update Password"
            successLabel="Password updated"
          />
        </div>
      </div>
    </SectionCard>
  )
}

function ProfileSection({ user, jobCity, setJobCity, stateCode, setStateCode, handleSave, saving, saved }) {
  return (
    <SectionCard
      title="Your Location"
      description="Tell Pathfinder where you're based so the AI can show you the right resources, portals, and timelines."
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 20 }}>
        {/* Current location badge */}
        {(jobCity || stateCode) && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(92,140,117,0.07)',
            border: '1px solid rgba(92,140,117,0.15)',
            borderRadius: 8, padding: '7px 12px',
            alignSelf: 'flex-start',
          }}>
            <MapPin size={12} color="rgba(92,140,117,0.7)" />
            <span style={{
              fontSize: 12, color: 'rgba(92,140,117,0.8)',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              Currently set to {[jobCity, stateCode].filter(Boolean).join(', ')}
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 14 }}>
          <Field
            label="City or job location"
            value={jobCity}
            onChange={setJobCity}
            placeholder="e.g. Bangalore"
          />
          <Field
            label="State code"
            value={stateCode}
            onChange={setStateCode}
            placeholder="e.g. KA"
          />
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          <ActionButton
            onClick={handleSave}
            disabled={saving}
            loading={saving}
            success={saved}
            label="Save location"
            successLabel="Location saved"
          />
        </div>
      </div>
    </SectionCard>
  )
}

function AIPreferencesSection({ prefs, setPref }) {
  return (
    <SectionCard
      title="AI Behaviour"
      description="Control how Pathfinder's AI generates and presents your plans."
    >
      <div>
        <Toggle
          label="Ask clarifying questions"
          sub="The AI will ask short follow-up questions to ensure the generated roadmap is perfectly tailored to your current situation."
          value={prefs.ai_clarification}
          onChange={v => setPref('ai_clarification', v)}
        />
        <Toggle
          label="Show confidence indicators"
          sub="Each recommendation will display a confidence score (0.0 - 1.0) based on the quality of the retrieved knowledge-base data."
          value={prefs.ai_confidence}
          onChange={v => setPref('ai_confidence', v)}
        />
        <Toggle
          label="AI Attribution Markers"
          sub="Every plan or task generated by the Pathfinder engine will be marked with a subtle sparkle badge to distinguish it from your manual edits."
          value={prefs.ai_badges}
          onChange={v => setPref('ai_badges', v)}
        />
      </div>
    </SectionCard>
  )
}

function NotificationsSection({ notifPrefs, setNotifPref }) {
  return (
    <SectionCard
      title="Notifications"
      description="Choose which reminders and progress updates you'd like to receive."
    >
      <p style={{
        fontSize: 11, color: 'rgba(255,255,255,0.25)',
        fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        margin: '0 0 4px',
      }}>
        During your journeys
      </p>
      <Toggle
        label="Overdue task alerts"
        sub="Get notified when a task needs your attention or has passed its due date."
        value={notifPrefs.notif_smart_alerts}
        onChange={v => setNotifPref('notif_smart_alerts', v)}
      />
      <Toggle
        label="Progress check-ins"
        sub="Periodic reminders to review and update your active life events."
        value={notifPrefs.notif_progress_checkins}
        onChange={v => setNotifPref('notif_progress_checkins', v)}
      />
      <Toggle
        label="Phase completions"
        sub="A notification when you finish a major phase within your plan."
        value={notifPrefs.notif_phase_completions}
        onChange={v => setNotifPref('notif_phase_completions', v)}
      />

      <p style={{
        fontSize: 11, color: 'rgba(255,255,255,0.25)',
        fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        margin: '20px 0 4px',
      }}>
        Milestone celebrations
      </p>
      <Toggle
        label="Journey completed"
        sub="A celebratory notification when you fully complete a life event plan."
        value={notifPrefs.notif_journey_completed}
        onChange={v => setNotifPref('notif_journey_completed', v)}
      />
      <Toggle
        label="Weekly summary"
        sub="A brief digest of your overall progress across all active plans."
        value={notifPrefs.notif_weekly_summary}
        onChange={v => setNotifPref('notif_weekly_summary', v)}
      />
    </SectionCard>
  )
}


function DangerZoneSection() {
  return (
    <SectionCard
      title="Delete & Reset"
      description="These actions are permanent and cannot be undone. Please proceed with care."
      danger
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {[
          {
            title: 'Wipe all data (Reset everything)',
            desc:  'Permanently deletes EVERY plan—including active, completed, and drafted ones. Your account login will remain, but all your work will be gone.',
            label: 'Total data reset',
          },
          {
            title: 'Terminate account',
            desc:  'Permanently deletes your identity and every trace of your data from Pathfinder AI. This action is absolute and cannot be undone.',
            label: 'Delete account permanently',
          },
        ].map((item, i) => (
          <div
            key={item.title}
            style={{
              padding: i === 0 ? '4px 0 22px' : '22px 0 4px',
              borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)', margin: '0 0 5px' }}>
              {item.title}
            </p>
            <p style={{
              fontSize: 13, color: 'rgba(255,255,255,0.28)',
              lineHeight: 1.55, margin: '0 0 14px',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              {item.desc}
            </p>
            <button
              style={{
                background: 'transparent',
                border: '1px solid rgba(198,93,74,0.3)',
                color: 'var(--coral, #c65d4a)',
                borderRadius: 9, padding: '8px 16px',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                display: 'inline-flex', alignItems: 'center', gap: 7,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(198,93,74,0.09)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <AlertTriangle size={12} />
              {item.label}
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('account')
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [jobCity, setJobCity]     = useState('')
  const [stateCode, setStateCode] = useState('')

  const [prefs, setPrefs] = useState({
    ai_clarification: true,
    ai_confidence: false,
    ai_badges: true,
  })
  const [notifPrefs, setNotifPrefs] = useState({
    notif_smart_alerts: true,
    notif_progress_checkins: false,
    notif_phase_completions: true,
    notif_journey_completed: true,
    notif_weekly_summary: false,
  })

  useEffect(() => {
    getUser(getCurrentUserId())
      .then(u => {
        setUser(u)
        setJobCity(u.job_city || '')
        setStateCode(u.state_code || '')
        
        // Sync Notification Prefs
        setNotifPrefs({
          notif_smart_alerts: u.notif_smart_alerts ?? true,
          notif_progress_checkins: u.notif_progress_checkins ?? false,
          notif_phase_completions: u.notif_phase_completions ?? true,
          notif_journey_completed: u.notif_journey_completed ?? true,
          notif_weekly_summary: u.notif_weekly_summary ?? false,
        })
        
        // Sync AI Prefs
        setPrefs({
          ai_clarification: u.ai_clarification ?? true,
          ai_confidence: u.ai_confidence ?? false,
          ai_badges: u.ai_badges ?? true,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateUser(getCurrentUserId(), { 
        job_city: jobCity, 
        state_code: stateCode,
        ...notifPrefs,
        ...prefs
      })
      setUser(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* bubble silently */ }
    finally { setSaving(false) }
  }

  const setPref      = (k, v) => setPrefs(p => ({ ...p, [k]: v }))
  const setNotifPref = (k, v) => setNotifPrefs(p => ({ ...p, [k]: v }))

  const renderSection = () => {
    switch (activeSection) {
      case 'account':  return <AccountSection user={user} />
      case 'security': return <SecuritySection />
      case 'profile':  return (
        <ProfileSection
          user={user}
          jobCity={jobCity} setJobCity={setJobCity}
          stateCode={stateCode} setStateCode={setStateCode}
          handleSave={handleSave} saving={saving} saved={saved}
        />
      )
      case 'ai':            return <AIPreferencesSection prefs={prefs} setPref={setPref} />
      case 'notifications': return <NotificationsSection notifPrefs={notifPrefs} setNotifPref={setNotifPref} />
      case 'danger':        return <DangerZoneSection />
      default:              return null
    }
  }

  return (
    <div style={{ padding: '24px 48px 48px', maxWidth: 1600, margin: '0 auto', width: '100%' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.06)',
            borderTopColor: 'var(--amber, #d47c3f)',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: 24,
            alignItems: 'stretch',
            minHeight: 'calc(100vh - 140px)',
          }}
        >
          {/* ── Sidebar ── */}
          <div style={{
            background: 'rgba(10,24,20,0.9)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 18,
            overflow: 'hidden',
            position: 'sticky',
            top: 24,
            height: '100%',
          }}>
            {/* Logo header */}
            <div style={{
              padding: '22px 20px 18px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 34, height: 34, flexShrink: 0 }}>
                <img
                  src="/favicon.svg"
                  alt="Pathfinder"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <p className="font-playfair" style={{
                  fontSize: 14, fontWeight: 700, color: 'white',
                  margin: 0, lineHeight: 1.2,
                }}>
                  Settings
                </p>
                <p style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.25)',
                  margin: 0, fontFamily: 'DM Sans, sans-serif',
                }}>
                  Pathfinder AI
                </p>
              </div>
            </div>

            {/* Nav groups */}
            <div style={{ padding: '8px 0 12px' }}>
              {NAV_GROUPS.map((group, gi) => (
                <div key={gi}>
                  {group.label && (
                    <p style={{
                      fontSize: 10, fontWeight: 700,
                      color: 'rgba(255,255,255,0.2)',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '14px 20px 5px',
                      margin: 0, fontFamily: 'DM Sans, sans-serif',
                    }}>
                      {group.label}
                    </p>
                  )}
                  {gi > 0 && !group.label && (
                    <div style={{
                      height: 1, background: 'rgba(255,255,255,0.04)',
                      margin: '8px 14px',
                    }} />
                  )}
                  {group.items.map(item => {
                    const isActive = activeSection === item.id
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        style={{
                          width: '100%',
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 18px',
                          background: isActive
                            ? (item.destructive ? 'rgba(198,93,74,0.07)' : 'rgba(212,124,63,0.07)')
                            : 'transparent',
                          border: 'none',
                          borderLeft: isActive
                            ? `2px solid ${item.destructive ? 'var(--coral, #c65d4a)' : 'var(--amber, #d47c3f)'}`
                            : '2px solid transparent',
                          cursor: 'pointer',
                          color: isActive
                            ? (item.destructive ? 'var(--coral, #c65d4a)' : 'var(--amber, #d47c3f)')
                            : 'rgba(255,255,255,0.38)',
                          fontSize: 13, fontWeight: isActive ? 600 : 400,
                          fontFamily: 'DM Sans, sans-serif',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                        }}
                        onMouseLeave={e => {
                          if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.38)'
                        }}
                      >
                        <Icon size={14} style={{ flexShrink: 0 }} />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* ── Content ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.16 }}
              style={{ minHeight: 480, height: '100%' }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
