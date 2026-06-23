import { useMemo } from 'react'
import type { PromptMeta } from '../../lib/api/prompts'
import { extractVariables } from '../../lib/prompt-studio/utils'

export type EditorTab = 'system' | 'template' | 'schema'

interface VariableChipsProps {
  editorTab: EditorTab
  meta: PromptMeta | null
  systemPrompt: string
  userTemplate: string
  liveSystem: string
  liveTemplate: string
  onInsert: (name: string) => void
}

export function VariableChips({
  editorTab,
  meta,
  systemPrompt,
  userTemplate,
  liveSystem,
  liveTemplate,
  onInsert,
}: VariableChipsProps) {
  const { title, hint, variables, knownVars } = useMemo(() => {
    if (editorTab === 'schema') return { title: '', hint: '', variables: [], knownVars: new Set<string>() }

    const known = new Set(meta?.variables || [])
    const liveText = (liveSystem || '') + '\n' + (liveTemplate || '')
    for (const m of liveText.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)) {
      known.add(m[1])
    }

    const combined = systemPrompt + '\n' + userTemplate
    const found = extractVariables(combined)

    if (found.length) {
      return {
        title: 'Variables in use',
        hint: '· click to insert',
        variables: found,
        knownVars: known,
      }
    }
    if (known.size) {
      return {
        title: 'Available Variables',
        hint: '· click to insert',
        variables: [...known],
        knownVars: known,
      }
    }
    return { title: '', hint: '', variables: [], knownVars: known }
  }, [editorTab, meta, systemPrompt, userTemplate, liveSystem, liveTemplate])

  if (editorTab === 'schema' || variables.length === 0) return null

  const hasUnknown = variables.some((v) => !knownVars.has(v))

  return (
    <div className="shrink-0 rounded-lg border border-[#E0E6ED] bg-white px-3.5 py-2.5">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.6px] text-[#4A6580]">
        {title}
        <span className="ml-1.5 text-[9px] font-medium normal-case tracking-normal text-[#A8C4D4]">
          {hint}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {variables.map((v) => {
          const known = knownVars.has(v)
          return (
            <button
              key={v}
              type="button"
              title={
                known
                  ? 'Click to insert at cursor'
                  : 'Not a server-substituted variable — will be sent as literal text. Click to insert.'
              }
              onClick={() => onInsert(v)}
              className={`cursor-pointer rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium transition select-none ${
                known
                  ? 'border-[rgba(37,99,235,0.15)] bg-[rgba(37,99,235,0.07)] text-[#2563eb] hover:border-[rgba(37,99,235,0.35)] hover:bg-[rgba(37,99,235,0.15)]'
                  : 'border-[rgba(201,146,42,0.25)] bg-[rgba(201,146,42,0.07)] text-[#C9922A] hover:border-[rgba(201,146,42,0.5)] hover:bg-[rgba(201,146,42,0.15)]'
              }`}
            >
              {'{' + v + '}'}
            </button>
          )
        })}
        {hasUnknown && (
          <span className="self-center ml-1 text-[9px] text-[#A8C4D4]">
            <span className="text-[#C9922A]">■</span> not substituted by server
          </span>
        )}
      </div>
    </div>
  )
}
