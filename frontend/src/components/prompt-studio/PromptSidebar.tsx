import type { PromptMeta } from '../../lib/api/prompts'
import { TYPE_BADGE, TYPE_ICON } from '../../lib/prompt-studio/flowConstants'

interface PromptSidebarProps {
  prompts: PromptMeta[]
  selected: string | null
  loading: boolean
  error: string | null
  onSelect: (name: string) => void
}

function PromptItem({
  prompt,
  active,
  onSelect,
}: {
  prompt: PromptMeta
  active: boolean
  onSelect: () => void
}) {
  const icon = TYPE_ICON[prompt.test_type] || prompt.name.charAt(0).toUpperCase()
  const typeBadge =
    TYPE_BADGE[prompt.test_type] || (prompt.step ? `Step ${prompt.step}` : '')

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full cursor-pointer items-start gap-2.5 border-l-[3px] px-4 py-2.5 text-left transition ${
        active
          ? 'border-l-[#1A4F72] bg-[#1A4F72]/6'
          : 'border-l-transparent hover:bg-[#F5F6F8]'
      }`}
    >
      <div
        className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] text-[13px] font-bold ${
          prompt.featured
            ? 'bg-gradient-to-br from-[#1A4F72] to-[#2E6A96] text-white'
            : 'border border-[#E0E6ED] bg-[#F5F6F8] text-[11px] text-[#4A6580]'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-[#1A2C3D]">{prompt.label}</div>
        <div className="mt-0.5 line-clamp-2 text-[10px] text-[#4A6580]">{prompt.description}</div>
        <div className="mt-1 flex items-center gap-1">
          {typeBadge && (
            <span className="rounded bg-[rgba(37,99,235,0.07)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#2563eb]">
              {typeBadge}
            </span>
          )}
          {prompt.has_draft && (
            <span className="rounded bg-[rgba(217,119,6,0.09)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#d97706]">
              Draft
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export function PromptSidebar({ prompts, selected, loading, error, onSelect }: PromptSidebarProps) {
  const featured = prompts
    .filter((p) => p.featured)
    .sort((a, b) => (a.step || 99) - (b.step || 99))
  const others = prompts.filter((p) => !p.featured)

  return (
    <aside className="flex flex-col overflow-hidden border-r border-[#E0E6ED] bg-white">
      <div className="shrink-0 border-b border-[#E0E6ED] px-4 pb-2.5 pt-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#4A6580]">
          Agent Prompts
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <div className="px-4 py-5 text-center text-xs text-[#4A6580]">Loading prompts...</div>
        )}
        {error && (
          <div className="px-4 py-4 text-xs text-[#dc2626]">{error}</div>
        )}
        {!loading && !error && (
          <>
            {featured.length > 0 && (
              <>
                <div className="px-4 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-[0.7px] text-[#A8C4D4]">
                  Featured
                </div>
                {featured.map((p) => (
                  <PromptItem
                    key={p.name}
                    prompt={p}
                    active={p.name === selected}
                    onSelect={() => onSelect(p.name)}
                  />
                ))}
              </>
            )}
            {others.length > 0 && (
              <>
                <div className="px-4 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-[0.7px] text-[#A8C4D4]">
                  All Prompts
                </div>
                {others.map((p) => (
                  <PromptItem
                    key={p.name}
                    prompt={p}
                    active={p.name === selected}
                    onSelect={() => onSelect(p.name)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
