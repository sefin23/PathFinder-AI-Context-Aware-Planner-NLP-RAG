/**
 * Dashboard — premium entry point for the Pathfinder AI.
 * Handles the "New Event" page with immersive Dark Forest styling.
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import TopNavbar from '../components/TopNavbar'
import LifeEventInput from '../components/LifeEventInput'
import ProcessingIndicator from '../components/ProcessingIndicator'
import EventAnalysisCard from '../components/EventAnalysisCard'
import RequirementsCard, { categorizeChunks, parseExplanationToCategories } from '../components/RequirementsCard'
import WorkflowCard from '../components/WorkflowCard'
import DocumentStatusDashboard from '../components/DocumentStatusDashboard'
import RecommendationsPanel from '../components/RecommendationsPanel'
import ErrorBoundary from '../components/ErrorBoundary'
import SavedPlans from './SavedPlans'
import VaultPage from './VaultPage'
import JourneyDetail from './JourneyDetail'
import JourneysPage from './JourneysPage'
import SmartAlerts from '../components/SmartAlerts'
import VictoryModal from '../components/VictoryModal'
import InsightsPage from './InsightsPage'
import SettingsPage from './SettingsPage'
import {
  analyzeLifeEvent,
  retrieveRequirements,
  proposeWorkflow,
  approveWorkflow,
  getRecommendations,
  getLifeEvent,
  createLifeEvent,
  updateTaskStatus,
  getUser,
  updateUser,
  saveRequirements,
  getCurrentUserId
} from '../api/backend'

const STEP_MS = 600

export default function Dashboard() {
  const [activePage, setActivePage] = useState('dashboard')
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [user, setUser] = useState(null)
  
  // Fetch user profile on mount to sync name across UI
  useEffect(() => {
    getUser().then(data => setUser(data)).catch(err => console.error("Failed to fetch user:", err))
  }, [])

  // Listen for profile updates from Settings page
  useEffect(() => {
    const handleProfileUpdate = (e) => { if (e.detail) setUser(e.detail) }
    window.addEventListener('pathfinder-profile-update', handleProfileUpdate)
    return () => window.removeEventListener('pathfinder-profile-update', handleProfileUpdate)
  }, [])

  // Pipeline state machine
  const [stage, setStage] = useState('idle')
  const [analysisData, setAnalysisData] = useState(null)
  const [requirementsData, setRequirementsData] = useState(null)
  const [workflowData, setWorkflowData] = useState(null)
  
  // ── Document Grouping Logic (Moved from child to parent for pre-render stats) ──
  const groupedDocsData = useMemo(() => {
    if (!requirementsData) return null
    const chunks = requirementsData?.retrieved_chunks ?? requirementsData?.results ?? []
    const explanation = requirementsData?.explanation
    const explanationRaw = typeof explanation === 'string' ? explanation : explanation?.explanation
    
    let groups = categorizeChunks(chunks)
    if (explanationRaw) {
      const parsedGroups = parseExplanationToCategories(explanationRaw)
      if (parsedGroups) {
        // MERGE and Deduplicate groups by title (case-insensitive)
        Object.keys(groups).forEach(k => {
          const titles = new Set(groups[k].map(it => (it.title || '').toLowerCase()));
          const filteredMatches = (parsedGroups[k] || []).filter(it => !titles.has((it.title || '').toLowerCase()));
          groups[k] = [...groups[k], ...filteredMatches];
        })
      }
    }
    return groups
  }, [requirementsData])
  const [recommendations, setRecommendations] = useState([])
  const [collectedDocs, setCollectedDocs] = useState(new Set())
  const [errorMsg, setErrorMsg] = useState(null)
  const [lifeEventStartDate, setLifeEventStartDate] = useState(null)

  const recRef = useRef(null)

  // Approve state
  const [approved, setApproved] = useState(false)
  const [approving, setApproving] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const [showDocs, setShowDocs] = useState(false)

  // Scroll to recommendations when they arrive
  useEffect(() => {
    if (recommendations.length > 0 && recRef.current) {
      recRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [recommendations])

  const resetPipeline = useCallback(() => {
    setStage('idle')
    setAnalysisData(null)
    setRequirementsData(null)
    setWorkflowData(null)
    setRecommendations([])
    setErrorMsg(null)
    setApproved(false)
    setShowSaveSuccess(false)
    setLifeEventStartDate(null)
    setCollectedDocs(new Set())
  }, [])

  const toggleDoc = useCallback((docId) => {
    setCollectedDocs(prev => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }, [])

  // Sync state with URL hash
  const navigateTo = useCallback(async (page, plan = null) => {
    const hash = page === 'dashboard' ? '' : `#${page}`
    if (window.location.hash !== hash) {
      window.history.pushState({ page, plan }, '', hash || window.location.pathname)
    }
    // Hard skip the preview for now: always go straight to the detailed roadmap.
    const targetPage = page
    if (page === 'dashboard') resetPipeline()
    
    if (plan && plan.id) {
       try {
         setSelectedPlan(plan)
         setActivePage(targetPage)
         
         const fullPlan = await getLifeEvent(plan.id)
         if (fullPlan) setSelectedPlan(fullPlan)
       } catch (err) {
         console.error("Failed to fetch full plan details:", err)
         setSelectedPlan(plan)
         setActivePage(targetPage)
       }
    } else {
       setActivePage(targetPage)
       if (page !== 'event-detail') setSelectedPlan(null)
    }
  }, [resetPipeline])

  useEffect(() => {
    const handlePopState = (event) => {
      const hash = window.location.hash.replace('#', '')
      const state = event?.state
      
      if (hash === 'saved') {
        setActivePage('saved')
        setSelectedPlan(null)
      } else if (hash === 'journey-detail') {
        setActivePage('journey-detail')
        if (state?.plan) {
          setSelectedPlan(state.plan)
        } else {
          setActivePage('saved')
        }
      } else {
        setActivePage('dashboard')
        resetPipeline()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [resetPipeline])

  useEffect(() => {
    const handleNavigate = (e) => {
      if (e.detail) navigateTo(e.detail)
    }
    window.addEventListener('navigate', handleNavigate)
    return () => window.removeEventListener('navigate', handleNavigate)
  }, [navigateTo])

  useEffect(() => {
    const handleNavigateToPlan = (e) => {
      if (e.detail) {
        navigateTo('event-detail', e.detail)
      }
    }
    window.addEventListener('navigate-to-plan', handleNavigateToPlan)
    return () => window.removeEventListener('navigate-to-plan', handleNavigateToPlan)
  }, [navigateTo])

  useEffect(() => {
    const initialHash = window.location.hash.substring(1)
    if (initialHash === 'event-detail') setActivePage('saved')
    else if (initialHash) setActivePage(initialHash)
  }, [])

  const handleRegenerate = useCallback(async (textOrEvent) => {
    if (typeof textOrEvent === 'string' && textOrEvent.trim()) {
       const extraContext = textOrEvent.trim()
       const newText = analysisData?.last_text ? `${analysisData.last_text}. ${extraContext}` : extraContext;
       
       setStage('updating')
       setCollectedDocs(new Set())
       try {
         const analysis = await analyzeLifeEvent(newText, true)
         if (!analysis?.success || !analysis?.data) throw new Error('Analysis failed.')
         
         const newAnalysisData = { ...analysis.data, last_text: newText }
         setAnalysisData(newAnalysisData)
   
         const eventTypes = newAnalysisData.life_event_types ?? []
         const location = newAnalysisData.location ?? null
         const timeline = newAnalysisData.timeline ?? null
         const primaryType = eventTypes[0] ?? null
   
         const requirements = await retrieveRequirements(newText, primaryType, 5)
         setRequirementsData(requirements)
   
         const workflow = await proposeWorkflow(eventTypes, location, timeline, null, newText)
         setWorkflowData(workflow)

         setStage('complete')
       } catch (err) {
         setErrorMsg(err?.response?.data?.detail ?? err.message ?? 'Refinement failed.')
         setStage('error')
       }
    } else {
       resetPipeline();
    }
  }, [analysisData])

  const runPipeline = useCallback(async (userText, startDate = null, skipClarification = false) => {
    setAnalysisData(null)
    setRequirementsData(null)
    setWorkflowData(null)
    setErrorMsg(null)
    setApproved(false)
    setLifeEventStartDate(startDate || null)
    setCollectedDocs(new Set())

    setStage('analyzing')
    let analysis
    try {
      analysis = await analyzeLifeEvent(userText, skipClarification)
      await new Promise(r => setTimeout(r, STEP_MS))
      if (!analysis?.success || !analysis?.data) {
        throw new Error(analysis?.message || 'I couldn\'t identify the situation.')
      }

      if (analysis.data?.clarification_needed) {
        setAnalysisData(analysis.data)
        setStage('idle')
        return
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail ?? err.message ?? 'Analysis failed.')
      setStage('error')
      return
    }
    setAnalysisData({ ...analysis, data: { ...analysis.data, last_text: userText } }.data)
    setStage('analyzed')

    const eventTypes = analysis.data?.life_event_types ?? []
    const location = analysis.data?.location ?? null
    const timeline = analysis.data?.timeline ?? null
    const primaryType = eventTypes[0] ?? null

    setStage('loading-docs')
    let requirements
    try {
      requirements = await retrieveRequirements(userText, primaryType, 5)
      await new Promise(r => setTimeout(r, STEP_MS))
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail ?? err.message ?? 'Requirement retrieval failed.')
      setStage('error')
      return
    }
    setRequirementsData(requirements)
    setStage('docs-loaded')

    setStage('generating')
    let workflow
    try {
      workflow = await proposeWorkflow(eventTypes, location, timeline, null, userText)
      await new Promise(r => setTimeout(r, STEP_MS))
      if (!workflow?.success) {
        throw new Error(workflow?.error ?? 'Workflow generation unsuccessful.')
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail ?? err.message ?? 'Workflow generation failed.')
      setStage('error')
      return
    }
    setWorkflowData(workflow)
    setStage('complete')
  }, [])

  const handleUpdateEvents = useCallback(async (updatedTypes) => {
    const updatedAnalysis = { ...analysisData, life_event_types: updatedTypes }
    setAnalysisData(updatedAnalysis)
    
    setStage('updating')
    setCollectedDocs(new Set())
    try {
      const requirements = await retrieveRequirements(analysisData.last_text || "Enriched Context", updatedTypes[0], 5)
      setRequirementsData(requirements)
      await new Promise(r => setTimeout(r, STEP_MS))
    } catch (err) {
      setErrorMsg('Failed to update requirements.')
      setStage('error')
      return
    }

    try {
      const workflow = await proposeWorkflow(updatedTypes, analysisData.location, analysisData.timeline, null, analysisData.last_text || null)
      setWorkflowData(workflow)
      setStage('complete')
    } catch (err) {
      setErrorMsg('Failed to update workflow.')
      setStage('error')
    }
  }, [analysisData])

  const handleManualAddEvent = useCallback(async (newType) => {
    if (!analysisData) return
    const updatedTypes = [...new Set([...(analysisData.life_event_types || []), newType])]
    handleUpdateEvents(updatedTypes)
  }, [analysisData, handleUpdateEvents])

  const handleRemoveEvent = useCallback(async (typeToRemove) => {
    if (!analysisData) return
    const updatedTypes = (analysisData.life_event_types || []).filter(t => t !== typeToRemove)
    if (updatedTypes.length === 0) return
    handleUpdateEvents(updatedTypes)
  }, [analysisData, handleUpdateEvents])

  const handleApprove = useCallback(async (tasks, startDate) => {
    setApproving(true)
    setStage('approving')
    setErrorMsg(null)
    try {
      const _rawTitle = analysisData?.display_title || ''
      const _genericTitles = ['new event', 'event', 'life event', 'personal event', 'untitled']
      const _isGenericTitle = !_rawTitle || _genericTitles.includes(_rawTitle.toLowerCase())
      const _cleanLoc = (analysisData?.location && analysisData.location.toLowerCase() !== 'null') ? analysisData.location : null
      const _typeLabel = analysisData?.life_event_types?.[0]?.replace(/_/g, ' ')?.toLowerCase()?.replace(/\b\w/g, l => l.toUpperCase())
      const eventName = _isGenericTitle
        ? (_typeLabel ? (_cleanLoc ? `${_typeLabel} in ${_cleanLoc}` : _typeLabel) : 'Personal Planning Journey')
        : _rawTitle

      const rawDesc = analysisData?.enriched_narrative || analysisData?.last_text || ''
      const cleanDesc = rawDesc.replace(/\.\s*Additional context\s*—.*$/s, '').trim()

      const lifeEvent = await createLifeEvent(
        eventName,
        cleanDesc,
        getCurrentUserId(),
        eventName,
        _cleanLoc,
        analysisData?.timeline,
        JSON.stringify({
          original_input: analysisData?.last_text,
          event_types: analysisData?.life_event_types
        })
      )
      
      const lifeEventId = lifeEvent.id
      console.log('--- Approving Workflow ---', { lifeEventId, receivedTasksLength: tasks?.length, workflowDataTasksLength: workflowData?.tasks?.length })
      
      // We must not use stale workflowData. The tasks passed from WorkflowCard are the truth.
      const tasksToApprove = (tasks && tasks.length > 0) ? tasks : null;
      
      if (!tasksToApprove || tasksToApprove.length === 0) {
        console.error("FATAL: tasks array passed to handleApprove is empty or undefined!", tasks);
        throw new Error(`CRITICAL: The UI failed to pass the tasks. Length: ${tasks?.length}. Stale scope check: ${workflowData?.tasks?.length || 0}`)
      }
      
      await approveWorkflow(lifeEventId, tasksToApprove, startDate)
      
      // PERSIST REQUIREMENTS - If this fails, we don't care, it's just a cache benefit
      if (requirementsData) {
        saveRequirements(lifeEventId, requirementsData).catch(e => console.warn('Requirements persistence failed (non-critical):', e))
      }
      
      // VISUAL CONFIRMATION: Show success immediately in the pill
      setStage('approved')
      setApproved(true)
      setAnalysisData(prev => ({ ...prev, db_id: lifeEventId }))
      setShowSaveSuccess(true)

      // FETCH AUXILIARY DATA - Try to get full details for a smooth transition, but don't crash the UI if these fails
      try {
        const fullEvent = await getLifeEvent(lifeEventId)
        if (fullEvent?.tasks) {
          const dbTasks = (fullEvent.tasks || []).filter(t => !t.parent_id)
          const subtasks = (fullEvent.tasks || []).filter(t => t.parent_id)
          const nested = dbTasks.map(t => ({
            ...t,
            subtasks: subtasks.filter(s => s.parent_id === t.id)
          }))
          setWorkflowData({ success: true, tasks: nested })
        }
      } catch (e) {
        console.warn("Post-approval data sync failed (non-critical):", e)
      }

      try {
        const recData = await getRecommendations(lifeEventId)
        setRecommendations(recData?.recommendations?.length > 0 ? recData.recommendations : [
          { message: "Roadmap secured. Focus on the high-impact documents listed first.", reason: "Next Steps" },
          { message: "Set chronological alerts for the timeline steps to avoid bottlenecks.", reason: "Efficiency Tip" }
        ])
      } catch (e) {
        console.warn("Post-approval recommendations failed (non-critical):", e)
      }
      
    } catch (err) {
      console.error('Approval failed:', err)
      setErrorMsg(err?.response?.data?.detail ?? err.message ?? 'Failed to approve and save your event.')
      setApproved(false)
      setStage('error')
    } finally {
      setApproving(false)
    }
  }, [analysisData, requirementsData, workflowData])

  const handleTaskStatusToggle = useCallback(async (taskId, currentStatus, isSubtask = false) => {
    if (!analysisData?.db_id) return
    
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    try {
      await updateTaskStatus(taskId, newStatus)
      
      const fullEvent = await getLifeEvent(analysisData.db_id)
      if (fullEvent?.tasks) {
         const dbTasks = fullEvent.tasks.filter(t => !t.parent_id)
         const subtasks = fullEvent.tasks.filter(t => t.parent_id)
         const nested = dbTasks.map(t => ({
           ...t,
           subtasks: subtasks.filter(s => s.parent_id === t.id)
         }))
         setWorkflowData({ success: true, tasks: nested })
      }

      const recData = await getRecommendations(analysisData.db_id)
      setRecommendations(recData?.recommendations || [])
    } catch (err) {
      console.error('Failed to sync task status:', err)
    }
  }, [analysisData])

  const isRunning = ['analyzing', 'analyzed', 'loading-docs', 'docs-loaded', 'generating', 'updating'].includes(stage)
  const showInitialInput = stage === 'idle' || isRunning

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--forest-deep)', overflow: 'hidden' }}>

      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(circle at 80% 20%, rgba(212,124,63,0.03) 0%, transparent 40%),
          radial-gradient(circle at 20% 80%, rgba(92,140,117,0.03) 0%, transparent 40%),
          var(--forest-deep)
        `
      }} />

      <Sidebar user={user} activePage={activePage} onNavigate={(p) => navigateTo(p)} />

      <main style={{ flex: 1, position: 'relative', overflowY: 'hidden', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
        
        <TopNavbar stage={stage} activePage={activePage} />

        <div id="main-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            {activePage === 'dashboard' && (
              <motion.div
                key="dashboard-page"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                style={{ padding: '32px 32px 80px', maxWidth: 1440, margin: '0 auto', width: '100%' }}
              >


                <SmartAlerts />
                
                <VictoryModal 
                  isOpen={showSaveSuccess} 
                  mode="save"
                  onClose={() => {
                    setShowSaveSuccess(false)
                    if (analysisData?.db_id) {
                      navigateTo('event-detail', { 
                        id: analysisData.db_id, 
                        title: analysisData.display_title,
                        tasks: workflowData?.tasks,
                        preview: false
                      })
                    }
                  }} 
                  planTitle={analysisData?.display_title || "Your New Roadmap"}
                  stats={{
                    tasks: workflowData?.tasks?.length || 0,
                    docs: requirementsData?.categories?.length || 0
                  }}
                />

                <AnimatePresence mode="wait">
                  {showInitialInput && (
                    <motion.section
                      key="input-section"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                    >
                      <LifeEventInput stage={stage} onSubmit={runPipeline} analysisData={analysisData} />
                      
                      <AnimatePresence>
                        {isRunning && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ marginTop: 40 }}
                          >
                             <ProcessingIndicator stage={stage} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.section>
                  )}
                </AnimatePresence>

                <section style={{ marginTop: stage === 'complete' ? 0 : 40 }}>
                  <AnimatePresence>
                    {stage === 'error' && (
                      <motion.div
                        key="error-box"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ 
                          background: 'rgba(216, 110, 110, 0.05)', 
                          border: '1px solid rgba(216, 110, 110, 0.2)', 
                          borderRadius: 'var(--r-md)', 
                          padding: '32px 24px', 
                          textAlign: 'center' 
                        }}
                      >
                        <p className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--coral)', marginBottom: 8, letterSpacing: '2px' }}>PLAN INTERRUPTED</p>
                        <p style={{ color: 'var(--fog)', fontSize: 15, marginBottom: 24, lineHeight: 1.6, maxWidth: 500, margin: '0 auto 24px' }}>{errorMsg}</p>
                        <button onClick={resetPipeline} className="btn-cust" style={{ background: 'var(--coral)', color: 'white', padding: '10px 24px' }}>TRY AGAIN</button>
                      </motion.div>
                    )}

                    {analysisData && !isRunning && !analysisData.clarification_needed && (
                      <motion.div key="analysis-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 24, position: 'relative', zIndex: 10 }}>
                        <ErrorBoundary>
                          <EventAnalysisCard data={analysisData} onAdd={handleManualAddEvent} onRemove={handleRemoveEvent} />
                        </ErrorBoundary>
                      </motion.div>
                    )}

                    {requirementsData && !isRunning && (
                      <div key="reqs-card-container" style={{ marginBottom: 24 }}>
                        <DocumentStatusDashboard
                           requirements={requirementsData}
                           collectedDocs={collectedDocs}
                           groupedDocs={groupedDocsData}
                           isLoading={stage === 'loading-docs'}
                           isExpanded={showDocs}
                           onToggleExpand={() => setShowDocs(!showDocs)}
                           onNavigateToVault={() => navigateTo('vault')}
                        />
                        <AnimatePresence>
                          {showDocs && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                              <RequirementsCard 
                                data={requirementsData} 
                                collectedIds={collectedDocs} 
                                onToggleDoc={toggleDoc} 
                                onGroupedDocs={() => {}} 
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {workflowData && !isRunning && (
                      <motion.div key="workflow-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: stage === 'updating' ? 0.5 : 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginBottom: 24 }}>
                        <ErrorBoundary>
                          <WorkflowCard
                            key={approved ? 'approved' : 'draft'}
                            data={workflowData}
                            approved={approved}
                            approving={approving}
                            initialStartDate={lifeEventStartDate}
                            onApprove={handleApprove}
                            onRegenerate={handleRegenerate}
                            onStatusChange={handleTaskStatusToggle}
                            onNavigate={navigateTo}
                          />
                        </ErrorBoundary>
                      </motion.div>
                    )}

                    {recommendations.length > 0 && !isRunning && (
                      <motion.div key="recs-panel" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} style={{ marginBottom: 60 }}>
                        <RecommendationsPanel ref={recRef} recommendations={recommendations} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                {stage === 'idle' && !analysisData?.clarification_needed && (
                  <div style={{ height: '20vh' }} />
                )}
              </motion.div>
            )}

            {activePage === 'vault' && (
              <motion.div
                key="vault-page"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <VaultPage />
              </motion.div>
            )}

            {activePage === 'event-detail' && selectedPlan && (
              <motion.div
                key={`detail-${selectedPlan.id}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <ErrorBoundary>
                  <JourneyDetail
                    planId={selectedPlan.id}
                    planTitle={(() => {
                      const raw = selectedPlan.display_title || selectedPlan.title || ''
                      const generic = ['new event', 'event', 'life event', 'personal event', 'untitled']
                      if (!generic.includes(raw.toLowerCase())) return raw
                      try {
                        const meta = JSON.parse(selectedPlan.metadata_json || '{}')
                        if (meta.event_types?.length > 0) {
                          const label = meta.event_types[0].replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
                          const loc = selectedPlan.location && selectedPlan.location.toLowerCase() !== 'null' ? selectedPlan.location : null
                          return loc ? `${label} in ${loc}` : label
                        }
                      } catch { /* ignore */ }
                      return raw || 'Personal Planning Journey'
                    })()}
                    planDescription={selectedPlan.description}
                    onBack={() => navigateTo('saved')}
                    onNavigate={navigateTo}
                  />
                </ErrorBoundary>
              </motion.div>
            )}


            {activePage === 'saved' && (
              <motion.div
                key="saved-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SavedPlans
                  onNavigate={navigateTo}
                  onViewDetail={(plan) => navigateTo('event-detail', plan)}
                />
              </motion.div>
            )}

            {activePage === 'journeys' && (
              <motion.div
                key="journeys-page"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <JourneysPage />
              </motion.div>
            )}

            {activePage === 'insights' && (
              <motion.div
                key="insights-page"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <InsightsPage />
              </motion.div>
            )}

            {activePage === 'settings' && (
              <motion.div
                key="settings-page"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <SettingsPage />
              </motion.div>
            )}

            {!['dashboard', 'saved', 'event-detail', 'vault', 'calendar', 'settings', 'insights', 'journeys'].includes(activePage) && (
              <motion.div
                key="unknown"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}
              >
                <div style={{ textAlign: 'center' }}>
                   <h2 className="font-playfair" style={{ fontSize: 24, color: 'white' }}>Section Restricted</h2>
                   <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>COMING SOON</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
