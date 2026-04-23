/**
 * GuidePanel — Premium "Guide Me" Experience
 *
 * This panel is the navigator, not a to-do list. It walks users through
 * complex government tasks step-by-step with pre-filled data from their vault.
 *
 * Design spec: guide-me-brief.html
 * Backend logic: backend/routes/task_routes.py (4-layer intelligence)
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Clipboard, Check, X, Upload } from 'lucide-react'

// Inline styles matching guide-me-brief.html exactly
const S = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(5px)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 0,
  },
  sheet: {
    background: '#0f1f18', // Slightly lighter than page background
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '24px 24px 0 0',
    width: '100%',
    maxWidth: 1200,
    maxHeight: '96vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 -20px 60px rgba(0, 0, 0, 0.8)',
  },
  handle: {
    width: 36,
    height: 4,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    margin: '12px auto 0',
    flexShrink: 0,
  },
  progressBar: {
    height: 3,
    background: 'rgba(255, 255, 255, 0.06)',
    width: '100%',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, #d47c3f, #5c8c75)',
    borderRadius: 0,
    transition: 'width 0.4s ease',
  },
  scroll: {
    overflowY: 'auto',
    flex: 1,
    padding: '0 0 60px 0',
  },
  header: {
    padding: '16px 20px 14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    position: 'relative',
  },
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: '#d47c3f',
    marginBottom: 4,
    fontWeight: 700,
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontWeight: 700,
    fontSize: 18,
    color: '#f7f4ee',
    marginBottom: 5,
    lineHeight: 1.2,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  timeChip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    padding: '2px 8px',
    borderRadius: 999,
    background: 'rgba(92, 140, 117, 0.12)',
    border: '1px solid rgba(92, 140, 117, 0.25)',
    color: '#5c8c75',
  },
  siteLink: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.38)',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'rgba(255, 255, 255, 0.38)',
    fontSize: 14,
    cursor: 'pointer',
    padding: '4px 9px',
    borderRadius: 6,
    lineHeight: 1,
    transition: 'all 0.15s',
  },
  prefillBanner: {
    background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.09), rgba(13, 26, 21, 0.3))',
    border: '1px solid rgba(201, 168, 76, 0.2)',
    borderRadius: 10,
    padding: '12px 14px',
    margin: '12px 20px',
  },
  prefillHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  prefillStar: {
    fontSize: 15,
  },
  prefillTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: '#f7f4ee',
  },
  prefillSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.38)',
    marginBottom: 8,
    paddingLeft: 23,
    lineHeight: 1.5,
  },
  prefillField: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 8px',
    background: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    marginBottom: 3,
  },
  pfLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.38)',
    width: 90,
    flexShrink: 0,
    textTransform: 'uppercase',
  },
  pfValue: {
    fontSize: 11,
    color: '#f7f4ee',
    flex: 1,
    fontWeight: 500,
  },
  pfSource: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    padding: '3px 7px',
    borderRadius: 5,
  },
  steps: {
    padding: '4px 20px 8px',
  },
  step: {
    display: 'flex',
    gap: 12,
    padding: '13px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: '#fff',
    transition: 'all 0.3s',
    cursor: 'pointer',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: '#f7f4ee',
    marginBottom: 3,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  stepDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.38)',
    lineHeight: 1.65,
    marginBottom: 7,
  },
  stepActions: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 12px',
    borderRadius: 999,
    fontSize: 10,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.18s',
    border: '1px solid',
    textDecoration: 'none',
  },
  resultBox: {
    background: 'rgba(92, 140, 117, 0.05)',
    border: '1px solid rgba(92, 140, 117, 0.14)',
    borderRadius: 9,
    padding: '12px 14px',
    margin: '6px 20px 0',
  },
  resultLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#5c8c75',
    marginBottom: 7,
  },
  resultItem: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.38)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    padding: '2px 0',
    lineHeight: 1.55,
  },
  ctaSection: {
    padding: '14px 20px',
  },
  ctaBtn: {
    width: '100%',
    padding: 13,
    background: '#d47c3f',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
}

function normalizeText(content) {
  if (!content) return ''
  return String(content)
    .split('\n')
    .map((l) => l.replace(/\t/g, ' ').trimEnd())
    .filter((l) => l.trim().length > 0)
    .join('\n')
}

/**
 * Returns a specific, helpful 1-2 sentence hint based on the full subtask title.
 * Uses double-quoted strings to avoid apostrophe parse issues.
 */
function getSubtaskHint(title) {
  if (!title) return ""
  const t = title.toLowerCase()

  // Document / proof gathering
  if (/identity|address proof|id proof/.test(t))
    return "Collect government-issued photo ID (Aadhaar, PAN, Passport) and a recent address proof (utility bill, bank statement) for each person involved."
  if (/photograph/.test(t))
    return "Arrange recent passport-size photographs with a white or light background. Typically required for each applicant."
  if (/income.*proof|salary.*slip|itr|income tax return/.test(t))
    return "Gather your last 2-3 salary slips or the most recent ITR acknowledgement from the Income Tax portal."
  if (/bank.*statement/.test(t))
    return "Download the last 3-6 months of bank statements from your net banking portal as a PDF."
  if (/noc|no.*objection/.test(t))
    return "Obtain this from the relevant authority (landlord, society, or employer) on official letterhead."
  if (/pan card|pan number/.test(t))
    return "Ensure PAN is linked to Aadhaar. Download a copy from the NSDL or UTIITSL portal if needed."
  if (/aadhaar|aadhar/.test(t))
    return "Use your linked mobile number to download an e-Aadhaar from uidai.gov.in if you need a digital copy."
  if (/passport/.test(t))
    return "Ensure your passport is valid and the address page is clearly scanned. It serves as both ID and address proof."

  // Business / legal setup
  if (/business name|proposed.*name/.test(t))
    return "Choose a unique name and verify availability on the MCA portal (mca.gov.in) before proceeding with registration."
  if (/description.*activit|brief.*description|nature.*business/.test(t))
    return "Write 2-3 clear sentences describing what your business does. This appears in official registration documents."
  if (/partnership deed/.test(t))
    return "The deed must specify partner names, capital contributions, profit-sharing ratio, and roles. Have it notarised or registered."
  if (/incorporation.*document|memorandum|moa|aoa/.test(t))
    return "Prepare MOA (Memorandum of Association) and AOA (Articles of Association). These define company purpose, structure, and rules."
  if (/gst.*register|gst registration|gstin/.test(t))
    return "Register on the GST portal (gst.gov.in) with your PAN, Aadhaar, and business documents. Approval typically takes 3-7 working days."
  if (/msme|udyam|udyog/.test(t))
    return "Register on the Udyam portal for free. It gives access to government schemes and subsidies for small businesses."

  // Financial / banking
  if (/bank account|current account/.test(t))
    return "You will need the account number, IFSC code, and bank branch details. A cancelled cheque may also be required."
  if (/pay.*fee|registration.*fee|stamp.*duty/.test(t))
    return "Complete the payment using net banking or UPI on the official portal. Save the payment receipt or acknowledgement number."
  if (/capital|share.*capital/.test(t))
    return "Define the authorised and paid-up share capital for your company. This affects registration fees and filing requirements."

  // Submission / uploading
  if (/upload|scan|attach/.test(t))
    return "Scan documents at 200 DPI or higher. Accepted formats are usually PDF or JPEG under 2MB. Check the portal requirements."
  if (/submit|application|apply/.test(t))
    return "Review all details before submitting. Note the application or reference number shown after submission for future tracking."
  if (/sign|e-sign|digital signature|dsc/.test(t))
    return "Digital signatures (DSC) can be obtained from certified agencies. Ensure the DSC is valid and the correct type (Class 2 or 3)."

  // Verification / review
  if (/verify|confirm|check|review/.test(t))
    return "Cross-check all spellings, dates, and numbers carefully before proceeding. Errors here can delay approval significantly."

  // Fallback by first verb
  const verb = t.split(" ")[0]
  if (/gather|collect|obtain|get/.test(verb))
    return "Collect and organise these materials in advance. Having them ready avoids delays in subsequent steps."
  if (/prepare|create|draft|make/.test(verb))
    return "Prepare this carefully and keep a copy. It may be referenced or submitted in a later step."
  if (/decide|choose|select/.test(verb))
    return "Finalise this decision before moving forward. It will be referenced in official documents."

  return "Complete and tick off this step to continue progressing through your journey."
}

/**
 * Returns a relevant official portal link for a subtask based on keyword detection.
 * Covers common Indian government and business portals.
 * Used as a fallback when the AI guide did not generate a step for this subtask.
 */
function getSmartLink(title, desc = "") {
  const t = ((title || "") + " " + (desc || "")).toLowerCase()
  if (!t.trim()) return null

  // Business registration / MCA
  if (/business name|name.*availab|proposed.*name|register.*name/.test(t))
    return { type: 'link', label: "Check name availability on MCA →", url: "https://www.mca.gov.in/mcafoportal/enquiryForNameAvailability.do" }
  if (/cin|llpin|spice|incorporation|register.*business|business.*register/.test(t))
    return { type: 'link', label: "Open MCA SPICe+ form →", url: "https://www.mca.gov.in/content/mca/global/en/mca/forms-filings.html" }
  if (/mca|ministry.*corporate|company.*registration/.test(t))
    return { type: 'link', label: "Open MCA portal →", url: "https://www.mca.gov.in" }

  // GST
  if (/gst|gstin|goods.*service.*tax/.test(t))
    return { type: 'link', label: "Open GST portal →", url: "https://www.gst.gov.in" }

  // Income Tax / ITR
  if (/income tax|itr|e-filing|tax.*return/.test(t))
    return { type: 'link', label: "Open Income Tax e-Filing →", url: "https://www.incometax.gov.in" }

  // PAN
  if (/pan card|pan number|apply.*pan/.test(t))
    return { type: 'link', label: "Apply for PAN on NSDL →", url: "https://www.onlineservices.nsdl.com/paam/endUserRegisterContact.html" }

  // Aadhaar
  if (/aadhaar|aadhar|uidai/.test(t))
    return { type: 'link', label: "Open UIDAI portal →", url: "https://uidai.gov.in" }

  // Passport
  if (/passport/.test(t))
    return { type: 'link', label: "Open Passport Seva portal →", url: "https://www.passportindia.gov.in" }

  // MSME / Udyam
  if (/msme|udyam|udyog|small.*business.*register/.test(t))
    return { type: 'link', label: "Register on Udyam portal →", url: "https://udyamregistration.gov.in" }

  // Bank / account
  if (/bank account|current account|open.*account/.test(t))
    return { type: 'link', label: "Find RBI-approved banks →", url: "https://www.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=2009" }

  // Trademark
  if (/trademark|brand.*register|logo.*register/.test(t))
    return { type: 'link', label: "Search trademarks on IP India →", url: "https://ipindiaonline.gov.in/tmrpublicsearch/frmmain.aspx" }

  // Digital signature
  if (/digital signature|dsc|e-sign/.test(t))
    return { type: 'link', label: "Get DSC from eMudhra →", url: "https://www.emudhra.com/digital-signature/dsc-for-companies/" }

  // Property / rent / lease
  if (/rental agreement|lease deed|property.*register/.test(t))
    return { type: 'link', label: "Find registration office →", url: "https://igrs.gov.in" }

  // Labour / employment
  if (/pf|provident fund|epfo|esic|labour registration/.test(t))
    return { type: 'link', label: "Open EPFO portal →", url: "https://www.epfindia.gov.in" }

  // Visa
  if (/visa|e-visa/.test(t))
    return { type: 'link', label: "Apply for e-Visa →", url: "https://indianvisaonline.gov.in/evisa/tvoa.html" }

  // Driving licence
  if (/driving.*licen|dl renewal/.test(t))
    return { type: 'link', label: "Open Parivahan portal →", url: "https://parivahan.gov.in" }

  // Vehicle registration
  if (/vehicle.*register|rc book|registration.*certificate/.test(t))
    return { type: 'link', label: "Open Parivahan portal →", url: "https://vahan.nic.in" }

  // No link available
  return null
}


export default function GuidePanel({ task, onClose, onMarkDone, onNavigate, onToggleSubtask }) {
  const [guide, setGuide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)
  const [stepStates, setStepStates] = useState([])
  // Tracks the real subtask IDs in order, if steps are backed by subtasks
  const subtaskIdsRef = useRef([])

  // Display fallbacks
  const displayTitle = guide?.title || task?.title || 'Task Assistant'
  const displayUrl = guide?.url || task?.portal_url
  const displayUrlNote = guide?.url_note
  const displayIntro =
    guide?.intro ||
    task?.description ||
    'Strategic guidance to help you complete this task quickly and correctly.'

  // Pre-fill data: use backend data if available, else derive from task
  let prefills = []
  if (guide?.prefilled?.length > 0) {
    prefills = guide.prefilled.map((f) => ({
      label: f.label || 'Details',
      value: f.found ? f.value : 'REQUIRED',
      source: f.found
        ? f.source_label?.includes('vault')
          ? 'vault'
          : 'profile'
        : 'missing',
    }))
  } else if (guide?.required_docs?.length > 0) {
    prefills = guide.required_docs.map((d) => ({
      label: d.name,
      value: d.has ? 'AVAILABLE' : 'REQUIRED',
      source: d.has ? 'vault' : 'missing',
    }))
  } else if (task?.required_docs?.length > 0) {
    prefills = task.required_docs.map((d) => ({
      label: d.name,
      value: d.has ? 'AVAILABLE' : 'REQUIRED',
      source: d.has ? 'vault' : 'missing',
      raw: d.has ? d.vault_value : null // Add value if available
    }))
  }

  // Fetch guide data
  useEffect(() => {
    if (!task?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const hasSubtasks = task.subtasks?.length > 0

    fetch(`/api/tasks/${task.id}/guide`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        clearTimeout(timeout)

        if (hasSubtasks) {
          subtaskIdsRef.current = task.subtasks.map(s => s.id)

          // Build a keyword-overlap scorer to find the best-matching AI description
          // for each subtask title. This is better than index-matching (which breaks
          // when step counts differ) and avoids wrong AI descriptions being shown.
          const aiSteps = data?.steps?.map(s => ({
            ...s,
            description: normalizeText(s.description),
            _words: new Set((s.title + ' ' + s.description).toLowerCase().match(/\w{4,}/g) ?? [])
          })) ?? []

          // Title-weighted scorer: title word overlap counts 3x, description overlap 1x.
          // This prevents a false match where a few shared description words
          // (e.g. "address proof") beat a semantically unrelated but description-matching step.
          // Minimum score of 3 means at least one shared title word is required.
          const getAiMatch = (subtaskTitle) => {
            if (!aiSteps.length) return { description: null, action: null }
            const subtaskTitleWords = new Set(subtaskTitle.toLowerCase().match(/\w{4,}/g) ?? [])
            let best = null, bestScore = 0
            for (const aiStep of aiSteps) {
              const aiTitleWords = new Set((aiStep.title || "").toLowerCase().match(/\w{4,}/g) ?? [])
              let score = 0
              for (const w of subtaskTitleWords) {
                if (aiTitleWords.has(w)) score += 3      // strong: title-to-title match
                else if (aiStep._words.has(w)) score += 1 // weak: description-only match
              }
              if (score > bestScore) { bestScore = score; best = aiStep }
            }
            // Score >= 3 means at least one shared title word (prevents description-only false positives)
            if (bestScore >= 3) return { description: best?.description ?? null, action: best?.action ?? null }
            return { description: null, action: null }
          }

          const matchedAiIndices = new Set()

          const steps = task.subtasks.map((s) => {
            if (!aiSteps.length) {
              return {
                title: s.title,
                description: s.description || getSubtaskHint(s.title),
                action: getSmartLink(s.title),
              }
            }
            const subtaskTitleWords = new Set(s.title.toLowerCase().match(/\w{4,}/g) ?? [])
            let bestIdx = -1, bestScore = 0
            aiSteps.forEach((aiStep, idx) => {
              const aiTitleWords = new Set((aiStep.title || "").toLowerCase().match(/\w{4,}/g) ?? [])
              let score = 0
              for (const w of subtaskTitleWords) {
                if (aiTitleWords.has(w)) score += 3
                else if (aiStep._words.has(w)) score += 1
              }
              if (score > bestScore) { bestScore = score; bestIdx = idx }
            })
            const matched = bestScore >= 3 ? aiSteps[bestIdx] : null
            if (matched) matchedAiIndices.add(bestIdx)
            const finalDesc = s.description || matched?.description || getSubtaskHint(s.title);
            return {
              title: s.title,
              description: finalDesc,
              action: matched?.action ?? getSmartLink(s.title, finalDesc),
            }
          })

          // AI steps that didn't match any subtask — shown as bonus "AI guide" steps
          const extraSteps = aiSteps
            .map((aiStep, idx) => ({ ...aiStep, _idx: idx }))
            .filter(aiStep => !matchedAiIndices.has(aiStep._idx))
            .map(({ _words, _idx, ...rest }) => ({ ...rest, action: rest.action ?? getSmartLink(rest.title, rest.description) })) // strip internal fields

          const finalSteps = [...steps, ...extraSteps]

          setGuide({
            title: task.title,
            intro: data?.intro ? normalizeText(data.intro) : task.description,
            steps: finalSteps,
            has_guide: true,
            url: data?.url,
            url_note: data?.url_note,
            estimated_mins: data?.estimated_mins,
            prefilled: data?.prefilled,
            required_docs: data?.required_docs,
            expected_result: data?.expected_result,
            what_to_save: data?.what_to_save,
          })
          setStepStates([...task.subtasks.map(s => s.done ? 'done' : 'todo'), ...extraSteps.map(() => 'todo')])

        } else if (data?.has_guide) {
          // No subtasks — use AI steps directly (nothing to sync)
          if (data.steps && Array.isArray(data.steps)) {
            data.steps = data.steps.map((s) => {
              const d = normalizeText(s.description);
              return {
                ...s,
                description: d,
                action: s.action ?? getSmartLink(s.title, d),
              }
            })
          }
          if (data.intro) data.intro = normalizeText(data.intro)
          setGuide(data)
          setStepStates(data.steps?.map((_, i) => (i === 0 ? 'active' : 'todo')) ?? [])

        } else {
          setGuide(null)
        }
        setLoading(false)
      })
      .catch((err) => {
        clearTimeout(timeout)
        console.error('Guide fetch error:', err)
        // Offline fallback — subtasks only
        if (hasSubtasks) {
          subtaskIdsRef.current = task.subtasks.map(s => s.id)
          setGuide({
            title: task.title,
            intro: task.description,
            steps: task.subtasks.map((s) => ({
              title: s.title,
              description: s.description || 'Complete this step to progress the task.',
            })),
            has_guide: true,
          })
          setStepStates([...task.subtasks.map(s => s.done ? 'done' : 'todo'), ...extraSteps.map(() => 'todo')])
        }
        setLoading(false)
      })
  }, [task?.id])

  const copyText = (key, text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const toggleStep = (idx) => {
    setStepStates((prev) => {
      const next = [...prev]
      const current = next[idx]

      const nextIsDone = current === 'done' ? false : true
      next[idx] = nextIsDone ? 'done' : 'active'

      // If backed by a real subtask, sync to parent
      const subtaskId = subtaskIdsRef.current[idx]
      if (subtaskId != null && onToggleSubtask) {
        onToggleSubtask(task.id, subtaskId)
      }

      // Auto-activate next incomplete step
      if (nextIsDone) {
        const nextIncomplete = next.findIndex((s, i) => i > idx && s === 'todo')
        if (nextIncomplete !== -1) {
          next[nextIncomplete] = 'active'
        }
      }
      return next
    })
  }

  // Progress: use real subtask completion when subtasks exist, otherwise guide step progress
  const subtasks = task?.subtasks ?? []
  const subtaskDoneCount = subtasks.filter(s => s.done).length
  const hasRealSubtasks = subtasks.length > 0
  const doneCount = hasRealSubtasks ? subtaskDoneCount : stepStates.filter((s) => s === 'done').length
  const totalCount = hasRealSubtasks ? subtasks.length : stepStates.length
  const progressPct = totalCount ? (doneCount / totalCount) * 100 : 0

  return createPortal(
    <AnimatePresence>
      {task && (
        <motion.div
          key="guide-overlay"
          style={S.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose} // Click outside to close
        >
          <motion.div
            key="guide-sheet"
            style={S.sheet}
            initial={{ transform: 'translateY(60%)', opacity: 0.6 }}
            animate={{ transform: 'translateY(0)', opacity: 1 }}
            exit={{ transform: 'translateY(60%)', opacity: 0.6 }}
            onClick={(e) => e.stopPropagation()} // Prevent close on inside click
            transition={{ type: 'spring', damping: 25, stiffness: 200, duration: 0.32 }}
          >
            {/* Handle */}
            <div style={S.handle} />

            {/* Progress bar */}
            <div style={S.progressBar}>
              <motion.div
                style={{ ...S.progressFill, width: `${progressPct}%` }}
                initial={false}
                animate={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Header */}
            <div style={S.header}>
              <div style={S.eyebrow}>GUIDE ME THROUGH THIS</div>
              <h2 style={S.title}>{displayTitle}</h2>
              <div style={S.meta}>
                <span style={S.timeChip}>~{guide?.estimated_mins || '5'} min</span>
                {displayUrl && (
                  <>
                    <span style={S.siteLink}>·</span>
                    <span style={S.siteLink}>{displayUrl.replace(/^https?:\/\//, '')}</span>
                  </>
                )}
                {!displayUrl && displayUrlNote && (
                  <>
                    <span style={S.siteLink}>·</span>
                    <span style={{...S.siteLink, color: 'var(--amber)', fontSize: 10}}>📄 {displayUrlNote}</span>
                  </>
                )}
              </div>
              <button
                style={S.closeBtn}
                onClick={onClose}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white'
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.38)'
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <X size={12} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={S.scroll}>
              {/* PathFinder Insights Pre-fill Banner */}
              {prefills.length > 0 && (
                <div style={S.prefillBanner}>
                  <div style={S.prefillHead}>
                    <span style={S.prefillStar}>✦</span>
                    <span style={S.prefillTitle}>PathFinder knows these — no need to look them up</span>
                  </div>
                  <div style={S.prefillSub}>Details from your vault and profile, pre-filled for this task.</div>
                  <div>
                    {prefills.map((row, i) => (
                      <div key={i} style={S.prefillField}>
                        <span style={S.pfLabel}>{row.label}</span>
                        <span
                          style={{
                            ...S.pfValue,
                            color: row.source === 'missing' ? 'rgba(255, 255, 255, 0.2)' : '#f7f4ee',
                          }}
                        >
                          {row.value}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {row.source === 'missing' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate?.('vault');
                              }}
                              style={{
                                ...S.pfSource,
                                background: 'rgba(212, 124, 63, 0.12)',
                                border: '1px solid rgba(212, 124, 63, 0.3)',
                                color: '#d47c3f',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                textTransform: 'uppercase',
                                fontWeight: 800,
                                outline: 'none',
                                fontSize: 11,
                                padding: '4px 12px'
                              }}
                            >
                              <Upload size={12} /> Upload
                            </button>
                          ) : (
                            <div
                              style={{
                                ...S.pfSource,
                                ...(row.source === 'vault'
                                  ? {
                                      background: 'rgba(92, 140, 117, 0.12)',
                                      border: '1px solid rgba(92, 140, 117, 0.25)',
                                      color: '#5c8c75',
                                    }
                                  : {
                                      background: 'rgba(212, 124, 63, 0.1)',
                                      border: '1px solid rgba(212, 124, 63, 0.22)',
                                      color: '#f0a96b',
                                    }),
                                textTransform: 'uppercase',
                                fontWeight: 800
                              }}
                            >
                              from {row.source}
                            </div>
                          )}

                          {row.source !== 'missing' && row.value && row.value !== 'AVAILABLE' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyText('req-' + i, row.value);
                              }}
                              style={{
                                background: copied === 'req-' + i ? 'rgba(92, 140, 117, 0.2)' : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${copied === 'req-' + i ? 'rgba(92,140,117,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: 6,
                                padding: '4px 10px',
                                color: copied === 'req-' + i ? '#5c8c75' : 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}
                            >
                              {copied === 'req-' + i ? 'COPIED' : 'COPY'}
                              <Clipboard size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading state */}
              {loading && !guide && (
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      margin: '0 auto',
                      animation: 'spin 1s linear infinite',
                      opacity: 0.3,
                    }}
                  />
                </div>
              )}

              {/* No guide fallback */}
              {!loading && !guide?.steps?.length && (
                <div style={{ padding: '20px', color: 'rgba(184, 207, 199, 0.55)', lineHeight: 1.6 }}>
                  {displayIntro}
                </div>
              )}

              {/* Steps */}
              {guide?.steps && (
                <div style={S.steps}>
                  {guide.steps.map((step, idx) => {
                    const state = stepStates[idx] || 'todo'
                    const isLast = idx === guide.steps.length - 1

                    return (
                      <div key={idx} style={{ ...S.step, borderBottom: isLast ? 'none' : S.step.borderBottom }}>
                        {/* Step number circle */}
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleStep(idx)}
                          style={{
                            ...S.stepNum,
                            ...(state === 'done'
                              ? { background: '#5c8c75' }
                              : { background: '#d47c3f', color: '#fff' }),
                          }}
                        >
                          {state === 'done' ? <Check size={12} strokeWidth={4} /> : idx + 1}
                        </motion.div>

                        {/* Step content */}
                        <div onClick={() => toggleStep(idx)} style={{ flex: 1, cursor: 'pointer' }}>
                          <div
                            style={{
                              ...S.stepTitle,
                              color: '#f7f4ee',
                            }}
                          >
                            {step.title}
                          </div>
                          <div style={S.stepDesc}>{step.description}</div>

                          {/* Action buttons */}
                          <div style={S.stepActions}>
                            {/* Open URL button */}
                            {step.action && (step.action.type === 'link' || step.action.url) && (
                              <a
                                href={step.action.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  ...S.actionBtn,
                                  background: 'rgba(212, 124, 63, 0.1)',
                                  borderColor: 'rgba(212, 124, 63, 0.25)',
                                  color: '#f0a96b',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212, 124, 63, 0.18)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(212, 124, 63, 0.1)')}
                              >
                                {step.action.label || 'Open Resource'} →
                              </a>
                            )}

                            {/* Copy button */}
                            {step.action && step.action.type === 'copy' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyText(idx, step.action.value)
                                }}
                                style={{
                                  ...S.actionBtn,
                                  background:
                                    copied === idx ? 'rgba(92, 140, 117, 0.15)' : 'rgba(212, 124, 63, 0.1)',
                                  borderColor: copied === idx ? '#5c8c75' : 'rgba(212, 124, 63, 0.25)',
                                  color: copied === idx ? '#5c8c75' : '#f0a96b',
                                }}
                              >
                                {copied === idx ? 'Copied!' : step.action.label || 'Copy ID'}
                                <Clipboard size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* What You'll Get When Done */}
              <div style={S.resultBox}>
                <div style={S.resultLabel}>WHAT YOU'LL GET WHEN DONE</div>
                {guide?.expected_result ? (
                  <div style={S.resultItem}>
                    <span style={{ flexShrink: 0, color: 'rgba(184, 207, 199, 0.3)' }}>→</span>
                    <span>{guide.expected_result}</span>
                  </div>
                ) : (
                  <div style={S.resultItem}>
                    <span style={{ flexShrink: 0, color: 'rgba(184, 207, 199, 0.3)' }}>→</span>
                    <span>The task will be marked as complete in your events timeline.</span>
                  </div>
                )}

                {guide?.what_to_save ? (
                  <div style={S.resultItem}>
                    <span style={{ flexShrink: 0, color: 'rgba(184, 207, 199, 0.3)' }}>→</span>
                    <span>
                      <b>You should save:</b> {guide.what_to_save}
                    </span>
                  </div>
                ) : (
                  <div style={S.resultItem}>
                    <span style={{ flexShrink: 0, color: 'rgba(184, 207, 199, 0.3)' }}>→</span>
                    <span>
                      Any acknowledgement slips, reference numbers, or digital certificates issued during this
                      process.
                    </span>
                  </div>
                )}
              </div>

              {/* Completion CTA */}
              <div style={S.ctaSection}>
                <motion.button
                  whileHover={{ transform: 'translateY(-2px)', boxShadow: '0 6px 22px rgba(212, 124, 63, 0.38)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    // Mark all undone subtasks as done before completing the task
                    if (onToggleSubtask && task?.subtasks?.length > 0) {
                      task.subtasks.forEach(s => {
                        if (!s.done) onToggleSubtask(task.id, s.id)
                      })
                    }
                    if (onMarkDone) onMarkDone(task.id)
                    onClose()
                  }}
                  style={S.ctaBtn}
                >
                  ✓ I completed this task
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
