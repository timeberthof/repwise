import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ToastMsg {
  id: number
  title: string
  text?: string
}

const Ctx = createContext<(title: string, text?: string) => void>(() => {})

/** Eingeblendete Hinweis-Karte oben (#212121) – z. B. „Pause überspringen“. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = useCallback((title: string, text?: string) => {
    if (timer.current) clearTimeout(timer.current)
    setMsg({ id: Date.now(), title, text })
    timer.current = setTimeout(() => setMsg(null), 2800)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] px-3" style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}>
            <div key={msg.id} role="status" className="pointer-events-auto rounded-sheet bg-toast px-[26px] py-[18px] shadow-2xl" style={{ animation: 'fade-in 180ms ease-out' }} onClick={() => setMsg(null)}>
              <p className="text-flow font-semibold leading-tight">{msg.title}</p>
              {msg.text && <p className="mt-2 text-[17px] leading-snug">{msg.text}</p>}
            </div>
          </div>,
          document.body,
        )}
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
