import { useForecast } from '../../context/ForecastContext'

export default function ForecastEngineSection() {
  const {
    activeSection,
    engineOverlayVisible,
    engineTitle,
    engineSubtitle,
    engineProgress,
    engineSteps,
    engineDetailsHtml,
    engineBtnsVisible,
    proceedToResults,
    backToAssumptions,
  } = useForecast()

  if (activeSection !== 'engine') return null

  return (
    <div className="rounded-xl border border-chryselys-primary/10 bg-white p-6 shadow-sm">
      <div className="mb-1 text-[10px] font-bold tracking-widest text-chryselys-gold">SECTION 3</div>

      {engineOverlayVisible && (
        <div className="engine-overlay mb-6 rounded-xl border border-chryselys-border bg-chryselys-bg/80 p-8 text-center">
          <div className="mb-4 text-lg font-bold text-chryselys-primary">{engineTitle}</div>
          <div className="mb-6 text-sm text-chryselys-text-2">{engineSubtitle}</div>
          <div className="mx-auto mb-4 max-w-md space-y-2 text-left">
            {engineSteps.map((step, i) =>
              step.status === 'hidden' ? null : (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-sm ${
                    step.status === 'running'
                      ? 'font-semibold text-chryselys-primary'
                      : step.status === 'done'
                        ? 'text-green-600'
                        : 'text-chryselys-text-2'
                  }`}
                >
                  <span>{step.status === 'done' ? '✓' : step.status === 'running' ? '●' : '○'}</span>
                  {step.label}
                </div>
              ),
            )}
          </div>
          <div className="mx-auto max-w-md">
            <div className="h-2 overflow-hidden rounded-full bg-chryselys-border">
              <div
                className="h-full bg-gradient-to-r from-chryselys-primary to-chryselys-gold transition-all duration-500"
                style={{ width: `${engineProgress}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-chryselys-text-2">{engineProgress}%</div>
          </div>
        </div>
      )}

      {engineDetailsHtml && (
        <div>
          <h2 className="mb-2 text-lg font-bold text-chryselys-primary">Year-by-Year Calculation Sheet</h2>
          <p className="mb-4 text-sm text-chryselys-text-2">
            Transparent calculation of all intermediate steps in the patient flow
          </p>
          <div dangerouslySetInnerHTML={{ __html: engineDetailsHtml }} />
        </div>
      )}

      {engineBtnsVisible && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={proceedToResults}
            className="rounded-lg bg-gradient-to-br from-chryselys-primary to-chryselys-navy-light px-5 py-2.5 text-sm font-semibold text-white"
          >
            View Summary & Charts →
          </button>
          <button
            type="button"
            onClick={backToAssumptions}
            className="rounded-lg border border-chryselys-border px-5 py-2.5 text-sm font-semibold text-chryselys-text-2"
          >
            ← Back to Assumptions
          </button>
        </div>
      )}
    </div>
  )
}
