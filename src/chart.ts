/**
 * A clean axis for values up to `max`: a step of 1, 2, 2.5 or 5 × 10ⁿ giving at most `ticks` steps,
 * and the first multiple of it at or above `max`.
 */
export function niceScale(max: number, ticks = 4): { max: number; step: number } {
  if (!(max > 0)) return { max: ticks, step: 1 }
  const raw = max / ticks
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!
  return { max: Math.ceil(max / step - 1e-9) * step, step }
}

export interface Arc {
  id: string
  value: number
  /** Where the segment starts and how long it is, along a circle of the given circumference. */
  offset: number
  length: number
}

/**
 * Lays out donut segments in order around a circle, leaving `gap` between neighbours. Zero values
 * are skipped; a lone segment closes the ring with no gap.
 */
export function donutArcs(values: { id: string; value: number }[], circumference: number, gap: number): Arc[] {
  const shown = values.filter((v) => v.value > 0)
  const total = shown.reduce((sum, v) => sum + v.value, 0)
  if (total === 0) return []
  const spacing = shown.length > 1 ? gap : 0
  let offset = 0
  return shown.map(({ id, value }) => {
    const span = (value / total) * circumference
    const arc = { id, value, offset: offset + spacing / 2, length: Math.max(span - spacing, 0.5) }
    offset += span
    return arc
  })
}

export interface Segment {
  id: string
  value: number
  /** Bottom and top of the segment in data units. */
  from: number
  to: number
}

/** Stacks values bottom-up in the given order, skipping zeros. */
export function stack(values: { id: string; value: number }[]): Segment[] {
  let base = 0
  return values
    .filter((v) => v.value > 0)
    .map(({ id, value }) => {
      const segment = { id, value, from: base, to: base + value }
      base += value
      return segment
    })
}

/** A rectangle with only its top corners rounded: a column's data end, square at the baseline. */
export function topRoundedRect(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height))
  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `A${r},${r} 0 0 1 ${x + r},${y}`,
    `H${x + width - r}`,
    `A${r},${r} 0 0 1 ${x + width},${y + r}`,
    `V${y + height}`,
    'Z',
  ].join(' ')
}
