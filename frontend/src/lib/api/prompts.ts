export interface PromptMeta {
  name: string
  label: string
  step?: number | null
  description: string
  featured: boolean
  test_type: 'flow' | 'assumptions' | 'generic' | string
  variables: string[]
  has_draft: boolean
  last_modified?: string
}

export interface PromptContent {
  system_prompt: string
  user_template: string
}

export interface PromptDetail {
  name: string
  meta: Record<string, unknown>
  live: PromptContent
  has_draft: boolean
  draft: PromptContent | null
  last_modified: string | null
}

export interface Resource {
  id: number
  type: 'url' | 'text' | 'file'
  name: string
  content: string
}

export interface ProductContext {
  indication: string
  product_name: string
  drug_class: string
  country: string
  launch_year: number
  peak_year: number
}

export interface TestResourcePayload {
  type: string
  content: string
  name: string
}

export interface AssumptionReadable {
  key: string
  value: unknown
  rationale?: string
  source?: string
}

export interface TestResult {
  status?: string
  raw?: string
  parsed?: unknown
  readable?: AssumptionReadable[]
  csv?: string
  testType?: string
  contextUsed?: ProductContext
  queryUsed?: string
}

export type LockedSchemas = Record<string, string>

async function handleResponse<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const text = await r.text()
    try {
      const json = JSON.parse(text)
      throw new Error(json.detail || JSON.stringify(json))
    } catch {
      throw new Error(text || `HTTP ${r.status}`)
    }
  }
  return r.json() as Promise<T>
}

export async function fetchPromptList(): Promise<{ prompts: PromptMeta[] }> {
  const r = await fetch('/api/prompts')
  return handleResponse(r)
}

export async function fetchLockedSchemas(): Promise<LockedSchemas> {
  const r = await fetch('/api/prompts/locked-schema')
  if (!r.ok) return {}
  return r.json()
}

export async function fetchPrompt(name: string): Promise<PromptDetail> {
  const r = await fetch(`/api/prompts/${encodeURIComponent(name)}`)
  return handleResponse(r)
}

export async function saveDraft(
  name: string,
  content: PromptContent,
): Promise<void> {
  const r = await fetch(`/api/prompts/${encodeURIComponent(name)}/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  })
  await handleResponse(r)
}

export async function publishPrompt(name: string): Promise<{ backup_path?: string }> {
  const r = await fetch(`/api/prompts/${encodeURIComponent(name)}/publish`, {
    method: 'POST',
  })
  return handleResponse(r)
}

export async function discardDraft(name: string): Promise<void> {
  const r = await fetch(`/api/prompts/${encodeURIComponent(name)}/draft`, {
    method: 'DELETE',
  })
  await handleResponse(r)
}

export async function uploadResource(file: File): Promise<{ name: string; content: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const r = await fetch('/api/prompts/upload-resource', {
    method: 'POST',
    body: formData,
  })
  return handleResponse(r)
}

export async function testFlowPrompt(body: {
  system_prompt: string
  user_template: string
  query?: string
} & ProductContext): Promise<TestResult> {
  const r = await fetch('/api/prompts/test/flow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse(r)
}

export async function testAssumptionsPrompt(body: {
  system_prompt: string
  user_template: string
  query: string
  resources: TestResourcePayload[]
  funnel_structure: unknown
} & ProductContext): Promise<TestResult> {
  const r = await fetch('/api/prompts/test/assumptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse(r)
}

export async function testGenericPrompt(body: {
  system_prompt: string
  user_template: string
  query: string
}): Promise<TestResult> {
  const r = await fetch('/api/prompts/test/generic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse(r)
}
