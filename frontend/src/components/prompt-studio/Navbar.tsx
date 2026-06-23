import { Link } from 'react-router-dom'

export function Navbar() {
  return (
    <nav className="z-[100] flex h-[58px] shrink-0 items-center justify-between border-b-2 border-[#C9922A] bg-gradient-to-br from-[#0F2F47] via-[#1A4F72] to-[#1d5a82] px-6 shadow-[0_3px_16px_rgba(10,30,50,0.35)]">
      <div className="flex items-center gap-3">
        <span className="text-[15px] font-bold uppercase tracking-tight text-[#C9922A]">
          Chryselys
        </span>
        <div className="h-[22px] w-px bg-white/20" />
        <div className="text-[13px] font-semibold tracking-wide text-white">
          ForecastIQ &thinsp;|&thinsp; Prompt Studio
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <Link
          to="/"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-medium text-white no-underline transition hover:border-[#C9922A]/50 hover:bg-[#C9922A]/20"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to App
        </Link>
        <div className="flex h-[42px] items-center rounded-full border border-white/15 bg-white/10 px-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A8C4D4]/75">
            ForecastIQ
          </span>
        </div>
      </div>
    </nav>
  )
}
