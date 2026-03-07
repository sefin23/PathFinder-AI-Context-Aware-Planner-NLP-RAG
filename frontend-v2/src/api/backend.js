/**
 * Pathfinder AI — Axios API client
 *
 * All requests go through the Vite dev proxy → FastAPI on :8000.
 * Each function returns the full Axios response data.
 * Errors bubble up to the caller — handle at the component level.
 *
 * TODO (L4): add analyzeWithClarification(text, answers)
 * TODO (L5): add getProgress(lifeEventId) and getTimeline(lifeEventId)
 */

import axios from 'axios'

const client = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

/**
 * POST /life-events/analyze
 * @param {string} text - Free-form user description of their life situation
 * @returns {Promise<{success: boolean, message: string, data: object}>}
 */
export async function analyzeLifeEvent(text) {
  const res = await client.post('/life-events/analyze', { text })
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
export async function proposeWorkflow(lifeEventTypes, location = null, timeline = null) {
  const res = await client.post('/life-events/propose-workflow', {
    life_event_types: lifeEventTypes,
    location,
    timeline,
    top_k: 5,
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

/**
 * POST /life-events/approve-workflow
 * STUBBED: endpoint exists in backend code but not yet wired in the running server.
 * Returns a mock success response so the frontend can simulate approval.
 *
 * TODO: replace stub with real API call when backend L3.4 is deployed.
 *
 * @param {number} lifeEventId
 * @param {object[]} tasks
 * @returns {Promise<{stubbed: true, approved: true}>}
 */
export async function approveWorkflow(lifeEventId, tasks) {
  // Simulated 800ms approval delay
  await new Promise((resolve) => setTimeout(resolve, 800))
  return { stubbed: true, approved: true, life_event_id: lifeEventId, task_count: tasks.length }
}
