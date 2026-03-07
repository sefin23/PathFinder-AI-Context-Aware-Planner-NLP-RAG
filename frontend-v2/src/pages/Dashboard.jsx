/**
 * Dashboard — Pathfinder AI planning dashboard.
 * Dark Forest main layout (Sidebar | Workspace | Overlay panels)
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import LifeEventInput from '../components/LifeEventInput'
import ProcessingIndicator from '../components/ProcessingIndicator'
import EventAnalysisCard from '../components/EventAnalysisCard'
import RequirementsCard from '../components/RequirementsCard'
import WorkflowCard from '../components/WorkflowCard'
import InsightPanel from '../components/InsightPanel'
import RecommendationsPanel from '../components/RecommendationsPanel'
import {
  analyzeLifeEvent,
  retrieveRequirements,
  proposeWorkflow,
  approveWorkflow,
  getRecommendations,
} from '../api/backend'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const STEP_MS  = 500

export default function Dashboard() {
  const [activePage, setActivePage] = useState('dashboard')

  // Pipeline state machine
  const [stage, setStage]                       = useState('idle')
  const [analysisData, setAnalysisData]         = useState(null)
  const [requirementsData, setRequirementsData] = useState(null)
  const [workflowData, setWorkflowData]         = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [errorMsg, setErrorMsg]                 = useState(null)

  const recRef = useRef(null)

  useEffect(() => {
    if (recommendations.length > 0 && recRef.current) {
      recRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [recommendations])

  // Approve state (stubbed)
  const [approved, setApproved]   = useState(false)
  const [approving, setApproving] = useState(false)

  const resetPipeline = () => {
    setStage('idle')
    setAnalysisData(null)
    setRequirementsData(null)
    setWorkflowData(null)
    setRecommendations([])
    setErrorMsg(null)
    setApproved(false)
  }

  /**
   * Main pipeline: analyze → retrieve → propose workflow.
   */
  const runPipeline = useCallback(async (userText) => {
    setAnalysisData(null)
    setRequirementsData(null)
    setWorkflowData(null)
    setErrorMsg(null)
    setApproved(false)

    // ── Step 1: Analyze ───────────────────────────────────────────────
    setStage('analyzing')
    let analysis
    try {
      analysis = await analyzeLifeEvent(userText)
      await sleep(STEP_MS)
      if (!analysis?.success || !analysis?.data) {
        throw new Error(analysis?.message || 'Classification returned no data.')
      }

      // ── Layer 4: Clarification Intercept ───────────────────────────
      if (analysis.data?.clarification_needed) {
        setAnalysisData(analysis.data)
        setStage('idle') // Back to idle so user can see questions and retry
        return
      }
    } catch (err) {
      const msg = err?.response?.data?.detail ?? err.message ?? 'Analysis failed.'
      setErrorMsg(msg)
      setStage('error')
      return
    }
    setAnalysisData(analysis.data)
    setStage('analyzed')

    const eventTypes  = analysis.data?.life_event_types ?? []
    const location    = analysis.data?.location ?? null
    const timeline    = analysis.data?.timeline ?? null
    const primaryType = eventTypes[0] ?? null

    await sleep(300)

    // ── Step 2: Retrieve Requirements ─────────────────────────────────
    setStage('loading-docs')
    let requirements
    try {
      requirements = await retrieveRequirements(userText, primaryType, 5)
      await sleep(STEP_MS)
    } catch (err) {
      const msg = err?.response?.data?.detail ?? err.message ?? 'Requirement retrieval failed.'
      setErrorMsg(msg)
      setStage('error')
      return
    }
    setRequirementsData(requirements)
    setStage('docs-loaded')
    await sleep(300)

    // ── Step 3: Generate Workflow ─────────────────────────────────────
    setStage('generating')
    let workflow
    try {
      workflow = await proposeWorkflow(eventTypes, location, timeline)
      await sleep(STEP_MS)
      if (!workflow?.success) {
        throw new Error(workflow?.error ?? 'Workflow generation was unsuccessful.')
      }
    } catch (err) {
      const msg = err?.response?.data?.detail ?? err.message ?? 'Workflow generation failed.'
      setErrorMsg(msg)
      setStage('error')
      return
    }
    setWorkflowData(workflow)
    await sleep(300)
    setStage('complete')
  }, [])

  /**
   * Approve workflow (stubbed).
   */
  const handleApprove = useCallback(async (tasks) => {
    setApproving(true)
    try {
      await approveWorkflow(1, tasks)
      setApproved(true)

      // Layer 4: Fetch recommendations after approval
      try {
        const recData = await getRecommendations(1)
        if (recData?.recommendations?.length > 0) {
          setRecommendations(recData.recommendations)
        } else {
           throw new Error("No recs")
        }
      } catch {
         // UI Demo fallback
         setRecommendations([
           { message: "You've just created your roadmap! A great first step is to gather all the required documents listed above.", reason: "Getting Started" },
           { message: "Try setting a due date for your highest priority tasks to stay on track.", reason: "Planning Tip" }
         ])
      }
    } catch {
      // silent — approval is stubbed
    } finally {
      setApproving(false)
    }
  }, [])

  const isRunning = ['analyzing','analyzed','loading-docs','docs-loaded','generating'].includes(stage)

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--forest-deep)', overflow: 'hidden' }}>

      {/* Background Ambience Layer */}
      <div style={{
         position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '120%', zIndex: 0, opacity: 0.15, pointerEvents: 'none',
         background: 'radial-gradient(circle at 80% 20%, var(--amber) 0%, transparent 20%), radial-gradient(circle at 20% 80%, var(--sage) 0%, transparent 25%)',
         filter: 'blur(80px)'
      }} />

      {/* ── Left: Sidebar ───────────────────────────────────── */}
      <div style={{ zIndex: 10, height: '100%' }}>
         <Sidebar activePage={activePage} onNavigate={setActivePage} />
      </div>

      {/* ── Centre: Main Workspace ──────────────────────────── */}
      <div id="main-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', position: 'relative', zIndex: 5 }}>

        {/* Scrollable workspace */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '60px 40px', maxWidth: 900, margin: '0 auto', width: '100%' }}>

          {/* 1 — Input */}
          <div style={{ marginBottom: 40 }}>
             <LifeEventInput stage={stage} onSubmit={runPipeline} analysisData={analysisData} />
          </div>

          {/* 2 — Processing indicator */}
          <AnimatePresence>
            {isRunning && <ProcessingIndicator stage={stage} />}
          </AnimatePresence>

          {/* 3 — Error state */}
          <AnimatePresence>
            {stage === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ background: 'var(--forest-card)', border: '1px solid rgba(198,93,74,0.3)', borderRadius: 'var(--r-md)', padding: '20px 24px', marginBottom: 24 }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--coral)', marginBottom: 6 }}>⚠ System Error</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{errorMsg}</p>
                <button
                  onClick={resetPipeline}
                  className="btn-cust"
                >
                  Restart Journey
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4 — Event Analysis Card */}
          <AnimatePresence>
            {analysisData && (
              <motion.div key="analysis" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ marginBottom: 24 }}>
                <EventAnalysisCard data={analysisData} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 5 — Requirements Card */}
          <AnimatePresence>
            {requirementsData && (
              <motion.div key="reqs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }} style={{ marginBottom: 24 }}>
                <RequirementsCard data={requirementsData} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 6 — Workflow Card */}
          <AnimatePresence>
            {workflowData && (
              <motion.div key="workflow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.16 }}>
                <WorkflowCard
                  data={workflowData}
                  approved={approved}
                  approving={approving}
                  onApprove={handleApprove}
                  onRegenerate={resetPipeline}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Layer 4: Recommendations */}
          <AnimatePresence>
            {recommendations.length > 0 && (
               <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} style={{ marginBottom: 40 }}>
                 <RecommendationsPanel ref={recRef} recommendations={recommendations} />
               </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state bottom padding */}
          {stage === 'idle' && (
             <div style={{ height: '30vh' }} /> 
          )}
        </div>
      </div>

    </div>
  )
}
