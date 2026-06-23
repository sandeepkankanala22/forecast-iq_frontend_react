import { useForecast } from '../../context/ForecastContext'

export default function Navbar() {
  const { chatHidden, setChatHidden } = useForecast()

  return (
    <nav className="relative z-10 flex h-[58px] shrink-0 items-center justify-between border-b-2 border-chryselys-gold bg-gradient-to-br from-[#0F2F47] via-chryselys-primary to-[#1d5a82] px-7 shadow-[0_3px_16px_rgba(10,30,50,0.35)]">
      <div className="relative flex items-center gap-3.5">
        <img src="/whitebglogo.svg" alt="Chryselys" className="block h-[60px] w-auto brightness-110" />
        <div className="h-6 w-px bg-white/20" />
        <div className="flex flex-col gap-px">
          <span className="text-[13px] font-semibold tracking-wide text-white">
            ForecastIQ | Prompt Studio
          </span>
        </div>
      </div>
      <div className="relative flex items-center gap-3">
        <button
          type="button"
          onClick={() => setChatHidden(!chatHidden)}
          className="flex items-center gap-1.5 rounded-md border border-chryselys-gold/65 bg-gradient-to-br from-chryselys-gold/20 to-chryselys-gold/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-chryselys-gold-light shadow-sm transition hover:border-chryselys-gold hover:from-chryselys-gold hover:to-[#b8811e] hover:text-white"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          AI Copilot
        </button>
        <div className="flex h-[42px] items-center justify-center rounded-3xl border border-white/15 bg-white/10 px-2 shadow-sm transition hover:border-chryselys-gold/50 hover:bg-white/[0.13]">
          <img src="/image.webp" alt="Profile" className="block h-[38px] w-auto object-contain brightness-105" />
        </div>
      </div>
    </nav>
  )
}
