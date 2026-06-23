import { useEffect, useState } from 'react'
import {
  PS_CATEGORIES,
  PS_FUNNEL_ORDER,
  PS_PARAM_DEFS,
  PS_PRESETS,
  PS_STEP_ICONS,
  PS_STEP_SHORT,
} from '../../lib/prompt-studio/flowConstants'
import { useToast } from './Toast'

interface FlowParsed {
  indication?: string
  market?: string
  product?: string
  drug_class?: string
  forecast_assumptions?: { launch_year?: number; peak_year?: number; suggested_forecast_period_years?: number }
  ai_recommendation_text?: string
  recommended_params?: string[]
  param_rationale?: Record<string, string>
  epi_type?: string
  custom_params?: Record<string, { label?: string; description?: string }>
  preset_match?: string
  market_summary?: string
}

interface FlowVisualProps {
  parsed: unknown
  onPassToAssumptions: () => void
}

const PRESET_LABELS: Record<string, string> = {
  standard: 'Standard',
  oncology: 'Oncology',
  rare: 'Rare Disease',
  custom: 'Custom',
}

export function FlowVisual({ parsed, onPassToAssumptions }: FlowVisualProps) {
  const { toast } = useToast()
  const data = parsed as FlowParsed | null

  const [studioParams, setStudioParams] = useState<Set<string>>(new Set())
  const [studioEpiType, setStudioEpiType] = useState('prevalence')
  const [studioRationale, setStudioRationale] = useState<Record<string, string>>({})
  const [studioCustomParams, setStudioCustomParams] = useState<
    Record<string, { label?: string; description?: string }>
  >({})
  const [studioParamOrder, setStudioParamOrder] = useState<string[]>([...PS_FUNNEL_ORDER])
  const [activePreset, setActivePreset] = useState('custom')
  const [aiParsed, setAiParsed] = useState<FlowParsed | null>(null)

  useEffect(() => {
    if (!data?.recommended_params) return
    setAiParsed(data)
    setStudioRationale(data.param_rationale || {})
    setStudioEpiType(data.epi_type || 'prevalence')
    const params = new Set(data.recommended_params || [])
    params.add('population')
    setStudioParams(params)
    const custom: Record<string, { label?: string; description?: string }> = {}
    Object.entries(data.custom_params || {}).forEach(([id, def]) => {
      if (!(id in PS_PARAM_DEFS)) custom[id] = def
    })
    setStudioCustomParams(custom)
    const order = data.recommended_params ? [...data.recommended_params] : [...PS_FUNNEL_ORDER]
    if (!order.includes('population')) order.unshift('population')
    setStudioParamOrder(order)
    setActivePreset(data.preset_match || 'custom')
  }, [data])

  if (!data) {
    return (
      <div className="rounded-lg border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.07)] p-2.5 text-xs text-[#dc2626]">
        No parsed output. Check the JSON tab for the raw response.
      </div>
    )
  }

  if (!data.recommended_params) {
    return (
      <div className="rounded-lg border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.07)] p-2.5 text-xs text-[#dc2626]">
        Response missing <code className="font-mono">recommended_params</code>. The prompt may use an
        older format — check the JSON tab and update the prompt to match the current output schema.
      </div>
    )
  }

  const toggleParam = (id: string) => {
    if (id === 'population') return
    setStudioParams((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setActivePreset('custom')
  }

  const setEpiType = (type: string) => {
    setStudioEpiType(type)
    setStudioParams((prev) => {
      const next = new Set(prev)
      next.delete('prevalence')
      next.delete('incidence')
      next.add(type)
      return next
    })
    setActivePreset('custom')
  }

  const applyPreset = (preset: string) => {
    const params = PS_PRESETS[preset]
    if (params) {
      setStudioParams(new Set(params))
      setStudioEpiType(params.includes('incidence') ? 'incidence' : 'prevalence')
      setStudioCustomParams({})
      setStudioParamOrder([...params])
    }
    setActivePreset(preset)
  }

  const applyAIRecommendation = () => {
    if (!aiParsed?.recommended_params) return
    const params = new Set(aiParsed.recommended_params)
    params.add('population')
    setStudioParams(params)
    setStudioEpiType(aiParsed.epi_type || 'prevalence')
    const custom: Record<string, { label?: string; description?: string }> = {}
    Object.entries(aiParsed.custom_params || {}).forEach(([id, def]) => {
      if (!(id in PS_PARAM_DEFS)) custom[id] = def
    })
    setStudioCustomParams(custom)
    const order = [...(aiParsed.recommended_params || [])]
    if (!order.includes('population')) order.unshift('population')
    setStudioParamOrder(order)
    setActivePreset(aiParsed.preset_match || 'custom')
    toast('AI recommendation applied', 'success')
  }

  const epiSlot = studioEpiType === 'incidence' ? 'incidence' : 'prevalence'
  const normalise = (id: string) =>
    id === 'prevalence' || id === 'incidence' ? epiSlot : id
  const aiOrdered = studioParamOrder.map(normalise)
  const fallback = PS_FUNNEL_ORDER.map(normalise).filter((id) => !aiOrdered.includes(id))
  const deduped = [...new Set([...aiOrdered, ...fallback])]
  const customSelected = [...studioParams].filter(
    (id) => !deduped.includes(id) && id in studioCustomParams,
  )
  const allOrdered = [...deduped, ...customSelected]
  const active = allOrdered.filter((id) => studioParams.has(id))

  const fa = data.forecast_assumptions || {}
  const recommended = [...studioParams].filter((p) => p !== 'population')

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[13px] font-bold text-[#1A2C3D]">
          {data.indication || ''}
          {data.market ? ' · ' + data.market : ''}
        </div>
        <div className="mt-0.5 text-[11px] text-[#4A6580]">
          {data.product || ''}
          {data.drug_class ? ' — ' + data.drug_class : ''}
        </div>
        {fa.launch_year && (
          <div className="mt-0.5 text-[10px] text-[#4A6580]">
            Forecast: {fa.launch_year}–{fa.peak_year || '—'} ·{' '}
            {fa.suggested_forecast_period_years || '—'} yrs
          </div>
        )}
      </div>

      {data.ai_recommendation_text && (
        <div className="flex gap-2.5 rounded-xl border border-[rgba(26,79,114,0.18)] bg-gradient-to-br from-[rgba(26,79,114,0.06)] to-[rgba(201,146,42,0.06)] p-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1A4F72] to-[#2E6A96] text-sm">
            🤖
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[11px] font-bold text-[#1A4F72]">AI Recommendation</div>
            <div className="mb-2 text-[11px] leading-relaxed text-[#4A6580]">
              {data.ai_recommendation_text}
            </div>
            {recommended.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1">
                {recommended.map((p) => (
                  <span
                    key={p}
                    className="rounded-xl border border-[rgba(26,79,114,0.2)] bg-[rgba(26,79,114,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[#1A4F72]"
                  >
                    {PS_PARAM_DEFS[p]?.label || p}
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={applyAIRecommendation}
              className="mt-1.5 inline-block cursor-pointer rounded-lg border border-[rgba(201,146,42,0.2)] bg-[rgba(201,146,42,0.08)] px-2.5 py-1 text-[10px] font-bold text-[#C9922A] transition hover:bg-[rgba(201,146,42,0.15)]"
            >
              ✓ Apply AI recommendation
            </button>
          </div>
        </div>
      )}

      {data.market_summary && (
        <div className="rounded-lg border border-[rgba(26,79,114,0.12)] bg-[rgba(26,79,114,0.04)] p-2.5 text-[11px] leading-relaxed text-[#4A6580]">
          {data.market_summary}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.6px] text-[#4A6580]">
          Template:
        </span>
        {['standard', 'oncology', 'rare', 'custom'].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => applyPreset(p)}
            className={`cursor-pointer rounded-full border-[1.5px] px-3 py-1 text-[11px] font-semibold transition ${
              activePreset === p
                ? 'border-[#1A4F72] bg-[#1A4F72] text-white'
                : 'border-[#E0E6ED] bg-[#F5F6F8] text-[#4A6580] hover:border-[#1A4F72] hover:bg-[rgba(26,79,114,0.04)] hover:text-[#1A4F72]'
            }`}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      {PS_CATEGORIES.map((cat) => (
        <div key={cat.id} className="overflow-hidden rounded-xl border border-[#E0E6ED] bg-white">
          <div className="flex items-center justify-between border-b border-[#E0E6ED] bg-[rgba(26,79,114,0.03)] px-3.5 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#1A4F72]">
              {cat.label}
            </span>
            <button
              type="button"
              onClick={() => toast(`Custom parameters for "${cat.id}" — coming soon`, '')}
              className="cursor-pointer rounded border border-[#E0E6ED] bg-transparent px-2 py-0.5 text-[10px] font-semibold text-[#4A6580] transition hover:border-[#1A4F72] hover:text-[#1A4F72]"
            >
              + Add
            </button>
          </div>
          <div className="py-1">
            {cat.params.map((id) => {
              const def = PS_PARAM_DEFS[id]
              if (!def) return null
              const isPopulation = id === 'population'
              const isEpiChoice = id === 'prevalence' || id === 'incidence'
              const isChecked = isPopulation
                ? true
                : isEpiChoice
                  ? studioEpiType === id
                  : studioParams.has(id)
              const rationale = studioRationale[id] || ''

              if (isPopulation) {
                return (
                  <div key={id} className="flex items-start gap-2.5 px-3.5 py-2">
                    <input type="checkbox" checked disabled className="mt-0.5 h-[15px] w-[15px] accent-[#1A4F72]" />
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#1A2C3D]">{def.label}</span>
                        <span className="rounded bg-[rgba(26,79,114,0.1)] px-1 py-px text-[9px] font-bold uppercase text-[#1A4F72]">
                          required
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] leading-snug text-[#4A6580]">{def.desc}</div>
                    </div>
                  </div>
                )
              }

              if (isEpiChoice) {
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setEpiType(id)}
                    className="flex w-full cursor-pointer items-start gap-2.5 px-3.5 py-2 text-left transition hover:bg-[#F5F6F8]"
                  >
                    <input
                      type="radio"
                      name="ps-epi"
                      checked={isChecked}
                      onChange={() => setEpiType(id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 h-[15px] w-[15px] accent-[#1A4F72]"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#1A2C3D]">{def.label}</span>
                        <span className="rounded bg-[rgba(201,146,42,0.1)] px-1 py-px text-[9px] font-bold uppercase text-[#C9922A]">
                          choose one
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] leading-snug text-[#4A6580]">{def.desc}</div>
                      {rationale && (
                        <div className="mt-1 border-l-2 border-[rgba(26,79,114,0.2)] pl-1.5 text-[10px] italic leading-snug text-[#1A4F72]">
                          {rationale}
                        </div>
                      )}
                    </div>
                  </button>
                )
              }

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleParam(id)}
                  className="flex w-full cursor-pointer items-start gap-2.5 px-3.5 py-2 text-left transition hover:bg-[#F5F6F8]"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleParam(id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 h-[15px] w-[15px] accent-[#1A4F72]"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#1A2C3D]">{def.label}</span>
                      <span className="rounded bg-[rgba(22,163,74,0.08)] px-1 py-px text-[9px] font-bold uppercase text-[#16a34a]">
                        optional
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] leading-snug text-[#4A6580]">{def.desc}</div>
                    {rationale && (
                      <div className="mt-1 border-l-2 border-[rgba(26,79,114,0.2)] pl-1.5 text-[10px] italic leading-snug text-[#1A4F72]">
                        {rationale}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {Object.keys(studioCustomParams).length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[#E0E6ED] bg-white">
          <div className="flex items-center justify-between border-b border-[#E0E6ED] bg-[rgba(26,79,114,0.03)] px-3.5 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#1A4F72]">
              Custom Parameters
            </span>
            <span className="rounded border border-[rgba(201,146,42,0.2)] bg-[rgba(201,146,42,0.1)] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#C9922A]">
              AI-created
            </span>
          </div>
          <div className="py-1">
            {Object.entries(studioCustomParams).map(([id, def]) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleParam(id)}
                className="flex w-full cursor-pointer items-start gap-2.5 px-3.5 py-2 text-left transition hover:bg-[#F5F6F8]"
              >
                <input
                  type="checkbox"
                  checked={studioParams.has(id)}
                  onChange={() => toggleParam(id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5 h-[15px] w-[15px] accent-[#1A4F72]"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#1A2C3D]">{def.label || id}</span>
                    <span className="rounded bg-[rgba(22,163,74,0.08)] px-1 py-px text-[9px] font-bold uppercase text-[#16a34a]">
                      custom
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] leading-snug text-[#4A6580]">
                    {def.description || ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 ? (
        <div className="py-3 text-center text-[11px] text-[#4A6580]">No parameters selected</div>
      ) : (
        <div className="flex flex-wrap items-center gap-0 overflow-x-auto rounded-xl border border-[#E0E6ED] bg-[#F5F6F8] p-3.5">
          {active.map((id, i) => {
            const isCustom = id in studioCustomParams
            const icon = PS_STEP_ICONS[id] || (isCustom ? '⚙️' : '📌')
            const label =
              PS_STEP_SHORT[id] || (isCustom ? studioCustomParams[id]?.label || id : id)
            return (
              <div key={id} className="flex items-center">
                <div
                  className={`flex min-w-[72px] flex-col items-center rounded-lg border-[1.5px] bg-white px-2.5 py-2 text-center ${
                    isCustom ? 'border-[#C9922A]' : 'border-[#1A4F72]'
                  }`}
                >
                  <div className="mb-0.5 text-base">{icon}</div>
                  <div
                    className={`text-[10px] font-semibold leading-tight ${
                      isCustom ? 'text-[#C9922A]' : 'text-[#1A4F72]'
                    }`}
                  >
                    {label}
                  </div>
                </div>
                {i < active.length - 1 && (
                  <div className="shrink-0 px-0.5 text-base text-[#4A6580]">→</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onPassToAssumptions}
        className="flex h-[34px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-[#1A4F72] bg-[rgba(26,79,114,0.06)] text-xs font-bold text-[#1A4F72] transition hover:bg-[rgba(26,79,114,0.1)]"
      >
        → Use this flow in Step 3 (Assumptions)
      </button>
    </div>
  )
}
