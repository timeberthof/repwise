import { useEffect, useState, useSyncExternalStore } from 'react'
import { beep } from '../../lib/sound'

/**
 * Pausentimer: läuft über die Uhrzeit (endsAt), überlebt also Sheet-Wechsel, Hintergrund und Neuladen.
 * Ton am Ende über Web Audio, dazu blinkt der Button (Vibration geht im iOS-Browser nicht).
 */
interface TimerState {
  endsAt: number | null
  total: number
  sessionId: number | null
  finishedAt: number | null
}

const KEY = 'repwise.restTimer'
let state: TimerState = load()
const listeners = new Set<() => void>()

function load(): TimerState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as TimerState
  } catch {
    /* ignorieren */
  }
  return { endsAt: null, total: 0, sessionId: null, finishedAt: null }
}

function set(next: TimerState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignorieren */
  }
  listeners.forEach((l) => l())
}

export const restTimer = {
  start(sessionId: number, seconds: number) {
    set({ endsAt: Date.now() + seconds * 1000, total: seconds, sessionId, finishedAt: null })
  },
  skip() {
    set({ ...state, endsAt: null, finishedAt: null })
  },
  add(seconds: number) {
    if (state.endsAt) set({ ...state, endsAt: state.endsAt + seconds * 1000, total: state.total + seconds })
  },
  finish() {
    set({ ...state, endsAt: null, finishedAt: Date.now() })
  },
  clearFinished() {
    if (state.finishedAt) set({ ...state, finishedAt: null })
  },
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

/** Restzeit in Sekunden (oder null) – aktualisiert sich mehrmals pro Sekunde; piept am Ende. */
export function useRestTimer(sessionId: number | undefined) {
  const s = useSyncExternalStore(restTimer.subscribe, restTimer.get)
  const [, tick] = useState(0)
  const running = !!s.endsAt && s.sessionId === sessionId
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      const st = restTimer.get()
      if (st.endsAt && Date.now() >= st.endsAt) {
        restTimer.finish()
        beep()
      }
      tick((x) => x + 1)
    }, 250)
    return () => clearInterval(t)
  }, [running])
  const remaining = running ? Math.max(0, (s.endsAt! - Date.now()) / 1000) : null
  const justFinished = !!s.finishedAt && s.sessionId === sessionId && Date.now() - s.finishedAt < 4000
  return { remaining, total: s.total, justFinished }
}
