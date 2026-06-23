import { useRef } from 'react'
import type { PromptMeta } from '../../lib/api/prompts'
import type { LockedSchemas } from '../../lib/api/prompts'
import { VariableChips, type EditorTab } from './VariableChips'
import { PublishModal } from './PublishModal'

interface EditorProps {
  meta: PromptMeta | null
  lockedSchemas: LockedSchemas
  editorTab: EditorTab
  systemPrompt: string
  userTemplate: string
  liveSystem: string
  liveTemplate: string
  hasDraft: boolean
  dirty: boolean
  lastModified: string | null
  saving: boolean
  publishOpen: boolean
  onTabChange: (tab: EditorTab) => void
  onSystemChange: (v: string) => void
  onTemplateChange: (v: string) => void
  onSaveDraft: () => void
  onDiscard: () => void
  onOpenPublish: () => void
  onClosePublish: () => void
  onPublish: () => void
}

function LockIcon() {
  return (
    <svg className="mr-1 inline -translate-y-px" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function Editor({
  meta,
  lockedSchemas,
  editorTab,
  systemPrompt,
  userTemplate,
  liveSystem,
  liveTemplate,
  hasDraft,
  dirty,
  lastModified,
  saving,
  publishOpen,
  onTabChange,
  onSystemChange,
  onTemplateChange,
  onSaveDraft,
  onDiscard,
  onOpenPublish,
  onClosePublish,
  onPublish,
}: EditorProps) {
  const systemRef = useRef<HTMLTextAreaElement>(null)
  const templateRef = useRef<HTMLTextAreaElement>(null)

  const schema = meta ? lockedSchemas[meta.test_type] : undefined
  const showDraftState = hasDraft || dirty

  const activeText =
    editorTab === 'system' ? systemPrompt : editorTab === 'template' ? userTemplate : ''
  const charCount = activeText.length
  const wordCount = activeText.split(/\s+/).filter(Boolean).length

  const insertVar = (name: string) => {
    if (editorTab === 'schema') return
    const ref = editorTab === 'template' ? templateRef : systemRef
    const ta = ref.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const insertion = '{' + name + '}'
    const value = ta.value
    const next = value.slice(0, start) + insertion + value.slice(end)
    if (editorTab === 'template') onTemplateChange(next)
    else onSystemChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + insertion.length
    })
  }

  const rawTs = lastModified || ''
  const d = rawTs ? new Date(rawTs) : null
  const ts = d && !isNaN(d.getTime()) ? d.toLocaleString() : '—'

  const tabs: { id: EditorTab; label: string; show?: boolean }[] = [
    { id: 'system', label: 'System Instructions' },
    { id: 'template', label: 'User Template' },
    { id: 'schema', label: 'Output Schema', show: !!schema },
  ]

  return (
    <main className="flex min-h-0 flex-col overflow-hidden bg-[#F5F6F8]">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#E0E6ED] bg-white px-5 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-[#1A2C3D]">
            {meta?.label || 'Select a prompt'}
          </div>
          <div className="mt-0.5 text-xs text-[#4A6580]">
            {meta?.description || 'Choose a prompt from the sidebar to start editing'}
          </div>
        </div>
        {meta && (
          <div className="flex items-center gap-2">
            {!showDraftState && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#16a34a]">
                <div className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
                Live
              </div>
            )}
            {showDraftState && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#d97706]">
                <div className="h-1.5 w-1.5 rounded-full bg-[#d97706]" />
                Draft unsaved
              </div>
            )}
            {showDraftState && (
              <button
                type="button"
                onClick={onDiscard}
                className="inline-flex h-[34px] items-center rounded-lg border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.07)] px-3.5 text-xs font-semibold text-[#dc2626] transition hover:bg-[rgba(220,38,38,0.12)]"
              >
                {hasDraft ? 'Discard Draft' : 'Reset to Live'}
              </button>
            )}
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={saving}
              className="inline-flex h-[34px] items-center rounded-lg border border-[rgba(217,119,6,0.25)] bg-[rgba(217,119,6,0.09)] px-3.5 text-xs font-semibold text-[#d97706] transition hover:bg-[rgba(217,119,6,0.18)] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={onOpenPublish}
              disabled={!hasDraft}
              className="inline-flex h-[34px] items-center rounded-lg bg-gradient-to-br from-[#16a34a] to-[#14532d] px-3.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Publish Live
            </button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 border-b border-[#E0E6ED] bg-white px-5">
        {tabs
          .filter((t) => t.show !== false)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`cursor-pointer border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                editorTab === t.id
                  ? 'border-b-[#1A4F72] text-[#1A4F72]'
                  : 'border-b-transparent text-[#4A6580] hover:text-[#1A2C3D]'
              }`}
            >
              {t.id === 'schema' && <LockIcon />}
              {t.label}
            </button>
          ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <VariableChips
          editorTab={editorTab}
          meta={meta}
          systemPrompt={systemPrompt}
          userTemplate={userTemplate}
          liveSystem={liveSystem}
          liveTemplate={liveTemplate}
          onInsert={insertVar}
        />

        {editorTab === 'system' && (
          <textarea
            ref={systemRef}
            value={systemPrompt}
            onChange={(e) => onSystemChange(e.target.value)}
            placeholder="Select a prompt to start editing..."
            className="min-h-0 flex-1 resize-none rounded-lg border border-[#E0E6ED] bg-white p-3.5 font-mono text-xs leading-relaxed text-[#1A2C3D] outline-none transition focus:border-[#1A4F72] placeholder:text-[#A8C4D4]"
            spellCheck={false}
          />
        )}

        {editorTab === 'template' && (
          <>
            <textarea
              ref={templateRef}
              value={userTemplate}
              onChange={(e) => onTemplateChange(e.target.value)}
              placeholder="User template with {variables}..."
              className="min-h-0 flex-1 resize-none rounded-lg border border-[#E0E6ED] bg-white p-3.5 font-mono text-xs leading-relaxed text-[#1A2C3D] outline-none transition focus:border-[#1A4F72] placeholder:text-[#A8C4D4]"
              spellCheck={false}
            />
            {schema && (
              <div className="shrink-0 overflow-hidden rounded-lg border-[1.5px] border-[rgba(201,146,42,0.35)] bg-[rgba(201,146,42,0.04)]">
                <div className="flex items-center gap-1.5 border-b border-[rgba(201,146,42,0.2)] bg-[rgba(201,146,42,0.09)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#C9922A]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Server-enforced Output Schema — read only
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre p-3 font-mono text-[10.5px] leading-relaxed text-[#4A6580]">
                  {schema}
                </pre>
              </div>
            )}
          </>
        )}

        {editorTab === 'schema' && (
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto rounded-lg border border-[#E0E6ED] bg-white p-4">
            {!schema ? (
              <div className="flex flex-1 items-center justify-center text-xs text-[#4A6580]">
                No locked output schema for this prompt type.
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-[rgba(37,99,235,0.15)] bg-[rgba(37,99,235,0.07)] p-2.5 text-[11px] leading-relaxed text-[#2563eb]">
                  This output schema is <strong>always appended</strong> to the user message by the
                  server and cannot be edited in the prompt. Your system and user templates shape the
                  agent&apos;s reasoning — the final JSON answer must always match this format exactly.
                </div>
                <pre className="flex-1 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-[#E0E6ED] bg-[#F5F6F8] p-3.5 font-mono text-[11px] leading-relaxed text-[#1A2C3D]">
                  {schema}
                </pre>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-[#E0E6ED] bg-white px-5 py-1.5">
        <span className="text-[10px] text-[#4A6580]">
          {meta
            ? `${meta.name} · Last modified ${ts}${hasDraft ? ' · Draft exists' : ''}`
            : 'No prompt loaded'}
        </span>
        {editorTab !== 'schema' && (
          <span className="text-[10px] text-[#4A6580]">
            {charCount.toLocaleString()} chars · {wordCount.toLocaleString()} words
          </span>
        )}
      </div>

      <PublishModal open={publishOpen} onClose={onClosePublish} onConfirm={onPublish} />
    </main>
  )
}
