import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { TabBar, TABS } from './TabBar'
import { HomePage } from '../../features/home/HomePage'
import { TrainingPage } from '../../features/training/TrainingPage'
import { StatistikPage } from '../../features/statistik/StatistikPage'

const PAGES: Record<string, () => React.ReactElement> = {
  home: HomePage,
  training: TrainingPage,
  statistik: StatistikPage,
}

/**
 * Haupt-Tabs als horizontal wischbarer Pager (wie im Original „nach rechts wischen“).
 * Jede Seite scrollt für sich; die Tab-Leiste schwebt darüber.
 */
export function TabsLayout() {
  const { tab = 'home' } = useParams()
  const navigate = useNavigate()
  const index = TABS.findIndex((t) => t.id === tab)
  const pager = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(Math.max(0, index))
  const fromScroll = useRef(false)

  // Route → Scrollposition
  useLayoutEffect(() => {
    const el = pager.current
    if (!el || index < 0) return
    setActive(index)
    if (fromScroll.current) {
      fromScroll.current = false
      return
    }
    el.scrollTo({ left: index * el.clientWidth, behavior: 'instant' as ScrollBehavior })
  }, [index])

  // Scrollposition → Route
  useEffect(() => {
    const el = pager.current
    if (!el) return
    let t: ReturnType<typeof setTimeout>
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth)
      setActive(i)
      clearTimeout(t)
      t = setTimeout(() => {
        const j = Math.round(el.scrollLeft / el.clientWidth)
        if (TABS[j] && TABS[j].id !== tab) {
          fromScroll.current = true
          navigate(TABS[j].path, { replace: true })
        }
      }, 90)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      clearTimeout(t)
    }
  }, [tab, navigate])

  if (index < 0) return <Navigate to="/home" replace />

  const select = (i: number) => {
    const el = pager.current
    if (!el) return
    if (i === active) {
      el.children[i]?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <>
      <div ref={pager} className="no-scrollbar flex h-dvh snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain">
        {TABS.map((t) => {
          const Page = PAGES[t.id]
          return (
            <section key={t.id} className="no-scrollbar h-dvh w-screen shrink-0 snap-start snap-always overflow-y-auto overscroll-y-contain" aria-label={t.label}>
              <Page />
              <div style={{ height: 'calc(var(--safe-bottom) + 112px)' }} />
            </section>
          )
        })}
      </div>
      <TabBar active={active} onSelect={select} />
    </>
  )
}
