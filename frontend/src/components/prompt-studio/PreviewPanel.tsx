import { useState } from 'react'
import type { TestResult } from '../../lib/api/prompts'
import { syntaxHighlight, toDataUri } from '../../lib/prompt-studio/utils'
import { AssumptionsVisual } from './AssumptionsVisual'
import { FlowVisual } from './FlowVisual'

export type PreviewTab = 'visual' | 'json' | 'raw'

interface PreviewPanelProps {
  result: TestResult | null
  loading: boolean
  error: string | null
  onPassToAssumptions: () => void
}

export function PreviewPanel({
  result,
  loading,
  error,
  onPassToAssumptions,
}: PreviewPanelProps) {
  const [tab, setTab] = useState<PreviewTab>('visual')

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: 'visual', label: 'Visual' },
    { id: 'json', label: 'JSON' },
    { id: 'raw', label: 'Raw' },
  ]

  const showDownloads =
    result?.testType === 'assumptions' && result.readable && result.readable.length > 0

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-[rgba(37,99,235,0.15)] bg-[rgba(37,99,235,0.07)] p-2.5 text-xs text-[#2563eb]">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-[rgba(37,99,235,0.3)] border-t-[#2563eb]" />
          Running test — this may take a moment…
        </div>
      )
    }

    if (error) {
      return (
        <div className="rounded-lg border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.07)] p-2.5 text-xs text-[#dc2626]">
          <strong>Error:</strong> {error}
        </div>
      )
    }

    if (!result) {
      return (
        <div className="flex h-[140px] flex-col items-center justify-center gap-2">
          <div className="text-[28px] opacity-30">⚗️</div>
          <div className="text-xs text-[#4A6580]">Run a test to see the output here</div>
        </div>
      )
    }

    if (tab === 'raw') {
      return (
        <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[#1A2C3D]">
          {result.raw || ''}
        </pre>
      )
    }

    if (tab === 'json') {
      const display = result.parsed ?? result.raw
      const json =
        typeof display === 'object'
          ? JSON.stringify(display, null, 2)
          : display || '(no output)'
      return (
        <pre
          className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[#1A2C3D]"
          dangerouslySetInnerHTML={{ __html: syntaxHighlight(String(json)) }}
        />
      )
    }

    // Visual tab
    if (result.testType === 'flow') {
      return <FlowVisual parsed={result.parsed} onPassToAssumptions={onPassToAssumptions} />
    }
    if (result.testType === 'assumptions') {
      return <AssumptionsVisual result={result} />
    }

    const display =
      typeof result.parsed === 'object' && result.parsed
        ? JSON.stringify(result.parsed, null, 2)
        : result.raw || '(no output)'
    return (
      <pre
        className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[#1A2C3D]"
        dangerouslySetInnerHTML={{ __html: syntaxHighlight(String(display)) }}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[#E0E6ED] px-4">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`cursor-pointer border-b-2 px-3 py-2 text-[11px] font-semibold transition ${
                tab === t.id
                  ? 'border-b-[#1A4F72] text-[#1A4F72]'
                  : 'border-b-transparent text-[#4A6580] hover:text-[#1A2C3D]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {showDownloads && result != null && result.parsed != null ? (
          <div className="flex items-center gap-1.5">
            <a
              href={toDataUri(JSON.stringify(result.parsed, null, 2), 'application/json')}
              download="assumptions.json"
              className="rounded-md border border-[#1A4F72] bg-[rgba(26,79,114,0.07)] px-2.5 py-0.5 text-[11px] font-semibold text-[#1A4F72] no-underline"
            >
              ↓ JSON
            </a>
            {result.csv && (
              <a
                href={toDataUri(result.csv, 'text/csv')}
                download="assumptions.csv"
                className="rounded-md border border-[#C9922A] bg-[rgba(201,146,42,0.07)] px-2.5 py-0.5 text-[11px] font-semibold text-[#C9922A] no-underline"
              >
                ↓ CSV
              </a>
            )}
          </div>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto p-3.5">{renderContent()}</div>
    </div>
  )
}
