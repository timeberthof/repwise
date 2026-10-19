import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, ReferenceLine } from 'recharts'
import type { ISODate } from '../../db/types'
import { axisLabel, formatDayMonth, formatDate } from '../../logic/dates'
import { fmt } from '../../logic/format'

export interface Point {
  date: ISODate
  value: number
}

/** Zweizeilige Datumsachse „Sep / 10“ wie im Original. */
function AxisTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (!payload) return null
  const [m, d] = axisLabel(payload.value)
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="#9f9f9f" fontSize={14.5} fontFamily="Montserrat" dy={14}>
        {m}
      </text>
      <text textAnchor="middle" fill="#9f9f9f" fontSize={14.5} fontFamily="Montserrat" dy={33}>
        {d}
      </text>
    </g>
  )
}

function ValueLabel({ x, y, value, color }: { x?: number | string; y?: number | string; value?: number | string; color: string }) {
  if (x === undefined || y === undefined || value === undefined) return null
  return (
    <text x={Number(x)} y={Number(y) - 12} textAnchor="middle" fill={color} fontSize={13.5} fontFamily="Montserrat">
      {fmt(Number(value))}
    </text>
  )
}

function RingDot({ cx, cy, color }: { cx?: number; cy?: number; color: string }) {
  if (cx === undefined || cy === undefined) return null
  return <circle cx={cx} cy={cy} r={5} fill="#0f0f0f" stroke={color} strokeWidth={2.5} />
}

function TipBox({ active, payload, unit }: { active?: boolean; payload?: { payload: Point }[]; unit: string }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border border-elevated bg-surface-2 px-3 py-2 text-label shadow-xl">
      <p className="text-fg-2">{formatDate(p.date)}</p>
      <p className="font-semibold text-fg">
        {fmt(p.value)} {unit}
      </p>
    </div>
  )
}

/**
 * Liniendiagramm der Statistik-Karten (S07–S16): Linie mit Ring-Punkten, Wert über jedem Punkt,
 * Datum zweizeilig, keine Y-Achse, kein Raster – wie im Original.
 */
export function ValueLineChart({ points, color = '#ed774d', unit = 'kg', height = 150 }: { points: Point[]; color?: string; unit?: string; height?: number }) {
  if (!points.length) return <div style={{ height }} />
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = max - min < 1 ? 2 : (max - min) * 0.15
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 26, right: 22, bottom: 0, left: 22 }}>
        <XAxis dataKey="date" axisLine={false} tickLine={false} interval={0} tick={<AxisTick />} height={44} padding={{ left: 4, right: 4 }} />
        <YAxis hide domain={[min - pad, max + pad]} />
        <Tooltip content={<TipBox unit={unit} />} cursor={{ stroke: '#3a3a3a', strokeWidth: 1 }} />
        <Line type="linear" dataKey="value" stroke={color} strokeWidth={2.5} dot={<RingDot color={color} />} activeDot={{ r: 6, fill: color, stroke: '#0f0f0f', strokeWidth: 2 }} isAnimationActive={false}>
          <LabelList dataKey="value" content={(p) => <ValueLabel x={p.x} y={p.y} value={p.value as number} color={color} />} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * Verlauf für die Detailseite: viele Punkte möglich, darum Werte nur im Tooltip und am letzten Punkt,
 * dezentes Raster, Y-Achse rechts.
 */
export function TrendChart({ points, color = '#ed774d', unit = 'kg', height = 200, digits = 1 }: { points: Point[]; color?: string; unit?: string; height?: number; digits?: number }) {
  if (!points.length) return <div className="flex items-center justify-center text-label text-fg-2" style={{ height }}>Keine Werte im Zeitraum</div>
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = max - min < 1 ? Math.max(1, max * 0.05) : (max - min) * 0.18
  const last = points.length - 1
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 26, right: 26, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} stroke="#1f1f1f" />
        <XAxis dataKey="date" tickFormatter={formatDayMonth} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={26} tick={{ fill: '#9e9e9e', fontSize: 12.5, fontFamily: 'Montserrat' }} dy={8} />
        <YAxis width={38} domain={[Math.max(0, min - pad), max + pad]} axisLine={false} tickLine={false} tickCount={4} tickFormatter={(v: number) => fmt(v, 0)} tick={{ fill: '#9e9e9e', fontSize: 12, fontFamily: 'Montserrat' }} />
        <Tooltip content={<TipBox unit={unit} />} cursor={{ stroke: '#3a3a3a', strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={points.length <= 24 ? <RingDot color={color} /> : false}
          activeDot={{ r: 6, fill: color, stroke: '#0f0f0f', strokeWidth: 2 }}
          isAnimationActive={false}
        >
          <LabelList dataKey="value" content={(p) => (p.index === last ? <ValueLabel x={p.x} y={p.y} value={Math.round(Number(p.value) * 10 ** digits) / 10 ** digits} color="#f3f3f3" /> : null)} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Geglätteter Maximalkraft-Verlauf im Trainingsabschluss (S48/S49). */
export function SmoothStrengthChart({ points }: { points: { date: ISODate; e1rm: number }[] }) {
  const id = useId()
  const data = points.map((p) => ({ date: p.date, value: Math.round(p.e1rm * 100) / 100 }))
  const values = data.map((d) => d.value)
  const lo = Math.floor((Math.min(...values) - 3) / 5) * 5
  const hi = Math.ceil((Math.max(...values) + 3) / 5) * 5
  const ticks = [lo, Math.round((lo + hi) / 2 / 5) * 5, hi]
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 20, right: 26, bottom: 4, left: -18 }}>
          <defs>
            <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ed774d" />
              <stop offset="50%" stopColor="#f09e3b" />
              <stop offset="100%" stopColor="#ed774d" />
            </linearGradient>
            <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f09e3b" stopOpacity={0.07} />
              <stop offset="100%" stopColor="#f09e3b" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="transparent" />
          <XAxis dataKey="date" tickFormatter={formatDayMonth} axisLine={false} tickLine={false} tick={{ fill: '#9e9e9e', fontSize: 13, fontFamily: 'Montserrat' }} interval={0} dy={10} />
          <YAxis domain={[lo, hi]} ticks={ticks} axisLine={false} tickLine={false} tick={{ fill: '#9e9e9e', fontSize: 13, fontFamily: 'Montserrat' }} />
          <Tooltip content={<TipBox unit="kg" />} cursor={{ stroke: '#3a3a3a' }} />
          <Area type="monotone" dataKey="value" stroke={`url(#${id}s)`} strokeWidth={3.5} fill={`url(#${id}f)`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
      <span className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 text-[17px] text-fg">kg</span>
    </div>
  )
}

/** KW-Beschriftung „KW / 42“ für Wochen-Balken. */
function WeekTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (!payload) return null
  const d = new Date(payload.value)
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const kw = Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7)
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="#9f9f9f" fontSize={13} fontFamily="Montserrat" dy={14}>
        KW
      </text>
      <text textAnchor="middle" fill="#9f9f9f" fontSize={14.5} fontFamily="Montserrat" dy={33}>
        {kw}
      </text>
    </g>
  )
}

/** Balken (Tage oder Wochen) mit optional gestrichelter Ziellinie. Werte stehen über den Balken. */
export function DayBarChart({ data, color, target, unit, height = 150, weekLabels }: { data: { date: ISODate; label: [string, string]; value: number }[]; color: string; target?: number; unit: string; height?: number; weekLabels?: boolean }) {
  const max = Math.max(target ?? 0, ...data.map((d) => d.value), 1)
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 22, right: 20, bottom: 0, left: 20 }}>
          <XAxis dataKey="date" axisLine={false} tickLine={false} interval={0} height={44} tick={weekLabels ? <WeekTick /> : <AxisTick />} />
          <YAxis hide domain={[0, max * 1.12]} />
          {target ? <ReferenceLine y={target} stroke="#303030" strokeDasharray="8 7" strokeWidth={2} /> : null}
          <Tooltip content={<TipBox unit={unit} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="value" fill={color} radius={[6, 6, 6, 6]} barSize={25} minPointSize={0} isAnimationActive={false}>
            <LabelList dataKey="value" content={(p) => (Number(p.value) > 0 ? <ValueLabel x={Number(p.x) + Number(p.width) / 2} y={p.y} value={p.value as number} color="#f3f3f3" /> : null)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
