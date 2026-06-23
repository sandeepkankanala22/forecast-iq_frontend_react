import { useCallback, useEffect, useRef } from 'react'

const MIN_W = 260
const MAX_W = 700

export function useChatResize(
  shellRef: React.RefObject<HTMLDivElement | null>,
  chatHidden: boolean,
) {
  const savedWidth = useRef('480px')

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const shell = shellRef.current
      if (!shell || chatHidden) return
      e.preventDefault()
      const startX = e.clientX
      const cols = getComputedStyle(shell).gridTemplateColumns.split(' ')
      const startW = parseFloat(cols[cols.length - 1]) || 480

      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX
        const newW = Math.min(MAX_W, Math.max(MIN_W, startW + delta))
        shell.style.gridTemplateColumns = `1fr ${newW}px`
        savedWidth.current = `${newW}px`
      }

      const onUp = () => {
        shell.style.transition = ''
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }

      shell.style.transition = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [chatHidden, shellRef],
  )

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    if (!chatHidden && savedWidth.current) {
      shell.style.gridTemplateColumns = `1fr ${savedWidth.current}`
    }
  }, [chatHidden, shellRef])

  return { onMouseDown, savedWidth }
}
