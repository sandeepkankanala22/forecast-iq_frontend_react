import { formatValue, linkifyRationaleHtml, validateParameter } from '../../lib/forecast/assumptionsHelpers'
import type { AssumptionValue } from '../../lib/forecast/types'
import { useForecast } from '../../context/ForecastContext'

export default function AssumptionsSection() {
  const {
    activeSection,
    assumptions,
    selectedParameters,
    parameterLabels,
    researchSources,
    rationaleVisible,
    toggleRationale,
    calculateForecast,
    viewExistingResults,
    resetAssumptions,
    forecastCalculated,
    updateAssumption,
    updateShareParam,
    updateEpiUnit,
    showSourceModal,
  } = useForecast()

  if (activeSection !== 'assumptions') return null

  return (
    <div className="rounded-xl border border-chryselys-primary/10 bg-white p-6 shadow-sm">
      <div className="mb-1 text-[10px] font-bold tracking-widest text-chryselys-gold">SECTION 2</div>
      <h2 className="mb-2 text-lg font-bold text-chryselys-primary">Forecast Assumptions & Validation</h2>
      <p className="mb-4 text-sm text-chryselys-text-2">
        Review and modify epidemiological, market, and pricing assumptions
      </p>

      <div className="mb-4 rounded-lg border border-chryselys-gold/30 bg-chryselys-primary/5 p-3">
        <h3 className="mb-2 text-xs font-bold">Your Customised Forecast Flow</h3>
        <div className="flex flex-wrap gap-1">
          {selectedParameters.parameters.map((p, i) => (
            <span key={p} className="flex items-center gap-1">
              <span className="flow-step">{parameterLabels[p] || p}</span>
              {i < selectedParameters.parameters.length - 1 && <span className="flow-arrow">→</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">Epidemiology & Market Parameters</h3>
        <button type="button" onClick={toggleRationale} className="rounded border border-chryselys-border px-3 py-1 text-xs">
          Show/Hide Rationale
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-chryselys-border">
        <table className="w-full text-sm">
          <thead className="bg-chryselys-bg">
            <tr>
              <th className="px-3 py-2 text-left">Parameter</th>
              <th className="px-3 py-2 text-left">Value</th>
              <th className="px-3 py-2 text-left">Unit</th>
              <th className="px-3 py-2 text-left">Range (Low–High)</th>
              {rationaleVisible && <th className="rationale-col px-3 py-2 text-left">Rationale</th>}
            </tr>
          </thead>
          <tbody>
            {selectedParameters.parameters.map((key) => {
              const data = assumptions[key] as AssumptionValue | undefined
              if (!data) return null
              const label = parameterLabels[key] || key
              const vr = validateParameter(key, data)
              return (
                <tr key={key} className="border-t border-chryselys-border">
                  <td className="px-3 py-2 font-semibold">{label}</td>
                  <td className="px-3 py-2">
                    <input
                      className="editable-cell w-28 rounded border border-chryselys-border px-2 py-1 text-sm"
                      defaultValue={formatValue(data.value, data.unit)}
                      onChange={(e) => updateAssumption(key, e.target.value)}
                    />
                    {(key === 'classShare' || key === 'peakProductShare') && (
                      <div className="mt-2 space-y-1 text-xs">
                        <div>
                          Starting Share:{' '}
                          <input
                            className="w-16 rounded border px-1"
                            defaultValue={((data.startingShare || 0) * 100).toFixed(1)}
                            onChange={(e) => updateShareParam(key, 'startingShare', e.target.value)}
                          />
                          %
                        </div>
                        <div>
                          Peak Year:{' '}
                          <input
                            type="number"
                            className="w-20 rounded border px-1"
                            defaultValue={data.peakYear}
                            onChange={(e) => updateShareParam(key, 'peakYear', e.target.value)}
                          />
                        </div>
                        <select
                          className="rounded border px-1"
                          defaultValue={data.curveType || 'scurve'}
                          onChange={(e) => updateShareParam(key, 'curveType', e.target.value)}
                        >
                          <option value="scurve">S-Curve</option>
                          <option value="linear">Linear</option>
                          <option value="exponential">Exponential</option>
                        </select>
                      </div>
                    )}
                    {(key === 'prevalence' || key === 'incidence') && (
                      <select
                        className="mt-1 block rounded border px-1 text-xs"
                        defaultValue={data.unitType || 'rate'}
                        onChange={(e) => updateEpiUnit(key, e.target.value)}
                      >
                        <option value="rate">Rate (proportion)</option>
                        <option value="per100k">Per 100,000</option>
                        <option value="per1M">Per 1,000,000</option>
                      </select>
                    )}
                    <div className={`mt-1 text-[10px] ${vr.valid ? 'text-green-600' : 'text-amber-600'}`}>
                      {vr.valid ? '✓' : '⚠'} {vr.message}
                    </div>
                  </td>
                  <td className="px-3 py-2">{data.displayUnit || data.unit}</td>
                  <td className="px-3 py-2">{data.range}</td>
                  {rationaleVisible && (
                    <td
                      className="rationale-col px-3 py-2 text-xs"
                      dangerouslySetInnerHTML={{
                        __html: linkifyRationaleHtml(data.rationale, researchSources.length),
                      }}
                      onClick={(e) => {
                        const t = (e.target as HTMLElement).closest('[data-source]')
                        if (t) showSourceModal(parseInt(t.getAttribute('data-source') || '1'))
                      }}
                    />
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {researchSources.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-lg border border-chryselys-gold/30">
          <div className="flex items-center gap-2 bg-chryselys-primary px-4 py-2.5">
            <span className="text-xs font-bold tracking-wide text-white">RESEARCH SOURCES</span>
            <span className="ml-auto text-[10px] text-white/60">
              {researchSources.length} verified sources
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
            {researchSources.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => showSourceModal(i + 1)}
                className="flex items-center gap-2 rounded-lg border border-chryselys-border bg-chryselys-bg p-2 text-left text-xs hover:border-chryselys-gold"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded bg-chryselys-primary text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="font-semibold text-chryselys-primary">Source {i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="notice mt-4 text-sm text-chryselys-text-2">
        <strong>Review Assumptions:</strong> Modify any values before computing commercial potential.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => calculateForecast()}
          className="rounded-lg bg-gradient-to-br from-chryselys-primary to-chryselys-navy-light px-5 py-2.5 text-sm font-semibold text-white"
        >
          Calculate Forecast
        </button>
        {forecastCalculated && (
          <button
            type="button"
            onClick={viewExistingResults}
            className="rounded-lg bg-gradient-to-br from-chryselys-primary to-chryselys-navy-light px-5 py-2.5 text-sm font-semibold text-white"
          >
            View Results →
          </button>
        )}
        <button
          type="button"
          onClick={resetAssumptions}
          className="rounded-lg border border-chryselys-border px-5 py-2.5 text-sm font-semibold text-chryselys-text-2"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
