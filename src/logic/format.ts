/** Zahlen im deutschen Format: 61,67 · 10.913 · 2.258 */
export function fmt(n: number | null | undefined, maxFractionDigits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '–'
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: maxFractionDigits }).format(n)
}

/** Gewicht: „77,5 kg“ */
export function kg(n: number | null | undefined, digits = 2): string {
  return `${fmt(n, digits)} kg`
}

/** Differenz mit Vorzeichen: „+7,6 kg“ / „−0,3 kg“ */
export function signed(n: number, digits = 1, unit = 'kg'): string {
  const r = Math.round(n * 10 ** digits) / 10 ** digits
  const sign = r > 0 ? '+' : r < 0 ? '-' : '+ '
  return `${sign}${fmt(Math.abs(r), digits)}${unit ? ' ' + unit : ''}`
}

export function plural(n: number, one: string, many: string): string {
  return `${fmt(n, 0)} ${n === 1 ? one : many}`
}
