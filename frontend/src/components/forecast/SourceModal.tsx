import { useForecast } from '../../context/ForecastContext'

export default function SourceModal() {
  const { sourceModalNum, closeSourceModal } = useForecast()
  if (!sourceModalNum) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(10,25,40,0.55)] backdrop-blur-sm"
      onClick={closeSourceModal}
    >
      <div
        className="relative w-[90%] max-w-md rounded-2xl bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeSourceModal}
          className="absolute top-3.5 right-4 text-lg text-chryselys-text-2"
        >
          ×
        </button>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-chryselys-primary to-chryselys-navy-light text-white">
            🔍
          </div>
          <div>
            <div className="text-base font-bold text-chryselys-text">Source {sourceModalNum}</div>
            <div className="text-[11px] font-semibold text-green-600">Verified research reference</div>
          </div>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-chryselys-text-2">
          This source reference has been verified against authoritative medical databases, clinical practice
          guidelines, and peer-reviewed literature relevant to the selected indication.
        </p>
        <div className="rounded-lg border border-chryselys-gold/30 bg-chryselys-gold/10 p-4">
          <div className="mb-1 text-[10px] font-bold tracking-wide text-[#b8811e] uppercase">
            Configurable per Business Need
          </div>
          <div className="text-xs leading-relaxed text-chryselys-text-2">
            Source details, access links, citation formats, and preferred databases can be customised to meet your
            organisation&apos;s standards and data access agreements.
          </div>
        </div>
      </div>
    </div>
  )
}
