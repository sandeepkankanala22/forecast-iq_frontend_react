import { useForecast } from '../../context/ForecastContext'

const STEPS = [
  { n: 1, label: 'Product Info' },
  { n: 2, label: 'Define Flow' },
  { n: 3, label: 'Assumptions' },
  { n: 4, label: 'Engine' },
  { n: 5, label: 'Results' },
]

export default function NavRibbon() {
  const { activeNavStep, maxStepReached, assumptionsGenerated, forecastCalculated, navigateToSection } =
    useForecast()

  return (
    <div className="sticky top-0 z-[5] border-b border-chryselys-border bg-white/95 px-6 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        {STEPS.map(({ n, label }) => {
          const isActive = activeNavStep === n
          const isCompleted =
            n < activeNavStep ||
            n <= maxStepReached ||
            (assumptionsGenerated && n === 3) ||
            (forecastCalculated && n >= 4)
          const isDisabled = !isActive && !isCompleted && n > maxStepReached + 1

          return (
            <button
              key={n}
              type="button"
              disabled={isDisabled}
              onClick={() => navigateToSection(n)}
              className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left transition ${
                isActive
                  ? 'bg-chryselys-primary/10 text-chryselys-primary'
                  : isCompleted
                    ? 'text-chryselys-gold hover:bg-chryselys-gold/10'
                    : 'cursor-not-allowed text-chryselys-text-2/40'
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isActive
                    ? 'bg-chryselys-primary text-white'
                    : isCompleted
                      ? 'border border-chryselys-gold bg-chryselys-gold/15 text-chryselys-gold'
                      : 'border border-chryselys-border bg-chryselys-bg text-chryselys-text-2/50'
                }`}
              >
                {isCompleted && !isActive ? '✓' : n}
              </div>
              <span className="text-xs font-semibold">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
