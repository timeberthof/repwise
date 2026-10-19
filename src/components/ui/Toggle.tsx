/** Schalter wie in „Verfügbare Gewichte“: aus = Rahmen + grauer Knopf, an = weiß gefüllt. */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[34px] w-[58px] shrink-0 rounded-full border-2 transition-colors ${checked ? 'border-fg bg-fg' : 'border-fg-3 bg-transparent'}`}
    >
      <span
        className={`absolute top-1/2 h-[22px] w-[22px] -translate-y-1/2 rounded-full transition-all ${checked ? 'left-[28px] bg-fg-inverse' : 'left-[4px] bg-fg-3'}`}
      />
    </button>
  )
}
