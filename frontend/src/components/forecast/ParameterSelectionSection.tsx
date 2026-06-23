import { useState } from 'react'
import { PRESETS } from '../../lib/forecast/constants'
import type { ParameterCategory } from '../../lib/forecast/types'
import { useForecast } from '../../context/ForecastContext'

const CATEGORIES: { key: ParameterCategory; title: string }[] = [
  { key: 'epidemiology', title: 'Epidemiology' },
  { key: 'treatment', title: 'Treatment Flow' },
  { key: 'market', title: 'Market Dynamics' },
  { key: 'pricing', title: 'Pricing & Access' },
]

export default function ParameterSelectionSection() {
  const {
    activeSection,
    parameterLists,
    parameterLabels,
    selectedParameters,
    advancedMode,
    setAdvancedMode,
    activePreset,
    aiRecHtml,
    aiRecLoading,
    applyAIRecommendation,
    applyPreset,
    generateAssumptions,
    generatingAssumptions,
    backToProductInfo,
    toggleParameterChecked,
    setEpiType,
    reorderParameter,
    renameParameter,
    deleteParameter,
    addCustomParameter,
  } = useForecast()

  const [dragId, setDragId] = useState<string | null>(null)
  const [openForm, setOpenForm] = useState<ParameterCategory | null>(null)
  const [customName, setCustomName] = useState('')
  const [customDesc, setCustomDesc] = useState('')

  if (activeSection !== 'parameters') return null

  return (
    <div className={`rounded-xl border border-chryselys-primary/10 bg-white p-6 shadow-sm ${advancedMode ? 'advanced-mode' : ''}`}>
      <div className="mb-1 text-[10px] font-bold tracking-widest text-chryselys-gold">SECTION 1.5</div>
      <h2 className="mb-2 text-lg font-bold text-chryselys-primary">Define Forecast Flow</h2>
      <p className="mb-4 text-sm text-chryselys-text-2">
        Choose a template to auto-configure parameters, or customise manually below.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-chryselys-text-2">Template:</span>
        {Object.keys(PRESETS).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              activePreset === key
                ? 'border-chryselys-gold bg-chryselys-gold/15 text-chryselys-primary'
                : 'border-chryselys-border text-chryselys-text-2 hover:border-chryselys-gold'
            }`}
          >
            {key === 'standard'
              ? 'Standard Forecast Template'
              : key === 'rare'
                ? 'Rare Disease'
                : key === 'oncology'
                  ? 'Oncology'
                  : 'Custom'}
          </button>
        ))}
      </div>

      <div className="ai-rec-banner">
        <span className="text-chryselys-gold">★</span>
        <div className="flex-1">
          <div className="text-sm font-bold text-chryselys-primary">AI Recommendation</div>
          <div
            className="mt-1 text-sm text-chryselys-text-2"
            dangerouslySetInnerHTML={{ __html: aiRecHtml || 'Loading recommendation…' }}
          />
          <button
            type="button"
            disabled={aiRecLoading}
            onClick={applyAIRecommendation}
            className="mt-2 rounded-md bg-chryselys-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {aiRecLoading ? 'Generating…' : 'Apply Recommendation'}
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 text-sm">
        <label htmlFor="advancedModeToggle">Advanced mode (enable drag reordering):</label>
        <input
          id="advancedModeToggle"
          type="checkbox"
          checked={advancedMode}
          onChange={(e) => setAdvancedMode(e.target.checked)}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CATEGORIES.map(({ key, title }) => (
          <div key={key} className="rounded-lg border border-chryselys-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-chryselys-primary">{title}</h3>
              <button
                type="button"
                onClick={() => setOpenForm(openForm === key ? null : key)}
                className="text-xs text-chryselys-gold"
              >
                + Add
              </button>
            </div>
            {openForm === key && (
              <div className="mb-3 space-y-2 rounded-lg bg-chryselys-bg p-3">
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Parameter name"
                  className="w-full rounded border border-chryselys-border px-2 py-1 text-sm"
                />
                <input
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Description"
                  className="w-full rounded border border-chryselys-border px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    addCustomParameter(key, customName, customDesc)
                    setCustomName('')
                    setCustomDesc('')
                    setOpenForm(null)
                  }}
                  className="rounded bg-chryselys-primary px-3 py-1 text-xs text-white"
                >
                  Add
                </button>
              </div>
            )}
            <div className="space-y-1">
              {(parameterLists[key] || []).map((item) => (
                <div
                  key={item.id}
                  draggable={advancedMode && item.draggable}
                  onDragStart={() => setDragId(item.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId && dragId !== item.id) reorderParameter(key, dragId, item.id)
                    setDragId(null)
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-chryselys-bg/50"
                >
                  {item.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={item.checked}
                      disabled={item.disabled}
                      onChange={(e) => toggleParameterChecked(key, item.id, e.target.checked)}
                    />
                  ) : (
                    <input
                      type="radio"
                      name="epi-type"
                      checked={item.checked}
                      onChange={() => setEpiType(item.id as 'prevalence' | 'incidence')}
                    />
                  )}
                  <span
                    className="drag-handle cursor-grab text-chryselys-text-2"
                    style={{ visibility: advancedMode && item.draggable ? 'visible' : 'hidden' }}
                  >
                    ⋮⋮
                  </span>
                  <div className="flex-1">
                    <div
                      className="text-sm font-medium"
                      contentEditable={!item.disabled}
                      suppressContentEditableWarning
                      onBlur={(e) => renameParameter(item.id, e.currentTarget.textContent || '')}
                    >
                      {parameterLabels[item.id] || item.label}
                    </div>
                    <div className="text-[11px] text-chryselys-text-2">{item.description}</div>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold text-chryselys-text-2">{item.badge}</span>
                  )}
                  {item.deletable && (
                    <button type="button" onClick={() => deleteParameter(key, item.id)} className="text-red-500">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-lg border border-chryselys-border bg-chryselys-bg/50 p-4">
        <h3 className="mb-2 text-sm font-bold text-chryselys-primary">Forecast Flow Preview</h3>
        <div className="flex flex-wrap items-center gap-1">
          {selectedParameters.parameters.map((p, i) => (
            <span key={p} className="flex items-center gap-1">
              <span className="flow-step">{parameterLabels[p] || p}</span>
              {i < selectedParameters.parameters.length - 1 && <span className="flow-arrow">→</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={generatingAssumptions}
          onClick={() => generateAssumptions()}
          className="rounded-lg bg-gradient-to-br from-chryselys-primary to-chryselys-navy-light px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {generatingAssumptions ? 'Researching…' : 'Generate Assumptions'}
        </button>
        <button
          type="button"
          onClick={backToProductInfo}
          className="rounded-lg border border-chryselys-border px-5 py-2.5 text-sm font-semibold text-chryselys-text-2"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
