import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

// ─── Shared Animation Engine ────────────────────────────────────────────────

/**
 * ExplainerCard — Universal screenshot + animated cursor overlay card.
 * Automatically detects if the screenshot exists and switches between modes.
 * Falls back to a clean vector simulation when the screenshot isn't placed yet.
 */
function ExplainerCard({
  screenshotSrc,
  addressBarUrl,
  inputCoords,     // { x: '%', y: '%' } relative position of primary input on screenshot
  buttonCoords,    // { x: '%', y: '%' } relative position of submit/action button
  typingLabel,
  successTitle,
  successSubtitle,
  successTag,
  vectorFields,    // [{ label, placeholder }] for vector fallback
  vectorButtonLabel,
}) {
  const [stage, setStage] = useState('idle')
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [clickPulse, setClickPulse] = useState(false)

  // Cursor position varies between screenshot mode and vector fallback mode
  const cursorPos = (() => {
    const vectorInput = { x: '50%', y: '42%' }
    const vectorButton = { x: '50%', y: '68%' }
    const useScreenshot = imgLoaded && !imgError

    switch (stage) {
      case 'idle': return { x: '88%', y: '88%' }
      case 'moving-to-input':
      case 'typing': return useScreenshot ? inputCoords : vectorInput
      case 'moving-to-button':
      case 'clicking': return useScreenshot ? buttonCoords : vectorButton
      default: return { x: '88%', y: '88%' }
    }
  })()

  useEffect(() => {
    let timer
    if (stage === 'idle') timer = setTimeout(() => setStage('moving-to-input'), 1200)
    else if (stage === 'moving-to-input') timer = setTimeout(() => setStage('typing'), 900)
    else if (stage === 'typing') timer = setTimeout(() => setStage('moving-to-button'), 1800)
    else if (stage === 'moving-to-button') timer = setTimeout(() => setStage('clicking'), 900)
    else if (stage === 'clicking') {
      setClickPulse(true)
      timer = setTimeout(() => { setClickPulse(false); setStage('loading') }, 400)
    }
    else if (stage === 'loading') timer = setTimeout(() => setStage('success'), 1500)
    else if (stage === 'success') timer = setTimeout(() => setStage('idle'), 4000)
    return () => clearTimeout(timer)
  }, [stage])

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
      width: '100%',
      maxWidth: '460px',
      margin: '12px auto',
      boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
      position: 'relative',
    }}>
      {/* Preload detector */}
      <img src={screenshotSrc} alt="" onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} style={{ display: 'none' }} />

      {/* Browser Chrome */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid var(--border)',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c65d4a' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c9a84c' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emerald)' }} />
        </div>
        <div style={{
          flex: 1,
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          padding: '3px 10px',
          fontSize: '9px',
          fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--fog)',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {addressBarUrl}
        </div>
        <div style={{
          fontSize: '8px',
          fontFamily: "'JetBrains Mono', monospace",
          color: imgLoaded && !imgError ? 'var(--emerald)' : 'var(--amber)',
          background: imgLoaded && !imgError ? 'rgba(92,140,117,0.1)' : 'rgba(212,124,63,0.1)',
          border: imgLoaded && !imgError ? '1px solid rgba(92,140,117,0.2)' : '1px solid rgba(212,124,63,0.2)',
          padding: '1px 6px',
          borderRadius: '4px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}>
          {imgLoaded && !imgError ? 'Live' : 'Simulated'}
        </div>
      </div>

      {/* Main Canvas */}
      <div style={{ position: 'relative' }}>
        {imgLoaded && !imgError ? (
          <ScreenshotCanvas
            screenshotSrc={screenshotSrc}
            stage={stage}
            typingLabel={typingLabel}
            successTitle={successTitle}
            successSubtitle={successSubtitle}
            successTag={successTag}
          />
        ) : (
          <VectorCanvas
            stage={stage}
            fields={vectorFields}
            buttonLabel={vectorButtonLabel}
            clickPulse={clickPulse}
            successTitle={successTitle}
            successSubtitle={successSubtitle}
            successTag={successTag}
          />
        )}

        {/* Cursor overlay — works on both modes */}
        <motion.div
          animate={{ x: cursorPos.x, y: cursorPos.y }}
          transition={{ type: 'spring', damping: 20, stiffness: 90 }}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 20, pointerEvents: 'none' }}
        >
          {clickPulse && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                position: 'absolute',
                width: '22px', height: '22px',
                borderRadius: '50%',
                border: '2px solid var(--amber)',
                left: '-7px', top: '-7px',
              }}
            />
          )}
          <svg width="13" height="14" viewBox="0 0 14 15" fill="none"
            style={{ filter: 'drop-shadow(0 0 6px rgba(212,124,63,0.9))' }}>
            <path d="M0 0V13.5L4 9.5L8.5 15L11 13L6.5 8L11.5 7L0 0Z" fill="var(--amber)" />
          </svg>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Screenshot Canvas ───────────────────────────────────────────────────────

function ScreenshotCanvas({ screenshotSrc, stage, typingLabel, successTitle, successSubtitle, successTag }) {
  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      <img
        src={screenshotSrc}
        alt="Portal screenshot"
        style={{
          width: '100%', height: 'auto', display: 'block',
          opacity: 0.88,
          filter: 'brightness(0.88) contrast(1.06) saturate(0.92)',
          userSelect: 'none', pointerEvents: 'none',
        }}
      />
      {/* Dark forest blend overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(16,28,22,0.18), rgba(16,28,22,0.38))',
        pointerEvents: 'none',
      }} />

      {/* Typing indicator */}
      <AnimatePresence>
        {stage === 'typing' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            style={{
              position: 'absolute', top: '12px', right: '12px',
              background: 'rgba(15,15,15,0.88)',
              border: '1px solid var(--border)',
              borderRadius: '6px', padding: '5px 10px',
              color: 'var(--amber)', fontSize: '9px',
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex', alignItems: 'center', gap: '6px',
              pointerEvents: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 0.7 }}
              style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--amber)', display: 'block' }}
            />
            {typingLabel}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      <AnimatePresence>
        {stage === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              color: 'var(--paper)', fontSize: '11px', fontWeight: 500,
              pointerEvents: 'none',
            }}
          >
            <Loader2 size={15} className="animate-spin" style={{ color: 'var(--amber)' }} />
            <span>Processing...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success overlay */}
      <AnimatePresence>
        {stage === 'success' && (
          <SuccessOverlay title={successTitle} subtitle={successSubtitle} tag={successTag} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Vector Fallback Canvas ──────────────────────────────────────────────────

function VectorCanvas({ stage, fields, buttonLabel, clickPulse, successTitle, successSubtitle, successTag }) {
  return (
    <div style={{
      padding: '18px',
      background: 'var(--forest-card)',
      minHeight: '148px',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: '10px',
      userSelect: 'none', position: 'relative',
    }}>
      {fields.map((field, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{
            fontSize: '8px', fontFamily: "'JetBrains Mono', monospace",
            color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {field.label}
          </span>
          <div style={{
            padding: '7px 10px',
            background: 'rgba(0,0,0,0.25)',
            border: stage === 'success' ? '1px solid var(--emerald)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            fontSize: '10px', color: 'var(--fog)',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'border-color 0.3s ease',
          }}>
            {field.placeholder}
          </div>
        </div>
      ))}

      {/* Submit button */}
      <motion.div
        animate={clickPulse ? { scale: 0.95 } : { scale: 1 }}
        transition={{ duration: 0.1 }}
        style={{
          marginTop: '4px',
          padding: '8px 16px',
          background: 'var(--amber)',
          borderRadius: '6px',
          fontSize: '10px', fontWeight: 600,
          color: 'white', textAlign: 'center',
          fontFamily: "'DM Sans', sans-serif",
          cursor: 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
      >
        {stage === 'loading' ? (
          <><Loader2 size={11} className="animate-spin" /> Processing...</>
        ) : buttonLabel}
      </motion.div>

      {/* Success overlay on vector canvas */}
      <AnimatePresence>
        {stage === 'success' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(16,28,22,0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <SuccessOverlay title={successTitle} subtitle={successSubtitle} tag={successTag} inline />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Success Overlay (shared) ────────────────────────────────────────────────

function SuccessOverlay({ title, subtitle, tag, inline }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        ...(inline ? {} : { position: 'absolute', inset: 0, background: 'rgba(16,28,22,0.65)', backdropFilter: 'blur(4px)' }),
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '10px', padding: '20px', textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      <motion.div
        initial={{ scale: 0.5, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12 }}
        style={{
          width: '38px', height: '38px', borderRadius: '50%',
          background: 'rgba(92,140,117,0.2)',
          border: '2px solid var(--emerald)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--emerald)',
          boxShadow: '0 0 18px rgba(92,140,117,0.4)',
        }}
      >
        <Check size={18} strokeWidth={3} />
      </motion.div>
      <div>
        <h4 style={{ margin: 0, fontSize: '12px', color: 'var(--paper)', fontWeight: 600 }}>{title}</h4>
        <p style={{ margin: '3px 0 0 0', fontSize: '10px', color: 'var(--fog)', fontFamily: "'JetBrains Mono', monospace" }}>{subtitle}</p>
      </div>
      <span style={{
        fontSize: '8px', color: 'var(--emerald)',
        border: '1px solid rgba(92,140,117,0.3)',
        padding: '2px 8px', borderRadius: '10px',
        background: 'rgba(92,140,117,0.1)',
        textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
      }}>
        {tag}
      </span>
    </motion.div>
  )
}

// ─── Portal Configurations ───────────────────────────────────────────────────

const PORTALS = {
  mca_name_check: {
    screenshotSrc: '/explainers/mca_name_check.png',
    addressBarUrl: 'mca.gov.in — MCA User Login',
    inputCoords: { x: '46%', y: '57%' },
    buttonCoords: { x: '43%', y: '79%' },
    typingLabel: 'Entering MCA credentials...',
    successTitle: 'Logged into MCA Portal',
    successSubtitle: 'Ready to check name availability',
    successTag: 'Proceed to name search',
    vectorFields: [
      { label: 'User ID / Email', placeholder: 'your@email.com' },
      { label: 'Password', placeholder: '••••••••' },
    ],
    vectorButtonLabel: 'Login',
  },

  uidai_aadhaar_download: {
    screenshotSrc: '/explainers/uidai_aadhaar_download.png',
    addressBarUrl: 'myaadhaar.uidai.gov.in — eAadhaar Download',
    inputCoords: { x: '32%', y: '52%' },
    buttonCoords: { x: '24%', y: '70%' },
    typingLabel: 'Entering Aadhaar number...',
    successTitle: 'OTP Sent Successfully',
    successSubtitle: 'Check your registered mobile',
    successTag: 'Enter OTP to download',
    vectorFields: [
      { label: 'Aadhaar Number', placeholder: '1234  5678  9012' },
      { label: 'Captcha', placeholder: 'Enter text from image' },
    ],
    vectorButtonLabel: 'Send OTP',
  },

  pan_download: {
    screenshotSrc: '/explainers/pan_download.png',
    addressBarUrl: 'onlineservices.proteantech.in — e-PAN Download',
    inputCoords: { x: '28%', y: '16%' },
    buttonCoords: { x: '9%', y: '93%' },
    typingLabel: 'Entering PAN details...',
    successTitle: 'e-PAN Request Submitted',
    successSubtitle: 'Check your registered email',
    successTag: 'Download PDF from inbox',
    vectorFields: [
      { label: 'PAN Number', placeholder: 'ABCDE1234F' },
      { label: 'Aadhaar Number', placeholder: '1234 5678 9012' },
    ],
    vectorButtonLabel: 'Submit',
  },

  gst_registration: {
    screenshotSrc: '/explainers/gst_registration.png',
    addressBarUrl: 'gst.gov.in — New GST Registration',
    inputCoords: { x: '52%', y: '53%' },
    buttonCoords: { x: '52%', y: '90%' },
    typingLabel: 'Filling business details...',
    successTitle: 'GST Application Submitted',
    successSubtitle: 'ARN generated on your email',
    successTag: 'Track with ARN number',
    vectorFields: [
      { label: 'Legal Name of Business', placeholder: 'As per PAN card' },
      { label: 'PAN Number', placeholder: 'ABCDE1234F' },
      { label: 'Mobile Number', placeholder: '+91 98765 43210' },
    ],
    vectorButtonLabel: 'Proceed',
  },

  passport_seva: {
    screenshotSrc: '/explainers/passport_seva.png',
    addressBarUrl: 'passportindia.gov.in — User Registration',
    inputCoords: { x: '47%', y: '30%' },
    buttonCoords: { x: '66%', y: '78%' },
    typingLabel: 'Filling registration form...',
    successTitle: 'Account Registered',
    successSubtitle: 'Login to book appointment',
    successTag: 'Proceed to apply',
    vectorFields: [
      { label: 'Full Name', placeholder: 'As per Aadhaar' },
      { label: 'Email ID', placeholder: 'your@email.com' },
      { label: 'Login ID', placeholder: 'Choose a username' },
    ],
    vectorButtonLabel: 'Sign Up',
  },

  epfo_pf_transfer: {
    screenshotSrc: '/explainers/epfo_pf_transfer.png',
    addressBarUrl: 'epfindia.gov.in — Member Login',
    inputCoords: { x: '50%', y: '38%' },
    buttonCoords: { x: '38%', y: '72%' },
    typingLabel: 'Entering UAN credentials...',
    successTitle: 'Logged into EPFO Portal',
    successSubtitle: 'Go to Online Services → Transfer',
    successTag: 'Initiate PF transfer',
    vectorFields: [
      { label: 'UAN Number', placeholder: '100123456789' },
      { label: 'Password', placeholder: '••••••••' },
    ],
    vectorButtonLabel: 'Sign In',
  },

  income_tax_efiling: {
    screenshotSrc: '/explainers/income_tax_efiling.png',
    addressBarUrl: 'eportal.incometax.gov.in — Login',
    inputCoords: { x: '28%', y: '46%' },
    buttonCoords: { x: '28%', y: '57%' },
    typingLabel: 'Entering PAN number...',
    successTitle: 'Logged into e-Filing Portal',
    successSubtitle: 'Ready to file your return',
    successTag: 'Go to File ITR',
    vectorFields: [
      { label: 'User ID (PAN / Aadhaar)', placeholder: 'ABCDE1234F' },
    ],
    vectorButtonLabel: 'Continue',
  },

  digilocker: {
    screenshotSrc: '/explainers/digilocker.png',
    addressBarUrl: 'digilocker.gov.in — Sign In',
    inputCoords: { x: '56%', y: '52%' },
    buttonCoords: { x: '53%', y: '65%' },
    typingLabel: 'Entering mobile number...',
    successTitle: 'OTP Sent to Mobile',
    successSubtitle: 'Enter OTP to access DigiLocker',
    successTag: 'Documents ready to share',
    vectorFields: [
      { label: 'Mobile Number', placeholder: '+91  98765 43210' },
    ],
    vectorButtonLabel: 'Continue',
  },
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export default function InteractiveExplainer({ explainerType }) {
  if (!explainerType) return null

  const config = PORTALS[explainerType]
  if (!config) return null   // Scope guard: unregistered types render nothing

  return <ExplainerCard {...config} />
}
