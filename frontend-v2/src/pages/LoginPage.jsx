/**
 * LoginPage — Split-screen auth gate.
 * Left: atmospheric forest panel with brand quote.
 * Right: sign-in / create-account form.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { loginUser, registerUser } from '../api/backend'
import BrandLogo from '../components/BrandLogo'

// ── Field primitive ────────────────────────────────────────────────────────────

function Field({ label, type = 'text', value, onChange, placeholder, error, autoComplete }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (show ? 'text' : 'password') : type

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.3)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${error ? 'rgba(198,93,74,0.5)' : 'rgba(255,255,255,0.09)'}`,
            borderRadius: 10,
            padding: isPassword ? '13px 44px 13px 14px' : '13px 14px',
            fontSize: 14,
            color: 'white',
            outline: 'none',
            fontFamily: 'DM Sans, sans-serif',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box',
          }}
          onFocus={e => { if (!error) e.target.style.borderColor = 'rgba(212,124,63,0.45)' }}
          onBlur={e => { if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center',
            }}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{ fontSize: 11, color: 'var(--coral)', margin: 0, fontFamily: 'DM Sans, sans-serif' }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LoginPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const [loginEmail, setLoginEmail]       = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regName, setRegName]         = useState('')
  const [regEmail, setRegEmail]       = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm]   = useState('')

  const [errors, setErrors] = useState({})

  const switchMode = (m) => {
    setMode(m)
    setErrors({})
    setGlobalError('')
  }

  const validateLogin = () => {
    const e = {}
    if (!loginEmail.trim()) e.loginEmail = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(loginEmail)) e.loginEmail = 'Enter a valid email'
    if (!loginPassword) e.loginPassword = 'Password is required'
    return e
  }

  const validateRegister = () => {
    const e = {}
    if (!regName.trim()) e.regName = 'Name is required'
    if (!regEmail.trim()) e.regEmail = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(regEmail)) e.regEmail = 'Enter a valid email'
    if (!regPassword) e.regPassword = 'Password is required'
    else if (regPassword.length < 6) e.regPassword = 'At least 6 characters'
    if (regPassword !== regConfirm) e.regConfirm = 'Passwords do not match'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGlobalError('')

    const errs = mode === 'login' ? validateLogin() : validateRegister()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})

    setLoading(true)
    try {
      if (mode === 'login') {
        await loginUser(loginEmail.trim(), loginPassword)
      } else {
        await registerUser(regName.trim(), regEmail.trim(), regPassword)
      }
      onAuthSuccess()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Something went wrong. Please try again.'
      setGlobalError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#06100a',
      overflow: 'hidden',
    }}>

      {/* ── Left panel ── */}
      <div style={{
        width: '44%',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '36px 44px 40px',
      }}>
        {/* Photo background — covers full panel, vertically centered on compass */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/login-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          backgroundRepeat: 'no-repeat',
        }} />

        {/* Darken overall so text is legible */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(4, 10, 6, 0.52)',
        }} />

        {/* Top vignette — keeps brand text readable */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '35%',
          background: 'linear-gradient(to bottom, rgba(3, 8, 5, 0.88) 0%, transparent 100%)',
        }} />

        {/* Bottom vignette — keeps quote text readable */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
          background: 'linear-gradient(to top, rgba(3, 8, 5, 0.96) 0%, rgba(3, 8, 5, 0.6) 50%, transparent 100%)',
        }} />

        {/* Right edge bleed so it merges smoothly with form panel */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: '22%',
          background: 'linear-gradient(to left, rgba(8, 17, 12, 0.98) 0%, transparent 100%)',
        }} />

        {/* Top: Brand */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
          <BrandLogo size={46} />
          <span className="font-playfair" style={{
            fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,1)',
            letterSpacing: '0.012em',
          }}>
            PathFinder AI
          </span>
        </div>

        {/* Bottom: Copy block */}
        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Tagline */}
          <p className="font-playfair" style={{
            fontSize: 'clamp(24px, 2.4vw, 34px)',
            fontWeight: 700,
            fontStyle: 'italic',
            color: 'white',
            lineHeight: 1.28,
            marginBottom: 14,
          }}>
            Your next chapter,<br />mapped.
          </p>

          {/* Sub-line */}
          <p style={{
            fontSize: 13,
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.52)',
            lineHeight: 1.65,
            marginBottom: 24,
            maxWidth: 320,
          }}>
            PathFinder turns life's biggest moves into clear,
            step-by-step plans — so you always know what to do next.
          </p>

          {/* Proof points */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26 }}>
            {[
              { icon: '🗺', text: 'AI-generated plans for any life event' },
              { icon: '📄', text: 'Document checklist built for your situation' },
              { icon: '⏱', text: 'Know exactly what to do, and when' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.45)',
                  letterSpacing: '0.02em',
                }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Attribution */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 28, height: 1, background: 'rgba(212,124,63,0.5)', flexShrink: 0 }} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10, letterSpacing: '0.1em',
              color: 'rgba(212,124,63,0.5)',
            }}>
              Trusted for relocations, job moves, visas &amp; more
            </span>
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 52px',
        background: 'rgba(8, 17, 12, 0.98)',
        borderLeft: '1px solid rgba(255,255,255,0.045)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Subtle dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />

        {/* Vertical Spacer to push form to middle */}
        <div style={{ flex: 1 }} />

        {/* Form area */}

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 600, position: 'relative', zIndex: 1 }}
        >
          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + '-heading'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              style={{ marginBottom: 48 }}
            >
              <h1 className="font-playfair" style={{
                fontSize: 28, fontWeight: 700, color: 'white',
                marginBottom: 8, lineHeight: 1.2,
              }}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p style={{
                fontSize: 13, color: 'rgba(255,255,255,0.36)',
                fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, margin: 0,
              }}>
                {mode === 'login'
                  ? 'Sign in to continue working on your active life plans.'
                  : 'Set up your account to start planning your next major life change.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Mode tabs */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10, padding: 3, marginBottom: 42,
          }}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  padding: '8px 0', borderRadius: 8, border: 'none',
                  background: mode === m ? 'rgba(212,124,63,0.13)' : 'transparent',
                  color: mode === m ? 'var(--amber, #d47c3f)' : 'rgba(255,255,255,0.35)',
                  fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.18s',
                  outline: 'none',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Form fields */}
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: mode === 'register' ? 14 : -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'register' ? -14 : 14 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 26 }}
            >
              {mode === 'register' && (
                <Field
                  label="Full Name"
                  value={regName}
                  onChange={setRegName}
                  placeholder="e.g. Alex Johnson"
                  error={errors.regName}
                  autoComplete="name"
                />
              )}

              <Field
                label="Email"
                type="email"
                value={mode === 'login' ? loginEmail : regEmail}
                onChange={mode === 'login' ? setLoginEmail : setRegEmail}
                placeholder="you@example.com"
                error={mode === 'login' ? errors.loginEmail : errors.regEmail}
                autoComplete="email"
              />

              <Field
                label="Password"
                type="password"
                value={mode === 'login' ? loginPassword : regPassword}
                onChange={mode === 'login' ? setLoginPassword : setRegPassword}
                placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                error={mode === 'login' ? errors.loginPassword : errors.regPassword}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />

              {mode === 'register' && (
                <Field
                  label="Confirm Password"
                  type="password"
                  value={regConfirm}
                  onChange={setRegConfirm}
                  placeholder="Repeat your password"
                  error={errors.regConfirm}
                  autoComplete="new-password"
                />
              )}

              {/* Global error */}
              <AnimatePresence>
                {globalError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      background: 'rgba(198,93,74,0.07)',
                      border: '1px solid rgba(198,93,74,0.22)',
                      borderRadius: 8, padding: '10px 14px',
                      fontSize: 13, color: 'var(--coral, #c65d4a)',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {globalError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button — solid amber fill like the Stitch design */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 8,
                  background: loading ? 'rgba(212,124,63,0.4)' : 'var(--amber, #d47c3f)',
                  border: 'none',
                  color: loading ? 'rgba(20,8,0,0.5)' : '#1c0a00',
                  borderRadius: 12, padding: '15px 22px',
                  fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.2s',
                  width: '100%',
                  letterSpacing: '0.01em',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(212,124,63,0.22)',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#e5904f'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(212,124,63,0.32)' } }}
                onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = 'var(--amber, #d47c3f)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,124,63,0.22)' } }}
              >
                {loading ? (
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid rgba(28,10,0,0.2)',
                    borderTopColor: '#1c0a00',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          {/* Switch mode link */}
          <p style={{
            marginTop: 22, textAlign: 'center',
            fontSize: 12, color: 'rgba(255,255,255,0.22)',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            {mode === 'login'
              ? <>Don't have an account?{' '}
                <button
                  onClick={() => switchMode('register')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(212,124,63,0.7)', fontSize: 12, fontFamily: 'DM Sans, sans-serif', padding: 0 }}
                >
                  Create one
                </button></>
              : <>Already have an account?{' '}
                <button
                  onClick={() => switchMode('login')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(212,124,63,0.7)', fontSize: 12, fontFamily: 'DM Sans, sans-serif', padding: 0 }}
                >
                  Sign in
                </button></>
            }
          </p>
        </motion.div>

        {/* Vertical Spacer to push form to middle */}
        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div className="font-mono" style={{
          marginTop: 'auto',
          paddingBottom: 28,
          fontSize: 10, letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.15)',
        }}>
          © 2026 PATHFINDER AI · CRAFTED FOR LIFE'S DEFINING MOMENTS
        </div>
      </div>
    </div>
  )
}
