import type {
  Assumptions,
  ProductInfo,
  ResearchData,
  WorkflowStage,
} from '../forecast/types'

const BASE = ''

export interface ChatRequest {
  messages: { role: string; content: string }[]
  chat_step: number
  form_state: ProductInfo
  workflow_stage: WorkflowStage
}

export interface ChatResponse {
  bot_message: string
  field_updates?: Partial<ProductInfo>
  action?: string
  quick_replies?: string[]
}

export async function postChat(body: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function postResearch(
  indication: string,
  country: string,
  classMoa: string,
): Promise<ResearchData> {
  const res = await fetch(`${BASE}/api/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ indication, country, class_moa: classMoa }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function postForecast(
  assumptions: Assumptions,
  selectedParameters: string[],
) {
  const res = await fetch(`${BASE}/api/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assumptions,
      selected_parameters: selectedParameters,
    }),
  })
  return res.json()
}

export async function postSensitivity(
  assumptions: Assumptions,
  selectedParameters: string[],
) {
  const res = await fetch(`${BASE}/api/sensitivity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assumptions,
      selected_parameters: selectedParameters,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function postRecommend(body: {
  indication: string
  product_name: string
  class_moa: string
  country: string
}) {
  const res = await fetch(`${BASE}/api/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function postAgent(userInput: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_input: userInput }),
  })
  return res.json()
}

export async function getAgentStatus(sessionId: string) {
  const res = await fetch(
    `${BASE}/api/agent/status?session_id=${encodeURIComponent(sessionId)}`,
  )
  return res.json()
}

export async function postPptx(sessionId: string, userInput: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/pptx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, user_input: userInput }),
  })
  return res.json()
}

export async function getPptxStatus(sessionId: string) {
  const res = await fetch(
    `${BASE}/api/pptx/status?session_id=${encodeURIComponent(sessionId)}`,
  )
  return res.json()
}

export async function getExcelData(sessionId: string) {
  const res = await fetch(
    `${BASE}/api/excel/data?session_id=${encodeURIComponent(sessionId)}`,
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getConfig() {
  const res = await fetch(`${BASE}/api/config`)
  return res.json()
}

export async function postSaveInput(payload: Record<string, unknown>) {
  await fetch(`${BASE}/api/save-input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function excelDownloadUrl(sessionId: string) {
  return `${BASE}/api/excel?session_id=${encodeURIComponent(sessionId)}`
}

export function pptxDownloadUrl(sessionId: string) {
  return `${BASE}/api/pptx?session_id=${encodeURIComponent(sessionId)}`
}
