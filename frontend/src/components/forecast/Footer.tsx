export default function Footer() {
  return (
    <footer className="flex shrink-0 items-center justify-between border-t-2 border-chryselys-gold bg-gradient-to-r from-[#0F2F47] to-chryselys-primary px-7 py-2.5 text-[11px] tracking-wide text-chryselys-steel/85">
      <span className="flex items-center gap-2.5">
        <span className="text-[11px] font-bold tracking-wider text-chryselys-gold uppercase">Chryselys</span>
        <span className="inline-block h-3 w-px bg-chryselys-steel/30" />
        <span>© 2026 All rights reserved.</span>
      </span>
      <span className="flex items-center gap-2.5">
        <span>www.chryselys.com</span>
        <span className="text-chryselys-steel/40">|</span>
        <span>info@chryselys.com</span>
      </span>
    </footer>
  )
}
