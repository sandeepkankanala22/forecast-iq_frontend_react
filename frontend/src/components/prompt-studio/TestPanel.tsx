import { useRef, useState } from 'react'
import type { ProductContext, PromptMeta, Resource } from '../../lib/api/prompts'
import { uploadResource } from '../../lib/api/prompts'
import { COUNTRIES } from '../../lib/prompt-studio/flowConstants'
import { useToast } from './Toast'
import { PreviewPanel } from './PreviewPanel'
import type { TestResult } from '../../lib/api/prompts'

interface TestPanelProps {
  meta: PromptMeta | null
  productContext: ProductContext
  onProductContextChange: (ctx: ProductContext) => void
  flowQuery: string
  onFlowQueryChange: (v: string) => void
  assumptionsQuery: string
  onAssumptionsQueryChange: (v: string) => void
  genericQuery: string
  onGenericQueryChange: (v: string) => void
  flowStructInput: string
  onFlowStructInputChange: (v: string) => void
  sessionFlowAuto: boolean
  resources: Resource[]
  onResourcesChange: (r: Resource[]) => void
  onClearFlowStructure: () => void
  running: boolean
  result: TestResult | null
  testError: string | null
  onRunTest: () => void
  onPassToAssumptions: () => void
}

const fieldClass =
  'w-full rounded-lg border border-[#E0E6ED] bg-[#F5F6F8] px-2.5 py-1.5 font-sans text-xs text-[#1A2C3D] outline-none transition focus:border-[#1A4F72] focus:bg-white'
const fieldInvalidClass =
  'border-[#dc2626]! bg-[rgba(220,38,38,0.07)]!'

export function TestPanel({
  meta,
  productContext,
  onProductContextChange,
  flowQuery,
  onFlowQueryChange,
  assumptionsQuery,
  onAssumptionsQueryChange,
  genericQuery,
  onGenericQueryChange,
  flowStructInput,
  onFlowStructInputChange,
  sessionFlowAuto,
  resources,
  onResourcesChange,
  onClearFlowStructure,
  running,
  result,
  testError,
  onRunTest,
  onPassToAssumptions,
}: TestPanelProps) {
  const { toast } = useToast()
  const [urlInput, setUrlInput] = useState('')
  const [textInput, setTextInput] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const testType = meta?.test_type || 'generic'
  const isStepped = testType === 'flow' || testType === 'assumptions'

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: false }))
  }

  const updateProduct = (patch: Partial<ProductContext>) => {
    onProductContextChange({ ...productContext, ...patch })
  }

  const addUrlResource = () => {
    const raw = urlInput.trim()
    if (!raw) return
    const url = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw
    try {
      new URL(url)
    } catch {
      toast('Invalid URL — please include the full address', 'warning')
      return
    }
    let displayName: string
    try {
      displayName = new URL(url).hostname.replace(/^www\./, '')
    } catch {
      displayName = url
    }
    onResourcesChange([
      ...resources,
      { id: Date.now(), type: 'url', name: displayName, content: url },
    ])
    setUrlInput('')
  }

  const addTextResource = () => {
    const text = textInput.trim()
    if (!text) return
    onResourcesChange([
      ...resources,
      { id: Date.now(), type: 'text', name: 'Note', content: text },
    ])
    setTextInput('')
  }

  const handleFileUpload = async (file: File) => {
    try {
      const data = await uploadResource(file)
      onResourcesChange([
        ...resources,
        { id: Date.now(), type: 'file', name: data.name, content: data.content },
      ])
      toast(`File "${data.name}" added`, 'success')
    } catch (e) {
      toast('Upload failed: ' + (e instanceof Error ? e.message : String(e)), 'error')
    }
  }

  const removeResource = (id: number) => {
    onResourcesChange(resources.filter((r) => r.id !== id))
  }

  return (
    <aside className="flex flex-col overflow-hidden border-l border-[#E0E6ED] bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-[#E0E6ED] px-4 py-3.5">
        <h3 className="text-[13px] font-bold text-[#1A2C3D]">Test &amp; Preview</h3>
        <span className="text-[11px] text-[#4A6580]">
          {meta?.label || 'No prompt selected'}
        </span>
      </div>

      <div className="max-h-[46%] min-h-20 shrink overflow-y-auto">
        {!meta && (
          <div className="px-4 py-8 text-center text-xs text-[#4A6580]">
            Select a prompt from the sidebar to configure the test panel.
          </div>
        )}

        {meta && isStepped && (
          <div className="border-b border-[#E0E6ED] px-4 py-3.5">
            <div className="mb-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.6px] text-[#4A6580]">
              <span>Product Context</span>
              <span className="text-[9px] font-medium normal-case tracking-wide text-[#A8C4D4]">
                Shared · Flow &amp; Assumptions
              </span>
            </div>

            {(
              [
                { key: 'indication', label: 'Indication', placeholder: 'e.g. Non-small cell lung cancer (NSCLC)' },
                { key: 'product_name', label: 'Product Name', placeholder: 'e.g. TUB-040' },
                { key: 'drug_class', label: 'Drug Class / MoA', placeholder: 'e.g. Antibody-Drug Conjugate (ADC)' },
              ] as const
            ).map(({ key, label, placeholder }) => (
              <div key={key} className="mb-2.5">
                <label className="mb-1 block text-[11px] font-semibold text-[#1A2C3D]">
                  {label} <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  value={productContext[key]}
                  onChange={(e) => {
                    updateProduct({ [key]: e.target.value })
                    clearFieldError(key)
                  }}
                  placeholder={placeholder}
                  className={`${fieldClass} ${fieldErrors[key] ? fieldInvalidClass : ''}`}
                />
                {fieldErrors[key] && (
                  <div className="mt-0.5 text-[10px] font-semibold text-[#dc2626]">
                    {label} is required
                  </div>
                )}
              </div>
            ))}

            <div className="mb-2.5">
              <label className="mb-1 block text-[11px] font-semibold text-[#1A2C3D]">Country</label>
              <select
                value={productContext.country}
                onChange={(e) => updateProduct({ country: e.target.value })}
                className={fieldClass}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-2.5 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1A2C3D]">Launch Year</label>
                <input
                  type="number"
                  value={productContext.launch_year}
                  onChange={(e) => updateProduct({ launch_year: parseInt(e.target.value) || 2025 })}
                  min={2024}
                  max={2040}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#1A2C3D]">End Year</label>
                <input
                  type="number"
                  value={productContext.peak_year}
                  onChange={(e) => updateProduct({ peak_year: parseInt(e.target.value) || 2035 })}
                  min={2025}
                  max={2045}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>
        )}

        {meta && testType === 'flow' && (
          <div className="border-b border-[#E0E6ED] px-4 py-3.5">
            <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.6px] text-[#4A6580]">
              Additional Instructions{' '}
              <span className="font-normal normal-case text-[#A8C4D4]">(optional)</span>
            </div>
            <textarea
              value={flowQuery}
              onChange={(e) => onFlowQueryChange(e.target.value)}
              placeholder="e.g. add a compliance rate parameter, split severity into mild/moderate/severe…"
              className={`${fieldClass} min-h-[70px] resize-y`}
            />
            <p className="-mt-1 text-[10px] leading-relaxed text-[#4A6580]">
              Mention any custom parameters you need — the agent will create them if they&apos;re not
              in the standard list.
            </p>
          </div>
        )}

        {meta && testType === 'assumptions' && (
          <>
            <div className="border-b border-[#E0E6ED] px-4 py-3.5">
              <div className="mb-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.6px] text-[#4A6580]">
                <span>
                  Flow Structure{' '}
                  <span className="font-normal normal-case text-[#4A6580]">(from Step 2)</span>
                </span>
                <button
                  type="button"
                  onClick={onClearFlowStructure}
                  className="cursor-pointer rounded-lg border border-[#E0E6ED] bg-[#F5F6F8] px-2 py-0.5 text-[9px] font-semibold text-[#4A6580] hover:border-[#1A4F72] hover:text-[#1A4F72]"
                >
                  Clear
                </button>
              </div>
              <div className="mb-1.5 text-[11px] text-[#4A6580]">
                {sessionFlowAuto ? (
                  <span className="font-semibold text-[#16a34a]">✓ Auto-populated from last Step 2 run</span>
                ) : (
                  <>
                    Not populated yet — run the <strong>Flow Generation</strong> prompt first, or paste
                    JSON below.
                  </>
                )}
              </div>
              <textarea
                value={flowStructInput}
                onChange={(e) => onFlowStructInputChange(e.target.value)}
                placeholder="Paste flow structure JSON here (optional)…"
                className="min-h-[55px] resize-y rounded-lg border border-[#E0E6ED] bg-white p-2 font-mono text-[10px] text-[#1A2C3D] outline-none focus:border-[#1A4F72]"
              />
            </div>

            <div className="border-b border-[#E0E6ED] px-4 py-3.5">
              <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.6px] text-[#4A6580]">
                Additional Instructions / Overrides
              </div>
              <textarea
                value={assumptionsQuery}
                onChange={(e) => onAssumptionsQueryChange(e.target.value)}
                placeholder="e.g. 15-year forecast, gross price $40,000, diagnosis rate 80%…"
                className={`${fieldClass} min-h-[70px] resize-y`}
              />
            </div>

            <div className="border-b border-[#E0E6ED] px-4 py-3.5">
              <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.6px] text-[#4A6580]">
                Resources
              </div>
              <div className="mb-2 flex flex-col gap-1.5">
                {resources.map((r) => {
                  const preview =
                    r.type === 'url' ? (
                      <span className="text-[10px] text-[#1A4F72]">{r.content}</span>
                    ) : (
                      (r.content || '').substring(0, 80) + ((r.content || '').length > 80 ? '…' : '')
                    )
                  return (
                    <div
                      key={r.id}
                      className="flex items-start gap-2 rounded-lg border border-[#E0E6ED] bg-[#F5F6F8] px-2.5 py-2"
                    >
                      <div
                        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                          r.type === 'url'
                            ? 'bg-[rgba(37,99,235,0.07)] text-[#2563eb]'
                            : r.type === 'file'
                              ? 'bg-[rgba(124,58,237,0.08)] text-[#7c3aed]'
                              : 'bg-[rgba(22,163,74,0.09)] text-[#16a34a]'
                        }`}
                      >
                        {r.type === 'url' ? '🔗' : r.type === 'file' ? '📄' : '📝'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-semibold text-[#1A2C3D]">{r.name}</div>
                        <div className="mt-0.5 truncate text-[10px] text-[#4A6580]">{preview}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeResource(r.id)}
                        className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-sm leading-none text-[#4A6580] hover:text-[#dc2626]"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="mb-1.5 flex gap-1.5">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste URL…"
                  type="url"
                  className="flex-1 rounded-lg border border-[#E0E6ED] bg-[#F5F6F8] px-2 py-1.5 text-[11px] text-[#1A2C3D] outline-none focus:border-[#1A4F72] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={addUrlResource}
                  className="h-[30px] shrink-0 cursor-pointer rounded-lg border border-[#E0E6ED] bg-[#F5F6F8] px-2.5 text-[11px] font-semibold whitespace-nowrap text-[#4A6580] hover:border-[#1A4F72] hover:bg-white hover:text-[#1A4F72]"
                >
                  + URL
                </button>
              </div>
              <div className="mb-1.5 flex gap-1.5">
                <input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste note or benchmark data…"
                  className="flex-1 rounded-lg border border-[#E0E6ED] bg-[#F5F6F8] px-2 py-1.5 text-[11px] text-[#1A2C3D] outline-none focus:border-[#1A4F72] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={addTextResource}
                  className="h-[30px] shrink-0 cursor-pointer rounded-lg border border-[#E0E6ED] bg-[#F5F6F8] px-2.5 text-[11px] font-semibold whitespace-nowrap text-[#4A6580] hover:border-[#1A4F72] hover:bg-white hover:text-[#1A4F72]"
                >
                  + Note
                </button>
              </div>
              <div
                className={`relative cursor-pointer rounded-lg border-[1.5px] border-dashed p-3.5 text-center transition ${
                  dragOver
                    ? 'border-[#1A4F72] bg-[rgba(26,79,114,0.04)]'
                    : 'border-[#E0E6ED] hover:border-[#1A4F72] hover:bg-[rgba(26,79,114,0.04)]'
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const file = e.dataTransfer.files[0]
                  if (file) handleFileUpload(file)
                }}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  accept=".txt,.pdf,.csv,.json,.md"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                    e.target.value = ''
                  }}
                />
                <div className="pointer-events-none text-[11px] text-[#4A6580]">
                  <strong>Upload file</strong> or drag &amp; drop &nbsp;·&nbsp; .txt .csv .json .md .pdf
                </div>
              </div>
            </div>
          </>
        )}

        {meta && testType === 'generic' && (
          <div className="border-b border-[#E0E6ED] px-4 py-3.5">
            <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.6px] text-[#4A6580]">
              Test Input
            </div>
            <textarea
              value={genericQuery}
              onChange={(e) => onGenericQueryChange(e.target.value)}
              placeholder="Enter test input for this prompt…"
              className={`${fieldClass} min-h-[100px] resize-y`}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 border-b border-[#E0E6ED] px-4 py-3">
        <button
          type="button"
          onClick={() => {
            if (isStepped) {
              const errs: Record<string, boolean> = {}
              if (!productContext.indication.trim()) errs.indication = true
              if (!productContext.product_name.trim()) errs.product_name = true
              if (!productContext.drug_class.trim()) errs.drug_class = true
              if (Object.keys(errs).length) {
                setFieldErrors(errs)
                return
              }
            }
            onRunTest()
          }}
          disabled={!meta || running}
          className="flex h-[38px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-gradient-to-br from-[#1A4F72] to-[#2E6A96] text-[13px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run Test
            </>
          )}
        </button>
      </div>

      <PreviewPanel
        result={result}
        loading={running}
        error={testError}
        onPassToAssumptions={onPassToAssumptions}
      />
    </aside>
  )
}
