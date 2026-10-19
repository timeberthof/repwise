/** Fortschritt aus Segmenten (Ablauf-Kopf, laufendes Workout). */
export function ProgressSegments({ total, current, accent, done }: { total: number; current: number; accent?: boolean; done?: number }) {
  const finished = done ?? current
  return (
    <div className="flex flex-1 gap-[4px]">
      {Array.from({ length: total }, (_, i) => {
        let bg = '#272727'
        if (i < finished) bg = accent ? 'linear-gradient(90deg,#f3af3d,#ed774d)' : '#f3f3f3'
        if (i === current && !accent) bg = 'linear-gradient(90deg,#f3f3f3,#9a9a9a)'
        if (i === current && accent) bg = 'linear-gradient(90deg,#f3af3d,#ed774d)'
        return <span key={i} className="h-[3px] flex-1 rounded-full" style={{ background: bg }} />
      })}
    </div>
  )
}
