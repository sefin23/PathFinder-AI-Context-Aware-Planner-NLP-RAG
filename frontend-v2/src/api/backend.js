/**
 * Pathfinder AI — Axios API client
 *
 * All requests go through the Vite dev proxy → FastAPI on :8000.
 * Each function returns the full Axios response data.
 * Errors bubble up to the caller — handle at the component level.
 */

import axios from 'axios'

// ── Auth helpers ──────────────────────────────────────────────────────────────

/** Returns the stored auth object { token, user } or null. */
export function getAuthData() {
  try {
    return JSON.parse(localStorage.getItem('pathfinder_auth') || 'null')
  } catch {
    return null
  }
}

/** Persists auth object to localStorage. */
export function setAuthData(data) {
  localStorage.setItem('pathfinder_auth', JSON.stringify(data))
}

/** Clears auth from localStorage. */
export function clearAuthData() {
  localStorage.removeItem('pathfinder_auth')
}

/** Returns the authenticated user's ID, falling back to 1 for the demo user. */
export function getCurrentUserId() {
  return getAuthData()?.user?.id ?? 1
}

// ── Auth API calls ─────────────────────────────────────────────────────────────

/** POST /auth/register — creates account and returns token + user. */
export async function registerUser(name, email, password) {
  const res = await client.post('/auth/register', { name, email, password })
  setAuthData({ token: res.data.access_token, user: res.data.user })
  return res.data
}

/** POST /auth/login — validates credentials and returns token + user. */
export async function loginUser(email, password) {
  const res = await client.post('/auth/login', { email, password })
  setAuthData({ token: res.data.access_token, user: res.data.user })
  return res.data
}

/** POST /auth/logout — invalidates server-side token, then clears localStorage. */
export async function logoutUser() {
  try { await client.post('/auth/logout') } catch { /* ignore if already expired */ }
  clearAuthData()
}

/** POST /auth/change-password — rotates the token on success. */
export async function changePassword(currentPassword, newPassword) {
  const res = await client.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  const auth = getAuthData()
  if (auth) setAuthData({ ...auth, token: res.data.access_token })
  return res.data
}

// ── User API calls ─────────────────────────────────────────────────────────────

/**
 * GET /users/{id}
 * @param {number} userId
 * @returns {Promise<object>}
 */
export async function getUser(userId = getCurrentUserId()) {
  const res = await client.get(`/users/${userId}`)
  return res.data
}

/**
 * PATCH /users/{id}
 * @param {number} userId
 * @param {object} updates - { job_city, state_code, extracted_profile }
 * @returns {Promise<object>}
 */
export async function updateUser(userId = getCurrentUserId(), updates) {
  const res = await client.patch(`/users/${userId}`, updates)
  return res.data
}

/**
 * GET /life-events/{id}
 * @param {number} lifeEventId
 * @returns {Promise<object>}
 */
export async function getLifeEvent(lifeEventId) {
  const res = await client.get(`/life-events/${lifeEventId}`)
  return res.data
}

/**
 * GET /life-events/
 * @param {number|null} userId
 * @returns {Promise<object[]>}
 */
export async function getLifeEvents(userId = getCurrentUserId()) {
  const res = await client.get('/life-events/', { params: { user_id: userId } })
  return res.data
}

/**
 * PATCH /life-events/{id}
 * @param {number} lifeEventId
 * @param {object} updates - {title, description, status}
 * @returns {Promise<object>}
 */
export async function updateLifeEvent(lifeEventId, updates) {
  const res = await client.patch(`/life-events/${lifeEventId}`, updates)
  return res.data
}

/**
 * DELETE /life-events/{id}
 * @param {number} lifeEventId
 */
export async function deleteLifeEvent(lifeEventId) {
  await client.delete(`/life-events/${lifeEventId}`)
}

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 240000,
})

// Attach Bearer token to every request when the user is authenticated
client.interceptors.request.use(config => {
  const auth = getAuthData()
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

/**
 * POST /life-events/analyze
 * @param {string} text - Free-form user description of their life situation
 * @returns {Promise<{success: boolean, message: string, data: object}>}
 */
export async function analyzeLifeEvent(text, skipClarification = false) {
  const res = await client.post('/life-events/analyze', { 
    text, 
    skip_clarification: skipClarification 
  })
  return res.data
}

/**
 * POST /rag/retrieve
 * Uses the original user text as the semantic query and the first
 * detected life_event_type from the NLP step as the filter.
 *
 * @param {string} query - Original user text
 * @param {string} lifeEventType - First type from analyzeLifeEvent result
 * @param {number} topK - Number of results (default 5)
 * @returns {Promise<object>}
 */
export async function retrieveRequirements(query, lifeEventType, topK = 5) {
  const res = await client.post('/rag/retrieve', {
    query,
    life_event_type: lifeEventType,
    top_k: topK,
  })
  return res.data
}

/**
 * POST /life-events/propose-workflow
 * @param {string[]} lifeEventTypes - Array of detected event types
 * @param {string|null} location - Extracted location or null
 * @param {string|null} timeline - Extracted timeline or null
 * @returns {Promise<object>}
 */
export async function proposeWorkflow(lifeEventTypes, location = null, timeline = null, startDate = null, originalDescription = null) {
  const res = await client.post('/life-events/propose-workflow', {
    life_event_types: lifeEventTypes,
    location,
    timeline,
    top_k: 5,
    start_date: startDate,
    original_description: originalDescription,
  })
  return res.data
}

/**
 * GET /life-events/{id}/recommendations
 * @param {number} lifeEventId
 * @returns {Promise<{recommendations: Array<{message: string, reason: string}>}>}
 */
export async function getRecommendations(lifeEventId) {
  const res = await client.get(`/life-events/${lifeEventId}/recommendations`)
  return res.data
}

export async function createLifeEvent(title, description, userId = getCurrentUserId(), displayTitle = null, location = null, timeline = null, metadataJson = null) {
  const res = await client.post('/life-events/', { 
    title, 
    description, 
    user_id: userId,
    display_title: displayTitle,
    location,
    timeline,
    metadata_json: metadataJson
  })
  return res.data
}

/**
 * PATCH /life-events/{id} — persist AI requirements so the model is never re-called for saved events.
 * @param {number} lifeEventId 
 * @param {object} requirementsData - The full RAG response object from /rag/retrieve
 */
export async function saveRequirements(lifeEventId, requirementsData) {
  const res = await client.patch(`/life-events/${lifeEventId}`, {
    requirements_json: JSON.stringify(requirementsData)
  })
  return res.data
}

/**
 * POST /life-events/approve-workflow
 * @param {number} lifeEventId
 * @param {object[]} tasks
 * @returns {Promise<object>}
 */
export async function approveWorkflow(lifeEventId, tasks, startDate = null) {
  console.log("APPROVE_WORKFLOW called with tasks:", tasks)
  const payload = {
    life_event_id: lifeEventId,
    start_date: startDate,
    approved_tasks: tasks.map(t => ({
      title: t.title || 'Untitled Task',
      description: t.description || null,
      phase_title: t.phase_title || null,
      priority: t.priority || 3,
      due_offset_days: t.suggested_due_offset_days || 0,
      scheduled_date: t.scheduled_date || null,
      task_type: t.task_type || null,
      status: t.done ? 'completed' : 'pending',
      subtasks: (t.subtasks || []).map(s => ({
        title: s.title || 'Untitled Subtask',
        priority: s.priority || 3,
        due_offset_days: s.suggested_due_offset_days || 0,
        scheduled_date: s.scheduled_date || null,
        task_type: s.task_type || null,
        status: s.done ? 'completed' : 'pending'
      }))
    }))
  }
  const res = await client.post('/life-events/approve-workflow', payload)
  return res.data
}

/**
 * PATCH /tasks/{id}/status
 * @param {number} taskId
 * @param {string} status - 'pending' or 'completed'
 * @returns {Promise<object>}
 */
export async function updateTaskStatus(taskId, status) {
  const res = await client.patch(`/tasks/${taskId}/status`, { status })
  return res.data
}

/**
 * PATCH /tasks/{id}
 * @param {number} taskId
 * @param {object} updates - {priority, due_date, reminder_opt_out}
 * @returns {Promise<object>}
 */
export async function updateTask(taskId, updates) {
  const res = await client.patch(`/tasks/${taskId}`, updates)
  return res.data
}

/**
 * PATCH /tasks/{id} - specific for scheduling with conflict detection
 * @param {number} taskId
 * @param {string} date - ISO Date
 */
export async function updateTaskScheduledDate(taskId, date) {
  const res = await client.patch(`/tasks/${taskId}`, { scheduled_date: date })
  return res.data
}

/**
 * POST /tasks/{id}/resolve-conflict
 * @param {number} taskId
 * @param {string} resolution - 'reschedule_others' | 'reschedule_current' | 'accept_conflict'
 * @param {string} date - The original proposed date
 */
export async function resolveTaskConflict(taskId, resolution, date) {
  const res = await client.post(`/tasks/${taskId}/resolve-conflict`, {
    resolution,
    scheduled_date: date
  })
  return res.data
}

// ── Personal Events ──────────────────────────────────────────────────────────

/**
 * GET /personal-events/?user_id=1&life_event_id=X
 * Returns personal events for a user, scoped to a plan + global ones.
 */
export async function getPersonalEvents(userId = getCurrentUserId(), lifeEventId = null) {
  const params = { user_id: userId }
  if (lifeEventId) params.life_event_id = lifeEventId
  const res = await client.get('/personal-events/', { params })
  return res.data
}

/**
 * POST /personal-events/
 * @param {object} event - { title, event_type, event_date (ISO), notes, life_event_id }
 */
export async function createPersonalEvent(event, userId = getCurrentUserId()) {
  const res = await client.post('/personal-events/', { ...event, user_id: userId })
  return res.data
}

/**
 * DELETE /personal-events/{id}
 */
export async function deletePersonalEvent(eventId) {
  await client.delete(`/personal-events/${eventId}`)
}

// ── Plan Chat ─────────────────────────────────────────────────────────────────

/**
 * POST /life-events/{id}/chat
 * Sends a user message to the plan-aware Navigator AI.
 * @param {number} lifeEventId
 * @param {string} message - The user's question
 * @param {Array<{role:string,content:string}>} history - Recent conversation turns
 * @returns {Promise<{reply: string}>}
 */
export async function sendPlanChat(lifeEventId, message, history = []) {
  const res = await client.post(
    `/life-events/${lifeEventId}/chat`,
    { message, history },
    { timeout: 60000 },
  )
  return res.data
}

/**
 * GET /life-events/{id}/chat/history
 * Returns the stored conversation history for a plan.
 * @param {number} lifeEventId
 * @returns {Promise<Array<{role:string,content:string}>>}
 */
export async function getPlanChatHistory(lifeEventId) {
  const res = await client.get(`/life-events/${lifeEventId}/chat/history`)
  return res.data
}

/**
 * GET /life-events/{id}/chat/suggestions
 * Returns event-type-specific suggested questions.
 * @param {number} lifeEventId
 * @returns {Promise<{suggestions: string[], event_type: string}>}
 */
export async function getPlanChatSuggestions(lifeEventId) {
  const res = await client.get(`/life-events/${lifeEventId}/chat/suggestions`)
  return res.data
}
