import type { AssumptionReadable, ProductContext, TestResult } from '../../lib/api/prompts'
import { formatAssumptionValue } from '../../lib/prompt-studio/utils'

interface AssumptionsVisualProps {
  result: TestResult
}

export function AssumptionsVisual({ result }: AssumptionsVisualProps) {
  const readable = result.readable
  const parsed = result.parsed
  const ctx = result.contextUsed || ({} as ProductContext)
  const qry = result.queryUsed || ''

  const ctxPairs: [string, string | number | undefined | null][] = [
    ['Indication', ctx.indication],
    ['Product', ctx.product_name],
    ['Drug Class', ctx.drug_class],
    ['Country', ctx.country],
    [
      'Period',
      ctx.launch_year && ctx.peak_year ? `${ctx.launch_year}–${ctx.peak_year}` : null,
    ],
    ['Query', qry || null],
  ].filter(([, v]) => v) as [string, string | number][]

  const contextBlock =
    ctxPairs.length > 0 ? (
      <div className="mb-3.5 border-l-[3px] border-[#1A4F72] pl-2.5">
        <div className="mb-1.5 border-b border-[#E0E6ED] pb-1 text-[10px] font-bold uppercase tracking-[0.6px] text-[#1A4F72]">
          Context Used
        </div>
        {ctxPairs.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-1">
            <span className="min-w-[90px] text-[11px] text-[#4A6580]">{k}</span>
            <span className="text-[11px] font-medium text-[#1A2C3D]">{String(v)}</span>
          </div>
        ))}
      </div>
    ) : null

  if (readable && readable.length > 0) {
    return (
      <div>
        {contextBlock}
        <div className="mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#4A6580]">
            {readable.length} assumption{readable.length !== 1 ? 's' : ''} generated
          </span>
        </div>
        <div className="mb-3 overflow-x-auto rounded-lg border border-[#E0E6ED]">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#F5F6F8]">
                {['Variable Name', 'Value', 'Rationale', 'Source'].map((h) => (
                  <th
                    key={h}
                    className="border-b-2 border-[#E0E6ED] px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[#4A6580]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {readable.map((r: AssumptionReadable) => {
                const dispVal = formatAssumptionValue(r.key, r.value)
                const src = r.source || 'self'
                return (
                  <tr key={r.key}>
                    <td className="border-b border-[#E0E6ED] px-2 py-1 font-mono text-[10px] break-all text-[#1A2C3D]">
                      {r.key}
                    </td>
                    <td className="border-b border-[#E0E6ED] px-2 py-1 text-xs font-bold whitespace-nowrap text-[#1A4F72]">
                      {dispVal}
                    </td>
                    <td className="border-b border-[#E0E6ED] px-2 py-1 text-[11px] italic text-[#4A6580]">
                      {r.rationale || ''}
                    </td>
                    <td className="border-b border-[#E0E6ED] px-2 py-1 text-[11px]">
                      {src === 'self' ? (
                        <span className="italic text-[#4A6580]">self</span>
                      ) : (
                        <a
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#1A4F72] underline break-all"
                          title={src}
                        >
                          {src.replace(/^https?:\/\//, '').slice(0, 40)}
                          {src.length > 47 ? '…' : ''}
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (Array.isArray(parsed) && parsed.length === 0) {
    return (
      <div>
        {contextBlock}
        <div className="mb-2.5 rounded-lg border border-[rgba(217,119,6,0.2)] bg-[rgba(217,119,6,0.09)] p-2.5 text-xs text-[#d97706]">
          <strong>Agent returned no overrides.</strong> Fill in the Indication field above and run
          again — the agent needs product context to generate assumptions.
        </div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#4A6580]">
          Raw Response
        </div>
        <pre className="max-h-[200px] overflow-y-auto rounded-lg border border-[#E0E6ED] bg-[#F5F6F8] p-2.5 font-mono text-[11px] text-[#1A2C3D]">
          {result.raw || '(empty)'}
        </pre>
      </div>
    )
  }

  const rawText = result.raw || ''
  return (
    <div>
      {contextBlock}
      <div className="mb-2.5 rounded-lg border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.07)] p-2.5 text-xs text-[#dc2626]">
        Could not parse a JSON array from the response. Switch to the <strong>Raw</strong> tab to
        inspect the full output.
      </div>
      {rawText && (
        <>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#4A6580]">
            Raw Response (first 800 chars)
          </div>
          <pre className="max-h-60 overflow-y-auto rounded-lg border border-[#E0E6ED] bg-[#F5F6F8] p-2.5 font-mono text-[11px] text-[#1A2C3D]">
            {rawText.slice(0, 800)}
            {rawText.length > 800 ? '\n…' : ''}
          </pre>
        </>
      )}
    </div>
  )
}
