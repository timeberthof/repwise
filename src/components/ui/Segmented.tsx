interface Props<T extends string> {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
  small?: boolean
}

/** Segment-Schalter 36 pt: „Hypertrophie | Mobility“, „kg | lb“. */
export function Segmented<T extends string>({ options, value, onChange, className = '', small }: Props<T>) {
  return (
    <div className={`flex h-[37px] rounded-md border border-elevated p-0 ${className}`}>
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex-1 rounded-md font-semibold transition-colors ${small ? 'px-2 text-[14.5px]' : 'text-card'} ${active ? 'bg-fg text-fg-inverse' : 'text-fg-2'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
