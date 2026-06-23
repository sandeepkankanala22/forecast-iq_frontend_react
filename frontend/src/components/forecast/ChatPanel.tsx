import { useState } from 'react'
import { formatBotText, useForecast } from '../../context/ForecastContext'
import { useChatResize } from '../../hooks/useChatResize'

export default function ChatPanel() {
  const { messages, quickReplies, typing, clearChat, sendMessage, aiRecLoading } = useForecast()
  const [input, setInput] = useState('')
  const { onMouseDown } = useChatResize({ current: null }, false)

  const handleSend = () => {
    const t = input.trim()
    if (!t) return
    setInput('')
    sendMessage(t)
  }

  return (
    <aside className="relative flex min-h-0 flex-col border-l border-chryselys-border bg-white">
      <div
        className="chat-resize-handle absolute top-0 bottom-0 left-0 z-[200] flex w-2 cursor-col-resize items-center justify-center border-r-2 border-chryselys-gold/25 bg-chryselys-gold/10 transition hover:border-chryselys-gold hover:bg-chryselys-gold/20"
        onMouseDown={onMouseDown}
        title="Drag to resize chat"
      />
      <div className="flex items-center justify-between border-b border-chryselys-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-chryselys-primary">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          AI Copilot
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="rounded-md border border-chryselys-border px-2.5 py-1 text-xs text-chryselys-text-2 hover:bg-chryselys-bg"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.map((m) => (
          <div key={m.id} className={`mb-3 flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chryselys-bg text-sm">
              {m.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className={`max-w-[90%] ${m.role === 'user' ? 'text-right' : ''}`}>
              <div
                className={`inline-block rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                  m.role === 'user' ? 'bg-chryselys-primary text-white' : 'bg-chryselys-bg text-chryselys-text'
                }`}
              >
                {m.liveHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: m.liveHtml }} />
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: formatBotText(m.text) }} />
                )}
              </div>
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.actions.map((a) => (
                    <a
                      key={a.href}
                      href={a.href}
                      download={a.download}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white no-underline ${
                        a.cls === 'pptx' ? 'bg-[#d24726]' : 'bg-[#217346]'
                      }`}
                    >
                      {a.label}
                    </a>
                  ))}
                </div>
              )}
              <div className="mt-1 text-[10px] text-chryselys-text-2">{m.time}</div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="mb-3 flex gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-chryselys-bg text-sm">🤖</div>
            <div className="flex items-center gap-1 rounded-xl bg-chryselys-bg px-3 py-2">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      {quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-chryselys-border px-4 py-2">
          {quickReplies.slice(0, 6).map((opt) => {
            const isApplyAI = opt === 'Apply AI Recommendation'
            return (
              <button
                key={opt}
                type="button"
                disabled={isApplyAI && aiRecLoading}
                onClick={() => sendMessage(opt)}
                className="rounded-full border border-chryselys-primary/25 bg-chryselys-primary/5 px-3 py-1 text-xs font-medium text-chryselys-primary transition hover:bg-chryselys-primary/15 disabled:opacity-50"
              >
                {isApplyAI && aiRecLoading ? 'Generating recommendation…' : opt}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex gap-2 border-t border-chryselys-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask me anything…"
          className="flex-1 rounded-lg border border-chryselys-border px-3 py-2 text-sm outline-none focus:border-chryselys-gold focus:ring-2 focus:ring-chryselys-gold/20"
        />
        <button
          type="button"
          onClick={handleSend}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-chryselys-primary text-white hover:bg-chryselys-primary-h"
        >
          <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
